import { DOMParser } from "@xmldom/xmldom";

const domParser = new DOMParser();

export function parseXml(xml: string): Record<string, string> {
  const doc = domParser.parseFromString(xml, "text/xml");
  const root = doc.documentElement;
  const result: Record<string, string> = {};

  for (let i = 0; i < root.childNodes.length; i++) {
    const node = root.childNodes[i];
    if (node.nodeType === 1) {
      const key = node.nodeName;
      const value = node.textContent ?? "";
      result[key] = value;
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
