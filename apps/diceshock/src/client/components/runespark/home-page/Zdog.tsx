import clsx from "clsx";
import { useEffect, useRef } from "react";
import Zdog from "zdog";

export default function ZdogComponent({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const illoRef = useRef<Zdog.Illustration | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Setup
    const illoElem = canvasRef.current;
    const illoSize = 24;

    // 获取父容器的尺寸而不是窗口尺寸
    const parentElement = illoElem.parentElement;
    if (!parentElement) return;

    const parentRect = parentElement.getBoundingClientRect();
    const minParentSize = Math.min(parentRect.width, parentRect.height);
    const zoom = Math.floor(minParentSize / illoSize);

    // 设置canvas尺寸为父容器的100%
    illoElem.width = parentRect.width;
    illoElem.height = parentRect.height;

    // 设置CSS尺寸为100%
    illoElem.style.width = "100%";
    illoElem.style.height = "100%";

    // Configure Zdog defaults
    [Zdog.Shape, Zdog.Rect].forEach((ItemClass: any) => {
      ItemClass.defaults.fill = true;
      ItemClass.defaults.backface = false;
      ItemClass.defaults.stroke = 1 / zoom;
    });

    const white = "white";
    const black = "#333";
    let isSpinning = true;
    const TAU = Zdog.TAU;
    const initRotate = { y: TAU / 4 };

    // Create illustration
    const illo = new Zdog.Illustration({
      element: illoElem,
      zoom: zoom,
      rotate: initRotate,
      dragRotate: true,
      resize: true,
      onDragStart: () => {
        isSpinning = false;
      },
    });

    illoRef.current = illo;

    // Wall creation function
    function makeWall(options: {
      rotate: any;
      outside: string;
      inside: string;
      left: string;
      right: string;
    }) {
      const rotor = new Zdog.Anchor({
        addTo: illo,
        rotate: options.rotate,
      });

      // rotor
      const wall = new Zdog.Anchor({
        addTo: rotor,
        translate: { z: 4 },
      });

      const topBlock = new Zdog.Anchor({
        addTo: wall,
        translate: { x: -4, y: -4 },
      });

      // side faces
      const face = new Zdog.Rect({
        addTo: topBlock,
        width: 2,
        height: 2,
        translate: { z: 1 },
        color: options.outside,
      });

      face.copy({
        translate: { x: -1 },
        rotate: { y: TAU / 4 },
        color: options.left,
      });

      face.copy({
        translate: { x: 1 },
        rotate: { y: -TAU / 4 },
        color: options.right,
      });

      face.copy({
        translate: { z: -1 },
        rotate: { y: TAU / 2 },
        color: options.inside,
      });

      // top
      face.copy({
        translate: { y: -1 },
        rotate: { x: TAU / 4 },
        color: black,
      });

      topBlock.copyGraph({
        translate: { x: 0, y: -4 },
      });

      const topTile = new Zdog.Rect({
        addTo: wall,
        width: 2,
        height: 2,
        color: black,
        rotate: { x: TAU / 4 },
        translate: { x: -2, y: -3 },
      });

      topTile.copy({
        translate: { x: 2, y: -3 },
      });

      // outside arch
      const arch = new Zdog.Shape({
        addTo: wall,
        path: [
          { x: 0, y: -3 },
          { x: 3, y: -3 },
          { x: 3, y: 2 },
          {
            arc: [
              { x: 3, y: -1 },
              { x: 0, y: -1 },
            ],
          },
        ],
        translate: { z: 1 },
        color: options.outside,
      });

      arch.copy({
        scale: { x: -1 },
      });

      // inside arch
      arch.copy({
        translate: { z: -1 },
        rotate: { y: TAU / 2 },
        color: options.inside,
      });

      arch.copy({
        translate: { z: -1 },
        rotate: { y: TAU / 2 },
        scale: { x: -1 },
        color: options.inside,
      });

      // outside columns
      const outsideColumn = new Zdog.Rect({
        addTo: wall,
        width: 2,
        height: 8,
        translate: { x: -4, y: 1, z: 1 },
        color: options.outside,
      });

      outsideColumn.copy({
        translate: { x: 4, y: 1, z: 1 },
      });

      const insideColumn = new Zdog.Rect({
        addTo: wall,
        width: 2,
        height: 3,
        translate: { x: -3, y: 3.5 },
        rotate: { y: -TAU / 4 },
        color: options.right,
      });

      insideColumn.copy({
        translate: { x: 3, y: 3.5 },
        rotate: { y: TAU / 4 },
        color: options.left,
      });

      // under arch, quarter arc
      const underArch = new Zdog.Shape({
        addTo: wall,
        path: [
          { x: 3, y: 2 },
          {
            arc: [
              { x: 3, y: -1 },
              { x: 0, y: -1 },
            ],
          },
          { x: 0, y: -1, z: -2 },
          {
            arc: [
              { x: 3, y: -1, z: -2 },
              { x: 3, y: 2, z: -2 },
            ],
          },
        ],
        translate: { z: 1 },
        backface: true,
        color: options.left,
      });

      underArch.copyGraph({
        scale: { x: -1 },
        color: options.right,
      });

      // feet soles
      new Zdog.Rect({
        addTo: wall,
        width: 2,
        height: 2,
        translate: { x: -4, y: 5, z: 0 },
        rotate: { x: -TAU / 4 },
        color: white,
      });
    }

    // Create walls
    makeWall({
      rotate: {},
      outside: white,
      inside: black,
      left: white,
      right: black,
    });

    makeWall({
      rotate: { y: -TAU / 4 },
      outside: black,
      inside: white,
      left: white,
      right: black,
    });

    makeWall({
      rotate: { y: -TAU / 2 },
      outside: black,
      inside: white,
      left: black,
      right: white,
    });

    makeWall({
      rotate: { y: (TAU * -3) / 4 },
      outside: white,
      inside: black,
      left: black,
      right: white,
    });

    // Animation
    let ticker = 0;
    const cycleCount = 105;

    const keyframes = [
      { x: TAU * 0, y: (TAU * 1) / 4 },
      { x: (TAU * -35) / 360, y: (TAU * 5) / 8 },
      { x: (TAU * -1) / 4, y: (TAU * 3) / 4 },
      { x: (TAU * -35) / 360, y: (TAU * 9) / 8 },
      { x: TAU * 0, y: (TAU * 5) / 4 },
    ];

    function animate() {
      // update
      if (isSpinning) {
        const progress = ticker / cycleCount;
        const tween = Zdog.easeInOut(progress % 1, 4);
        const turnLimit = keyframes.length - 1;
        const turn = Math.floor(progress % turnLimit);
        const keyA = keyframes[turn];
        const keyB = keyframes[turn + 1];
        illo.rotate.x = Zdog.lerp(keyA.x, keyB.x, tween);
        illo.rotate.y = Zdog.lerp(keyA.y, keyB.y, tween);
        ticker++;
      }

      illo.updateRenderGraph();
      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className={clsx("size-full", className)}>
      <canvas
        ref={canvasRef}
        className="size-full"
        style={{
          cursor: "move",
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      />
    </div>
  );
}
