const { sessionView, localTime } = require("./session");
function recruitmentBoard(rows) {
  const groups = new Map();
  for (const row of rows) {
    const s = sessionView(row),
      date = row.startsAt ? localTime(row.startsAt).slice(0, 10) : "pending";
    if (!groups.has(date)) {
      const d = date === "pending" ? null : new Date(`${date}T00:00:00+08:00`);
      groups.set(date, {
        id: date,
        label: d
          ? `${Number(date.slice(5, 7))} 月 ${Number(date.slice(8, 10))} 日 · 周${"日一二三四五六"[new Date(d.getTime() + 28800000).getUTCDay()]}`
          : "时间待定",
        cards: [],
      });
    }
    const end = row.startsAt
      ? localTime(
          new Date(
            Date.parse(row.startsAt) + row.durationMinutes * 60000,
          ).toISOString(),
        )
      : "";
    groups.get(date).cards.push({
      ...s,
      branchLabel: row.storeName,
      typeLabel: s.typeText,
      feeLabel: s.feeText,
      timeLabel: row.startsAt
        ? `${s.timeText.slice(11)}–${end.slice(0, 10) !== date ? "次日 " : ""}${end.slice(11)}`
        : row.timeHint,
      seatLabel: row.startsAt ? `余 ${row.remaining} 位` : "开放意向登记",
      countLabel: row.startsAt ? s.progressText : "时间确定后优先确认",
    });
  }
  return [...groups.values()].sort((a, b) =>
    a.id === "pending" ? 1 : b.id === "pending" ? -1 : a.id.localeCompare(b.id),
  );
}
module.exports = { recruitmentBoard };
