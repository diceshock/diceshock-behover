CREATE TABLE trpg_mail (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id),
  kind TEXT NOT NULL CHECK(kind IN ('suggestion','wish')), message TEXT NOT NULL,
  reply TEXT, replied_by TEXT REFERENCES user(id), created_at INTEGER NOT NULL,
  replied_at INTEGER, request_id TEXT NOT NULL, UNIQUE(user_id,request_id)
);
CREATE INDEX trpg_mail_created ON trpg_mail(created_at,id);
CREATE TABLE trpg_rewards (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT '', points INTEGER NOT NULL CHECK(points>0),
  stock INTEGER NOT NULL CHECK(stock>=0), active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1)),
  revision INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL
);
CREATE TABLE trpg_vouchers (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id),
  reward_id TEXT NOT NULL REFERENCES trpg_rewards(id), title TEXT NOT NULL,
  points INTEGER NOT NULL CHECK(points>0), request_id TEXT NOT NULL,
  created_at INTEGER NOT NULL, used_at INTEGER, used_by TEXT REFERENCES user(id),
  used_store_id TEXT REFERENCES stores(id), UNIQUE(user_id,request_id)
);
CREATE INDEX trpg_vouchers_user ON trpg_vouchers(user_id,created_at,id);
-- The voucher, stock decrement, points deduction and existing member ledger entry
-- commit together in the same SQLite statement. No read/modify/write race.
CREATE TRIGGER trpg_voucher_debit BEFORE INSERT ON trpg_vouchers BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM trpg_rewards WHERE id=NEW.reward_id AND active=1 AND stock>0 AND points=NEW.points)
    THEN RAISE(ABORT,'Reward unavailable') END;
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM user_info i JOIN user u ON u.id=i.id WHERE i.id=NEW.user_id AND i.phone IS NOT NULL AND u.disabled=0 AND coalesce(i.points,0)>=NEW.points)
    THEN RAISE(ABORT,'Insufficient points') END;
END;
CREATE TRIGGER trpg_voucher_ledger AFTER INSERT ON trpg_vouchers BEGIN
  UPDATE user_info SET points=points-NEW.points WHERE id=NEW.user_id;
  UPDATE trpg_rewards SET stock=stock-1,revision=revision+1 WHERE id=NEW.reward_id;
  INSERT INTO user_membership_plans(id,user_id,plan_type,amount,points,note,start_date,create_at,update_at)
    VALUES ('reward:'||NEW.id,NEW.user_id,'stored_value',0,-NEW.points,'积分兑换：'||NEW.title,NEW.created_at,NEW.created_at,NEW.created_at);
END;
