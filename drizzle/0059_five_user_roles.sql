-- 0059: five account identities
-- customer 顾客 / member 会员 / host 主持人 / staff 店长 / admin 管理员
--
-- The role column is plain TEXT in D1 (no CHECK constraint), so this migration
-- only promotes existing accounts whose current data already implies one of the
-- new identities. It never demotes staff/admin accounts.

-- Existing TRPG hosts become 主持人 unless they already hold a dashboard role.
UPDATE user
SET role = 'host'
WHERE role = 'customer'
  AND EXISTS (
    SELECT 1 FROM trpg_access a
    WHERE a.user_id = user.id AND a.host = 1
  );

-- Existing holders of an active time card become 会员.
UPDATE user
SET role = 'member'
WHERE role = 'customer'
  AND EXISTS (
    SELECT 1 FROM user_membership_plans p
    WHERE p.user_id = user.id
      AND p.plan_type <> 'stored_value'
      AND p.start_date <= (strftime('%s', 'now') * 1000)
      AND (p.end_date IS NULL OR p.end_date > (strftime('%s', 'now') * 1000))
  );
