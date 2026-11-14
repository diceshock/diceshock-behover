const labels = {
  interested: "已登记意向",
  pending: "待门店审核",
  confirmed: "报名已确认",
  rejected: "报名已退回",
  withdrawn: "报名已取消",
};
function localTime(iso) {
  return iso
    ? new Date(Date.parse(iso) + 28800000)
        .toISOString()
        .slice(0, 16)
        .replace("T", " ")
    : "时间待定";
}
function sessionView(row) {
  return {
    ...row,
    timeText: localTime(row.startsAt),
    deadlineText: localTime(row.deadline),
    feeText: row.feeCents ? `¥${(row.feeCents / 100).toFixed(2)} / 人` : "免费",
    progressText:
      row.confirmedCount >= row.minimum
        ? "已成团"
        : `还差 ${row.minimum - row.confirmedCount} 人成团`,
    bookingText:
      row.status === "cancelled"
        ? "场次已取消"
        : row.status === "completed"
          ? "已结团"
          : labels[row.booking?.status] || "",
    joinText:
      row.booking?.status === "interested" && row.startsAt
        ? "确认正式报名"
        : row.startsAt
          ? "报名参加"
          : "登记意向",
    canJoin:
      row.registrationOpen &&
      (!row.booking ||
        ["withdrawn", "rejected"].includes(row.booking.status) ||
        (row.booking.status === "interested" && !!row.startsAt)),
    canWithdraw:
      row.registrationOpen &&
      ["interested", "pending", "confirmed"].includes(row.booking?.status),
    priorityText:
      row.priorityUntil && Date.parse(row.priorityUntil) > Date.now()
        ? `意向玩家优先确认至 ${localTime(row.priorityUntil)}`
        : "",
  };
}
module.exports = { sessionView, localTime };
