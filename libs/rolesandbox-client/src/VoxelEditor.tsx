import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { VoxelWorld, Voxel } from "./VoxelWorld";

interface VoxelEditorProps {
  world: VoxelWorld;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * VoxelEditor — A Three.js-based voxel renderer and editor.
 * Renders the VoxelWorld as instanced box meshes with orbit controls.
 * Click to add voxels on faces, shift+click to remove.
 */
export function VoxelEditor({
  world,
  width = 800,
  height = 600,
  className,
}: VoxelEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    mesh: THREE.InstancedMesh | null;
  } | null>(null);

  const rebuildMesh = useCallback(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;

    // Remove old mesh
    if (ctx.mesh) {
      ctx.scene.remove(ctx.mesh);
      ctx.mesh.dispose();
    }

    const voxels = world.getAllVoxels();
    if (voxels.length === 0) return;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });

    const instancedMesh = new THREE.InstancedMesh(
      geometry,
      material,
      voxels.length
    );

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();

    for (let i = 0; i < voxels.length; i++) {
      const v = voxels[i];
      matrix.setPosition(v.x + 0.5, v.y + 0.5, v.z + 0.5);
      instancedMesh.setMatrixAt(i, matrix);
      instancedMesh.setColorAt(i, color.setHex(v.color));
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }

    ctx.scene.add(instancedMesh);
    ctx.mesh = instancedMesh;
  }, [world]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(8, 6, 8);
    camera.lookAt(1.5, 1.5, 1.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(1.5, 1.5, 1.5);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(10, 15, 10);
    scene.add(directional);

    // Grid helper
    const grid = new THREE.GridHelper(20, 20, 0x444466, 0x333355);
    scene.add(grid);

    sceneRef.current = { scene, camera, renderer, controls, mesh: null };

    // Initial render
    rebuildMesh();

    // Animation loop
    let rafId: number;
    function animate() {
      rafId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Click handler for adding/removing voxels
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onClick(event: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const ctx = sceneRef.current;
      if (!ctx?.mesh) return;

      const intersects = raycaster.intersectObject(ctx.mesh);
      if (intersects.length === 0) return;

      const hit = intersects[0];
      const normal = hit.face!.normal;
      const point = hit.point;

      if (event.shiftKey) {
        // Remove: find the voxel at this position
        const vx = Math.floor(point.x - normal.x * 0.01);
        const vy = Math.floor(point.y - normal.y * 0.01);
        const vz = Math.floor(point.z - normal.z * 0.01);
        world.removeVoxel(vx, vy, vz);
      } else {
        // Add: place on the face
        const vx = Math.floor(point.x + normal.x * 0.01);
        const vy = Math.floor(point.y + normal.y * 0.01);
        const vz = Math.floor(point.z + normal.z * 0.01);
        world.setVoxel(vx, vy, vz, 0x4488ff);
      }
    }

    renderer.domElement.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(rafId);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, [width, height, rebuildMesh, world]);

  // Subscribe to world changes
  useEffect(() => {
    return world.onChange(rebuildMesh);
  }, [world, rebuildMesh]);

  return <div ref={containerRef} className={className} />;
}
