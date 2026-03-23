import db, { activesTable, drizzle, eventsTable } from "@lib/db";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";

const BASE_URL = "https://www.diceshock.com";

const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/inventory", changefreq: "weekly", priority: "0.8" },
  { path: "/actives", changefreq: "daily", priority: "0.9" },
  { path: "/diceshock-agents", changefreq: "monthly", priority: "0.7" },
  { path: "/contact-us", changefreq: "monthly", priority: "0.5" },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return new Date().toISOString().split("T")[0];
  return date.toISOString().split("T")[0];
}

export default async function sitemap(c: Context<HonoCtxEnv>) {
  const tdb = db(c.env.DB);

  const [actives, events] = await Promise.all([
    tdb
      .select({
        id: activesTable.id,
        update_at: activesTable.update_at,
      })
      .from(activesTable)
      .orderBy(drizzle.desc(activesTable.create_at)),
    tdb
      .select({
        id: eventsTable.id,
        update_at: eventsTable.update_at,
      })
      .from(eventsTable)
      .where(drizzle.eq(eventsTable.is_published, true))
      .orderBy(drizzle.desc(eventsTable.create_at)),
  ]);

  const urls = [
    ...STATIC_ROUTES.map(
      ({ path, changefreq, priority }) =>
        `  <url>
    <loc>${escapeXml(`${BASE_URL}${path}`)}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
    ),
    ...actives.map(
      (a) =>
        `  <url>
    <loc>${escapeXml(`${BASE_URL}/actives/${a.id}`)}</loc>
    <lastmod>${formatDate(a.update_at)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`,
    ),
    ...events.map(
      (e) =>
        `  <url>
    <loc>${escapeXml(`${BASE_URL}/events/${e.id}`)}</loc>
    <lastmod>${formatDate(e.update_at)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`,
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return c.text(xml, 200, {
    "Content-Type": "application/xml; charset=utf-8",
  });
}
