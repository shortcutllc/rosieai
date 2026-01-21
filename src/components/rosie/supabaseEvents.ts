import { supabase } from '../../lib/supabaseClient';
import { TimelineEvent } from './types';

// Helper to check if error is an AbortError (expected in React StrictMode)
const isAbortError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.includes('AbortError');
  }
  if (typeof error === 'object' && error !== null) {
    const err = error as { message?: string };
    return err.message?.includes('AbortError') || false;
  }
  return false;
};

// Database row type
interface EventRow {
  id: string;
  user_id: string;
  baby_id: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
  created_at: string;
}

// Convert TimelineEvent to database row format
const toEventRow = (event: TimelineEvent, userId: string, babyId: string): Omit<EventRow, 'created_at'> => {
  const { id, timestamp, type, ...data } = event;
  return {
    id,
    user_id: userId,
    baby_id: babyId,
    type,
    timestamp,
    data
  };
};

// Convert database row to TimelineEvent
const fromEventRow = (row: EventRow): TimelineEvent => {
  return {
    id: row.id,
    timestamp: row.timestamp,
    type: row.type as TimelineEvent['type'],
    ...row.data
  } as TimelineEvent;
};

// Fetch all events for a baby
export const fetchEvents = async (userId: string, babyId: string): Promise<TimelineEvent[]> => {
  try {
    const { data, error } = await supabase
      .from('rosie_events')
      .select('*')
      .eq('user_id', userId)
      .eq('baby_id', babyId)
      .order('timestamp', { ascending: false });

    if (error) {
      if (!isAbortError(error)) {
        console.error('Error fetching events:', error);
      }
      return [];
    }

    return (data || []).map(fromEventRow);
  } catch (err) {
    if (!isAbortError(err)) {
      console.error('Error in fetchEvents:', err);
    }
    return [];
  }
};

// Add a new event
export const addEvent = async (
  event: TimelineEvent,
  userId: string,
  babyId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const row = toEventRow(event, userId, babyId);

    const { error } = await supabase
      .from('rosie_events')
      .insert(row);

    if (error) {
      console.error('Error adding event:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in addEvent:', err);
    return { success: false, error: 'Failed to add event' };
  }
};

// Update an event
export const updateEvent = async (
  event: TimelineEvent,
  userId: string,
  babyId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const row = toEventRow(event, userId, babyId);

    const { error } = await supabase
      .from('rosie_events')
      .update(row)
      .eq('id', event.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating event:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in updateEvent:', err);
    return { success: false, error: 'Failed to update event' };
  }
};

// Delete an event
export const deleteEvent = async (
  eventId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('rosie_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting event:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in deleteEvent:', err);
    return { success: false, error: 'Failed to delete event' };
  }
};
