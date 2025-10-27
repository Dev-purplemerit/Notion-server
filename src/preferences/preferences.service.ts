import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Preferences, PreferencesDocument } from './preferences.schema';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectModel(Preferences.name) private preferencesModel: Model<PreferencesDocument>
  ) {}

  /**
   * Get or create preferences for a user
   */
  async getOrCreatePreferences(userId: string): Promise<PreferencesDocument> {
    let preferences = await this.preferencesModel.findOne({ userId });

    if (!preferences) {
      // Create default preferences
      preferences = new this.preferencesModel({ userId });
      await preferences.save();
    }

    return preferences;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, updates: Partial<Preferences>): Promise<PreferencesDocument> {
    let preferences = await this.preferencesModel.findOne({ userId });

    if (!preferences) {
      // Create new preferences if they don't exist
      preferences = new this.preferencesModel({ userId, ...updates });
      return preferences.save();
    }

    // Update existing preferences
    Object.assign(preferences, updates);
    return preferences.save();
  }

  /**
   * Delete user preferences (for cleanup)
   */
  async deletePreferences(userId: string): Promise<void> {
    await this.preferencesModel.deleteOne({ userId });
  }
}
