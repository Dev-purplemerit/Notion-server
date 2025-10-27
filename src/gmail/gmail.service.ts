import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { google } from 'googleapis';
import { GmailToken, GmailTokenDocument } from './gmail.schema';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class GmailService {
  private oauth2Client;

  constructor(
    @InjectModel(GmailToken.name) private gmailTokenModel: Model<GmailTokenDocument>,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_GMAIL_REDIRECT_URI'),
    );
  }

  /**
   * Generate OAuth URL for Gmail authorization
   */
  generateAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.compose',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  /**
   * Exchange auth code for tokens and store them
   */
  async handleOAuthCallback(code: string, userEmail: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      // Get user ID
      const userId = await this.usersService.getUserIdFromEmail(userEmail);

      // Get Gmail email address
      this.oauth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });

      // Store or update tokens
      await this.gmailTokenModel.findOneAndUpdate(
        { userId },
        {
          userId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenType: tokens.token_type || 'Bearer',
          expiryDate: tokens.expiry_date || Date.now() + 3600000,
          scope: tokens.scope,
          email: profile.data.emailAddress,
          isActive: true,
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true },
      );

      return { success: true, email: profile.data.emailAddress };
    } catch (error) {
      throw new BadRequestException('Failed to exchange OAuth code for tokens');
    }
  }

  /**
   * Disconnect Gmail (delete stored tokens)
   */
  async disconnectGmail(userEmail: string) {
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    await this.gmailTokenModel.deleteOne({ userId });
    return { success: true };
  }

  /**
   * Check if user has connected Gmail
   */
  async getAuthStatus(userEmail: string) {
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    const token = await this.gmailTokenModel.findOne({ userId, isActive: true });

    return {
      connected: !!token,
      email: token?.email,
    };
  }

  /**
   * Get authenticated Gmail client for a user
   */
  private async getGmailClient(userEmail: string) {
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    const tokenDoc = await this.gmailTokenModel.findOne({ userId, isActive: true });

    if (!tokenDoc) {
      throw new UnauthorizedException('Gmail not connected. Please connect your Gmail account first.');
    }

    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_GMAIL_REDIRECT_URI'),
    );

    oauth2Client.setCredentials({
      access_token: tokenDoc.accessToken,
      refresh_token: tokenDoc.refreshToken,
      token_type: tokenDoc.tokenType,
      expiry_date: tokenDoc.expiryDate,
    });

    // Handle token refresh
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        tokenDoc.refreshToken = tokens.refresh_token;
      }
      if (tokens.access_token) {
        tokenDoc.accessToken = tokens.access_token;
      }
      if (tokens.expiry_date) {
        tokenDoc.expiryDate = tokens.expiry_date;
      }
      await tokenDoc.save();
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  /**
   * List emails (with filters)
   */
  async listMessages(
    userEmail: string,
    options: {
      category?: string;
      maxResults?: number;
      pageToken?: string;
      q?: string;
    } = {},
  ) {
    const gmail = await this.getGmailClient(userEmail);

    const query: any = {};
    const maxResults = options.maxResults || 50;

    // Build query based on category
    if (options.category === 'inbox') query.labelIds = ['INBOX'];
    else if (options.category === 'sent') query.labelIds = ['SENT'];
    else if (options.category === 'drafts') query.labelIds = ['DRAFT'];
    else if (options.category === 'starred') query.labelIds = ['STARRED'];
    else if (options.category === 'important') query.labelIds = ['IMPORTANT'];
    else if (options.category === 'trash') query.labelIds = ['TRASH'];
    else if (options.category === 'spam') query.labelIds = ['SPAM'];

    if (options.q) query.q = options.q;
    if (options.pageToken) query.pageToken = options.pageToken;

    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      ...query,
    });

    return {
      messages: response.data.messages || [],
      nextPageToken: response.data.nextPageToken,
      resultSizeEstimate: response.data.resultSizeEstimate,
    };
  }

  /**
   * Get email by ID
   */
  async getMessage(userEmail: string, messageId: string) {
    const gmail = await this.getGmailClient(userEmail);

    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    return response.data;
  }

  /**
   * Send email
   */
  async sendEmail(
    userEmail: string,
    email: {
      to: string | string[];
      cc?: string | string[];
      bcc?: string | string[];
      subject: string;
      body: string;
      isHtml?: boolean;
    },
  ) {
    const gmail = await this.getGmailClient(userEmail);

    const message = this.createEmailMessage(email);
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return response.data;
  }

  /**
   * Reply to email
   */
  async replyToEmail(
    userEmail: string,
    messageId: string,
    reply: {
      body: string;
      isHtml?: boolean;
    },
  ) {
    const gmail = await this.getGmailClient(userEmail);

    // Get original message to extract headers
    const originalMessage = await this.getMessage(userEmail, messageId);
    const headers = originalMessage.payload?.headers || [];

    const to = headers.find((h: any) => h.name === 'From')?.value || '';
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const messageIdHeader = headers.find((h: any) => h.name === 'Message-ID')?.value || '';
    const referencesHeader = headers.find((h: any) => h.name === 'References')?.value || '';

    const replySubject = subject.startsWith('Re: ') ? subject : `Re: ${subject}`;

    const message = this.createEmailMessage({
      to,
      subject: replySubject,
      body: reply.body,
      isHtml: reply.isHtml,
    });

    // Add threading headers
    const messageWithHeaders = message + `In-Reply-To: ${messageIdHeader}\r\nReferences: ${referencesHeader} ${messageIdHeader}\r\n`;

    const encodedMessage = Buffer.from(messageWithHeaders).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId: originalMessage.threadId,
      },
    });

    return response.data;
  }

  /**
   * Forward email
   */
  async forwardEmail(
    userEmail: string,
    messageId: string,
    forward: {
      to: string | string[];
      cc?: string | string[];
      body?: string;
      isHtml?: boolean;
    },
  ) {
    const gmail = await this.getGmailClient(userEmail);

    // Get original message
    const originalMessage = await this.getMessage(userEmail, messageId);
    const headers = originalMessage.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';

    const forwardSubject = subject.startsWith('Fwd: ') ? subject : `Fwd: ${subject}`;

    const message = this.createEmailMessage({
      to: forward.to,
      cc: forward.cc,
      subject: forwardSubject,
      body: forward.body || '',
      isHtml: forward.isHtml,
    });

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return response.data;
  }

  /**
   * Modify email labels
   */
  async modifyMessage(
    userEmail: string,
    messageId: string,
    modifications: {
      addLabels?: string[];
      removeLabels?: string[];
    },
  ) {
    const gmail = await this.getGmailClient(userEmail);

    const response = await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: modifications.addLabels,
        removeLabelIds: modifications.removeLabels,
      },
    });

    return response.data;
  }

  /**
   * Trash email
   */
  async trashMessage(userEmail: string, messageId: string) {
    const gmail = await this.getGmailClient(userEmail);

    const response = await gmail.users.messages.trash({
      userId: 'me',
      id: messageId,
    });

    return response.data;
  }

  /**
   * Untrash email
   */
  async untrashMessage(userEmail: string, messageId: string) {
    const gmail = await this.getGmailClient(userEmail);

    const response = await gmail.users.messages.untrash({
      userId: 'me',
      id: messageId,
    });

    return response.data;
  }

  /**
   * Permanently delete email
   */
  async deleteMessage(userEmail: string, messageId: string) {
    const gmail = await this.getGmailClient(userEmail);

    await gmail.users.messages.delete({
      userId: 'me',
      id: messageId,
    });

    return { success: true };
  }

  /**
   * Get Gmail profile
   */
  async getProfile(userEmail: string) {
    const gmail = await this.getGmailClient(userEmail);

    const response = await gmail.users.getProfile({
      userId: 'me',
    });

    return response.data;
  }

  /**
   * Get labels
   */
  async getLabels(userEmail: string) {
    const gmail = await this.getGmailClient(userEmail);

    const response = await gmail.users.labels.list({
      userId: 'me',
    });

    return response.data.labels || [];
  }

  /**
   * Helper: Create email message in RFC 2822 format
   */
  private createEmailMessage(email: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    body: string;
    isHtml?: boolean;
  }): string {
    const to = Array.isArray(email.to) ? email.to.join(', ') : email.to;
    const cc = email.cc ? (Array.isArray(email.cc) ? email.cc.join(', ') : email.cc) : '';
    const bcc = email.bcc ? (Array.isArray(email.bcc) ? email.bcc.join(', ') : email.bcc) : '';

    const contentType = email.isHtml ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';

    let message = `To: ${to}\r\n`;
    if (cc) message += `Cc: ${cc}\r\n`;
    if (bcc) message += `Bcc: ${bcc}\r\n`;
    message += `Subject: ${email.subject}\r\n`;
    message += `Content-Type: ${contentType}\r\n\r\n`;
    message += email.body;

    return message;
  }

  /**
   * Batch modify messages
   */
  async batchModifyMessages(
    userEmail: string,
    messageIds: string[],
    modifications: {
      addLabels?: string[];
      removeLabels?: string[];
    },
  ) {
    const gmail = await this.getGmailClient(userEmail);

    const response = await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: messageIds,
        addLabelIds: modifications.addLabels,
        removeLabelIds: modifications.removeLabels,
      },
    });

    return { success: true };
  }

  /**
   * Batch delete messages
   */
  async batchDeleteMessages(userEmail: string, messageIds: string[]) {
    const gmail = await this.getGmailClient(userEmail);

    await gmail.users.messages.batchDelete({
      userId: 'me',
      requestBody: {
        ids: messageIds,
      },
    });

    return { success: true };
  }
}
