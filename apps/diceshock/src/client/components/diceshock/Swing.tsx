import { animated, to, useInView, useSpringValue } from "@react-spring/web";
import {
  type ComponentProps,
  type MouseEventHandler,
  useEffect,
  useState,
} from "react";
import { useMsg } from "./Msg";

const Swing: React.FC<{
  children: React.ReactNode;
  intensity?: number;
  className?: { outer?: string; inner?: string };
  styleInner?: ComponentProps<typeof animated.div>["style"];
}> = ({ children, intensity = 10, className, styleInner }) => {
  const [ref, inView] = useInView();

  const [isHover, setIsHover] = useState(false);

  const msg = useMsg();

  const springX = useSpringValue(0);
  const springY = useSpringValue(0);

  useEffect(() => {
    if (!inView) return;

    let lastAcceleration = { x: 0, y: 0, z: 0 };
    let lastTime = Date.now();

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.acceleration ?? event.accelerationIncludingGravity;

      if (!acc) return;

      const currentTime = Date.now();
      const deltaTime = (currentTime - lastTime) / 1000;

      const { x = 0, y = 0, z = 0 } = acc;

      if (!x || !y || !z) return;

      const deltaX = x - lastAcceleration.x;
      const deltaY = y - lastAcceleration.y;

      lastAcceleration = { x, y, z };
      lastTime = currentTime;

      const speedX = deltaX / deltaTime;
      const speedY = deltaY / deltaTime;

      const clampedX = Math.max(-1, Math.min(1, speedX / 10));
      const clampedY = Math.max(-1, Math.min(1, speedY / 10));

      springX.start(clampedX);
      springY.start(-clampedY);
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener("devicemotion", handleMotion);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // biome-ignore lint/suspicious/noExplicitAny: DeviceMotionEvent.requestPermission is experimental API
      const { requestPermission } = DeviceMotionEvent as any;

      if (typeof requestPermission === "function") {
        requestPermission()
          .then((permissionState: string) => {
            if (permissionState !== "granted") return;

            window.addEventListener("devicemotion", handleMotion);
          })
          .catch(console.error);
      }
    } else msg.info("DeviceMotionEvent is not supported");

    return () => {
      window.removeEventListener("devicemotion", handleMotion);
    };
  }, [inView, msg, springX, springY]);

  const onMouseMove: MouseEventHandler<HTMLDivElement> = (evt) => {
    if (!isHover || !inView) return;

    const { clientX, clientY } = evt.nativeEvent;
    const rect = evt.currentTarget.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const offsetX = clientX - centerX;
    const offsetY = clientY - centerY;

    const relativeX = offsetX / (rect.width / 2);
    const relativeY = offsetY / (rect.height / 2);

    const clampedX = Math.max(-1, Math.min(1, relativeX));
    const clampedY = Math.max(-1, Math.min(1, relativeY));

    springX.start(clampedX);
    springY.start(-clampedY);
  };

  const onMouseLeave: MouseEventHandler<HTMLDivElement> = () => {
    setIsHover(false);
    springX.start(0);
    springY.start(0);
  };

  return (
    <div
      ref={ref}
      className={className?.outer}
      style={{ perspective: 800 }}
      onMouseOver={() => setIsHover(true)}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
    >
      <animated.div
        className={className?.inner}
        style={{
          transform: to(
            [springX, springY],
            (x, y) =>
              `rotateY(${x * intensity}deg) rotateX(${y * intensity}deg)`,
          ),
          ...styleInner,
        }}
      >
        {inView && children}
      </animated.div>
    </div>
  );
};

export default Swing;
