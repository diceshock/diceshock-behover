const SITE_NAME = "DiceShock 骰子奇兵";
const SITE_DESC = "跑团, 桌游, 日麻 我们都是专业的 · Lift-off to be The Shock";
const SITE_URL = "https://origin.runespark.fun";
const DEFAULT_OG_IMAGE = `${SITE_URL}/edge/media/card/site-og`;

interface OgMeta {
  title: string;
  description: string;
  image: string;
  url: string;
}

export function getOgMeta(pathname: string): OgMeta {
  if (pathname === "/riichi") {
    return {
      title: `日麻 PP 排行榜 - ${SITE_NAME}`,
      description: "立直麻将 PP 排行榜，查看日/周/月排名",
      image: `${SITE_URL}/edge/media/card/riichi-ranking`,
      url: `${SITE_URL}/riichi`,
    };
  }

  const riichiStatsMatch = pathname.match(/^\/my-riichi\/(.+)$/);
  if (riichiStatsMatch) {
    return {
      title: `日麻个人战绩 - ${SITE_NAME}`,
      description: "查看日麻 PP 统计、对局记录、排名和徽章",
      image: `${SITE_URL}/edge/media/card/riichi-stats/${riichiStatsMatch[1]}`,
      url: `${SITE_URL}${pathname}`,
    };
  }

  if (pathname === "/inventory") {
    return {
      title: `桌游库 - ${SITE_NAME}`,
      description: "查看 DiceShock 骰子奇兵的桌游库存",
      image: `${SITE_URL}/edge/media/card/inventory`,
      url: `${SITE_URL}/inventory`,
    };
  }

  const inventoryIdMatch = pathname.match(/^\/inventory\/(.+)$/);
  if (inventoryIdMatch) {
    return {
      title: `桌游详情 - ${SITE_NAME}`,
      description: "查看桌游详细信息、评分、游戏人数等",
      image: `${SITE_URL}/edge/media/card/board-game/${inventoryIdMatch[1]}`,
      url: `${SITE_URL}${pathname}`,
    };
  }

  if (pathname === "/actives") {
    return {
      title: `活动 - ${SITE_NAME}`,
      description: "查看活动，加入桌游社区",
      image: `${SITE_URL}/edge/media/card/actives`,
      url: `${SITE_URL}/actives`,
    };
  }

  const activesIdMatch = pathname.match(/^\/actives\/(.+)$/);
  if (activesIdMatch) {
    return {
      title: `活动详情 - ${SITE_NAME}`,
      description: "查看活动详情，加入桌游社区",
      image: `${SITE_URL}/edge/media/card/active/${activesIdMatch[1]}`,
      url: `${SITE_URL}${pathname}`,
    };
  }

  const eventsIdMatch = pathname.match(/^\/events\/(.+)$/);
  if (eventsIdMatch) {
    return {
      title: `活动详情 - ${SITE_NAME}`,
      description: "查看活动详情和报名信息",
      image: `${SITE_URL}/edge/media/card/event/${eventsIdMatch[1]}`,
      url: `${SITE_URL}${pathname}`,
    };
  }

  return {
    title: SITE_NAME,
    description: SITE_DESC,
    image: DEFAULT_OG_IMAGE,
    url: SITE_URL,
  };
}
