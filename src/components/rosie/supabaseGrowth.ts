import { supabase } from '../../lib/supabaseClient';
import { GrowthMeasurement } from './types';

// Database row type
interface GrowthMeasurementRow {
  id: string;
  user_id: string;
  baby_id: string;
  measurement_date: string | null;
  weight: number | null;
  length: number | null;
  head_circumference: number | null;
  note: string | null;
  created_at: string;
}

// Convert database row to GrowthMeasurement
const fromRow = (row: GrowthMeasurementRow): GrowthMeasurement => ({
  id: row.id,
  timestamp: row.created_at,
  measurementDate: row.measurement_date || undefined,
  weight: row.weight || undefined,
  length: row.length || undefined,
  headCircumference: row.head_circumference || undefined,
  note: row.note || undefined,
});

// Fetch all growth measurements for a baby
export const fetchGrowthMeasurements = async (
  userId: string,
  babyId: string
): Promise<GrowthMeasurement[]> => {
  try {
    const { data, error } = await supabase
      .from('rosie_growth_measurements')
      .select('*')
      .eq('user_id', userId)
      .eq('baby_id', babyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[supabaseGrowth] Error fetching measurements:', error.message);
      return [];
    }

    return (data || []).map(fromRow);
  } catch (err) {
    console.error('[supabaseGrowth] Exception fetching measurements:', err);
    return [];
  }
};

// Add a new growth measurement
export const addGrowthMeasurement = async (
  measurement: GrowthMeasurement,
  userId: string,
  babyId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('rosie_growth_measurements')
      .insert({
        id: measurement.id,
        user_id: userId,
        baby_id: babyId,
        measurement_date: measurement.measurementDate || null,
        weight: measurement.weight || null,
        length: measurement.length || null,
        head_circumference: measurement.headCircumference || null,
        note: measurement.note || null,
      });

    if (error) {
      console.error('[supabaseGrowth] Error adding measurement:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[supabaseGrowth] Exception adding measurement:', err);
    return { success: false, error: 'Failed to add measurement' };
  }
};

// Delete a growth measurement
export const deleteGrowthMeasurement = async (
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('rosie_growth_measurements')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('[supabaseGrowth] Error deleting measurement:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[supabaseGrowth] Exception deleting measurement:', err);
    return { success: false, error: 'Failed to delete measurement' };
  }
};
