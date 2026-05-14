-- ============================================
-- RSVP Quiz App — Group Assignment Migration
-- Run in Supabase SQL Editor
-- ============================================

-- 1. Add group columns to responses table
ALTER TABLE responses ADD COLUMN IF NOT EXISTS group_number integer;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS group_name text;

-- 2. Index for dashboard queries by group
CREATE INDEX IF NOT EXISTS idx_responses_group_number ON responses(group_number);

-- 3. Backfill any existing rows based on industry
-- (Only needed if there are existing responses)
UPDATE responses SET
  group_number = CASE industry
    WHEN 'Event Planner / Coordinator' THEN 1
    WHEN 'Photographer' THEN 2
    WHEN 'Videographer' THEN 2
    WHEN 'Floral / Design / Creative' THEN 3
    WHEN 'Rental / Production Company' THEN 4
    WHEN 'Hospitality / Hotel' THEN 5
    WHEN 'DJ / Entertainment' THEN 6
    ELSE 7
  END,
  group_name = CASE industry
    WHEN 'Event Planner / Coordinator' THEN 'Event Planners'
    WHEN 'Photographer' THEN 'Visual Creatives'
    WHEN 'Videographer' THEN 'Visual Creatives'
    WHEN 'Floral / Design / Creative' THEN 'Design & Creative'
    WHEN 'Rental / Production Company' THEN 'Production & Rentals'
    WHEN 'Hospitality / Hotel' THEN 'Hospitality'
    WHEN 'DJ / Entertainment' THEN 'Entertainment'
    ELSE 'Not Listed'
  END
WHERE group_number IS NULL;


-- ============================================
-- CLEANUP: Delete all stress test data
-- Run this AFTER the stress test to remove synthetic rows
-- ============================================
-- DELETE FROM responses WHERE email LIKE '%@stresstest.invalid';
