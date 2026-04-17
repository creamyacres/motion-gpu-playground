# Motion GPU — Vue Adapter Reference

## Imports

```typescript
import { FragCanvas, useMotionGPU, useFrame, usePointer, useTexture } from '@motion-core/motion-gpu/vue';
import { defineMaterial, ShaderPass, BlitPass, ComputePass, PingPongComputePass } from '@motion-core/motion-gpu';
```

For advanced features (user context, scheduler helpers):
```typescript
import { useMotionGPUUserContext, applySchedulerPreset, captureSchedulerDebugSnapshot } from '@motion-core/motion-gpu/vue/advanced';
```

## Component Structure

Vue uses provide/inject under the hood. Hooks (`useFrame`, `usePointer`, etc.) must be called inside a child component rendered in the default slot of `<FragCanvas>`.

**Runtime.vue** (child component):
```vue
<script setup lang="ts">
import { useFrame, usePointer } from '@motion-core/motion-gpu/vue';

const pointer = usePointer();

useFrame((state) => {
  state.setUniform('mouse', [pointer.x, pointer.y]);
});
</script>

<template>
  <!-- No visible DOM needed -->
</template>
```

**MyShader.vue** (parent component):
```vue
<script setup lang="ts">
import { FragCanvas } from '@motion-core/motion-gpu/vue';
import { defineMaterial } from '@motion-core/motion-gpu';
import Runtime from './Runtime.vue';

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

<template>
  <div style="width: 100%; height: 100vh">
    <FragCanvas
      :material="material"
      :clearColor="[0, 0, 0, 1]"
      renderMode="always"
    >
      <Runtime />
    </FragCanvas>
  </div>
</template>
```

### Vue-Specific Props

- `canvasClass` — CSS class on the `<canvas>` element (note: `canvasClass`, not `class` or `className`)
- `canvasStyle` — `string | Record<string, string | number>` for inline styles on the canvas
- Default slot — where child components with hooks go
- `#errorRenderer="{ report }"` — scoped slot for custom error UI

### useFrame in Vue

```vue
<script setup lang="ts">
import { useFrame } from '@motion-core/motion-gpu/vue';

useFrame((state) => {
  // state.time — elapsed seconds
  // state.delta — frame delta (clamped to maxDelta)
  // state.frame — frame count
  // state.resolution — [width, height] in physical pixels
  // state.setUniform(name, value)
  // state.setTexture(name, source)
  // state.invalidate()
  // state.advance()
  // state.writeStorageBuffer(name, data)
  // state.readStorageBuffer(name)
});
</script>
```

### usePointer in Vue

```vue
<script setup lang="ts">
import { useFrame, usePointer } from '@motion-core/motion-gpu/vue';

const pointer = usePointer();

useFrame((state) => {
  state.setUniform('mouse', [pointer.x, pointer.y]);
});
</script>
```

### useTexture in Vue

```vue
<script setup lang="ts">
import { useFrame, useTexture } from '@motion-core/motion-gpu/vue';

const texture = useTexture('/textures/noise.png', {
  filter: 'linear',
  addressMode: 'repeat',
  flipY: true,
});

useFrame((state) => {
  if (texture.source) {
    state.setTexture('noiseTex', texture.source);
  }
});
</script>
```

### Full Example: Animated Plasma

**PlasmaMaterial.ts** (shared material):
```typescript
import { defineMaterial } from '@motion-core/motion-gpu';

export const plasmaMaterial = defineMaterial({
  fragment: `
    fn frag(uv: vec2f) -> vec4f {
      let t = motiongpuFrame.time;
      let res = motiongpuFrame.resolution;
      let aspect = res.x / res.y;
      var p = uv;
      p.x *= aspect;

      var color = 0.0;
      color += sin(p.x * 10.0 + t);
      color += sin((p.y * 10.0 + t) * 0.5);
      color += sin((p.x * 10.0 + p.y * 10.0 + t) * 0.33);
      let cx = p.x + 0.5 * sin(t * 0.33);
      let cy = p.y + 0.5 * cos(t * 0.5);
      color += sin(sqrt(cx * cx + cy * cy + 1.0) * 10.0 + t);
      color *= 0.25;

      let r = sin(color * 3.14159) * 0.5 + 0.5;
      let g = sin(color * 3.14159 + 2.094) * 0.5 + 0.5;
      let b = sin(color * 3.14159 + 4.189) * 0.5 + 0.5;

      return vec4f(r, g, b, 1.0);
    }
  `,
  uniforms: {
    mouse: [0.5, 0.5],
  },
});
```

**PlasmaRuntime.vue**:
```vue
<script setup lang="ts">
import { useFrame, usePointer } from '@motion-core/motion-gpu/vue';

const pointer = usePointer();

useFrame((state) => {
  state.setUniform('mouse', [pointer.x, pointer.y]);
});
</script>

<template></template>
```

**PlasmaEffect.vue**:
```vue
<script setup lang="ts">
import { FragCanvas } from '@motion-core/motion-gpu/vue';
import { plasmaMaterial } from './PlasmaMaterial';
import PlasmaRuntime from './PlasmaRuntime.vue';
</script>

<template>
  <div style="width: 100%; height: 100vh">
    <FragCanvas
      :material="plasmaMaterial"
      :clearColor="[0, 0, 0, 1]"
      renderMode="always"
      :dpr="2"
    >
      <PlasmaRuntime />
    </FragCanvas>
  </div>
</template>
```

### Custom Error Renderer in Vue

```vue
<template>
  <FragCanvas :material="material">
    <Runtime />
    <template #errorRenderer="{ report }">
      <aside class="my-error-banner">
        <strong>{{ report.title }}</strong>
        <p>{{ report.message }}</p>
      </aside>
    </template>
  </FragCanvas>
</template>
```
