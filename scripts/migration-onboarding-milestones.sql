-- Migration: Onboarding & Personalization Backend
-- Adds due_date + catch_up_data to rosie_babies, creates rosie_milestones table
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ═══════════════════════════════════════════════════════════════
-- 1. Add due_date column to rosie_babies
--    Used for adjusted/corrected age calculation for premature babies.
--    AAP recommends using corrected age until 24 months.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE rosie_babies
ADD COLUMN IF NOT EXISTS due_date TEXT DEFAULT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 2. Add catch_up_data JSONB column to rosie_babies
--    Stores Quick Catch-Up quiz responses (feeding method, sleep
--    baseline, milestones checked, parent concerns).
--    Baby-scoped because different babies may have different data.
--
--    Expected shape:
--    {
--      "feedingMethod": "breast" | "bottle" | "both" | "pumping",
--      "solidFoods": true | false,
--      "sleepBaseline": {
--        "napsPerDay": 3,
--        "bedtime": "19:00",
--        "nightWakings": 2,
--        "sleepMethod": "contact" | "crib" | "cosleep" | "bassinet"
--      },
--      "milestonesChecked": ["social_smile", "head_control", ...],
--      "concerns": ["reflux", "sleep regression", ...],
--      "parentConcernText": "She's been really fussy...",
--      "completedTopics": ["feeding", "sleep", "milestones", "concerns"],
--      "completedAt": "2026-02-24T..."
--    }
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE rosie_babies
ADD COLUMN IF NOT EXISTS catch_up_data JSONB DEFAULT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 3. Create rosie_milestones table
--    Tracks which developmental milestones a parent has marked
--    for their baby. Milestone definitions are static content
--    in the app (milestoneData.ts) — only user completions hit
--    the database.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rosie_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  baby_id UUID NOT NULL,
  milestone_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'next',  -- 'done', 'emerging', 'next'
  noted_at TIMESTAMPTZ,                 -- when parent marked it
  note TEXT,                            -- optional parent note
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prevent duplicate milestone entries per baby
CREATE UNIQUE INDEX IF NOT EXISTS idx_milestones_unique_per_baby
ON rosie_milestones(user_id, baby_id, milestone_id);

-- Fast lookups by user + baby
CREATE INDEX IF NOT EXISTS idx_milestones_user_baby
ON rosie_milestones(user_id, baby_id);

-- ═══════════════════════════════════════════════════════════════
-- 4. Enable RLS on rosie_milestones
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE rosie_milestones ENABLE ROW LEVEL SECURITY;

-- Users can only see their own milestones
CREATE POLICY "Users can view own milestones"
ON rosie_milestones
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own milestones
CREATE POLICY "Users can insert own milestones"
ON rosie_milestones
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own milestones
CREATE POLICY "Users can update own milestones"
ON rosie_milestones
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own milestones
CREATE POLICY "Users can delete own milestones"
ON rosie_milestones
FOR DELETE
USING (auth.uid() = user_id);
