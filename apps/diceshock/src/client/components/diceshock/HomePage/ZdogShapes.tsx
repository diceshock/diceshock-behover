import type React from "react";
import { useEffect, useRef } from "react";
import Zdog from "zdog";

type Vector2D = {
  x: number;
  y: number;
};

type DragStartRef = {
  x: number;
  y: number;
};

const ZdogIllustration: React.FC<{ className?: string }> = ({ className }) => {
  const illoRef = useRef<HTMLCanvasElement | null>(null);
  const solidsRef = useRef<Zdog.Anchor[]>([]);
  const viewRotationRef = useRef<Zdog.Vector>(new Zdog.Vector());
  const displaySizeRef = useRef<number>(0);
  const isSpinningRef = useRef<boolean>(true);
  const tickerRef = useRef<number>(0);
  const dragStartRef = useRef<DragStartRef>({ x: 0, y: 0 });

  const sceneSize = 96;
  const TAU = Zdog.TAU;
  const ROOT3 = Math.sqrt(3);
  const ROOT5 = Math.sqrt(5);
  const PHI = (1 + ROOT5) / 2;

  const colors = {
    eggplant: "#9f7ff6",
    garnet: "#859fe1",
    orange: "#69becc",
    gold: "#4bdfb9",
    yellow: "#28ffa5",
  };

  useEffect(() => {
    const illo = new Zdog.Illustration({
      element: illoRef.current as HTMLCanvasElement,
      scale: 8,
      resize: true,
      onResize: function (width: number, height: number) {
        displaySizeRef.current = Math.min(width, height);
        this.zoom = Math.floor(displaySizeRef.current / sceneSize);
      },
    });

    solidsRef.current = [];

    createHourglass(illo);
    createSphere(illo);
    createCylinder(illo);
    createCone(illo);
    createTetrahedron(illo);
    createOctahedron(illo);
    createCube(illo);
    createDodecahedron(illo);
    createIsocahedron(illo);

    animate(illo);

    new Zdog.Dragger({
      startElement: illoRef.current as HTMLCanvasElement,
      onDragStart: () => {
        isSpinningRef.current = false;
        dragStartRef.current = {
          x: viewRotationRef.current.x,
          y: viewRotationRef.current.y,
        };
      },
      onDragMove: (pointer, moveX, moveY) => {
        viewRotationRef.current.x =
          dragStartRef.current.x - (moveY / displaySizeRef.current) * TAU;
        viewRotationRef.current.y =
          dragStartRef.current.y - (moveX / displaySizeRef.current) * TAU;
      },
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Functions to create solids
  const createHourglass = (illo: Zdog.Illustration) => {
    const hourglass = new Zdog.Anchor({
      addTo: illo,
      translate: { x: 0, y: -4 },
    });

    solidsRef.current.push(hourglass);

    new Zdog.Hemisphere({
      diameter: 2,
      translate: { z: -1 },
      addTo: hourglass,
      color: colors.garnet,
      backface: colors.orange,
      stroke: false,
    }).copy({
      translate: { z: 1 },
      rotate: { y: TAU / 2 },
      color: colors.eggplant,
      backface: colors.gold,
    });
  };

  const createSphere = (illo: Zdog.Illustration) => {
    const sphere = new Zdog.Anchor({
      addTo: illo,
      translate: { x: -4, y: -4 },
    });

    solidsRef.current.push(sphere);

    new Zdog.Hemisphere({
      diameter: 2,
      addTo: sphere,
      color: colors.orange,
      backface: colors.eggplant,
      stroke: false,
    }).copy({
      rotate: { y: TAU / 2 },
      color: colors.eggplant,
      backface: colors.orange,
    });
  };

  const createCylinder = (illo: Zdog.Illustration) => {
    const cylinder = new Zdog.Cylinder({
      diameter: 2,
      length: 2,
      addTo: illo,
      translate: { x: 4, y: -4 },
      color: colors.gold,
      backface: colors.garnet,
      stroke: false,
    });

    solidsRef.current.push(cylinder);
  };

  const createCone = (illo: Zdog.Illustration) => {
    const cone = new Zdog.Anchor({
      addTo: illo,
      translate: { x: -4, y: 0 },
    });

    solidsRef.current.push(cone);

    new Zdog.Cone({
      diameter: 2,
      length: 2,
      addTo: cone,
      translate: { z: 1 },
      rotate: { y: TAU / 2 },
      color: colors.garnet,
      backface: colors.gold,
      stroke: false,
    });
  };

  const createTetrahedron = (illo: Zdog.Illustration) => {
    const tetrahedron = new Zdog.Anchor({
      addTo: illo,
      translate: { x: 0, y: 0 },
      scale: 2.5,
    });

    const radius = 0.5;
    const inradius = Math.cos(TAU / 6) * radius;
    const height = radius + inradius;

    solidsRef.current.push(tetrahedron);

    const triangle = new Zdog.Polygon({
      sides: 3,
      radius: radius,
      addTo: tetrahedron,
      translate: { y: height / 2 },
      fill: true,
      stroke: false,
      color: colors.eggplant,
    });

    for (let i = 0; i < 3; i++) {
      const rotor1 = new Zdog.Anchor({
        addTo: tetrahedron,
        rotate: { y: (TAU / 3) * -i },
      });
      const rotor2 = new Zdog.Anchor({
        addTo: rotor1,
        translate: { z: inradius, y: height / 2 },
        rotate: { x: Math.acos(1 / 3) * -1 + TAU / 4 },
      });
      triangle.copy({
        addTo: rotor2,
        translate: { y: -inradius },
        color: [colors.gold, colors.garnet, colors.orange][i],
      });
    }

    triangle.rotate.set({ x: -TAU / 4, z: -TAU / 2 });
  };

  const createOctahedron = (illo: Zdog.Illustration) => {
    const octahedron = new Zdog.Anchor({
      addTo: illo,
      translate: { x: -4, y: 4 },
      scale: 1.75,
    });

    solidsRef.current.push(octahedron);

    const colorWheel = [
      colors.eggplant,
      colors.garnet,
      colors.orange,
      colors.gold,
      colors.yellow,
    ];

    const radius = (ROOT3 / 2) * (2 / 3);
    const height = radius * (3 / 2);
    const tilt = Math.asin(0.5 / height);

    [-1, 1].forEach((ySide) => {
      for (let i = 0; i < 4; i++) {
        const rotor = new Zdog.Anchor({
          addTo: octahedron,
          rotate: { y: (TAU / 4) * (i + 1.5) * -1 },
        });

        const anchor = new Zdog.Anchor({
          addTo: rotor,
          translate: { z: 0.5 },
          rotate: { x: tilt * ySide },
        });

        new Zdog.Polygon({
          sides: 3,
          radius: radius,
          addTo: anchor,
          translate: { y: (-radius / 2) * ySide },
          scale: { y: ySide },
          stroke: false,
          fill: true,
          color: colorWheel[i + 0.5 + 0.5 * ySide],
          backface: false,
        });
      }
    });
  };

  const createCube = (illo: Zdog.Illustration) => {
    const cube = new Zdog.Box({
      addTo: illo,
      width: 2,
      height: 2,
      depth: 2,
      translate: { x: 4, y: 0 },
      topFace: colors.yellow,
      frontFace: colors.gold,
      leftFace: colors.orange,
      rightFace: colors.orange,
      rearFace: colors.garnet,
      bottomFace: colors.eggplant,
      stroke: false,
    });

    solidsRef.current.push(cube);
  };

  const createDodecahedron = (illo: Zdog.Illustration) => {
    const dodecahedron = new Zdog.Anchor({
      addTo: illo,
      translate: { x: 0, y: 4 },
      scale: 0.75,
    });

    solidsRef.current.push(dodecahedron);

    const midradius = (PHI * PHI) / 2;

    const face = new Zdog.Polygon({
      sides: 5,
      radius: 1,
      addTo: dodecahedron,
      translate: { y: -midradius },
      rotate: { x: TAU / 4 },
      fill: true,
      stroke: false,
      color: colors.yellow,
    });

    face.copy({
      translate: { y: midradius },
      rotate: { x: -TAU / 4 },
      color: colors.eggplant,
    });

    [-1, 1].forEach((ySide) => {
      const colorWheel = {
        "-1": [
          colors.eggplant,
          colors.garnet,
          colors.gold,
          colors.orange,
          colors.garnet,
        ],
        1: [
          colors.yellow,
          colors.gold,
          colors.garnet,
          colors.orange,
          colors.gold,
        ],
      }[ySide];

      for (let i = 0; i < 5; i++) {
        const rotor1 = new Zdog.Anchor({
          addTo: dodecahedron,
          rotate: { y: (TAU / 5) * i },
        });
        const rotor2 = new Zdog.Anchor({
          addTo: rotor1,
          rotate: { x: (TAU / 4) * ySide - Math.atan(2) },
        });

        face.copy({
          addTo: rotor2,
          translate: { z: midradius },
          rotate: { z: TAU / 2 },
          color: colorWheel?.[i] ?? "black",
        });
      }
    });
  };

  const createIsocahedron = (illo: Zdog.Illustration) => {
    const isocahedron = new Zdog.Anchor({
      addTo: illo,
      translate: { x: 4, y: 4 },
      scale: 1.2,
    });

    solidsRef.current.push(isocahedron);

    const faceRadius = (ROOT3 / 2) * (2 / 3);
    const faceHeight = faceRadius * (3 / 2);
    const capApothem = 0.5 / Math.tan(TAU / 10);
    const capRadius = 0.5 / Math.sin(TAU / 10);
    const capTilt = Math.asin(capApothem / faceHeight);
    const capSagitta = capRadius - capApothem;
    const sideTilt = Math.asin(capSagitta / faceHeight);
    const sideHeight = Math.sqrt(
      faceHeight * faceHeight - capSagitta * capSagitta,
    );

    [-1, 1].forEach((ySide) => {
      const capColors = {
        "-1": [
          colors.garnet,
          colors.gold,
          colors.yellow,
          colors.gold,
          colors.orange,
        ],
        1: [
          colors.gold,
          colors.garnet,
          colors.eggplant,
          colors.garnet,
          colors.orange,
        ],
      }[ySide];

      const sideColors = {
        "-1": [
          colors.garnet,
          colors.gold,
          colors.yellow,
          colors.orange,
          colors.garnet,
        ],
        1: [
          colors.gold,
          colors.garnet,
          colors.eggplant,
          colors.orange,
          colors.orange,
        ],
      }[ySide];

      for (let i = 0; i < 5; i++) {
        const rotor = new Zdog.Anchor({
          addTo: isocahedron,
          rotate: { y: (TAU / 5) * -i },
          translate: { y: (sideHeight / 2) * ySide },
        });

        let capRotateX = -capTilt;
        const isYPos = ySide > 0;
        capRotateX += isYPos ? TAU / 2 : 0;

        const capAnchor = new Zdog.Anchor({
          addTo: rotor,
          translate: { z: capApothem * ySide },
          rotate: { x: capRotateX },
        });

        new Zdog.Polygon({
          sides: 3,
          radius: faceRadius,
          addTo: capAnchor,
          translate: { y: -faceRadius / 2 },
          stroke: false,
          fill: true,
          color: capColors?.[i] ?? "black",
        });

        let sideRotateX = -sideTilt;
        sideRotateX += isYPos ? 0 : TAU / 2;
        const sideAnchor = capAnchor.copy({
          rotate: { x: sideRotateX },
        });

        new Zdog.Polygon({
          sides: 3,
          radius: faceRadius,
          addTo: sideAnchor,
          translate: { y: -faceRadius / 2 },
          rotate: { y: TAU / 2 },
          stroke: false,
          fill: true,
          color: sideColors?.[i] ?? "black",
        });
      }
    });
  };

  // Animation function
  const animate = (illo: Zdog.Illustration) => {
    const keyframes: Vector2D[] = [
      { x: 0, y: 0 },
      { x: 0, y: TAU },
      { x: TAU, y: TAU },
    ];
    const cycleCount = 180;
    const turnLimit = keyframes.length - 1;

    const update = () => {
      if (isSpinningRef.current) {
        const progress = tickerRef.current / cycleCount;
        const tween = Zdog.easeInOut(progress % 1, 4);
        const turn = Math.floor(progress % turnLimit);
        const keyA = keyframes[turn];
        const keyB = keyframes[turn + 1];
        viewRotationRef.current.x = Zdog.lerp(keyA.x, keyB.x, tween);
        viewRotationRef.current.y = Zdog.lerp(keyA.y, keyB.y, tween);
        tickerRef.current++;
      }

      solidsRef.current.forEach((solid) => {
        solid.rotate.set(viewRotationRef.current);
      });

      illo.updateGraph();
    };

    const animateFrame = () => {
      update();
      illo.renderGraph();
      requestAnimationFrame(animateFrame);
    };

    animateFrame();
  };

  return <canvas ref={illoRef} className={className} />;
};

export default ZdogIllustration;
