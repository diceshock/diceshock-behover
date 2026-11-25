-- Read-only reconciliation for historical stored-value deductions.
-- Run against a D1 backup first. Never apply a balance correction from this report alone.
SELECT
  user_id,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS remaining_credit_rows_cents,
  SUM(COALESCE(amount, 0)) AS signed_balance_cents,
  SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) AS recorded_deductions_cents,
  SUM(CASE WHEN amount < 0 AND order_id IS NOT NULL THEN 1 ELSE 0 END) AS order_deduction_count,
  SUM(CASE WHEN amount < 0 AND order_id IS NULL THEN 1 ELSE 0 END) AS manual_deduction_count
FROM user_membership_plans
WHERE plan_type = 'stored_value'
GROUP BY user_id
HAVING SUM(CASE WHEN amount < 0 THEN 1 ELSE 0 END) > 0
ORDER BY recorded_deductions_cents DESC, user_id;
