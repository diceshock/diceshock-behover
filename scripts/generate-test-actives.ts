import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { createId } from "@paralleldrive/cuid2";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dayjs.extend(isoWeek);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 活动名称模板
const activityNames = [
  "桌游聚会",
  "狼人杀之夜",
  "剧本杀体验",
  "卡牌游戏大赛",
  "策略游戏对战",
  "合作游戏挑战",
  "桌游新手教学",
  "经典桌游回顾",
  "新游戏试玩",
  "桌游马拉松",
  "推理游戏专场",
  "家庭游戏日",
  "竞技桌游赛",
  "休闲游戏聚会",
  "主题桌游活动",
];

// 活动描述模板
const descriptions = [
  "欢迎所有桌游爱好者参加！",
  "一起享受桌游的乐趣吧！",
  "适合新手和老玩家！",
  "提供免费教学和指导！",
  "精彩刺激的游戏体验！",
  "放松心情，享受游戏时光！",
  "结交新朋友的好机会！",
  "挑战你的策略思维！",
];

// 生成随机活动数据
function generateRandomActivity(date: Date) {
  const nameIndex = Math.floor(Math.random() * activityNames.length);
  const descIndex = Math.floor(Math.random() * descriptions.length);
  const name = activityNames[nameIndex];
  const description = descriptions[descIndex];
  
  // 随机添加序号，避免完全重复
  const randomNum = Math.floor(Math.random() * 100);
  const finalName = randomNum < 30 ? `${name} ${randomNum}` : name;

  return {
    name: finalName,
    description,
    content: `## ${finalName}\n\n${description}\n\n期待您的参与！`,
    tags: [] as string[],
    event_date: dayjs(date).format("YYYY-MM-DDTHH:mm"),
  };
}

// 执行 SQL 命令
function executeSQL(sql: string) {
  const projectRoot = join(__dirname, "..");
  const appsDiceshockPath = join(projectRoot, "apps/diceshock");
  
  try {
    execSync(`cd "${appsDiceshockPath}" && pnpm wrangler d1 execute DB --local --command "${sql.replace(/"/g, '\\"')}"`, {
      stdio: "pipe",
      encoding: "utf-8",
    });
    return true;
  } catch (error: any) {
    console.error(`SQL 执行失败: ${error.message}`);
    return false;
  }
}

// 生成测试活动
async function generateTestActives() {
  console.log(`使用本地 D1 数据库（通过 wrangler）...`);

  const now = dayjs();
  const activities: Array<{ date: Date; activity: ReturnType<typeof generateRandomActivity> }> = [];

  // 生成本周的活动（周一到周日）
  const thisWeekStart = now.startOf("isoWeek");
  for (let day = 0; day < 7; day++) {
    const date = thisWeekStart.add(day, "day");
    // 每天生成 1-3 个活动，时间分布在 10:00, 14:00, 19:00
    const times = [10, 14, 19];
    const count = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < count; i++) {
      const hour = times[Math.floor(Math.random() * times.length)];
      const minute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
      const eventDate = date.hour(hour).minute(minute).second(0).toDate();
      activities.push({ date: eventDate, activity: generateRandomActivity(eventDate) });
    }
  }

  // 生成下周的活动
  const nextWeekStart = thisWeekStart.add(1, "week");
  for (let day = 0; day < 5; day++) {
    const date = nextWeekStart.add(day, "day");
    const times = [10, 14, 19];
    const count = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < count; i++) {
      const hour = times[Math.floor(Math.random() * times.length)];
      const minute = Math.floor(Math.random() * 4) * 15;
      const eventDate = date.hour(hour).minute(minute).second(0).toDate();
      activities.push({ date: eventDate, activity: generateRandomActivity(eventDate) });
    }
  }

  // 生成下下周的一些活动
  const weekAfterNextStart = thisWeekStart.add(2, "week");
  for (let day = 0; day < 3; day++) {
    const date = weekAfterNextStart.add(day, "day");
    const hour = [10, 14, 19][Math.floor(Math.random() * 3)];
    const minute = Math.floor(Math.random() * 4) * 15;
    const eventDate = date.hour(hour).minute(minute).second(0).toDate();
    activities.push({ date: eventDate, activity: generateRandomActivity(eventDate) });
  }

  console.log(`准备创建 ${activities.length} 个活动...`);

  let successCount = 0;
  let failCount = 0;

  // 批量创建活动
  for (const { date, activity } of activities) {
    try {
      const id = createId();
      const eventDate = new Date(activity.event_date);
      const publishAt = new Date();

      // 转义 SQL 字符串中的单引号
      const escapeSQL = (str: string | null) => {
        if (str === null) return "NULL";
        return `'${str.replace(/'/g, "''")}'`;
      };

      const sql = `INSERT INTO actives_table (
        id, name, description, content, cover_image, 
        event_date, is_published, is_deleted, 
        enable_registration, allow_watching, publish_at
      ) VALUES (
        '${id}',
        ${escapeSQL(activity.name)},
        ${escapeSQL(activity.description)},
        ${escapeSQL(activity.content)},
        NULL,
        ${eventDate.getTime()},
        1,
        0,
        0,
        0,
        ${publishAt.getTime()}
      )`;

      if (executeSQL(sql)) {
        successCount++;
        console.log(`✓ 创建活动: ${activity.name} - ${dayjs(date).format("YYYY-MM-DD HH:mm")}`);
      } else {
        failCount++;
      }
    } catch (error) {
      failCount++;
      console.error(`✗ 创建失败: ${error}`);
    }
  }

  console.log(`\n完成！成功: ${successCount}, 失败: ${failCount}`);
}

// 运行脚本
generateTestActives().catch(console.error);
