import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './messaging.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class MessagingService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private usersService: UsersService,
  ) {}

  /**
   * Send a message
   */
  async sendMessage(
    senderEmail: string,
    data: {
      receiverId: string;
      content: string;
      messageType?: string;
      fileUrl?: string;
      fileName?: string;
    },
  ) {
    const senderId = await this.usersService.getUserIdFromEmail(senderEmail);

    const message = await new this.messageModel({
      senderId,
      receiverId: data.receiverId,
      content: data.content,
      messageType: data.messageType || 'text',
      fileUrl: data.fileUrl,
      fileName: data.fileName,
    }).save();

    // Populate sender and receiver info
    await message.populate(['senderId', 'receiverId']);

    return message;
  }

  /**
   * Get conversation between two users
   */
  async getConversation(userEmail: string, otherUserId: string, limit: number = 50) {
    const userId = await this.usersService.getUserIdFromEmail(userEmail);

    const messages = await this.messageModel
      .find({
        $or: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate(['senderId', 'receiverId'])
      .exec();

    return messages.reverse(); // Return in chronological order
  }

  /**
   * Get all conversations for a user (list of users they've messaged with)
   */
  async getConversations(userEmail: string) {
    const userId = await this.usersService.getUserIdFromEmail(userEmail);

    if (!userId) {
      return [];
    }

    // Get all messages where user is sender or receiver
    const messages = await this.messageModel
      .find({
        $or: [{ senderId: userId }, { receiverId: userId }],
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .populate(['senderId', 'receiverId'])
      .exec();

    // Group by conversation partner and get latest message
    const conversationsMap = new Map();

    for (const message of messages) {
      const partnerId = message.senderId._id.toString() === userId.toString()
        ? message.receiverId._id.toString()
        : message.senderId._id.toString();

      if (!conversationsMap.has(partnerId)) {
        const partner = message.senderId._id.toString() === userId.toString()
          ? message.receiverId
          : message.senderId;

        conversationsMap.set(partnerId, {
          partner,
          lastMessage: message,
          unreadCount: 0,
        });
      }
    }

    // Count unread messages for each conversation
    for (const [partnerId, conversation] of conversationsMap.entries()) {
      const unreadCount = await this.messageModel.countDocuments({
        senderId: partnerId,
        receiverId: userId,
        isRead: false,
        isDeleted: false,
      });
      conversation.unreadCount = unreadCount;
    }

    return Array.from(conversationsMap.values());
  }

  /**
   * Mark message as read
   */
  async markAsRead(userEmail: string, messageId: string) {
    const userId = await this.usersService.getUserIdFromEmail(userEmail);

    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const message = await this.messageModel.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only the receiver can mark as read
    if (message.receiverId.toString() !== userId.toString()) {
      throw new ForbiddenException('You can only mark your own received messages as read');
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    return message;
  }

  /**
   * Mark all messages from a user as read
   */
  async markConversationAsRead(userEmail: string, otherUserId: string) {
    const userId = await this.usersService.getUserIdFromEmail(userEmail);

    if (!userId) {
      throw new NotFoundException('User not found');
    }

    await this.messageModel.updateMany(
      {
        senderId: otherUserId,
        receiverId: userId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    );

    return { success: true };
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(userEmail: string, messageId: string) {
    const userId = await this.usersService.getUserIdFromEmail(userEmail);

    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const message = await this.messageModel.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only sender can delete
    if (message.senderId.toString() !== userId.toString()) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    return { success: true };
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(userEmail: string) {
    const userId = await this.usersService.getUserIdFromEmail(userEmail);

    const count = await this.messageModel.countDocuments({
      receiverId: userId,
      isRead: false,
      isDeleted: false,
    });

    return { count };
  }

  /**
   * Search messages
   */
  async searchMessages(userEmail: string, query: string) {
    const userId = await this.usersService.getUserIdFromEmail(userEmail);

    const messages = await this.messageModel
      .find({
        $or: [{ senderId: userId }, { receiverId: userId }],
        content: { $regex: query, $options: 'i' },
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate(['senderId', 'receiverId'])
      .exec();

    return messages;
  }
}
