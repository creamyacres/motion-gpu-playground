# Motion GPU — Svelte Adapter Reference

## Imports

```typescript
import { FragCanvas, useMotionGPU, useFrame, usePointer, useTexture } from '@motion-core/motion-gpu/svelte';
import { defineMaterial, ShaderPass, BlitPass, ComputePass, PingPongComputePass } from '@motion-core/motion-gpu';
```

For advanced features (user context, scheduler helpers):
```typescript
import { useMotionGPUUserContext, applySchedulerPreset, captureSchedulerDebugSnapshot } from '@motion-core/motion-gpu/svelte/advanced';
```

## Component Structure

Svelte uses snippets for children and error renderers. The runtime child component must be defined separately so that hooks have access to the FragCanvas context.

```svelte
<script lang="ts">
  import { FragCanvas, useFrame, usePointer } from '@motion-core/motion-gpu/svelte';
  import { defineMaterial } from '@motion-core/motion-gpu';

  const material = defineMaterial({
    fragment: `
      fn frag(uv: vec2f) -> vec4f {
        let t = motiongpuFrame.time;
        let color = 0.5 + 0.5 * cos(t + uv.xyx + vec3f(0.0, 2.0, 4.0));
        return vec4f(color, 1.0);
      }
    `,
  });
</script>

<!-- FragCanvas with a Runtime child -->
<FragCanvas
  {material}
  clearColor={[0, 0, 0, 1]}
  renderMode="always"
>
  <Runtime />
</FragCanvas>

<!-- The Runtime child uses hooks inside FragCanvas context -->
{#snippet Runtime()}
  <!-- useFrame, usePointer, etc. work here -->
{/snippet}
```

### Using Hooks in Svelte

Hooks must be called during component initialization inside a child of FragCanvas. In Svelte 5, you typically create a separate component:

**Runtime.svelte** (child component):
```svelte
<script lang="ts">
  import { useFrame, usePointer } from '@motion-core/motion-gpu/svelte';

  const pointer = usePointer();

  useFrame((state) => {
    state.setUniform('mouse', [pointer.x, pointer.y]);
  });
</script>
```

**App.svelte** (parent):
```svelte
<script lang="ts">
  import { FragCanvas } from '@motion-core/motion-gpu/svelte';
  import { defineMaterial } from '@motion-core/motion-gpu';
  import Runtime from './Runtime.svelte';

  const material = defineMaterial({
    fragment: `
      fn frag(uv: vec2f) -> vec4f {
        let dist = distance(uv, mouse);
        let glow = 0.02 / (dist * dist + 0.001);
        return vec4f(vec3f(glow * 0.3, glow * 0.5, glow), 1.0);
      }
    `,
    uniforms: { mouse: [0.5, 0.5] },
  });
</script>

<div style="width: 100%; height: 100vh;">
  <FragCanvas {material} clearColor={[0, 0, 0, 1]}>
    <Runtime />
  </FragCanvas>
</div>
```

### Svelte-Specific Props

- `class` — CSS class on the `<canvas>` element
- `style` — inline styles as a string
- `children` — Svelte snippet
- `errorRenderer` — `Snippet<[MotionGPUErrorReport]>` for custom error UI

### Full Example: Interactive Noise

**NoiseMaterial.ts**:
```typescript
import { defineMaterial } from '@motion-core/motion-gpu';

export const noiseMaterial = defineMaterial({
  fragment: `
    #include <noise>

    fn frag(uv: vec2f) -> vec4f {
      let t = motiongpuFrame.time;
      let scale = 4.0;
      let n = fbm(uv * scale + vec2f(t * 0.3, t * 0.2));
      let color = mix(vec3f(0.05, 0.0, 0.15), vec3f(0.2, 0.5, 1.0), n);
      return vec4f(color, 1.0);
    }
  `,
  includes: {
    noise: `
      fn hash(p: vec2f) -> f32 {
        let h = dot(p, vec2f(127.1, 311.7));
        return fract(sin(h) * 43758.5453);
      }
      fn noise2d(p: vec2f) -> f32 {
        let i = floor(p);
        let f = fract(p);
        let u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x),
          mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
          u.y
        );
      }
      fn fbm(p: vec2f) -> f32 {
        var value = 0.0;
        var amplitude = 0.5;
        var pos = p;
        for (var i = 0; i < 6; i++) {
          value += amplitude * noise2d(pos);
          pos *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }
    `
  },
  uniforms: {
    mouse: [0.5, 0.5],
  },
});
```

**NoiseBackground.svelte**:
```svelte
<script lang="ts">
  import { FragCanvas } from '@motion-core/motion-gpu/svelte';
  import { noiseMaterial } from './NoiseMaterial';
  import NoiseRuntime from './NoiseRuntime.svelte';
</script>

<div style="width: 100%; height: 100vh;">
  <FragCanvas
    material={noiseMaterial}
    clearColor={[0, 0, 0, 1]}
    renderMode="always"
    dpr={2}
  >
    <NoiseRuntime />
  </FragCanvas>
</div>
```
