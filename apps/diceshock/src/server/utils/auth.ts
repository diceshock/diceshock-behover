import { customAlphabet } from "nanoid/non-secure";

export const getSmsTmpCodeKey = (phone: string) => `sms_code:${phone}`;

export const genNickname = () =>
  `The Shock ${customAlphabet("1234567890abcdef", 5)}`;
