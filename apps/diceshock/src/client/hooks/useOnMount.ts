import { useEffect, useRef } from "react";

/**
 * Hook that runs a callback only once on mount
 * @param callback The callback to run on mount
 */
export function useOnMount(callback: () => void | Promise<void>) {
  const hasRun = useRef(false);
  const callbackRef = useRef(callback);

  // 更新 callback ref，确保使用最新的 callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      callbackRef.current();
    }
  }, []);
}
