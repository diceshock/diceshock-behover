import type { Context } from "hono";
import type { HonoCtxEnv } from "@/main";

export default async function page(c: Context<HonoCtxEnv>) {
  return c.html(
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script
          src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.8/dist/htmx.min.js"
          integrity="sha384-/TgkGk7p307TH7EXJDuUlgG3Ce1UVolAOFopFekQkkXihi5u/6OCvVKyz1W+idaz"
          crossorigin="anonymous"
        ></script>
        <title>Document</title>
      </head>
      <body></body>
    </html>,
  );
}
