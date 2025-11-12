import { useAtomValue } from "jotai";
import type React from "react";
import { useEffect } from "react";
import { msgA } from ".";

const Msg = () => {
  const comp = useAtomValue(msgA);

  useEffect(() => {
    setTimeout(() => {
      console.log(
        "这么想要知道这个网站的秘密, 不如直接看源码, 然后给我一个 star...",
        "https://github.com/diceshock/diceshock-behover",
        "小さな星を摘んだなら, あなたは小さな幸せを手に入れる.",
        "大きな星を摘んだなら, あなたは大きな富を手に入れる.",
        "その両方を摘んだなら, あなたは永遠の願いを手に入れる!",
      );
    }, 1000);
  }, []);

  return (
    <div className="toast toast-bottom toast-end">
      {comp as React.ReactNode}
    </div>
  );
};

export default Msg;
