import { useEffect, useRef, useState } from 'react';
import type { BufferGeometry, Group, Mesh, MeshStandardMaterial } from 'three';

function RobotFallback() {
  return (
    <svg viewBox="0 0 520 340" fill="none" aria-label="四足机器人线框示意图">
      <g stroke="#41EAD4" strokeWidth="1.1" opacity="0.55">
        <path d="M60 250h400M40 280h440M80 220h360" strokeDasharray="2 8" />
        <path d="M110 250l40-50M410 250l-40-50" />
      </g>
      <g stroke="#FF6A2B" strokeWidth="1.4">
        <rect x="160" y="128" width="196" height="62" rx="5" fill="rgba(255,106,43,.04)" />
        <path d="M356 145h32v30h-32" />
        <circle cx="390" cy="160" r="5" fill="#FF6A2B" />
      </g>
      <g stroke="#E8ECF2" strokeWidth="1.2" opacity="0.8">
        <path d="M184 190l-18 42-30 30M184 190l10 54-18 34" />
        <path d="M332 190l18 42 30 30M332 190l-10 54 18 34" />
      </g>
      <g fill="#41EAD4">
        <circle cx="184" cy="190" r="4" />
        <circle cx="332" cy="190" r="4" />
      </g>
      <text x="60" y="316" fill="#6E7A8C" fontFamily="monospace" fontSize="9" letterSpacing="2">
        LITE3 / DIGITAL TWIN
      </text>
    </svg>
  );
}

export default function QuadrupedHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      try {
        const test = document.createElement('canvas');
        const gl = test.getContext('webgl2') || test.getContext('webgl');
        if (!gl) throw new Error('WebGL is not available');

        const THREE = await import('three');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        if (cancelled) return;

        const width = container.clientWidth || 560;
        const height = container.clientHeight || 520;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x0a0c10, 0.043);

        const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 120);
        camera.position.set(3.45, 1.95, 4.2);
        camera.lookAt(0, 0.82, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.domElement.setAttribute('aria-hidden', 'true');
        container.appendChild(renderer.domElement);

        const shell = new THREE.MeshStandardMaterial({
          color: 0x1b222c,
          metalness: 0.72,
          roughness: 0.34,
        });
        const shellDark = new THREE.MeshStandardMaterial({
          color: 0x0e131a,
          metalness: 0.55,
          roughness: 0.52,
        });
        const accent = new THREE.MeshStandardMaterial({
          color: 0xff6a2b,
          emissive: 0xff6a2b,
          emissiveIntensity: 1.5,
          metalness: 0.2,
          roughness: 0.35,
        });
        const cyan = new THREE.MeshStandardMaterial({
          color: 0x41ead4,
          emissive: 0x41ead4,
          emissiveIntensity: 0.9,
          metalness: 0.25,
          roughness: 0.4,
        });
        const edgeMaterial = new THREE.LineBasicMaterial({
          color: 0x41ead4,
          transparent: true,
          opacity: 0.34,
        });

        const robot = new THREE.Group();
        robot.position.y = 1.0;
        scene.add(robot);

        const box = (
          w: number,
          h: number,
          d: number,
          material: MeshStandardMaterial,
          x = 0,
          y = 0,
          z = 0,
          parent: Group = robot,
        ): Mesh => {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
          mesh.position.set(x, y, z);
          parent.add(mesh);
          return mesh;
        };

        const outline = (mesh: Mesh) => {
          const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(mesh.geometry as unknown as BufferGeometry),
            edgeMaterial,
          );
          mesh.add(edges);
        };

        const body = box(1.24, 0.3, 0.56, shell);
        outline(body);
        const spine = box(0.68, 0.15, 0.46, shellDark, 0.1, 0.21, 0);
        outline(spine);
        box(0.46, 0.06, 0.3, cyan, 0.06, 0.3, 0);

        const head = box(0.32, 0.2, 0.28, shell, 0.72, 0.01, 0);
        outline(head);
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.05, 24), accent);
        lens.rotation.z = Math.PI / 2;
        lens.position.set(0.9, 0.01, 0);
        robot.add(lens);
        const lidar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.09, 20), shellDark);
        lidar.position.set(0.46, 0.27, 0);
        robot.add(lidar);
        const lidarTop = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.014, 20), cyan);
        lidarTop.position.set(0.46, 0.32, 0);
        robot.add(lidarTop);

        const legs: Array<{
          upper: Group;
          lower: Group;
          phase: number;
          lateral: number;
        }> = [];

        const legDefinitions = [
          { x: 0.41, z: 0.24, phase: 0, lateral: 1 },
          { x: 0.41, z: -0.24, phase: Math.PI, lateral: -1 },
          { x: -0.41, z: 0.24, phase: Math.PI, lateral: 1 },
          { x: -0.41, z: -0.24, phase: 0, lateral: -1 },
        ];

        for (const definition of legDefinitions) {
          const hip = new THREE.Group();
          hip.position.set(definition.x, -0.12, definition.z);
          robot.add(hip);

          const hipJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.077, 0.077, 0.11, 18), accent);
          hipJoint.rotation.x = Math.PI / 2;
          hip.add(hipJoint);
          const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.082, 16, 12), shellDark);
          hip.add(shoulder);

          const upper = new THREE.Group();
          hip.add(upper);
          const upperMesh = box(0.11, 0.48, 0.125, shell, 0, -0.24, 0, upper);
          outline(upperMesh);
          box(0.03, 0.26, 0.03, cyan, 0.06, -0.2, 0, upper);

          const knee = new THREE.Group();
          knee.position.y = -0.48;
          upper.add(knee);
          const kneeJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.115, 18), accent);
          kneeJoint.rotation.x = Math.PI / 2;
          knee.add(kneeJoint);

          const lower = new THREE.Group();
          knee.add(lower);
          const lowerMesh = box(0.09, 0.46, 0.095, shell, 0, -0.23, 0, lower);
          outline(lowerMesh);
          const foot = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 10), shellDark);
          foot.position.y = -0.46;
          lower.add(foot);

          upper.rotation.z = 0.26;
          lower.rotation.z = -0.55;
          legs.push({ upper, lower, phase: definition.phase, lateral: definition.lateral });
        }

        const grid = new THREE.GridHelper(18, 36, 0x334052, 0x171e27);
        const gridMaterial = grid.material as InstanceType<typeof THREE.LineBasicMaterial>;
        gridMaterial.transparent = true;
        gridMaterial.opacity = 0.72;
        grid.position.y = 0.002;
        scene.add(grid);

        const shadow = new THREE.Mesh(
          new THREE.CircleGeometry(1.05, 48),
          new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38 }),
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.004;
        scene.add(shadow);

        const scanRing = new THREE.Mesh(
          new THREE.RingGeometry(0.96, 0.976, 96),
          new THREE.MeshBasicMaterial({
            color: 0x41ead4,
            transparent: true,
            opacity: 0.28,
            side: THREE.DoubleSide,
          }),
        );
        scanRing.rotation.x = -Math.PI / 2;
        scanRing.position.y = 0.006;
        scene.add(scanRing);

        scene.add(new THREE.AmbientLight(0xffffff, 0.62));
        const key = new THREE.DirectionalLight(0xffd9c7, 2.6);
        key.position.set(4.5, 6, 3.5);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x41ead4, 1.35);
        rim.position.set(-4.5, 3.2, -4);
        scene.add(rim);
        const warm = new THREE.PointLight(0xff6a2b, 14, 9, 2);
        warm.position.set(0.4, 1.5, 2.6);
        scene.add(warm);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 0.8, 0);
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.055;
        controls.autoRotate = !reducedMotion;
        controls.autoRotateSpeed = 0.7;
        controls.minPolarAngle = 0.72;
        controls.maxPolarAngle = Math.PI / 2.06;
        controls.update();

        const pose = (time: number) => {
          robot.position.y = 1.0 + Math.sin(time * 4.4) * 0.018;
          robot.rotation.x = Math.sin(time * 2.2) * 0.012;
          for (const leg of legs) {
            const phase = time * 4.4 + leg.phase;
            const swing = Math.sin(phase) * 0.2;
            const lift = Math.max(0, Math.sin(phase)) * 0.17;
            leg.upper.rotation.z = 0.26 + swing;
            leg.lower.rotation.z = -0.55 - lift * leg.lateral + Math.sin(phase + 0.8) * 0.045;
          }
          scanRing.scale.setScalar(1 + Math.sin(time * 1.25) * 0.045);
          const material = scanRing.material as InstanceType<typeof THREE.MeshBasicMaterial>;
          material.opacity = 0.22 + Math.sin(time * 1.25) * 0.06;
        };

        const hud = hudRef.current;
        let lastHud = 0;
        const updateHud = (time: number) => {
          if (!hud || time - lastHud < 0.12) return;
          lastHud = time;
          const pitch = hud.querySelector('[data-pitch]');
          const roll = hud.querySelector('[data-roll]');
          const freq = hud.querySelector('[data-freq]');
          if (pitch) pitch.textContent = `${(Math.sin(time * 1.7) * 2.4).toFixed(1)}°`;
          if (roll) roll.textContent = `${(Math.cos(time * 1.35) * 1.8).toFixed(1)}°`;
          if (freq) freq.textContent = `${(2.2 + Math.sin(time * 0.4) * 0.05).toFixed(2)} Hz`;
        };

        let raf = 0;
        let running = true;
        const startedAt = performance.now();

        const renderFrame = () => {
          const time = (performance.now() - startedAt) / 1000;
          pose(time);
          updateHud(time);
          controls.update();
          renderer.render(scene, camera);
        };

        const loop = () => {
          if (!running || cancelled) return;
          renderFrame();
          raf = requestAnimationFrame(loop);
        };

        if (reducedMotion) {
          pose(0.8);
          renderer.render(scene, camera);
          controls.addEventListener('change', () => renderer.render(scene, camera));
        } else {
          loop();
        }

        const onVisibility = () => {
          running = !document.hidden;
          if (running && !reducedMotion) loop();
        };
        document.addEventListener('visibilitychange', onVisibility);

        const resize = () => {
          const nextWidth = container.clientWidth;
          const nextHeight = container.clientHeight;
          if (!nextWidth || !nextHeight) return;
          camera.aspect = nextWidth / nextHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(nextWidth, nextHeight);
          if (reducedMotion) renderer.render(scene, camera);
        };
        const observer = new ResizeObserver(resize);
        observer.observe(container);

        setReady(true);

        cleanup = () => {
          running = false;
          cancelAnimationFrame(raf);
          observer.disconnect();
          document.removeEventListener('visibilitychange', onVisibility);
          controls.dispose();
          scene.traverse((object) => {
            const mesh = object as InstanceType<typeof THREE.Mesh>;
            if (mesh.geometry) mesh.geometry.dispose();
            const material = mesh.material as InstanceType<typeof THREE.Material> | InstanceType<typeof THREE.Material>[];
            if (Array.isArray(material)) material.forEach((item) => item.dispose());
            else if (material) material.dispose();
          });
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <div className="hero-stage">
      <div className="stage-label">
        <strong>DIGITAL TWIN / LITE3</strong>
        12 DOF · TROT GAIT
      </div>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {(!ready || failed) && (
        <div className="stage-fallback" style={{ position: 'absolute', inset: 0 }}>
          <RobotFallback />
        </div>
      )}
      <div className="stage-hud" ref={hudRef} aria-hidden="true">
        <div><span>MODE</span><b>TROT</b></div>
        <div><span>DOF</span><b>12</b></div>
        <div><span>PITCH</span><b data-pitch>+0.0°</b></div>
        <div><span>ROLL</span><b data-roll>+0.0°</b></div>
        <div><span>FREQ</span><b data-freq>2.20 Hz</b></div>
      </div>
    </div>
  );
}
