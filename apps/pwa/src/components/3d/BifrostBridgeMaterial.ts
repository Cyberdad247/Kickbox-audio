'use client';

import * as THREE from 'three';

export const BifrostBridgeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      // Emerald / Cyan void with subtle animated pulse
      float pulse = sin(uTime * 2.0 + vUv.x * 10.0) * 0.05 + 0.95;
      vec3 baseColor = vec3(0.0, 0.15, 0.1);
      vec3 glow = vec3(0.0, 0.95, 0.5) * (1.0 - abs(vUv.y - 0.5) * 2.0);
      gl_FragColor = vec4(baseColor * pulse + glow * 0.25, 1.0);
    }
  `,
  side: THREE.DoubleSide,
});
