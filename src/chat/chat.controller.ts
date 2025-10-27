import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Get private conversation between current user and another user
   * GET /chat/conversation/:userEmail?limit=100
   */
  @Get('conversation/:userEmail')
  async getPrivateConversation(
    @Request() req,
    @Param('userEmail') otherUserEmail: string,
    @Query('limit') limit?: number,
  ) {
    const currentUserEmail = req.user.email;
    const messages = await this.chatService.getPrivateConversation(
      currentUserEmail,
      otherUserEmail,
      limit ? parseInt(limit.toString()) : 100,
    );

    return {
      success: true,
      messages,
    };
  }

  /**
   * Get group conversation
   * GET /chat/group/:groupName?limit=100
   */
  @Get('group/:groupName')
  async getGroupConversation(
    @Param('groupName') groupName: string,
    @Query('limit') limit?: number,
  ) {
    const messages = await this.chatService.getGroupConversation(
      groupName,
      limit ? parseInt(limit.toString()) : 100,
    );

    return {
      success: true,
      messages,
    };
  }

  /**
   * Get all conversations for current user
   * GET /chat/conversations
   */
  @Get('conversations')
  async getUserConversations(@Request() req) {
    const userEmail = req.user.email;
    const conversations = await this.chatService.getUserConversations(userEmail);

    return {
      success: true,
      conversations,
    };
  }

  /**
   * Get user's groups
   * GET /chat/groups
   */
  @Get('groups')
  async getUserGroups(@Request() req) {
    const userEmail = req.user.email;
    const groups = await this.chatService.getUserGroups(userEmail);

    return {
      success: true,
      groups,
    };
  }

  /**
   * Get unread messages count
   * GET /chat/unread-count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const userEmail = req.user.email;
    const unreadMessages = await this.chatService.getUnreadMessages(userEmail);

    return {
      success: true,
      count: unreadMessages.length,
    };
  }
}
