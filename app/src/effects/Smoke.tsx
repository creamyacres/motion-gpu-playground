// Smoke.tsx
// Monochrome GPU particle smoke — soft gaussian blobs that rise, drift, and fade.
//
// Two storage buffers:
//   particles[i] = vec4f(x, y, vx, vy)        — position & velocity in UV space
//   pdata[i]     = vec4f(life, maxLife, size, seed) — seed stored as bitcast<f32>(u32)
//
// Compute pass updates particles each frame (respawn when life ≤ 0).
// Fragment shader loops over all particles and accumulates gaussian contributions.

import { useRef } from 'react';
import { FragCanvas, useFrame } from '@motion-core/motion-gpu/react';
import { defineMaterial, ComputePass } from '@motion-core/motion-gpu';

const N     = 200;
const BYTES = N * 16; // vec4f = 16 bytes

// ---------------------------------------------------------------------------
// Material
// ---------------------------------------------------------------------------

const smokeMaterial = defineMaterial({
  fragment: `
    fn frag(uv: vec2f) -> vec4f {
      let res    = motiongpuFrame.resolution;
      let aspect = res.x / res.y;
      // Centered aspect-corrected space
      let ap = vec2f((uv.x - 0.5) * aspect, uv.y - 0.5);

      var acc = 0.0;

      for (var i = 0u; i < 200u; i++) {
        let pos     = particles[i];
        let data    = pdata[i];
        let life    = data.x;
        let maxLife = data.y;
        let size    = data.z;

        if (life <= 0.0 || maxLife <= 0.0) { continue; }

        // Particle center in same space
        let px = (pos.x - 0.5) * aspect;
        let py = pos.y - 0.5;

        let dx = ap.x - px;
        let dy = ap.y - py;
        let d2 = dx*dx + dy*dy;

        // Gaussian blob; size is fraction of screen height
        let g = exp(-d2 / (size * size));

        // Fade in quickly, hold, then fade out
        let phase   = clamp(1.0 - life / maxLife, 0.0, 1.0);
        let fadeIn  = smoothstep(0.0, 0.12, phase);
        let fadeOut = 1.0 - smoothstep(0.60, 1.0, phase);

        acc += g * fadeIn * fadeOut;
      }

      // Tone-map accumulation so overlapping blobs don't blow out
      let smoke = 1.0 - exp(-acc * 1.4);

      // Very dark charcoal bg → light grey-white smoke
      let bg  = vec3f(0.055, 0.055, 0.055);
      let col = mix(bg, vec3f(0.90, 0.90, 0.90), smoke);
      return vec4f(col, 1.0);
    }
  `,
  storageBuffers: {
    particles: { size: BYTES, type: 'array<vec4f>' },
    pdata:     { size: BYTES, type: 'array<vec4f>' },
  },
});

// ---------------------------------------------------------------------------
// Compute pass — particle physics
// ---------------------------------------------------------------------------

const computeSmoke = new ComputePass({
  compute: `
fn lcg(s: u32) -> u32 { return s * 1664525u + 1013904223u; }
fn rand(s: u32) -> f32 { return f32(s) / 4294967296.0; }

@compute @workgroup_size(64)
fn compute(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= 200u) { return; }

  let pos  = particles[i];
  let data = pdata[i];
  let dt   = clamp(motiongpuFrame.delta, 0.0, 0.05);

  var life    = data.x;
  let maxLife = data.y;
  var size    = data.z;
  var seed    = bitcast<u32>(data.w);

  life -= dt;

  if (life <= 0.0) {
    // Respawn — advance seed with time+index entropy
    seed = lcg(seed ^ (u32(motiongpuFrame.time * 137.0) + i * 31u));
    let s1 = lcg(seed);
    let s2 = lcg(s1);
    let s3 = lcg(s2);
    let s4 = lcg(s3);
    let s5 = lcg(s4);

    let newMaxLife = 4.0 + rand(s4) * 5.0;

    particles[i] = vec4f(
      0.44 + rand(s1) * 0.12,          // x: near center
      0.04,                              // y: spawn at bottom
      (rand(s2) - 0.5) * 0.035,         // vx: gentle lateral drift
      0.04 + rand(s3) * 0.055           // vy: upward
    );
    pdata[i] = vec4f(
      newMaxLife,
      newMaxLife,
      0.022 + rand(s5) * 0.028,         // initial size
      bitcast<f32>(s5)                   // seed preserved exactly
    );
  } else {
    // Sinusoidal horizontal turbulence based on life phase and per-particle seed
    let phase  = 1.0 - life / maxLife;
    let freq   = 6.0 + rand(seed & 255u) * 4.0;
    let offset = rand((seed >> 8u) & 255u) * 6.28;
    let turbX  = sin(phase * freq + offset) * 0.010;

    let newX = pos.x + (pos.z + turbX) * dt;
    let newY = pos.y + pos.w * dt;

    // Slight upward deceleration + size grows as smoke expands
    particles[i] = vec4f(newX, newY, pos.z, pos.w * (1.0 - dt * 0.08));
    pdata[i]     = vec4f(life, maxLife, size + dt * 0.016, data.w);
  }
}
  `,
  dispatch: [4, 1, 1],  // 4 × 64 = 256 threads; guard with i >= 200
});

// ---------------------------------------------------------------------------
// Runtime — seed particles pre-spread across their lifecycle so
// the screen fills immediately instead of starting empty.
// ---------------------------------------------------------------------------

function SmokeRuntime() {
  const seeded = useRef(false);
  useFrame((state) => {
    if (seeded.current) return;
    seeded.current = true;

    const pos  = new Float32Array(N * 4);
    const data = new Float32Array(N * 4);

    for (let i = 0; i < N; i++) {
      const maxLife = 4 + Math.random() * 5;
      const life    = Math.random() * maxLife;           // random point in lifecycle
      const phase   = 1 - life / maxLife;                // 0=just spawned, 1=about to die

      // Reconstruct plausible position from age
      const riseY   = 0.04 + phase * 0.72;
      const size    = 0.022 + phase * 0.046;

      pos[i*4 + 0]  = 0.44 + Math.random() * 0.12;
      pos[i*4 + 1]  = riseY;
      pos[i*4 + 2]  = (Math.random() - 0.5) * 0.035;
      pos[i*4 + 3]  = 0.04 + Math.random() * 0.055;

      data[i*4 + 0] = life;
      data[i*4 + 1] = maxLife;
      data[i*4 + 2] = size;
      data[i*4 + 3] = (Math.random() * 0xffffffff) >>> 0; // uint seed as f32 bits — close enough
    }

    state.writeStorageBuffer('particles', pos);
    state.writeStorageBuffer('pdata', data);
  });
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Smoke() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#0d0d0d' }}>
      <FragCanvas
        material={smokeMaterial}
        passes={[computeSmoke]}
        clearColor={[0.055, 0.055, 0.055, 1]}
        renderMode="always"
      >
        <SmokeRuntime />
      </FragCanvas>
    </div>
  );
}
