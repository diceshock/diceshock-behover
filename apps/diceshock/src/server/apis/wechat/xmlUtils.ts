/**
 * WeChat XML message parsing/building using fast-xml-parser.
 * WeChat wraps values in CDATA — the parser strips it automatically.
 */

import { XMLBuilder, XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  cdataPropName: "__cdata",
  textNodeName: "__text",
});

export function parseXml(xml: string): Record<string, string> {
  const parsed = parser.parse(xml);
  const root = parsed.xml || parsed;
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(root)) {
    if (key === "__text") continue;
    if (typeof value === "string" || typeof value === "number") {
      result[key] = String(value);
    } else if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      if ("__cdata" in obj) {
        result[key] = String(obj.__cdata);
      } else if ("__text" in obj) {
        result[key] = String(obj.__text);
      }
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
