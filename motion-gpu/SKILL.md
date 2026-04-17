---
name: motion-gpu
description: >
  Generate WebGPU shader components using Motion GPU's FragCanvas system. Use this skill whenever the user wants to create GPU-accelerated visual effects, fragment shaders, WGSL shader components, WebGPU renderings, or anything involving Motion GPU, FragCanvas, defineMaterial, or WGSL fragment shaders for Svelte, React, or Vue. Also trigger when the user describes a visual effect (gradient, noise, particles, glow, ripple, warp, etc.) and wants it rendered on a canvas via GPU shaders — or when they need compute shaders, storage buffers, ping-pong simulations, or multi-pass render pipelines with Motion GPU. Even if the user just says "make a cool shader" or "create a GPU effect", this skill applies.
---

# Motion GPU Component Generator

This skill generates ready-to-use Motion GPU components — WebGPU fragment shaders, compute pipelines, and multi-pass render graphs rendered through `<FragCanvas>` in Svelte, React, or Vue.

## What Motion GPU Is

Motion GPU is a WebGPU library (`@motion-core/motion-gpu`) with framework adapters for Svelte 5, React 18/19, and Vue 3. Its core abstractions:

1. **`defineMaterial()`** — declares an immutable material: fragment shader (WGSL), uniforms, textures, includes, defines, and storage buffers.
2. **`<FragCanvas>`** — the host component that manages the WebGPU lifecycle and renders frames.
3. **Hooks** — `useFrame`, `useMotionGPU`, `usePointer`, `useTexture` for per-frame state access inside FragCanvas children.
4. **Passes** — `ShaderPass`, `BlitPass`, `ComputePass`, `PingPongComputePass` for post-processing and GPU compute.
5. **Storage Buffers** — GPU-side data arrays for compute workloads, declared in the material and read/written from useFrame.
6. **Render Targets** — named off-screen surfaces for multi-pass rendering and intermediate buffers.

## Workflow

1. **Determine the framework.** Ask if not clear. Check for `.svelte`, `.tsx`, `.vue` files or `package.json`.
2. **Assess complexity.** Simple visual effect → basic material + FragCanvas. Multi-pass, compute, or simulation → read `references/advanced.md` first.
3. **Design the material.** Write the WGSL fragment shader. Decide on uniforms, textures, includes, defines, storage buffers.
4. **Assemble the component.** Wire into a FragCanvas component with hooks and passes.
5. **Write the file(s)** to the user's workspace folder.

## Reference Files

Read these before writing code:

- **Framework adapter** → `references/svelte.md`, `references/react.md`, or `references/vue.md`
- **Advanced patterns** → `references/advanced.md` (compute shaders, storage buffers, render targets, scheduling, ping-pong)

The framework files cover imports, component structure, hook usage, and full examples. The advanced file covers everything beyond basic fragment shaders.

## Hard Contracts (will throw if violated)

- Fragment function signature: `fn frag(uv: vec2f) -> vec4f`
- ShaderPass fragment: `fn shade(inputColor: vec4f, uv: vec2f) -> vec4f`
- ComputePass shader must contain `@compute @workgroup_size(...)` and `fn compute(...)`
- Storage buffer size must be > 0 and a multiple of 4
- All uniform/texture/define/include/storage buffer keys must be valid WGSL identifiers: `[A-Za-z_][A-Za-z0-9_]*`
- `renderMode` must be `'always'`, `'on-demand'`, or `'manual'`
- `maxDelta` must be > 0
- Render target `scale`, `width`, `height` must be finite and > 0
- Pass slots: `needsSwap: true` only valid for `source` → `target`; `canvas` is output-only
- Named slot reads/writes must reference declared `renderTargets`

## Built-in Uniforms

Automatically injected into every fragment shader — do NOT declare these yourself:

```wgsl
struct MotionGPUFrame {
  time: f32,        // elapsed seconds
  delta: f32,       // frame delta (clamped to maxDelta)
  frame: f32,       // frame count
  resolution: vec2f // canvas size in physical pixels
}
@group(0) @binding(0) var<uniform> motiongpuFrame: MotionGPUFrame;
```

## Material Definition

```typescript
import { defineMaterial } from '@motion-core/motion-gpu';

const material = defineMaterial({
  fragment: `
    fn frag(uv: vec2f) -> vec4f {
      let t = motiongpuFrame.time;
      return vec4f(uv, sin(t) * 0.5 + 0.5, 1.0);
    }
  `,
  uniforms: {
    speed: 1.0,             // f32
    color: [1, 0, 0],       // vec3f
    mouse: [0, 0],          // vec2f
    tint: [1, 1, 1, 1],     // vec4f
  },
  textures: {
    diffuse: {
      source: null,          // set at runtime via setTexture
      filter: 'linear',      // 'linear' | 'nearest'
      addressMode: 'repeat', // 'repeat' | 'clamp-to-edge' | 'mirror-repeat'
      flipY: true,
      generateMipmaps: false,
    }
  },
  includes: {
    noise: `
      fn hash(p: vec2f) -> f32 {
        let h = dot(p, vec2f(127.1, 311.7));
        return fract(sin(h) * 43758.5453);
      }
    `
  },
  defines: {
    ENABLE_GLOW: true,                    // const ENABLE_GLOW: bool = true;
    GLOW_INTENSITY: 0.02,                 // const GLOW_INTENSITY: f32 = 0.02;
    ITERATIONS: { type: 'i32', value: 8 }, // const ITERATIONS: i32 = 8;
  },
  storageBuffers: {
    particles: { size: 1024 },  // size in bytes, must be multiple of 4
  },
});
```

### Uniform Type Inference

| JS value | WGSL type |
|---|---|
| `1.0` (number) | `f32` |
| `[x, y]` | `vec2f` |
| `[x, y, z]` | `vec3f` |
| `[r, g, b, a]` | `vec4f` |
| `true` / `false` | not supported as uniform — use `defines` instead |

Uniforms update per-frame via buffer writes (no recompilation). Defines are baked into shader source — changing one requires a new material and full pipeline rebuild.

### Defines vs. Uniforms

| Use case | Defines | Uniforms |
|---|---|---|
| Feature toggles (ENABLE_X) | yes | no |
| Loop iteration counts | yes | no |
| Values that change every frame | no | yes |
| User interaction values | no | yes |
| Performance-critical constants | yes (enables compiler optimization) | — |

### Include System

`#include <name>` pulls in reusable WGSL chunks from the `includes` map. Includes can be recursive. Circular references throw.

```typescript
defineMaterial({
  fragment: `
    #include <sdf>
    fn frag(uv: vec2f) -> vec4f {
      let d = sdCircle(uv - 0.5, 0.3);
      return vec4f(vec3f(smoothstep(0.01, 0.0, d)), 1.0);
    }
  `,
  includes: {
    sdf: `
      fn sdCircle(p: vec2f, r: f32) -> f32 { return length(p) - r; }
      fn sdBox(p: vec2f, b: vec2f) -> f32 {
        let d = abs(p) - b;
        return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0);
      }
    `
  }
});
```

### Runtime State (useFrame)

Inside a child component of FragCanvas, `useFrame` runs every animation frame:

```typescript
useFrame((state) => {
  // Timing
  state.time;       // elapsed seconds
  state.delta;      // frame delta
  state.frame;      // frame count
  state.resolution; // [width, height]

  // Setters
  state.setUniform('speed', 2.0);
  state.setTexture('diffuse', imgElement);

  // Storage buffers
  state.writeStorageBuffer('particles', float32Array);
  const data = await state.readStorageBuffer('particles'); // async

  // Render mode control
  state.invalidate(); // request re-render (on-demand mode)
  state.advance();    // advance one frame (manual mode)
});
```

Setting an unknown uniform or texture name throws immediately.

### Pointer Input

```typescript
const pointer = usePointer();
// pointer.x, pointer.y — normalized 0..1
// pointer.isDown — boolean
```

Feed to shader via `useFrame` + `setUniform`.

### Texture Loading

```typescript
const texture = useTexture('/path/to/image.png', {
  filter: 'linear',
  addressMode: 'repeat',
  flipY: true,
});
// In useFrame: state.setTexture('myTex', texture.source);
```

### Post-Processing Passes

```typescript
import { ShaderPass } from '@motion-core/motion-gpu';

const vignettePass = new ShaderPass({
  fragment: `
    fn shade(inputColor: vec4f, uv: vec2f) -> vec4f {
      let vignette = smoothstep(0.8, 0.3, length(uv - 0.5));
      return vec4f(inputColor.rgb * vignette, inputColor.a);
    }
  `,
  // Entry point is fn shade(inputColor, uv) — NOT fn frag(uv)
});
```

Pass to FragCanvas: `passes={[vignettePass]}`. Passes execute in array order.

### Compute Shaders & Storage Buffers

For GPU compute workloads (particle simulations, physics, data processing), see `references/advanced.md`. Key points:

- Declare `storageBuffers` in `defineMaterial()` with `{ size: N }` (bytes, multiple of 4)
- Create a `ComputePass` with a WGSL compute shader containing `@compute @workgroup_size(X)` and `fn compute(...)`
- Use `PingPongComputePass` for iterative simulations that alternate read/write buffers
- Storage buffers get `STORAGE | COPY_DST | COPY_SRC` usage flags automatically
- Read/write from useFrame via `state.writeStorageBuffer()` / `state.readStorageBuffer()`

### Render Targets

Named off-screen surfaces for multi-pass rendering:

```typescript
// On FragCanvas:
renderTargets={{ halfRes: { scale: 0.5 }, hdr: { format: 'rgba16float' } }}
```

Passes can read from and write to named targets. See `references/advanced.md` for the full render graph model.

### Render Modes & Scheduling

| Mode | Behavior |
|---|---|
| `'always'` | Renders every frame (default). Use for continuous animation. |
| `'on-demand'` | Only renders when `state.invalidate()` is called. Use for interactive-only effects. |
| `'manual'` | Only renders when `state.advance()` is called. Use for step-by-step simulations. |

`autoRender={false}` is a hard gate — no rendering occurs regardless of mode.

### FragCanvas Props

| Prop | Type | Default |
|---|---|---|
| `material` | `FragMaterial` | required |
| `clearColor` | `[r,g,b,a]` | `[0,0,0,1]` |
| `outputColorSpace` | `'srgb' \| 'linear'` | `'srgb'` |
| `renderMode` | `'always' \| 'on-demand' \| 'manual'` | `'always'` |
| `autoRender` | `boolean` | `true` |
| `maxDelta` | `number` | `0.1` |
| `dpr` | `number` | `devicePixelRatio` |
| `passes` | `AnyPass[]` | `[]` |
| `renderTargets` | `RenderTargetDefinitionMap` | `{}` |
| `adapterOptions` | `GPURequestAdapterOptions` | `undefined` |
| `deviceDescriptor` | `GPUDeviceDescriptor` | `undefined` |
| `showErrorOverlay` | `boolean` | `true` |
| `onError` | `(report) => void` | `undefined` |
| `errorHistoryLimit` | `number` | `0` |

### What Triggers a Pipeline Rebuild vs. a Buffer Update

Understanding this prevents unnecessary recompilation:

| Change | Rebuild? | What happens instead |
|---|---|---|
| Shader source, uniform layout, texture bindings, storage buffers | Yes | Full renderer recreation |
| `outputColorSpace` | Yes | Full renderer recreation |
| Runtime uniform value (`setUniform`) | No | Dirty-range buffer write |
| Runtime texture source (`setTexture`) | No | Texture re-upload |
| Texture `fragmentVisible` change | Yes | Full renderer recreation |
| `writeStorageBuffer` | No | Pending write flushed next frame |
| Canvas resize | No | Render target resize + re-render |
| Clear color change | No | Applied next frame |

## Output Conventions

- Descriptive filenames: `GlowEffect.tsx`, `NoiseBackground.svelte`, `ParticleSimulation.vue`
- Brief comment at top explaining the effect
- Default export where appropriate
- Material in same file unless complex enough to separate
- Always include correct imports from `@motion-core/motion-gpu` and the framework adapter
- For compute/simulation components, separate the material + compute pass setup into its own file for clarity
