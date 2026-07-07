## 2026-03-30 Initial Setup
- DO rename: SeatTimerDO → SocketDO, binding SEAT_TIMER → SOCKET
- Mahjong logic: pure functions in shared/mahjong/ (testable separately from DO)
- D1 persistence: only on match end, not per-round
- GSZ API: NOT connected, local simulation only
- Registration: real users + verified phone only, no temp identity
- Voting: 2/3 for 3p, 3/4 for 4p
- 场制: 東風場 (tonpuu) / 半庄 (hanchan)
- 连庄: dealer wins or draw → dealer stays; non-dealer wins → rotate
