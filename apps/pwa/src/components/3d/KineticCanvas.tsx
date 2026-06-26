'use client';

import { Float, Sparkles } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { type WeatherCondition, useClevelandWeather } from '../../hooks/useClevelandWeather';

const GOLD = '#D4AF37';
const VIOLET = '#9D4EDD';
const VOID = '#050507'; // matches the canonical obsidian token (tailwind.config.js)

// Highly performant falling rain — one InstancedMesh, one draw call.
function Rain({ count, color }: { count: number; color: string }) {
  // Typed loosely (any) to stay robust against @types/three copy duplication.
  const meshRef = useRef<any>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const drops = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 44,
        y: Math.random() * 34 - 17,
        z: (Math.random() - 0.5) * 22,
        speed: 0.18 + Math.random() * 0.3,
      })),
    [count],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      const d = drops[i];
      d.y -= d.speed;
      if (d.y < -17) d.y = 17;
      dummy.position.set(d.x, d.y, d.z);
      dummy.scale.set(0.012, 0.7, 0.012);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry />
      <meshBasicMaterial color={color} transparent opacity={0.45} />
    </instancedMesh>
  );
}

// Distant brutalist monoliths — slow rotation gives the void structural depth.
function Monoliths() {
  const groupRef = useRef<any>(null);
  const slabs = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        id: `monolith-${i}`,
        x: (Math.random() - 0.5) * 34,
        y: (Math.random() - 0.5) * 12,
        z: -12 - Math.random() * 16,
        h: 4 + Math.random() * 9,
        w: 0.5 + Math.random() * 0.5,
      })),
    [],
  );

  useFrame((state) => {
    if (groupRef.current) groupRef.current.rotation.y = state.clock.elapsedTime * 0.015;
  });

  return (
    <group ref={groupRef}>
      {slabs.map((s) => (
        <Float key={s.id} speed={1} rotationIntensity={0.05} floatIntensity={0.4}>
          <mesh position={[s.x, s.y, s.z]}>
            {/* brutalist audio-monolith cabinets */}
            <boxGeometry args={[s.w * 1.5, s.h, s.w]} />
            <meshStandardMaterial
              color="#16161E"
              roughness={0.9}
              metalness={0.18}
              emissive={GOLD}
              emissiveIntensity={0.04}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function Scene({ condition, isDay }: { condition: WeatherCondition; isDay: boolean }) {
  return (
    <>
      <color attach="background" args={[VOID]} />
      <fog attach="fog" args={[VOID, 12, 46]} />

      {isDay ? (
        <ambientLight intensity={0.45} color={GOLD} />
      ) : (
        <>
          <ambientLight intensity={0.07} />
          <pointLight position={[6, 6, 6]} intensity={2.4} color={VIOLET} distance={34} />
          <pointLight position={[-9, -4, 3]} intensity={1.6} color={VIOLET} distance={28} />
        </>
      )}

      <Monoliths />
      {/* Dust motes for depth — gold by day, violet by night. */}
      <Sparkles
        count={120}
        scale={[40, 24, 20]}
        size={2}
        speed={0.2}
        opacity={0.35}
        color={isDay ? GOLD : VIOLET}
      />
      {(condition === 'rain' || condition === 'snow') && (
        <Rain count={condition === 'snow' ? 800 : 1300} color={isDay ? GOLD : VIOLET} />
      )}
    </>
  );
}

export default function KineticCanvas() {
  const { condition, isDay } = useClevelandWeather();
  return (
    <Canvas
      camera={{ position: [0, 0, 18], fov: 32 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
    >
      <Scene condition={condition} isDay={isDay} />
    </Canvas>
  );
}
