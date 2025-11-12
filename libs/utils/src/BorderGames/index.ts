import _ from "lodash";
import { sleep } from "..";
import type { BoardGameCol } from "./types";

export * from "./types";

const headers = new Headers();
headers.append("Content-Type", "application/x-www-form-urlencoded");

export async function* fetchOwnedBoardGames() {
  const page = _.range(0, 100);
  const reqChunks = _.chunk(page, 20);

  for (const chunk of reqChunks) {
    const chunkPromises: Promise<{ data: { game_list: BoardGameCol[] } }>[] =
      chunk.map((page) =>
        fetch(
          "https://www.gstonegames.com/app/other_user_get_game/owned_games/",
          {
            method: "POST",
            headers,
            body: JSON.stringify({ user_id: "124991", page }),
          }
        ).then((r) => r.json())
      );

    console.log("已发送请求的ID段: ", chunk[0], " ~ ", chunk[chunk.length - 1]);

    const chunkResults = await Promise.all(chunkPromises);

    for (const result of chunkResults) {
      const games = result?.data?.game_list;

      yield games ?? [];

      if (games.length) continue;

      console.log("所有游戏数据已获取完毕。");

      return;
    }

    await sleep(200);
  }
}
