-- Migration: Add settings column to rosie_profiles + Create rosie_growth_measurements table
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Add settings JSONB column to rosie_profiles
ALTER TABLE rosie_profiles
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT NULL;

-- 2. Create rosie_growth_measurements table
CREATE TABLE IF NOT EXISTS rosie_growth_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  baby_id UUID NOT NULL,
  measurement_date TEXT,
  weight NUMERIC,
  length NUMERIC,
  head_circumference NUMERIC,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_growth_measurements_user_baby
ON rosie_growth_measurements(user_id, baby_id);

-- 4. Enable RLS on rosie_growth_measurements
ALTER TABLE rosie_growth_measurements ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for rosie_growth_measurements
-- Users can only see their own measurements
CREATE POLICY "Users can view own growth measurements"
ON rosie_growth_measurements
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own measurements
CREATE POLICY "Users can insert own growth measurements"
ON rosie_growth_measurements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own measurements
CREATE POLICY "Users can update own growth measurements"
ON rosie_growth_measurements
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own measurements
CREATE POLICY "Users can delete own growth measurements"
ON rosie_growth_measurements
FOR DELETE
USING (auth.uid() = user_id);
