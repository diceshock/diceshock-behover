import logoUrl from "@/client/assets/svg/black-simplify-with-text-logo.svg?url";
import type { TrpgSessionFieldsFragment } from "@/client/graphql/__generated__/trpg";
import { sessionPricing } from "@/shared/trpg/pricing";
import { sessionLabels } from "@/shared/trpg/validation";
import dayjs from "@/shared/utils/dayjs-config";

// Draw from data instead of capturing the viewport: pagination and scrolling
// must not cut sessions out of the exported poster.
export async function exportSchedule(
  start: string,
  store: string,
  sessions: TrpgSessionFieldsFragment[],
) {
  await document.fonts.ready;
  const logo = new Image();
  logo.src = logoUrl;
  await logo.decode();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("浏览器无法生成图片，请更换浏览器重试");
  const width = 1600;
  const font = (size: number, bold = false) => {
    ctx.font = `${bold ? 700 : 400} ${size}px "Microsoft YaHei", sans-serif`;
  };
  const wrap = (value: string, max: number, size: number, bold = false) => {
    font(size, bold);
    const lines: string[] = [];
    for (const paragraph of value.split("\n")) {
      let line = "";
      for (const ch of paragraph) {
        if (line && ctx.measureText(line + ch).width > max) {
          lines.push(line);
          line = "";
        }
        line += ch;
      }
      lines.push(line);
    }
    return lines;
  };
  const textWidth = 1376;
  const week = dayjs.tz(start, "Asia/Shanghai");
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = week.add(index, "day");
    const items = sessions
      .filter(
        (s) =>
          s.startsAt &&
          Date.parse(s.startsAt) < day.add(1, "day").valueOf() &&
          Date.parse(s.startsAt) + s.durationMinutes * 60000 > day.valueOf(),
      )
      .sort(
        (a, b) =>
          Date.parse(a.startsAt!) - Date.parse(b.startsAt!) ||
          a.storeName.localeCompare(b.storeName),
      );
    const cards = items.map((s) => {
      const from = dayjs(s.startsAt).tz("Asia/Shanghai");
      const to = from.add(s.durationMinutes, "minute");
      const price = sessionPricing(s.sessionType);
      const time = `${from.format("MM/DD HH:mm")} — ${to.format("MM/DD HH:mm")}`;
      const lines = [
        {
          values: wrap(
            `${time}  ·  ${sessionLabels[s.status as keyof typeof sessionLabels] || s.status}`,
            textWidth,
            26,
            true,
          ),
          size: 26,
          bold: true,
          color: "#246342",
        },
        {
          values: wrap(s.title, textWidth, 34, true),
          size: 34,
          bold: true,
          color: "#14251c",
        },
        {
          values: wrap(
            `${s.storeName}  ·  ${s.tableName || "场地待安排"}  ·  主持人：${s.hostName}`,
            textWidth,
            26,
          ),
          size: 26,
          bold: false,
          color: "#33493b",
        },
        {
          values: wrap(
            `${s.gameSystem}  ·  ${s.moduleName || "模组待定"}  ·  ${s.confirmedCount}/${s.capacity} 人已确认`,
            textWidth,
            26,
          ),
          size: 26,
          bold: false,
          color: "#33493b",
        },
        {
          values: wrap(
            `${price.label}  ·  ${price.summary}${s.tags.length ? `  ·  ${s.tags.join(" / ")}` : ""}`,
            textWidth,
            26,
          ),
          size: 26,
          bold: false,
          color: "#33493b",
        },
      ];
      return {
        lines,
        height:
          44 +
          lines.reduce(
            (total, l) => total + l.values.length * (l.size + 12),
            0,
          ),
      };
    });
    return {
      day,
      cards,
      height:
        82 +
        (cards.length ? cards.reduce((n, c) => n + c.height + 16, 0) : 60) +
        20,
    };
  });
  const height = 310 + days.reduce((n, day) => n + day.height, 0) + 170;
  if (height > 30000)
    throw new Error("场次过多，单张图片过长，请选择具体门店后导出");
  canvas.width = width;
  canvas.height = height;
  ctx.fillStyle = "#f2f6f0";
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = "top";
  const write = (
    text: string,
    x: number,
    y: number,
    size: number,
    color = "#14251c",
    bold = false,
  ) => {
    font(size, bold);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  };
  ctx.fillStyle = "#7efba9";
  ctx.fillRect(0, 0, width, 270);
  ctx.drawImage(logo, 64, 40, 270, (270 * 213.65) / 535.3);
  write("骰子奇兵 · 每周约团排期", 390, 50, 52, "#14251c", true);
  write(`${start} — ${week.add(6, "day").format("YYYY-MM-DD")}`, 390, 125, 32);
  write(`${store}  ·  北京时间  ·  ${sessions.length} 场`, 64, 205, 28);
  let y = 310;
  for (const { day, cards, height: dayHeight } of days) {
    const sectionTop = y;
    write(
      `${day.format("MM/DD")}  星期${"日一二三四五六"[day.day()]}`,
      64,
      y,
      34,
      "#14251c",
      true,
    );
    y += 64;
    if (!cards.length) write("暂无排期", 88, y, 26, "#718274");
    for (const card of cards) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(64, y, width - 128, card.height, 20);
      ctx.fill();
      let lineY = y + 22;
      for (const line of card.lines) {
        for (const value of line.values) {
          write(value, 96, lineY, line.size, line.color, line.bold);
          lineY += line.size + 12;
        }
      }
      y += card.height + 16;
    }
    y = sectionTop + dayHeight;
  }
  write(
    "桌游门票：工作日 40 元 / 人；周末及法定节假日 60 元 / 人。",
    64,
    y + 12,
    26,
  );
  write(
    "测试团会员免费，其他客人按当日门票收费。跨日场次会在涉及的日期重复展示。",
    64,
    y + 54,
    26,
  );
  write(
    `排期可能调整，请以小程序最新信息为准 · 生成于 ${dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD HH:mm")}`,
    64,
    y + 105,
    22,
    "#718274",
  );
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value
          ? resolve(value)
          : reject(new Error("图片生成失败，请选择具体门店后重试")),
      "image/png",
    ),
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `骰子奇兵-${store}-${start}-周排期.png`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
