-- Add points column to user_membership_plans (unified transaction log)
ALTER TABLE user_membership_plans ADD COLUMN points INTEGER;

-- Migrate existing points log entries into membership plans
INSERT INTO user_membership_plans (id, user_id, plan_type, amount, points, note, start_date, create_at)
SELECT id, user_id, 'stored_value', 0, amount, note, create_at, create_at
FROM user_points_log;

-- Drop the separate points log table
DROP TABLE IF EXISTS user_points_log;
