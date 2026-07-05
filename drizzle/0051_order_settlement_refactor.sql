-- Migration: Remove stored amounts from orders, add settled status
-- Orders now only store time points; amounts are always calculated at query time.

-- 1. Add settled_at and note columns
ALTER TABLE `table_occupancy` ADD COLUMN `settled_at` integer;--> statement-breakpoint
ALTER TABLE `table_occupancy` ADD COLUMN `note` text;--> statement-breakpoint

-- 2. Migrate existing settled orders: set settled_at from settlement_snapshot createdAt or end_at
UPDATE `table_occupancy`
SET `settled_at` = COALESCE(
  json_extract(`settlement_snapshot`, '$.createdAt'),
  `end_at`
),
`note` = json_extract(`settlement_snapshot`, '$.note'),
`status` = 'settled'
WHERE `final_price` IS NOT NULL OR `settlement_snapshot` IS NOT NULL;--> statement-breakpoint

-- 3. Add order_id to user_membership_plans for linking deductions to orders
ALTER TABLE `user_membership_plans` ADD COLUMN `order_id` text;--> statement-breakpoint

-- 4. Backfill order_id on deduction records using settlement_snapshot data
-- For each settled order with a stored value deduction, find the matching
-- negative-amount membership record by user_id + approximate timestamp
UPDATE `user_membership_plans`
SET `order_id` = (
  SELECT o.id FROM `table_occupancy` o
  WHERE o.`user_id` = `user_membership_plans`.`user_id`
    AND o.`settlement_snapshot` IS NOT NULL
    AND json_extract(o.`settlement_snapshot`, '$.storedValueDeduction.deducted') = 1
    AND json_extract(o.`settlement_snapshot`, '$.storedValueDeduction.amount') = -`user_membership_plans`.`amount`
    AND ABS(COALESCE(json_extract(o.`settlement_snapshot`, '$.createdAt'), 0) - `user_membership_plans`.`start_date`) < 60000
  LIMIT 1
)
WHERE `plan_type` = 'stored_value' AND `amount` < 0 AND `order_id` IS NULL;--> statement-breakpoint

-- 5. Drop deprecated columns
ALTER TABLE `table_occupancy` DROP COLUMN `final_price`;--> statement-breakpoint
ALTER TABLE `table_occupancy` DROP COLUMN `price_breakdown`;--> statement-breakpoint
ALTER TABLE `table_occupancy` DROP COLUMN `settlement_snapshot`;
