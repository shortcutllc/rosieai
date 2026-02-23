import { supabase } from '../../lib/supabaseClient';
import { UserSettings } from './types';

// Fetch user settings from rosie_profiles.settings column
export const fetchSettings = async (userId: string): Promise<UserSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('rosie_profiles')
      .select('settings')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[supabaseSettings] Error fetching settings:', error.message);
      return null;
    }

    if (!data?.settings) return null;

    return data.settings as UserSettings;
  } catch (err) {
    console.error('[supabaseSettings] Exception fetching settings:', err);
    return null;
  }
};

// Save user settings to rosie_profiles.settings column
export const saveSettings = async (
  userId: string,
  settings: UserSettings
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('rosie_profiles')
      .update({ settings })
      .eq('id', userId);

    if (error) {
      console.error('[supabaseSettings] Error saving settings:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[supabaseSettings] Exception saving settings:', err);
    return { success: false, error: 'Failed to save settings' };
  }
};
