'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useClevelandWeather, type WeatherCondition } from '../../hooks/useClevelandWeather';

type TimeOfDay = 'day' | 'night';

function useEnvironment(): { timeOfDay: TimeOfDay; weather: WeatherCondition; lowPower: boolean } {
  const weather = useClevelandWeather();
  const lowPower =
    typeof navigator !== 'undefined' &&
    ((navigator as unknown as { hardwareConcurrency?: number }).hardwareConcurrency ?? 4) <= 4;

  return {
    timeOfDay: weather.isDay ? 'day' : 'night',
    weather: weather.condition,
    lowPower,
  };
}

// Procedural wave equation to simulate smooth biome elevation heights.
function getProceduralHeight(x: number, y: number, time: number): number {
  const h1 = Math.sin(x * 0.25 + time * 0.12) * Math.cos(y * 0.25 - time * 0.1) * 1.1;
  const h2 = Math.sin(x * 0.55 - time * 0.2) * Math.cos(y * 0.5 + time * 0.15) * 0.45;
  const h3 = Math.sin(x * 1.1 + time * 0.35) * Math.cos(y * 1.0 - time * 0.3) * 0.15;
  return h1 + h2 + h3;
}

export function SpatialBackground() {
  const { timeOfDay, weather, lowPower } = useEnvironment();
  const isNight = timeOfDay === 'night';
  const isWet = weather === 'rain' || weather === 'snow';

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-[#050505]" aria-hidden="true">
      <div className="absolute inset-0 h-screen w-screen">
        <Canvas
          className="h-full w-full"
          camera={{ position: [0, 0, 8], fov: 52 }}
          dpr={lowPower ? 1 : [1, 1.5]}
          gl={{
            alpha: false,
            antialias: !lowPower,
            powerPreference: lowPower ? 'low-power' : 'high-performance',
            preserveDrawingBuffer: true,
          }}
        >
          <color attach="background" args={['#050505']} />
          <ambientLight intensity={isNight ? 0.22 : 0.85} />
          
          {/* Dynamic Procedural Biome Grid */}
          <ProceduralBiomeMap active={isWet} isNight={isNight} condition={weather} />

          <directionalLight
            color={isNight ? '#9D4EDD' : '#FFD700'}
            intensity={isNight ? 1.6 : 2.5}
            position={isNight ? [-3, 3, 5] : [4, 6, 7]}
          />
          <pointLight color="#D4AF37" intensity={isNight ? 0.4 : 1.4} position={[3, -1.5, 4]} />
          
          <Atmosphere isNight={isNight} />
          <RainParticles active={isWet || isNight} lowPower={lowPower} />
        </Canvas>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.05),rgba(5,5,5,0.72))]" />
    </div>
  );
}

function ProceduralBiomeMap({
  active,
  isNight,
  condition,
}: {
  active: boolean;
  isNight: boolean;
  condition: WeatherCondition;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  // Smooth biome color mapping (tligames aesthetics)
  const biomeColor = useMemo(() => {
    if (condition === 'clear' || condition === 'clouds') {
      return isNight ? '#0B2914' : '#D4AF37'; // Golden Emerald highlights
    }
    if (condition === 'snow') {
      return isNight ? '#1B2C4A' : '#EBF5FB'; // Ice biome hues
    }
    // Rain/Storm
    return isNight ? '#3D0F75' : '#9D4EDD'; // Electric Violet biome hues
  }, [condition, isNight]);

  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    timeRef.current += delta * (condition === 'rain' ? 1.6 : 0.7);
    const geom = mesh.geometry as THREE.PlaneGeometry;
    const pos = geom.getAttribute('position') as THREE.BufferAttribute;

    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      const z = getProceduralHeight(v3.x, v3.y, timeRef.current);
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} position={[0, -2.4, -3.8]} rotation={[-Math.PI / 3.6, 0, 0]}>
      <planeGeometry args={[28, 18, 32, 32]} />
      <meshStandardMaterial
        color={biomeColor}
        wireframe
        roughness={0.75}
        metalness={0.15}
        transparent
        opacity={0.42}
      />
    </mesh>
  );
}

function Atmosphere({ isNight }: { isNight: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += delta * 0.035;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -2]}>
      <torusGeometry args={[3.6, 0.025, 12, 96]} />
      <meshBasicMaterial color={isNight ? '#9D4EDD' : '#FFD700'} transparent opacity={isNight ? 0.24 : 0.18} />
    </mesh>
  );
}

function RainParticles({ active, lowPower }: { active: boolean; lowPower: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const frameBudgetRef = useRef(0);
  const pointCount = lowPower ? 90 : 180;

  const positions = useMemo(() => {
    const arr = new Float32Array(pointCount * 3);
    for (let i = 0; i < pointCount; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 1] = Math.random() * 7 - 2;
      arr[i * 3 + 2] = Math.random() * -4;
    }
    return arr;
  }, [pointCount]);

  useFrame((_state, delta) => {
    frameBudgetRef.current += delta;
    if (lowPower && frameBudgetRef.current < 1 / 30) return;
    frameBudgetRef.current = 0;

    const points = pointsRef.current;
    if (!points) return;
    const attr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const array = attr.array as Float32Array;
    for (let i = 0; i < pointCount; i++) {
      const yIndex = i * 3 + 1;
      array[yIndex] -= active ? 0.055 : 0.012;
      if (array[yIndex] < -3.2) {
        array[yIndex] = 4;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#9D4EDD" size={active ? 0.035 : 0.018} transparent opacity={active ? 0.78 : 0.28} />
    </points>
  );
}
