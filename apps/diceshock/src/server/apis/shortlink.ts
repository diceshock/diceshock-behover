import type { Context } from "hono";
import {
  type LocaleCode,
  resolveLocaleFromAcceptLanguage,
} from "@/shared/store-locale";
import type { HonoCtxEnv } from "@/shared/types";

const KV_PREFIX = "shortlink:";

interface ShortlinkData {
  url: string;
  expiresAt?: number;
  createdAt: number;
}

const EXPIRED_MESSAGES: Record<
  LocaleCode,
  { title: string; desc: string; home: string }
> = {
  zh_Hans: {
    title: "短链接已失效",
    desc: "该短链接已过期或不再可用，请联系分享者获取新的链接。",
    home: "返回主页",
  },
  zh_Hant: {
    title: "短連結已失效",
    desc: "該短連結已過期或不再可用，請聯繫分享者取得新的連結。",
    home: "返回主頁",
  },
  en: {
    title: "Short Link Expired",
    desc: "This short link has expired or is no longer available. Please contact the sender for a new link.",
    home: "Back to Home",
  },
  ja: {
    title: "短縮リンクが無効です",
    desc: "この短縮リンクは有効期限切れか、利用できなくなりました。新しいリンクを共有者にお問い合わせください。",
    home: "ホームに戻る",
  },
  ru: {
    title: "Короткая ссылка недействительна",
    desc: "Эта короткая ссылка истекла или больше недоступна. Свяжитесь с отправителем для получения новой ссылки.",
    home: "На главную",
  },
  es: {
    title: "Enlace corto caducado",
    desc: "Este enlace corto ha caducado o ya no está disponible. Contacta al remitente para obtener uno nuevo.",
    home: "Volver al inicio",
  },
  pt: {
    title: "Link curto expirado",
    desc: "Este link curto expirou ou não está mais disponível. Entre em contato com o remetente para obter um novo link.",
    home: "Voltar ao início",
  },
  fr: {
    title: "Lien court expiré",
    desc: "Ce lien court a expiré ou n'est plus disponible. Veuillez contacter l'expéditeur pour obtenir un nouveau lien.",
    home: "Retour à l'accueil",
  },
  de: {
    title: "Kurzlink abgelaufen",
    desc: "Dieser Kurzlink ist abgelaufen oder nicht mehr verfügbar. Bitte kontaktieren Sie den Absender für einen neuen Link.",
    home: "Zur Startseite",
  },
};

function renderExpiredPage(locale: LocaleCode): string {
  const msg = EXPIRED_MESSAGES[locale] ?? EXPIRED_MESSAGES.zh_Hans;
  return `<!DOCTYPE html>
<html lang="${locale.replace("_", "-")}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${msg.title} - DiceShock</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8f9fa;color:#1a1a2e}
.container{max-width:420px;padding:2.5rem;text-align:center}
.icon{font-size:4rem;margin-bottom:1.5rem}
h1{font-size:1.5rem;font-weight:700;margin-bottom:.75rem}
p{color:#555;line-height:1.6;margin-bottom:1.5rem}
a{display:inline-block;padding:.625rem 1.5rem;background:#6c5ce7;color:#fff;border-radius:.5rem;text-decoration:none;font-weight:500;transition:background .2s}
a:hover{background:#5a4bd1}
</style>
</head>
<body>
<div class="container">
<div class="icon">⏰</div>
<h1>${msg.title}</h1>
<p>${msg.desc}</p>
<a href="/">${msg.home}</a>
</div>
</body>
</html>`;
}

function renderNotFoundPage(locale: LocaleCode): string {
  const notFoundMsg: Record<
    string,
    { title: string; desc: string; home: string }
  > = {
    zh_Hans: {
      title: "短链接不存在",
      desc: "该短链接不存在或已被删除。",
      home: "返回主页",
    },
    en: {
      title: "Short Link Not Found",
      desc: "This short link does not exist or has been removed.",
      home: "Back to Home",
    },
  };
  const msg = notFoundMsg[locale] ?? notFoundMsg.zh_Hans;
  return `<!DOCTYPE html>
<html lang="${locale.replace("_", "-")}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${msg.title} - DiceShock</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8f9fa;color:#1a1a2e}
.container{max-width:420px;padding:2.5rem;text-align:center}
.icon{font-size:4rem;margin-bottom:1.5rem}
h1{font-size:1.5rem;font-weight:700;margin-bottom:.75rem}
p{color:#555;line-height:1.6;margin-bottom:1.5rem}
a{display:inline-block;padding:.625rem 1.5rem;background:#6c5ce7;color:#fff;border-radius:.5rem;text-decoration:none;font-weight:500;transition:background .2s}
a:hover{background:#5a4bd1}
</style>
</head>
<body>
<div class="container">
<div class="icon">🔗</div>
<h1>${msg.title}</h1>
<p>${msg.desc}</p>
<a href="/">${msg.home}</a>
</div>
</body>
</html>`;
}

export async function shortlinkRedirect(c: Context<HonoCtxEnv>) {
  const id = c.req.param("id");
  if (!id) {
    return c.text("Not Found", 404);
  }

  const acceptLang = c.req.header("Accept-Language") ?? "";
  const locale = resolveLocaleFromAcceptLanguage(acceptLang);

  const raw = await c.env.KV.get(`${KV_PREFIX}${id}`);
  if (!raw) {
    return c.html(renderNotFoundPage(locale), 404);
  }

  let data: ShortlinkData;
  try {
    data = JSON.parse(raw);
  } catch {
    return c.html(renderNotFoundPage(locale), 404);
  }

  if (data.expiresAt && Date.now() > data.expiresAt) {
    c.executionCtx.waitUntil(c.env.KV.delete(`${KV_PREFIX}${id}`));
    return c.html(renderExpiredPage(locale), 410);
  }

  return c.redirect(data.url, 302);
}

export { KV_PREFIX, type ShortlinkData };
