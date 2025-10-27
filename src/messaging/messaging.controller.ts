import { Controller, Get, Post, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  /**
   * POST /messages
   * Send a message
   */
  @Post()
  async sendMessage(
    @Req() req: any,
    @Body() data: {
      receiverId: string;
      content: string;
      messageType?: string;
      fileUrl?: string;
      fileName?: string;
    },
  ) {
    return this.messagingService.sendMessage(req.user.email, data);
  }

  /**
   * GET /messages/conversations
   * Get all conversations for the current user
   */
  @Get('conversations')
  async getConversations(@Req() req: any) {
    return this.messagingService.getConversations(req.user.email);
  }

  /**
   * GET /messages/conversation/:userId
   * Get conversation with a specific user
   */
  @Get('conversation/:userId')
  async getConversation(
    @Req() req: any,
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.messagingService.getConversation(req.user.email, userId, limitNum);
  }

  /**
   * POST /messages/:id/read
   * Mark a message as read
   */
  @Post(':id/read')
  async markAsRead(@Req() req: any, @Param('id') messageId: string) {
    return this.messagingService.markAsRead(req.user.email, messageId);
  }

  /**
   * POST /messages/conversation/:userId/read
   * Mark all messages from a user as read
   */
  @Post('conversation/:userId/read')
  async markConversationAsRead(@Req() req: any, @Param('userId') userId: string) {
    return this.messagingService.markConversationAsRead(req.user.email, userId);
  }

  /**
   * DELETE /messages/:id
   * Delete a message (soft delete)
   */
  @Delete(':id')
  async deleteMessage(@Req() req: any, @Param('id') messageId: string) {
    return this.messagingService.deleteMessage(req.user.email, messageId);
  }

  /**
   * GET /messages/unread/count
   * Get unread message count
   */
  @Get('unread/count')
  async getUnreadCount(@Req() req: any) {
    return this.messagingService.getUnreadCount(req.user.email);
  }

  /**
   * GET /messages/search
   * Search messages
   */
  @Get('search')
  async searchMessages(@Req() req: any, @Query('q') query: string) {
    return this.messagingService.searchMessages(req.user.email, query);
  }
}
