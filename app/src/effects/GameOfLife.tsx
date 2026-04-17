// GameOfLife.tsx — Conway's Game of Life on the GPU
//
// Motion GPU auto-injects storage buffer bindings at @group(1).
// DO NOT declare them manually in shader code — just use the variable names.
//
// Ping-pong via a doubled storage buffer:
//   cells[0 .. N-1]  = current generation  (fragment reads here)
//   cells[N .. 2N-1] = scratch / next gen
//
// pass1 reads lower half, writes upper half.
// pass2 reads upper half, writes lower half.
// Fragment always reads the lower half (fresh after pass2).

import { useRef } from 'react';
import { FragCanvas, useFrame } from '@motion-core/motion-gpu/react';
import { defineMaterial, ComputePass } from '@motion-core/motion-gpu';

const GRID  = 256;
const N     = GRID * GRID;    // 65 536 cells per half
const BYTES = N * 2 * 8;      // two halves × vec2f (alive f32 + age f32) × 4 bytes

// ---------------------------------------------------------------------------
// Material — fragment reads lower half of `cells`
// (system injects: @group(1) @binding(0) var<storage, read> cells: array<vec2f>)
// ---------------------------------------------------------------------------

const golMaterial = defineMaterial({
  fragment: `
    fn frag(uv: vec2f) -> vec4f {
      let col = u32(uv.x * 256.0);
      let row = u32(uv.y * 256.0);
      let idx = clamp(row * 256u + col, 0u, 65535u);

      let cell  = cells[idx];
      let alive = cell.x;
      let age   = cell.y;

      if (alive < 0.5) {
        return vec4f(0.04, 0.04, 0.09, 1.0);
      }

      // young → cyan-blue  mid → green  old → yellow
      let t  = clamp(age / 60.0, 0.0, 1.0);
      let c0 = vec3f(0.10, 0.60, 1.00);
      let c1 = vec3f(0.20, 1.00, 0.45);
      let c2 = vec3f(1.00, 0.92, 0.15);
      let lo = min(t * 2.0, 1.0);
      let hi = max(t * 2.0 - 1.0, 0.0);
      return vec4f(mix(mix(c0, c1, lo), c2, hi), 1.0);
    }
  `,
  storageBuffers: {
    // access defaults to "read-write" so compute passes can write to it.
    // Fragment shader always receives a read-only view regardless.
    cells: { size: BYTES, type: 'array<vec2f>' },
  },
});

// ---------------------------------------------------------------------------
// Pass 1 — lower half → upper half
// `cells` is injected by the system at @group(1) @binding(0) var<storage, read_write>
// ---------------------------------------------------------------------------

const computeLowerToUpper = new ComputePass({
  compute: `
fn nbr(idx: u32, dc: i32, dr: i32) -> f32 {
  let col = i32(idx % 256u);
  let row = i32(idx / 256u);
  let c   = ((col + dc) % 256 + 256) % 256;
  let r   = ((row + dr) % 256 + 256) % 256;
  return cells[u32(r * 256 + c)].x;
}

@compute @workgroup_size(64)
fn compute(@builtin(global_invocation_id) id: vec3u) {
  let idx = id.x;
  if (idx >= 65536u) { return; }

  let n = i32(
    nbr(idx,-1,-1) + nbr(idx, 0,-1) + nbr(idx, 1,-1) +
    nbr(idx,-1, 0) +                   nbr(idx, 1, 0) +
    nbr(idx,-1, 1) + nbr(idx, 0, 1) + nbr(idx, 1, 1) + 0.5
  );

  let alive = cells[idx].x > 0.5;
  let age   = cells[idx].y;
  var na = 0.0; var ng = 0.0;
  if (alive) { if (n == 2 || n == 3) { na = 1.0; ng = age + 1.0; } }
  else       { if (n == 3)           { na = 1.0; ng = 0.0; } }

  cells[65536u + idx] = vec2f(na, ng);
}
  `,
  dispatch: [1024, 1, 1],
});

// ---------------------------------------------------------------------------
// Pass 2 — upper half → lower half
// ---------------------------------------------------------------------------

const computeUpperToLower = new ComputePass({
  compute: `
fn nbr(idx: u32, dc: i32, dr: i32) -> f32 {
  let col = i32(idx % 256u);
  let row = i32(idx / 256u);
  let c   = ((col + dc) % 256 + 256) % 256;
  let r   = ((row + dr) % 256 + 256) % 256;
  return cells[65536u + u32(r * 256 + c)].x;
}

@compute @workgroup_size(64)
fn compute(@builtin(global_invocation_id) id: vec3u) {
  let idx = id.x;
  if (idx >= 65536u) { return; }

  let n = i32(
    nbr(idx,-1,-1) + nbr(idx, 0,-1) + nbr(idx, 1,-1) +
    nbr(idx,-1, 0) +                   nbr(idx, 1, 0) +
    nbr(idx,-1, 1) + nbr(idx, 0, 1) + nbr(idx, 1, 1) + 0.5
  );

  let alive = cells[65536u + idx].x > 0.5;
  let age   = cells[65536u + idx].y;
  var na = 0.0; var ng = 0.0;
  if (alive) { if (n == 2 || n == 3) { na = 1.0; ng = age + 1.0; } }
  else       { if (n == 3)           { na = 1.0; ng = 0.0; } }

  cells[idx] = vec2f(na, ng);
}
  `,
  dispatch: [1024, 1, 1],
});

// ---------------------------------------------------------------------------
// Runtime — seeds both halves on the first frame
// ---------------------------------------------------------------------------

function GoLRuntime() {
  const seeded = useRef(false);
  useFrame((state) => {
    if (!seeded.current) {
      seeded.current = true;
      const init = new Float32Array(N * 2 * 2);
      for (let i = 0; i < N; i++) {
        const alive = Math.random() < 0.35 ? 1.0 : 0.0;
        init[i * 2]           = alive;
        init[i * 2 + 1]       = 0.0;
        init[(N + i) * 2]     = alive;
        init[(N + i) * 2 + 1] = 0.0;
      }
      state.writeStorageBuffer('cells', init);
    }
  });
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GameOfLife() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0a14' }}>
      <FragCanvas
        material={golMaterial}
        passes={[computeLowerToUpper, computeUpperToLower]}
        clearColor={[0.04, 0.04, 0.09, 1]}
        renderMode="always"
      >
        <GoLRuntime />
      </FragCanvas>
    </div>
  );
}
