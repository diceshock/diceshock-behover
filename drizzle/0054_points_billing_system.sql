-- Add points-related columns to table_occupancy for dual pricing
ALTER TABLE table_occupancy ADD COLUMN final_price INTEGER;
ALTER TABLE table_occupancy ADD COLUMN final_points INTEGER;
ALTER TABLE table_occupancy ADD COLUMN settled_price INTEGER;
ALTER TABLE table_occupancy ADD COLUMN settled_points INTEGER;
