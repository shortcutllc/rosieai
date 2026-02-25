import { RosieData } from './types';

const STORAGE_KEY = 'rosie_data';

export const getStoredData = (): RosieData | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as RosieData;
  } catch (error) {
    console.error('Error reading Rosie data from localStorage:', error);
    return null;
  }
};

export const saveData = (data: RosieData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving Rosie data to localStorage:', error);
  }
};

export const clearData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing Rosie data from localStorage:', error);
  }
};

export const exportData = (): string => {
  const data = getStoredData();
  return JSON.stringify(data, null, 2);
};

export const importData = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString) as RosieData;
    if (!data.baby || !data.timeline) {
      throw new Error('Invalid data structure');
    }
    saveData(data);
    return true;
  } catch (error) {
    console.error('Error importing Rosie data:', error);
    return false;
  }
};

// ─── Session Tracking ─────────────────────────────────────────

const SESSION_KEY = 'rosie_last_chat_open';
const SESSION_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get the timestamp of when the chat was last opened.
 */
export const getLastChatOpenTime = (): number | null => {
  try {
    const val = localStorage.getItem(SESSION_KEY);
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
};

/**
 * Record that the chat was just opened.
 */
export const setLastChatOpenTime = (): void => {
  try {
    localStorage.setItem(SESSION_KEY, Date.now().toString());
  } catch {
    // Silently fail
  }
};

/**
 * Check if this is a "new session" — no previous timestamp or >30 min since last chat open.
 */
export const isNewSession = (): boolean => {
  const last = getLastChatOpenTime();
  if (!last) return true;
  return (Date.now() - last) > SESSION_THRESHOLD_MS;
};
