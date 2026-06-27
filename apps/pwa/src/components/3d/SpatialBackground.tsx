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
          <ambientLight intensity={isNight ? 0.18 : 0.75} />
          <mesh position={[0, 0, -5]}>
            <planeGeometry args={[18, 12]} />
            <meshBasicMaterial color={isNight ? '#0D0D11' : '#16161E'} />
          </mesh>
          <directionalLight
            color={isNight ? '#9D4EDD' : '#FFD700'}
            intensity={isNight ? 1.4 : 2.3}
            position={isNight ? [-2, 2, 4] : [3, 5, 6]}
          />
          <pointLight color="#D4AF37" intensity={isNight ? 0.3 : 1.2} position={[2.5, -1.2, 3]} />
          <Atmosphere isNight={isNight} />
          <RainParticles active={isWet || isNight} lowPower={lowPower} />
        </Canvas>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.05),rgba(5,5,5,0.72))]" />
    </div>
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
