export function parseXml(xml: string): Record<string, string> {
  const result: Record<string, string> = {};
  const tags = xml.matchAll(
    /<(\w+)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/g,
  );
  for (const match of tags) {
    const key = match[1];
    if (key === "xml") continue;
    result[key] = match[2];
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
