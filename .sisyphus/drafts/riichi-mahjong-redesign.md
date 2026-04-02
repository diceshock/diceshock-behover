# Draft: 立直麻将重新设计 (Riichi Mahjong Redesign)

## 当前系统理解

### 当前流程 (公式战)
1. **配置选择** (`config_select`): 选三麻/四麻 + 东风场/半庄
2. **选座** (`seat_select`): 玩家加入并选风位(东南西北), 全部选完自动开始
3. **对局中** (`playing`): 显示当前局风、局数、本场数、庄家、排名和点数
4. **录分** (`scoring`): 每人输入当前点数 → 全部提交后点"确认全部点数"
5. **本局总览** (`round_review`): 显示变化, 选结果(庄和/闲和/流局) → 进入下一局
6. **投票** (`voting`): 20秒倒计时, 3/4(四麻)或2/3(三麻)同意则结束
7. **对局结束** (`ended`): 显示排名 → "新的一场"重置

### 当前关键概念 (要移除/改变的)
- **局 (Round)**: 当前有 wind + roundNumber + honba + dealerIndex
- **庄家 (Dealer)**: dealerIndex 指向当前庄家, 会轮换
- **场风 (Prevailing Wind)**: 东/南, 根据 format 决定几个风
- **RoundResult**: dealer_win / non_dealer_win / draw → 决定庄家是否轮换

### 当前文件清单
- **Engine**: `src/shared/mahjong/engine.ts` (state machine)
- **Types**: `src/shared/mahjong/types.ts`
- **Constants**: `src/shared/mahjong/constants.ts`
- **SocketDO**: `src/server/durableObjects/SocketDO.ts`
- **tRPC**: `src/server/apis/trpc/mahjong.ts`
- **Hook**: `src/client/hooks/useMahjongMatch.ts`
- **Stepper UI**: `src/client/components/diceshock/MahjongMatch/MahjongMatchStepper.tsx`
- **History UI**: `src/client/components/diceshock/MahjongMatch/MahjongMatchHistory.tsx`
- **Dash GSZ list**: `src/apps/routers/dash/gsz.tsx`
- **Dash GSZ detail**: `src/apps/routers/dash/gsz_.$id.tsx`
- **Me page**: `src/apps/routers/_with-home-lo/me.tsx`
- **Homepage sections**: `src/client/components/diceshock/HomePage/MahjongMatch.tsx`, `JPMahjong.tsx`
- **DB Schema**: `libs/db/src/schema.ts` (mahjongMatchesTable, mahjongRegistrationsTable)

---

## 用户要求的改动

### 1. 重命名
- "公式战" → "立直麻将"
- 所有 UI 文本、组件名称中的"公式战"替换为"立直麻将"

### 2. 配置选项重设计
- 每场游戏配置: **店内/公式战** + **三麻/四麻** + **东风场/半庄**
- 公式战模式强制: 半庄 + 四麻 (不可修改)
- 店内模式: 三麻/四麻 + 东风场/半庄 自由选

### 3. 移除概念
- **局 (Round)**: 移除局的概念
- **庄家 (Dealer)**: 移除庄家概念
- 意味着: 不再有 wind rotation, dealer rotation, honba, roundNumber
- 不再有 RoundResult (dealer_win/non_dealer_win/draw)

### 4. 新的游戏流程
1. **配置选择**: 选 店内/公式战 + 三麻/四麻 + 东风场/半庄
2. **选风**: 所有人选择场风 (之前是选座, 现在叫选场风)
3. **倒计时**: 三二一开始
4. **计时中**: 开始计时 (这是核心对局状态)
5. **录分 OR 投票终止**:
   - 录分: 点击录分 → 输入分数 → 确认 → 确认后可取消返回 → 所有人确认后不可返回 → 自动进入下一"局"(但没有局概念了, 可能是自动回到计时中?)
   - 可以查看每个人的录分进度
   - 投票终止: 投票结束本场
6. **计分结束**: 自动下一句 (回到计时中)
7. **终止结束**: 回到修改配置

### 5. Dash 和 Me 页面
- 完全简化内容
- 参考当前流程但去除不需要的信息

---

## 已确认的答案 (Round 1)

1. **"选场风"** → 就是选座位(东南西北), 换个名字, 逻辑不变
2. **计时** → 正计时(从0往上数, 显示已打多久)
3. **录分历史** → **只保留最终分数**, 不保留每次录分历史(移除 roundHistory)
4. **临时身份** → 临时身份可以参加"店内"模式, 不能参加"公式战"模式
5. **"自动下一句"** → 录分完成后自动**下一场**(保持配置, 新开一场), 不是回到计时中

## 关键理解更新

### 新流程 (确认版)
```
配置(店内/公式战 × 三麻/四麻 × 东风/半庄)
→ 选座(东南西北)
→ 321倒计时
→ 计时中(正计时, 显示时长)
→ [录分] 或 [投票终止]
  录分: 每人输分 → 个人确认(可撤回) → 所有人确认(锁定) → 本场结束 → 自动保持配置新开下一场
  投票终止: 通过 → 回到配置页
```

### 数据模型变化
- **移除**: roundHistory, currentRound(wind/roundNumber/honba/dealerIndex), RoundResult, RoundRecord
- **保留**: players(userId, nickname, seat, finalScore), config(type/mode/format), startedAt, endedAt, terminationReason
- **新增**: matchType("store" | "tournament"), 正计时 startedAt 用于计算时长

### 每场只录一次分
- 不再有多局概念
- 一场就是: 开始 → 打牌 → 录分 → 结束
- 录分完成 = 本场结束 = 保存到DB = 自动新开一场(保持配置)

## 已确认的答案 (Round 2)

1. **东风场/半庄** → 纯标签, 用来未来分开排名, 不影响当前游戏逻辑
2. **录分** → 每人录自己的分, 独立输入独立确认
3. **命名** → 功能叫"立直麻将", 里面两个模式: "店内" 和 "公式战"
4. **测试** → 需要写测试, 给 engine.ts 的新状态机写自动化测试

## Technical Decisions

### 新的 MatchPhase (状态机)
```
config_select → seat_select → countdown → playing → scoring → ended
                                            ↓
                                          voting → ended (if passed)
                                                 → playing (if failed)
```
- `config_select`: 选店内/公式战 + 三麻/四麻 + 东风/半庄
- `seat_select`: 选座位(东南西北)
- `countdown`: 321倒计时
- `playing`: 正计时中 (核心状态)
- `scoring`: 录分 (每人输入→确认→可撤回→全部确认锁定)
- `voting`: 投票终止
- `ended`: 结束 → 自动保持配置新开下一场 OR 投票终止回到配置

### 新的 MatchConfig
```ts
interface MatchConfig {
  type: "store" | "tournament";  // 店内 / 公式战
  mode: "3p" | "4p";            // 三麻 / 四麻
  format: "tonpuu" | "hanchan"; // 东风场 / 半庄
}
```

### 新的 MatchState (简化)
```ts
interface MatchState {
  config: MatchConfig | null;
  players: PlayerState[];
  phase: MatchPhase;
  votes: Vote[];
  voteStartedAt: number | null;
  pendingScores: Record<string, number>;  // 录分用
  scoreConfirmed: Record<string, boolean>; // 新增: 确认状态
  terminationReason: TerminationReason | null;
  startedAt: number | null;
  endedAt: number | null;
  step: number;
}
```

### 移除的字段
- currentRound (整个移除)
- roundHistory (整个移除)
- roundCounter (移除)

### 新增的字段
- scoreConfirmed: Record<string, boolean> — 每人的确认状态, 用于"确认后可撤回, 所有人确认锁定"

### DB Schema 变化
- mahjong_matches 表:
  - 新增: match_type ("store" | "tournament")
  - 移除: round_history (不再存储)
  - 保留: mode, format, players(json), config(json), started_at, ended_at, termination_reason

### TerminationReason 变化
- 移除: "bust" (没有飞人了), "format_complete" (没有场制完成了)
- 保留: "vote", "admin_abort", "order_invalid"
- 新增: "score_complete" (录分完成正常结束)

## Scope Boundaries
- INCLUDE: engine重写, types更新, constants更新, SocketDO更新, tRPC更新, stepper UI重写, history UI简化, dash简化, me页面简化, 重命名, DB schema更新, useMahjongMatch hook更新, 自动化测试
- EXCLUDE: Homepage sections (MahjongMatch.tsx / JPMahjong.tsx 暂不改), 注册流程 (mahjongRegistrationsTable 保留不动)
