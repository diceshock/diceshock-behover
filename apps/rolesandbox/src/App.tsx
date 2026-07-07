import { useMemo } from "react";
import { VoxelEditor, VoxelWorld, useVoxelSync } from "@lib/rolesandbox-client";

export function App() {
  // Build WS URL relative to current origin
  const wsUrl = useMemo(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/sandbox/ws/default-room`;
  }, []);

  const { world, connected } = useVoxelSync(wsUrl);

  // Ensure a default cube exists on first load
  useMemo(() => {
    world.initDefaultCube(3, 0x4488ff);
  }, [world]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <header className="mb-4 text-center">
        <h1 className="text-2xl font-bold text-white">
          RoleSandbox
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          三维体素协作沙箱编辑器 ·{" "}
          <span className={connected ? "text-green-400" : "text-red-400"}>
            {connected ? "已连接" : "离线模式"}
          </span>
        </p>
        <p className="text-gray-500 text-xs mt-1">
          点击体素表面添加 · Shift+点击删除 · 拖拽旋转
        </p>
      </header>
      <VoxelEditor
        world={world}
        width={Math.min(960, window.innerWidth - 32)}
        height={Math.min(640, window.innerHeight - 200)}
        className="rounded-lg overflow-hidden shadow-2xl border border-gray-800"
      />
    </div>
  );
}
