'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useBifrost } from '../../context/BifrostContext';
import { useGreenComputing } from '../../hooks/useGreenComputing';
import { playSpatialTone, triggerHaptic } from '../../lib/hapticsAndSpatialAudio';
import { BifrostBridgeMaterial } from '../3d/BifrostBridgeMaterial';

export interface BifrostMeshNode {
  id: string;
  name: string;
  ip: string;
  online: boolean;
  position: { x: number; y: number; z: number };
  config: {
    cpuCores: number;
    ramGB: number;
    tailscaleSsh: boolean;
    version: string;
  };
  activeRoutes: number[];
}

const DEFAULT_NODES: BifrostMeshNode[] = [
  {
    id: 'node-anya',
    name: 'Anya-Hypervisor-Primary',
    ip: '100.64.0.1',
    online: true,
    position: { x: -6, y: 1.5, z: -15 },
    config: { cpuCores: 8, ramGB: 8, tailscaleSsh: true, version: '4.0.0-PROD' },
    activeRoutes: [1, 2],
  },
  {
    id: 'node-merlin',
    name: 'Merlin-Knowledge-Graph',
    ip: '100.64.0.2',
    online: true,
    position: { x: 6, y: 1.8, z: -8 },
    config: { cpuCores: 16, ramGB: 32, tailscaleSsh: true, version: '4.0.0-PROD' },
    activeRoutes: [0, 3],
  },
  {
    id: 'node-sentinel',
    name: 'Sentinel-WASM-Enclave',
    ip: '100.64.0.3',
    online: true,
    position: { x: -4, y: 1.2, z: 8 },
    config: { cpuCores: 4, ramGB: 4, tailscaleSsh: true, version: '4.0.0-PROD' },
    activeRoutes: [0, 4],
  },
  {
    id: 'node-heimdall',
    name: 'Heimdall-SRE-Warden',
    ip: '100.64.0.4',
    online: true,
    position: { x: 5, y: 1.4, z: 16 },
    config: { cpuCores: 8, ramGB: 16, tailscaleSsh: true, version: '4.0.0-PROD' },
    activeRoutes: [1, 4],
  },
  {
    id: 'node-edge-mobile',
    name: 'Sovereign-Edge-PWA',
    ip: '100.64.0.5',
    online: true,
    position: { x: 0, y: 0.8, z: 0 },
    config: { cpuCores: 8, ramGB: 6, tailscaleSsh: true, version: '4.0.0-PROD' },
    activeRoutes: [0, 1, 2, 3],
  },
];

export function BifrostBridgeNexusView() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { connected } = useBifrost();
  const { isTabVisible, isLowPowerMode } = useGreenComputing();

  const [nodes] = useState<BifrostMeshNode[]>(DEFAULT_NODES);
  const [selectedNode, setSelectedNode] = useState<BifrostMeshNode | null>(DEFAULT_NODES[4]);
  const [packetWeight, setPacketWeight] = useState(50);
  const [latency, setLatency] = useState<number>(2.4);
  const [chatLogs, setChatLogs] = useState<Array<{ sender: string; text: string }>>([
    { sender: 'system', text: '> Secure Bifröst Quantum Mesh channel established over Tailscale.' },
    {
      sender: 'system',
      text: '> High-speed ChaCha20 encrypted packet pipeline online. Awaiting commands.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [fps, setFps] = useState(60);
  const [activePacketCount, setActivePacketCount] = useState(0);

  // Three.js References
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    instancedMesh: THREE.InstancedMesh;
    packets: Array<{
      mesh: THREE.Mesh;
      spline: THREE.QuadraticBezierCurve3;
      progress: number;
      speed: number;
    }>;
    freeMeshes: THREE.Mesh[];
    packetGeometry: THREE.SphereGeometry;
    packetMaterial: THREE.MeshBasicMaterial;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    animId?: number;
  } | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04080a, 0.015);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 14, 28);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isLowPowerMode,
      alpha: true,
      powerPreference: isLowPowerMode ? 'low-power' : 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isLowPowerMode ? 1 : 1.5));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;

    // Bridge Deck Geometry
    const bridgeGeo = new THREE.BoxGeometry(6, 0.15, 60, 6, 1, 30);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, BifrostBridgeMaterial);
    scene.add(bridgeMesh);

    // Node Instancing
    const crystalGeo = new THREE.OctahedronGeometry(0.45, 0);
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0x00ff66, wireframe: false });
    const instancedMesh = new THREE.InstancedMesh(crystalGeo, crystalMat, nodes.length);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    nodes.forEach((n, idx) => {
      dummy.position.set(n.position.x, n.position.y, n.position.z);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(idx, dummy.matrix);
      color.set(n.online ? 0x00f0ff : 0xff3355);
      instancedMesh.setColorAt(idx, color);
    });

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
    scene.add(instancedMesh);

    // Packet Pool
    const packetGeometry = new THREE.SphereGeometry(0.06, 6, 6);
    const packetMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    threeRef.current = {
      scene,
      camera,
      renderer,
      controls,
      instancedMesh,
      packets: [],
      freeMeshes: [],
      packetGeometry,
      packetMaterial,
      raycaster: new THREE.Raycaster(),
      mouse: new THREE.Vector2(),
    };

    // Animation Loop
    let frames = 0;
    let lastTime = performance.now();
    const clock = new THREE.Clock();

    const animate = () => {
      const animId = requestAnimationFrame(animate);
      if (threeRef.current) threeRef.current.animId = animId;

      const delta = clock.getElapsedTime();
      BifrostBridgeMaterial.uniforms.uTime.value = delta;

      // FPS tracking
      frames++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frames * 1000) / (now - lastTime)));
        frames = 0;
        lastTime = now;
      }

      // Animate Nodes Hover
      nodes.forEach((n, idx) => {
        dummy.position.set(
          n.position.x,
          n.position.y + Math.sin(delta * 2.0 + idx) * 0.08,
          n.position.z,
        );
        dummy.rotation.set(0, delta * 0.6 + idx, 0);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(idx, dummy.matrix);
      });
      instancedMesh.instanceMatrix.needsUpdate = true;

      // Animate Packets
      const state = threeRef.current;
      if (state) {
        for (let i = state.packets.length - 1; i >= 0; i--) {
          const pkt = state.packets[i];
          pkt.progress += pkt.speed;
          if (pkt.progress >= 1) {
            state.scene.remove(pkt.mesh);
            state.freeMeshes.push(pkt.mesh);
            state.packets.splice(i, 1);
          } else {
            pkt.mesh.position.copy(pkt.spline.getPointAt(pkt.progress));
          }
        }
        setActivePacketCount(state.packets.length);
        controls.update();
        renderer.render(scene, camera);
      }
    };

    animate();

    // Auto Packet Stream
    const packetInterval = setInterval(() => {
      if (threeRef.current && isTabVisible) {
        const randOrigin = nodes[Math.floor(Math.random() * nodes.length)];
        if (randOrigin && randOrigin.activeRoutes.length > 0) {
          const destIdx =
            randOrigin.activeRoutes[Math.floor(Math.random() * randOrigin.activeRoutes.length)];
          spawnPacket(randOrigin, destIdx);
        }
      }
    }, 400);

    const handleResize = () => {
      if (!containerRef.current || !threeRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(packetInterval);
      window.removeEventListener('resize', handleResize);
      if (threeRef.current?.animId) cancelAnimationFrame(threeRef.current.animId);
      renderer.dispose();
    };
  }, [isLowPowerMode, isTabVisible]);

  // Spawn dynamic Bezier curve packet
  const spawnPacket = (origin: BifrostMeshNode, destIdx: number) => {
    const state = threeRef.current;
    if (!state) return;
    const target = nodes[destIdx];
    if (!target || !origin.online || !target.online) return;

    const pStart = new THREE.Vector3(origin.position.x, origin.position.y, origin.position.z);
    const pEnd = new THREE.Vector3(target.position.x, target.position.y, target.position.z);
    const mid = new THREE.Vector3().addVectors(pStart, pEnd).multiplyScalar(0.5);
    mid.y += Math.min(pStart.distanceTo(pEnd) * 0.25, 4);

    const spline = new THREE.QuadraticBezierCurve3(pStart, mid, pEnd);

    let mesh: THREE.Mesh;
    if (state.freeMeshes.length > 0) {
      mesh = state.freeMeshes.pop()!;
      mesh.visible = true;
    } else {
      mesh = new THREE.Mesh(state.packetGeometry, state.packetMaterial);
    }

    const scale = 0.5 + packetWeight / 200;
    mesh.scale.setScalar(scale);
    state.scene.add(mesh);

    state.packets.push({
      mesh,
      spline,
      progress: 0,
      speed: 0.009 + Math.random() * 0.012,
    });
  };

  const handleBurst = () => {
    if (!selectedNode) return;
    triggerHaptic('slot');
    playSpatialTone(720, 0.5, 0.1);
    for (let i = 0; i < 5; i++) {
      const randDest = Math.floor(Math.random() * nodes.length);
      if (nodes[randDest].id !== selectedNode.id) {
        spawnPacket(selectedNode, randDest);
      }
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim() || !selectedNode) return;
    const prompt = chatInput.trim();
    setChatInput('');
    setChatLogs((prev) => [...prev, { sender: 'user', text: `root@bifrost:~# ${prompt}` }]);
    triggerHaptic('click');

    setTimeout(() => {
      let reply = `> Response from [${selectedNode.name}]: Executed prompt safely in Zone-0 microVM.`;
      if (prompt.toLowerCase().includes('disk')) {
        reply = `> Filesystem Stats: /dev/root 32GB (14.2GB used, 56% free). OPFS Worktree healthy.`;
      } else if (prompt.toLowerCase().includes('cpu')) {
        reply = `> CPU Profile: 8 Cores (Average load: 12.4%, 0 throttled frames).`;
      } else if (prompt.toLowerCase().includes('net')) {
        reply = `> Tailscale Mesh: 5 Active Peers | Direct WireGuard Link: 1.8ms RTT.`;
      }
      setChatLogs((prev) => [...prev, { sender: 'bot', text: reply }]);
      setLatency(Number((1.5 + Math.random() * 1.5).toFixed(1)));
    }, 250);
  };

  return (
    <div className="flex flex-col h-full space-y-4 select-none animate-fadeIn">
      {/* Top Diagnostics HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#00F0FF]/20 bg-black/60 p-3 font-mono text-xs backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[#00F0FF] font-bold">
            <span className="h-2 w-2 rounded-full bg-[#00F0FF] animate-pulse" />
            <span>BIFRÖST QUANTUM NEXUS</span>
          </div>
          <span className="text-white/40">|</span>
          <div className="text-white/70">
            <span>HOTKEYS: </span>
            <span className="text-gold">Alt+D (Disk) | Alt+C (CPU) | Alt+N (Net)</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div>
            PEERS: <span className="text-cyan-300 font-bold">{nodes.length}</span>
          </div>
          <div>
            PACKETS: <span className="text-emerald-400 font-bold">{activePacketCount}</span>
          </div>
          <div>
            FPS:{' '}
            <span className={`font-bold ${fps < 45 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {fps}
            </span>
          </div>
          <div className="rounded border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-emerald-300">
            {connected ? 'LINK_SECURE' : 'EDGE_STANDALONE'}
          </div>
        </div>
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={containerRef}
        className="relative h-[360px] w-full rounded-2xl border border-[#00F0FF]/30 bg-gradient-to-b from-[#020808] to-[#050A0E] overflow-hidden shadow-2xl"
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full block cursor-grab active:cursor-grabbing"
        />

        {/* Viewport Overlay Controls */}
        <div className="absolute top-3 left-3 rounded-lg border border-white/10 bg-black/70 px-3 py-1.5 font-mono text-[10px] text-white/60 backdrop-blur-md">
          <span>Click Node to Select • Drag to Orbit • Scroll to Zoom</span>
        </div>

        {/* Selected Node Quick Info Tag */}
        {selectedNode && (
          <div className="absolute top-3 right-3 rounded-lg border border-[#00F0FF]/40 bg-black/80 p-2.5 font-mono text-[11px] backdrop-blur-md space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs">⚡</span>
              <span className="text-[#00F0FF] font-bold">{selectedNode.name}</span>
            </div>
            <div className="text-white/60 text-[10px]">
              IP: {selectedNode.ip} · RTT: {latency}ms
            </div>
          </div>
        )}
      </div>

      {/* Bottom Peer Dashboard & Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Node Telemetry & Burst Controls */}
        {selectedNode && (
          <div className="rounded-2xl border border-emerald-400/20 bg-black/50 p-4 font-mono text-xs space-y-3 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-white font-bold tracking-wider uppercase">
                NODE: {selectedNode.name}
              </span>
              <span className="text-emerald-400 font-bold">STATE: ONLINE</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-white/70 bg-black/40 p-2.5 rounded-xl border border-white/5">
              <div>IP: {selectedNode.ip}</div>
              <div>
                LATENCY: <span className="text-emerald-400 font-bold">{latency} ms</span>
              </div>
              <div>CPU: {selectedNode.config.cpuCores} vCPU</div>
              <div>RAM: {selectedNode.config.ramGB} GB</div>
              <div>SSH: {selectedNode.config.tailscaleSsh ? 'ENABLED' : 'DISABLED'}</div>
              <div>VERSION: v{selectedNode.config.version}</div>
            </div>

            {/* Burst Weight Slider */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1">
                <div className="flex justify-between text-[10px] text-white/60 mb-1">
                  <span>BURST LOAD:</span>
                  <span className="text-cyan-300 font-bold">{packetWeight} KB</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="500"
                  value={packetWeight}
                  onChange={(e) => setPacketWeight(Number(e.target.value))}
                  className="w-full accent-[#00F0FF]"
                />
              </div>
              <button
                type="button"
                onClick={handleBurst}
                className="rounded-xl border border-[#00F0FF] bg-[#00F0FF]/20 px-4 py-2 text-xs font-bold text-[#00F0FF] hover:bg-[#00F0FF]/30 transition-all shadow-[0_0_12px_rgba(0,240,255,0.25)]"
              >
                BURST PING
              </button>
            </div>
          </div>
        )}

        {/* Right: Quantum Terminal Channel */}
        <div className="flex flex-col rounded-2xl border border-cyan-400/20 bg-black/50 p-4 font-mono text-xs space-y-3 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-cyan-300 font-bold tracking-wider uppercase">
              TAILSCALE QUANTUM OPERATOR
            </span>
            <span className="text-[10px] text-white/40">Zone-0 Encrypted</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 text-[11px] max-h-[140px] p-2 bg-black/60 rounded-xl border border-white/5">
            {chatLogs.map((log, idx) => (
              <div
                key={idx}
                className={
                  log.sender === 'user'
                    ? 'text-gold font-semibold'
                    : log.sender === 'system'
                      ? 'text-white/50 text-[10px]'
                      : 'text-emerald-300'
                }
              >
                {log.text}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendChat();
              }}
              placeholder="Run diagnostic (e.g. disk, cpu, net, latency)..."
              className="flex-1 rounded-xl border border-white/15 bg-black/60 px-3 py-2 font-mono text-xs text-white placeholder-white/30 focus:border-[#00F0FF] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSendChat}
              className="rounded-xl border border-emerald-400 bg-emerald-400/20 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-400/30 transition-all"
            >
              SEND
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
