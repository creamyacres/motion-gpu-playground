# Motion GPU — Advanced Patterns

Read this file when the user needs compute shaders, storage buffers, render targets, ping-pong simulations, multi-pass render graphs, or advanced scheduling.

## Compute Shaders

Compute shaders run arbitrary GPU workloads outside the fragment rendering pipeline. They're used for particle simulations, physics, image processing, or any data-parallel task.

### ComputePass

```typescript
import { ComputePass } from '@motion-core/motion-gpu';

const computePass = new ComputePass({
  shader: `
    @group(0) @binding(0) var<storage, read_write> data: array<f32>;

    @compute @workgroup_size(64)
    fn compute(@builtin(global_invocation_id) id: vec3u) {
      let index = id.x;
      if (index < arrayLength(&data)) {
        data[index] = data[index] * 2.0;
      }
    }
  `,
  workgroupCount: [16, 1, 1], // dispatches 16 * 64 = 1024 threads
});
```

**Hard contracts for compute shaders:**
- Shader must contain `@compute @workgroup_size(...)` decorator
- Shader must define `fn compute(...)`
- Workgroup size values must be positive integers

### PingPongComputePass

For iterative simulations that need to read from one buffer and write to another, alternating each iteration:

```typescript
import { PingPongComputePass } from '@motion-core/motion-gpu';

const pingPongPass = new PingPongComputePass({
  shader: `
    @group(0) @binding(0) var<storage, read> inputData: array<vec4f>;
    @group(0) @binding(1) var<storage, read_write> outputData: array<vec4f>;

    @compute @workgroup_size(64)
    fn compute(@builtin(global_invocation_id) id: vec3u) {
      let i = id.x;
      if (i < arrayLength(&inputData)) {
        // Read from input, write to output
        let pos = inputData[i];
        let vel = vec4f(pos.z, pos.w, 0.0, 0.0);
        outputData[i] = pos + vel * 0.016;
      }
    }
  `,
  iterations: 4,           // runs 4 times per frame, alternating read/write
  workgroupCount: [16, 1, 1],
});
```

PingPongComputePass automatically:
- Alternates A→B / B→A bind groups across iterations
- Reuses cached bind-group layouts for stable resource topology
- Shares the same command encoder and submit queue as render passes

### Compute passes in the render graph

Compute passes coexist in the same `passes` array as render passes:

```typescript
<FragCanvas
  material={material}
  passes={[computePass, shaderPass1, shaderPass2]}
>
```

Compute passes have `kind: 'compute'` and do NOT participate in slot routing (source/target/canvas). They execute their compute pipelines and share the command encoder with render passes.

## Storage Buffers

Storage buffers are GPU-side data arrays for compute workloads. They're declared in the material and accessed from both shaders and JavaScript.

### Declaring Storage Buffers

```typescript
const material = defineMaterial({
  fragment: `
    fn frag(uv: vec2f) -> vec4f {
      // Fragment shader can also read storage buffers if needed
      return vec4f(uv, 0.5, 1.0);
    }
  `,
  storageBuffers: {
    particles: { size: 4096 },  // 4096 bytes (must be multiple of 4)
    velocities: { size: 4096 },
  },
});
```

**Constraints:**
- `size` must be > 0 and a multiple of 4
- Key must be a valid WGSL identifier
- Buffers are allocated with `STORAGE | COPY_DST | COPY_SRC` usage flags
- Buffers are cleaned up on renderer destroy

### Reading and Writing from JavaScript

```typescript
useFrame(async (state) => {
  // Write data to GPU
  const positions = new Float32Array([1.0, 2.0, 3.0, 4.0]);
  state.writeStorageBuffer('particles', positions);

  // Read data back from GPU (async — uses staging buffer copy)
  const result = await state.readStorageBuffer('particles');
  // result is an ArrayBuffer
});
```

- `writeStorageBuffer` queues a pending write, flushed next frame
- `readStorageBuffer` is async (GPU → staging buffer → CPU copy)
- Setting an unknown buffer name throws immediately

## Render Targets

Named off-screen surfaces enable multi-pass rendering with intermediate buffers.

### Declaring Render Targets

```typescript
<FragCanvas
  material={material}
  renderTargets={{
    halfRes: { scale: 0.5 },                           // half canvas resolution
    compute: { width: 256, height: 256, format: 'rgba16float' }, // fixed size
    hdr: { format: 'rgba16float' },                     // full resolution, 16-bit float
  }}
  passes={[blurPass, toneMapPass]}
>
```

### Render Target Options

| Property | Type | Description |
|---|---|---|
| `scale` | `number` | Fraction of canvas resolution (e.g., 0.5 = half size) |
| `width` | `number` | Fixed pixel width |
| `height` | `number` | Fixed pixel height |
| `format` | `string` | GPU texture format (default: canvas format). Use `'rgba16float'` for HDR. |

All values must be finite and > 0.

### Slot System

The render graph uses a slot system for routing data between passes:

| Slot | Purpose |
|---|---|
| `source` | Current scene/result surface |
| `target` | Ping-pong companion (allocated when needed) |
| `canvas` | Final presentation surface (output-only) |
| `<targetName>` | Named off-screen surface from `renderTargets` |

**Routing rules:**
- Without passes, the base shader renders directly to `canvas`
- `needsSwap: true` is only valid for `source` → `target` routing
- `canvas` is output-only (can write to it, cannot read from it in a later pass)
- Named slot reads/writes must reference declared `renderTargets`
- Inputs must be written before first read

After all passes execute, if the final output isn't `canvas`, the renderer blits the resolved final surface to canvas automatically.

### ShaderPass with Named Targets

```typescript
const blurPass = new ShaderPass({
  fragment: `
    fn shade(inputColor: vec4f, uv: vec2f) -> vec4f {
      // blur logic using inputColor
      return blurredColor;
    }
  `,
  input: 'source',
  output: 'halfRes',     // writes to the named render target
});

const compositePass = new ShaderPass({
  fragment: `
    fn shade(inputColor: vec4f, uv: vec2f) -> vec4f {
      // composite from halfRes back to canvas
      return inputColor;
    }
  `,
  input: 'halfRes',
  output: 'canvas',
});
```

### BlitPass

Simple copy between surfaces without shader processing:

```typescript
import { BlitPass } from '@motion-core/motion-gpu';

const blit = new BlitPass({
  input: 'source',
  output: 'canvas',
});
```

## Render Modes & Scheduling

### Render Mode Patterns

**Always (default):** Continuous animation loop. Every frame renders.
```typescript
<FragCanvas material={m} renderMode="always" />
```

**On-demand:** Only re-renders when explicitly invalidated. Good for interactive-only effects that shouldn't waste GPU cycles when nothing changes.
```typescript
// In useFrame:
useFrame((state) => {
  if (pointer.isDown) {
    state.setUniform('mouse', [pointer.x, pointer.y]);
    state.invalidate(); // triggers a re-render
  }
});
```

**Manual:** Only renders when `advance()` is called. Used for step-by-step simulations or frame-precise control.
```typescript
// In useFrame:
useFrame((state) => {
  if (shouldStep) {
    state.advance(); // renders exactly one frame
  }
});
```

### Frame Scheduler Architecture

The scheduler is a DAG-based execution engine. Tasks registered via `useFrame` run in topological order based on stage and dependency declarations.

```typescript
// useFrame with scheduling options
useFrame((state) => {
  // task logic
}, {
  key: 'physics',
  stage: 'simulation',
  before: ['rendering'],  // run before tasks in 'rendering' stage
});
```

**Concepts:**
- **Task:** A useFrame callback with a key, stage, invalidation policy, and dependency edges
- **Stage:** An ordered group of tasks with before/after dependencies and optional wrapper callbacks
- **Dependencies:** `before` / `after` on both tasks and stages. Cycles throw.

### Error Handling

All errors are normalized into a `MotionGPUErrorReport` with:
- `code` — stable error category for telemetry
- `severity` — `'error'` or `'fatal'`
- `recoverable` — boolean
- `title`, `message`, `hint` — human-readable
- `source` — for shader compile errors: component, location, line, column, code snippet with highlights
- `context` — material signature, pass graph info, active render targets

```typescript
<FragCanvas
  material={material}
  onError={(report) => console.error(report.title, report.hint)}
  showErrorOverlay={true}
  errorHistoryLimit={20}
  onErrorHistory={(history) => sendToTelemetry(history)}
/>
```

Renderer creation retries with exponential backoff (250ms → 500ms → 1s → ... → 8s cap). Backoff resets when the pipeline signature changes.

## Full Example: Particle Simulation (React)

This combines compute shaders, storage buffers, and fragment rendering:

```tsx
import { FragCanvas, useFrame } from '@motion-core/motion-gpu/react';
import { defineMaterial, ComputePass } from '@motion-core/motion-gpu';

const PARTICLE_COUNT = 1024;
const BUFFER_SIZE = PARTICLE_COUNT * 4 * 4; // 4 floats per particle (x, y, vx, vy)

const material = defineMaterial({
  fragment: `
    fn frag(uv: vec2f) -> vec4f {
      // Visualize particles as dots
      let t = motiongpuFrame.time;
      var color = vec3f(0.02, 0.01, 0.05); // dark bg

      // Simple particle visualization using uniforms
      // (In production, you'd read from storage buffer in the shader)
      return vec4f(color, 1.0);
    }
  `,
  storageBuffers: {
    particles: { size: BUFFER_SIZE },
  },
});

const updatePass = new ComputePass({
  shader: `
    struct Particle {
      pos: vec2f,
      vel: vec2f,
    }

    @group(0) @binding(0) var<storage, read_write> particles: array<Particle>;

    @compute @workgroup_size(64)
    fn compute(@builtin(global_invocation_id) id: vec3u) {
      let i = id.x;
      if (i >= arrayLength(&particles)) { return; }

      var p = particles[i];

      // Simple gravity toward center
      let center = vec2f(0.5, 0.5);
      let dir = center - p.pos;
      let dist = length(dir);
      let force = normalize(dir) * 0.001 / (dist + 0.01);

      p.vel = p.vel + force;
      p.vel = p.vel * 0.99; // damping
      p.pos = p.pos + p.vel;

      // Wrap around
      p.pos = fract(p.pos);

      particles[i] = p;
    }
  `,
  workgroupCount: [Math.ceil(PARTICLE_COUNT / 64), 1, 1],
});

function ParticleRuntime() {
  useFrame((state) => {
    // Initialize particles on first frame
    if (state.frame < 2) {
      const init = new Float32Array(PARTICLE_COUNT * 4);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        init[i * 4 + 0] = Math.random();     // x
        init[i * 4 + 1] = Math.random();     // y
        init[i * 4 + 2] = (Math.random() - 0.5) * 0.01; // vx
        init[i * 4 + 3] = (Math.random() - 0.5) * 0.01; // vy
      }
      state.writeStorageBuffer('particles', init);
    }
  });
  return null;
}

export default function ParticleSimulation() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <FragCanvas
        material={material}
        passes={[updatePass]}
        clearColor={[0.02, 0.01, 0.05, 1]}
        renderMode="always"
        adapterOptions={{ powerPreference: 'high-performance' }}
      >
        <ParticleRuntime />
      </FragCanvas>
    </div>
  );
}
```

## Full Example: HDR Multi-Pass Bloom (Svelte)

```svelte
<script lang="ts">
  import { FragCanvas } from '@motion-core/motion-gpu/svelte';
  import { defineMaterial, ShaderPass } from '@motion-core/motion-gpu';

  const material = defineMaterial({
    fragment: `
      fn frag(uv: vec2f) -> vec4f {
        let t = motiongpuFrame.time;
        let center = vec2f(0.5 + sin(t) * 0.2, 0.5 + cos(t * 0.7) * 0.2);
        let dist = distance(uv, center);
        let brightness = 2.0 / (dist * dist * 200.0 + 1.0);
        return vec4f(vec3f(brightness * 0.5, brightness * 0.8, brightness), 1.0);
      }
    `,
  });

  // Horizontal blur pass writing to half-res target
  const blurH = new ShaderPass({
    fragment: `
      fn shade(inputColor: vec4f, uv: vec2f) -> vec4f {
        let texelSize = 1.0 / motiongpuFrame.resolution.x;
        var color = inputColor.rgb * 0.4;
        color += inputColor.rgb * 0.15; // simplified blur
        return vec4f(color, 1.0);
      }
    `,
  });

  // Tone mapping pass
  const toneMap = new ShaderPass({
    fragment: `
      fn shade(inputColor: vec4f, uv: vec2f) -> vec4f {
        // Reinhard tone mapping
        let mapped = inputColor.rgb / (inputColor.rgb + vec3f(1.0));
        let gammaCorrected = pow(mapped, vec3f(1.0 / 2.2));
        return vec4f(gammaCorrected, 1.0);
      }
    `,
  });
</script>

<div style="width: 100%; height: 100vh;">
  <FragCanvas
    {material}
    clearColor={[0, 0, 0, 1]}
    outputColorSpace="linear"
    renderTargets={{ hdr: { format: 'rgba16float' } }}
    passes={[blurH, toneMap]}
    dpr={2}
  >
    <Runtime />
  </FragCanvas>
</div>

{#snippet Runtime()}
{/snippet}
```
