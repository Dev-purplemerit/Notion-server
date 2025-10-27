import { Controller, Get, Post, Delete, Put, Body, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import type { Response } from 'express';

@Controller('gmail')
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  /**
   * GET /gmail/auth
   * Initiate Gmail OAuth flow
   */
  @Get('auth')
  @UseGuards(JwtAuthGuard)
  initiateOAuth(@Res() res: Response) {
    const authUrl = this.gmailService.generateAuthUrl();
    res.redirect(authUrl);
  }

  /**
   * GET /gmail/auth/callback
   * OAuth callback endpoint
   */
  @Get('auth/callback')
  @UseGuards(JwtAuthGuard)
  async handleOAuthCallback(
    @Query('code') code: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const result = await this.gmailService.handleOAuthCallback(code, req.user.email);
      // Redirect to admin email page after successful authentication
      res.redirect('/admin/email?connected=true');
    } catch (error) {
      res.redirect('/admin/email?error=auth_failed');
    }
  }

  /**
   * POST /gmail/disconnect
   * Disconnect Gmail account
   */
  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnectGmail(@Req() req: any) {
    return this.gmailService.disconnectGmail(req.user.email);
  }

  /**
   * GET /gmail/auth/status
   * Check if user has connected Gmail
   */
  @Get('auth/status')
  @UseGuards(JwtAuthGuard)
  async getAuthStatus(@Req() req: any) {
    return this.gmailService.getAuthStatus(req.user.email);
  }

  /**
   * GET /gmail/messages
   * List emails with optional filters
   */
  @Get('messages')
  @UseGuards(JwtAuthGuard)
  async listMessages(
    @Req() req: any,
    @Query('category') category?: string,
    @Query('maxResults') maxResults?: string,
    @Query('pageToken') pageToken?: string,
    @Query('q') q?: string,
  ) {
    return this.gmailService.listMessages(req.user.email, {
      category,
      maxResults: maxResults ? parseInt(maxResults, 10) : undefined,
      pageToken,
      q,
    });
  }

  /**
   * GET /gmail/messages/:id
   * Get email by ID
   */
  @Get('messages/:id')
  @UseGuards(JwtAuthGuard)
  async getMessage(@Req() req: any, @Param('id') id: string) {
    return this.gmailService.getMessage(req.user.email, id);
  }

  /**
   * POST /gmail/messages/send
   * Send email
   */
  @Post('messages/send')
  @UseGuards(JwtAuthGuard)
  async sendEmail(
    @Req() req: any,
    @Body() emailData: {
      to: string | string[];
      cc?: string | string[];
      bcc?: string | string[];
      subject: string;
      body: string;
      isHtml?: boolean;
    },
  ) {
    return this.gmailService.sendEmail(req.user.email, emailData);
  }

  /**
   * POST /gmail/messages/:id/reply
   * Reply to email
   */
  @Post('messages/:id/reply')
  @UseGuards(JwtAuthGuard)
  async replyToEmail(
    @Req() req: any,
    @Param('id') id: string,
    @Body() replyData: {
      body: string;
      isHtml?: boolean;
    },
  ) {
    return this.gmailService.replyToEmail(req.user.email, id, replyData);
  }

  /**
   * POST /gmail/messages/:id/forward
   * Forward email
   */
  @Post('messages/:id/forward')
  @UseGuards(JwtAuthGuard)
  async forwardEmail(
    @Req() req: any,
    @Param('id') id: string,
    @Body() forwardData: {
      to: string | string[];
      cc?: string | string[];
      body?: string;
      isHtml?: boolean;
    },
  ) {
    return this.gmailService.forwardEmail(req.user.email, id, forwardData);
  }

  /**
   * POST /gmail/messages/:id/modify
   * Modify email labels
   */
  @Post('messages/:id/modify')
  @UseGuards(JwtAuthGuard)
  async modifyMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() modifications: {
      addLabels?: string[];
      removeLabels?: string[];
    },
  ) {
    return this.gmailService.modifyMessage(req.user.email, id, modifications);
  }

  /**
   * POST /gmail/messages/:id/trash
   * Move email to trash
   */
  @Post('messages/:id/trash')
  @UseGuards(JwtAuthGuard)
  async trashMessage(@Req() req: any, @Param('id') id: string) {
    return this.gmailService.trashMessage(req.user.email, id);
  }

  /**
   * POST /gmail/messages/:id/untrash
   * Remove email from trash
   */
  @Post('messages/:id/untrash')
  @UseGuards(JwtAuthGuard)
  async untrashMessage(@Req() req: any, @Param('id') id: string) {
    return this.gmailService.untrashMessage(req.user.email, id);
  }

  /**
   * DELETE /gmail/messages/:id
   * Permanently delete email
   */
  @Delete('messages/:id')
  @UseGuards(JwtAuthGuard)
  async deleteMessage(@Req() req: any, @Param('id') id: string) {
    return this.gmailService.deleteMessage(req.user.email, id);
  }

  /**
   * POST /gmail/messages/batch-modify
   * Batch modify messages
   */
  @Post('messages/batch-modify')
  @UseGuards(JwtAuthGuard)
  async batchModifyMessages(
    @Req() req: any,
    @Body() data: {
      messageIds: string[];
      addLabels?: string[];
      removeLabels?: string[];
    },
  ) {
    return this.gmailService.batchModifyMessages(req.user.email, data.messageIds, {
      addLabels: data.addLabels,
      removeLabels: data.removeLabels,
    });
  }

  /**
   * POST /gmail/messages/batch-delete
   * Batch delete messages
   */
  @Post('messages/batch-delete')
  @UseGuards(JwtAuthGuard)
  async batchDeleteMessages(
    @Req() req: any,
    @Body() data: {
      messageIds: string[];
    },
  ) {
    return this.gmailService.batchDeleteMessages(req.user.email, data.messageIds);
  }

  /**
   * POST /gmail/messages/batch-trash
   * Batch trash messages
   */
  @Post('messages/batch-trash')
  @UseGuards(JwtAuthGuard)
  async batchTrashMessages(
    @Req() req: any,
    @Body() data: {
      messageIds: string[];
    },
  ) {
    // Use batch modify to add TRASH label
    return this.gmailService.batchModifyMessages(req.user.email, data.messageIds, {
      addLabels: ['TRASH'],
    });
  }

  /**
   * GET /gmail/labels
   * Get all Gmail labels
   */
  @Get('labels')
  @UseGuards(JwtAuthGuard)
  async getLabels(@Req() req: any) {
    return this.gmailService.getLabels(req.user.email);
  }

  /**
   * GET /gmail/profile
   * Get Gmail profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    return this.gmailService.getProfile(req.user.email);
  }

  /**
   * Draft endpoints (simplified - can be expanded later)
   */

  @Post('drafts')
  @UseGuards(JwtAuthGuard)
  async saveDraft(@Req() req: any, @Body() draftData: any) {
    // For now, return not implemented
    // Can be implemented using gmail.users.drafts.create() API
    return { message: 'Draft functionality coming soon' };
  }

  @Put('drafts/:id')
  @UseGuards(JwtAuthGuard)
  async updateDraft(@Req() req: any, @Param('id') id: string, @Body() draftData: any) {
    return { message: 'Draft functionality coming soon' };
  }

  @Delete('drafts/:id')
  @UseGuards(JwtAuthGuard)
  async deleteDraft(@Req() req: any, @Param('id') id: string) {
    return { message: 'Draft functionality coming soon' };
  }

  @Post('drafts/:id/send')
  @UseGuards(JwtAuthGuard)
  async sendDraft(@Req() req: any, @Param('id') id: string) {
    return { message: 'Draft functionality coming soon' };
  }
}
