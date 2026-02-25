import { supabase } from '../../lib/supabaseClient';
import { MilestoneRecord } from './types';

// Database row type
interface MilestoneRow {
  id: string;
  user_id: string;
  baby_id: string;
  milestone_id: string;
  status: string;
  noted_at: string | null;
  note: string | null;
  created_at: string;
}

// Convert database row to MilestoneRecord
const fromRow = (row: MilestoneRow): MilestoneRecord => ({
  id: row.id,
  milestoneId: row.milestone_id,
  status: row.status as MilestoneRecord['status'],
  notedAt: row.noted_at || undefined,
  note: row.note || undefined,
});

// Fetch all milestone records for a baby
export const fetchMilestones = async (
  userId: string,
  babyId: string
): Promise<MilestoneRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('rosie_milestones')
      .select('*')
      .eq('user_id', userId)
      .eq('baby_id', babyId)
      .order('noted_at', { ascending: false });

    if (error) {
      console.error('[supabaseMilestones] Error fetching milestones:', error.message);
      return [];
    }

    return (data || []).map(fromRow);
  } catch (err) {
    // Suppress AbortError for React StrictMode compatibility
    if (err instanceof Error && err.name === 'AbortError') return [];
    console.error('[supabaseMilestones] Exception fetching milestones:', err);
    return [];
  }
};

// Upsert a milestone record (insert or update status)
// Uses the unique index on (user_id, baby_id, milestone_id)
export const upsertMilestone = async (
  milestoneId: string,
  status: MilestoneRecord['status'],
  userId: string,
  babyId: string,
  note?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('rosie_milestones')
      .upsert(
        {
          user_id: userId,
          baby_id: babyId,
          milestone_id: milestoneId,
          status,
          noted_at: status === 'done' || status === 'emerging' ? new Date().toISOString() : null,
          note: note || null,
        },
        {
          onConflict: 'user_id,baby_id,milestone_id',
        }
      );

    if (error) {
      console.error('[supabaseMilestones] Error upserting milestone:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[supabaseMilestones] Exception upserting milestone:', err);
    return { success: false, error: 'Failed to update milestone' };
  }
};

// Batch upsert milestones (for catch-up quiz bulk check)
export const batchUpsertMilestones = async (
  milestoneIds: string[],
  status: MilestoneRecord['status'],
  userId: string,
  babyId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const now = new Date().toISOString();
    const records = milestoneIds.map(milestoneId => ({
      user_id: userId,
      baby_id: babyId,
      milestone_id: milestoneId,
      status,
      noted_at: status === 'done' || status === 'emerging' ? now : null,
    }));

    const { error } = await supabase
      .from('rosie_milestones')
      .upsert(records, {
        onConflict: 'user_id,baby_id,milestone_id',
      });

    if (error) {
      console.error('[supabaseMilestones] Error batch upserting:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[supabaseMilestones] Exception batch upserting:', err);
    return { success: false, error: 'Failed to update milestones' };
  }
};

// Delete a milestone record (reset to untracked)
export const deleteMilestone = async (
  milestoneId: string,
  userId: string,
  babyId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('rosie_milestones')
      .delete()
      .eq('milestone_id', milestoneId)
      .eq('user_id', userId)
      .eq('baby_id', babyId);

    if (error) {
      console.error('[supabaseMilestones] Error deleting milestone:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[supabaseMilestones] Exception deleting milestone:', err);
    return { success: false, error: 'Failed to delete milestone' };
  }
};

// Get count of completed milestones for a baby (useful for progress display)
export const getMilestoneProgress = async (
  userId: string,
  babyId: string
): Promise<{ done: number; emerging: number; total: number }> => {
  try {
    const { data, error } = await supabase
      .from('rosie_milestones')
      .select('status')
      .eq('user_id', userId)
      .eq('baby_id', babyId);

    if (error) {
      console.error('[supabaseMilestones] Error getting progress:', error.message);
      return { done: 0, emerging: 0, total: 0 };
    }

    const records = data || [];
    return {
      done: records.filter(r => r.status === 'done').length,
      emerging: records.filter(r => r.status === 'emerging').length,
      total: records.length,
    };
  } catch (err) {
    console.error('[supabaseMilestones] Exception getting progress:', err);
    return { done: 0, emerging: 0, total: 0 };
  }
};
