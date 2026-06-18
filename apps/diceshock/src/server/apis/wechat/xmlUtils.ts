import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  processEntities: false,
  htmlEntities: false,
  ignorePiTags: true,
});

export function parseXml(xml: string): Record<string, string> {
  const stripped = xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  const parsed = parser.parse(stripped);
  const root = parsed.xml || parsed;
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(root)) {
    if (typeof value === "string" || typeof value === "number") {
      result[key] = String(value);
    }
  }

  return result;
}

export function buildTextReply(
  toUser: string,
  fromUser: string,
  content: string,
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${timestamp}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${content}]]></Content>
</xml>`;
}

export function buildImageReply(
  toUser: string,
  fromUser: string,
  mediaId: string,
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${timestamp}</CreateTime>
<MsgType><![CDATA[image]]></MsgType>
<Image><MediaId><![CDATA[${mediaId}]]></MediaId></Image>
</xml>`;
}

export function buildEmptyReply(): string {
  return "success";
}
