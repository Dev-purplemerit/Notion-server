import { Controller, Get, Put, UseGuards, Req, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PreferencesService } from './preferences.service';
import { UsersService } from '../users/users.service';

@Controller('user/preferences')
@UseGuards(JwtAuthGuard)
export class PreferencesController {
  constructor(
    private readonly preferencesService: PreferencesService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async getPreferences(@Req() req) {
    const userId = await this.usersService.getUserIdFromEmail(req.user.email);
    if (!userId) {
      throw new Error('User not found');
    }

    const preferences = await this.preferencesService.getOrCreatePreferences(userId);

    return {
      language: preferences.language,
      fontSize: preferences.fontSize,
      theme: preferences.theme,
      captionLanguage: preferences.captionLanguage,
      enableCaptions: preferences.enableCaptions,
      notificationTypes: preferences.notificationTypes,
      notificationChannels: preferences.notificationChannels,
      notificationFrequency: preferences.notificationFrequency,
      enableAutoSummaries: preferences.enableAutoSummaries,
      enableSmartSuggestions: preferences.enableSmartSuggestions,
      enableVoiceDetection: preferences.enableVoiceDetection,
      enableLanguageTranslation: preferences.enableLanguageTranslation,
      enableTaskPrioritization: preferences.enableTaskPrioritization,
    };
  }

  @Put()
  async updatePreferences(@Req() req, @Body() updates: any) {
    const userId = await this.usersService.getUserIdFromEmail(req.user.email);
    if (!userId) {
      throw new Error('User not found');
    }

    const preferences = await this.preferencesService.updatePreferences(userId, updates);

    return {
      message: 'Preferences updated successfully',
      language: preferences.language,
      fontSize: preferences.fontSize,
      theme: preferences.theme,
      captionLanguage: preferences.captionLanguage,
      enableCaptions: preferences.enableCaptions,
      notificationTypes: preferences.notificationTypes,
      notificationChannels: preferences.notificationChannels,
      notificationFrequency: preferences.notificationFrequency,
      enableAutoSummaries: preferences.enableAutoSummaries,
      enableSmartSuggestions: preferences.enableSmartSuggestions,
      enableVoiceDetection: preferences.enableVoiceDetection,
      enableLanguageTranslation: preferences.enableLanguageTranslation,
      enableTaskPrioritization: preferences.enableTaskPrioritization,
    };
  }
}
