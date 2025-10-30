import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatMessage, ChatMessageDocument } from './chat.schema';

export interface SaveMessageDto {
  sender: string;
  receiver?: string;
  groupName?: string;
  text: string;
  mode: 'private' | 'group';
  isMedia?: boolean;
  mediaUrl?: string;
  filename?: string;
  mimetype?: string;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name)
    private chatMessageModel: Model<ChatMessageDocument>,
  ) {}

  /**
   * Save a message to the database
   */
  async saveMessage(messageData: SaveMessageDto): Promise<ChatMessageDocument> {
    const message = new this.chatMessageModel(messageData);
    return await message.save();
  }

  /**
   * Get private conversation between two users
   */
  async getPrivateConversation(
    user1: string,
    user2: string,
    limit: number = 100,
  ): Promise<ChatMessageDocument[]> {
    return await this.chatMessageModel
      .find({
        mode: 'private',
        $or: [
          { sender: user1, receiver: user2 },
          { sender: user2, receiver: user1 },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec()
      .then((messages) => messages.reverse()); // Return in chronological order
  }

  /**
   * Get group conversation
   */
  async getGroupConversation(
    groupName: string,
    limit: number = 100,
  ): Promise<ChatMessageDocument[]> {
    return await this.chatMessageModel
      .find({
        mode: 'group',
        groupName: groupName,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec()
      .then((messages) => messages.reverse()); // Return in chronological order
  }

  /**
   * Mark message as delivered
   */
  async markAsDelivered(messageId: string): Promise<void> {
    await this.chatMessageModel.findByIdAndUpdate(messageId, {
      isDelivered: true,
      deliveredAt: new Date(),
    });
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    await this.chatMessageModel.findByIdAndUpdate(messageId, {
      isRead: true,
      readAt: new Date(),
    });
  }

  /**
   * Get unread messages for a user (messages that haven't been delivered yet)
   */
  async getUnreadMessages(receiver: string): Promise<ChatMessageDocument[]> {
    return await this.chatMessageModel
      .find({
        receiver: receiver,
        isDelivered: false, // Only fetch messages that haven't been delivered yet
      })
      .sort({ createdAt: 1 })
      .exec();
  }

  /**
   * Get undelivered group messages for a user since their last connection
   * This fetches group messages from groups the user is a member of
   */
  async getUndeliveredGroupMessages(
    userEmail: string,
    lastSeenTimestamp?: Date,
  ): Promise<ChatMessageDocument[]> {
    // Get all groups the user has participated in
    const userGroups = await this.getUserGroups(userEmail);

    if (userGroups.length === 0) {
      return [];
    }

    // If no timestamp provided, use a reasonable default (e.g., last 7 days)
    const since = lastSeenTimestamp || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Fetch all group messages from user's groups that are newer than their last seen time
    // and were not sent by the user themselves
    return await this.chatMessageModel
      .find({
        mode: 'group',
        groupName: { $in: userGroups },
        sender: { $ne: userEmail }, // Don't send user's own messages back
        createdAt: { $gt: since },
      })
      .sort({ createdAt: 1 })
      .exec();
  }

  /**
   * Get all conversations for a user (list of users they've chatted with)
   */
  async getUserConversations(userEmail: string): Promise<any[]> {
    // Get all messages where user is sender or receiver
    const messages = await this.chatMessageModel
      .find({
        mode: 'private',
        $or: [{ sender: userEmail }, { receiver: userEmail }],
      })
      .sort({ createdAt: -1 })
      .exec();

    // Group by conversation partner
    const conversationsMap = new Map();

    for (const message of messages) {
      const partner =
        message.sender === userEmail ? message.receiver : message.sender;

      if (!conversationsMap.has(partner)) {
        conversationsMap.set(partner, {
          partner,
          lastMessage: message,
          unreadCount: 0,
        });
      }
    }

    // Count unread messages for each conversation
    for (const [partner, conversation] of conversationsMap.entries()) {
      const unreadCount = await this.chatMessageModel.countDocuments({
        sender: partner,
        receiver: userEmail,
        isRead: false,
      });
      conversation.unreadCount = unreadCount;
    }

    return Array.from(conversationsMap.values());
  }

  /**
   * Get user's group chats
   */
  async getUserGroups(userEmail: string): Promise<string[]> {
    const groups = await this.chatMessageModel.distinct('groupName', {
      mode: 'group',
      $or: [{ sender: userEmail }],
    });

    return groups.filter((g) => g != null);
  }
}
