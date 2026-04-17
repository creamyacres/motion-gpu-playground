# Motion GPU — React Adapter Reference

## Imports

```typescript
import { FragCanvas, useMotionGPU, useFrame, usePointer, useTexture } from '@motion-core/motion-gpu/react';
import { defineMaterial, ShaderPass, BlitPass, ComputePass, PingPongComputePass } from '@motion-core/motion-gpu';
```

For advanced features (user context, scheduler helpers):
```typescript
import { useMotionGPUUserContext, applySchedulerPreset, captureSchedulerDebugSnapshot } from '@motion-core/motion-gpu/react/advanced';
```

## Component Structure

React hooks (`useFrame`, `usePointer`, etc.) must be called inside a child component rendered within `<FragCanvas>`. This is because the hooks depend on React context that FragCanvas provides.

```tsx
import { FragCanvas, useFrame, usePointer } from '@motion-core/motion-gpu/react';
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

// Runtime child — hooks work here
function Runtime() {
  useFrame((state) => {
    // Access state.time, state.delta, state.frame, state.resolution
    // Call state.setUniform(), state.setTexture(), etc.
  });
  return null;
}

// Main component
export default function MyShader() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <FragCanvas
        material={material}
        clearColor={[0, 0, 0, 1]}
        renderMode="always"
      >
        <Runtime />
      </FragCanvas>
    </div>
  );
}
```

### React-Specific Props

- `className` — CSS class on the `<canvas>` element (note: `className`, not `class`)
- `style` — `React.CSSProperties` object for inline styles
- `children` — `ReactNode`
- `errorRenderer` — `(report: MotionGPUErrorReport) => ReactNode` for custom error UI

### useFrame in React

```tsx
function Runtime() {
  useFrame((state) => {
    // state.time — elapsed seconds
    // state.delta — frame delta (clamped to maxDelta)
    // state.frame — frame count
    // state.resolution — [width, height] in physical pixels
    // state.setUniform(name, value) — update a uniform
    // state.setTexture(name, source) — update a texture
    // state.invalidate() — request re-render (for on-demand mode)
    // state.advance() — advance one frame (for manual mode)
    // state.writeStorageBuffer(name, data) — write to storage buffer
    // state.readStorageBuffer(name) — async read from storage buffer
  });
  return null;
}
```

### usePointer in React

```tsx
function Runtime() {
  const pointer = usePointer();

  useFrame((state) => {
    // pointer.x, pointer.y — normalized 0..1
    // pointer.isDown — boolean
    state.setUniform('mouse', [pointer.x, pointer.y]);
  });

  return null;
}
```

### useTexture in React

```tsx
function Runtime() {
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

  return null;
}
```

### Full Example: Mouse-Reactive Glow

```tsx
import { FragCanvas, useFrame, usePointer } from '@motion-core/motion-gpu/react';
import { defineMaterial } from '@motion-core/motion-gpu';

const glowMaterial = defineMaterial({
  fragment: `
    fn frag(uv: vec2f) -> vec4f {
      let t = motiongpuFrame.time;
      let m = mouse;
      let dist = distance(uv, m);
      let glow = intensity / (dist * dist + 0.001);

      let r = glow * (0.5 + 0.5 * sin(t));
      let g = glow * (0.5 + 0.5 * sin(t + 2.094));
      let b = glow * (0.5 + 0.5 * sin(t + 4.189));

      return vec4f(r, g, b, 1.0);
    }
  `,
  uniforms: {
    mouse: [0.5, 0.5],
    intensity: 0.015,
  },
});

function GlowRuntime() {
  const pointer = usePointer();

  useFrame((state) => {
    state.setUniform('mouse', [pointer.x, pointer.y]);
  });

  return null;
}

export default function GlowEffect() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <FragCanvas
        material={glowMaterial}
        clearColor={[0, 0, 0, 1]}
        renderMode="always"
        dpr={2}
      >
        <GlowRuntime />
      </FragCanvas>
    </div>
  );
}
```

### Full Example with Post-Processing

```tsx
import { FragCanvas, useFrame } from '@motion-core/motion-gpu/react';
import { defineMaterial, ShaderPass } from '@motion-core/motion-gpu';

const baseMaterial = defineMaterial({
  fragment: `
    fn frag(uv: vec2f) -> vec4f {
      let t = motiongpuFrame.time;
      let pattern = sin(uv.x * 20.0 + t) * cos(uv.y * 20.0 + t * 0.7);
      let color = vec3f(pattern * 0.5 + 0.5, pattern * 0.3 + 0.5, 0.8);
      return vec4f(color, 1.0);
    }
  `,
});

// ShaderPass uses fn shade(inputColor, uv), NOT fn frag(uv)
const vignettePass = new ShaderPass({
  fragment: `
    fn shade(inputColor: vec4f, uv: vec2f) -> vec4f {
      let vignette = smoothstep(0.8, 0.3, length(uv - 0.5));
      return vec4f(inputColor.rgb * vignette, inputColor.a);
    }
  `,
});

function Runtime() {
  useFrame(() => {});
  return null;
}

export default function PostProcessDemo() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <FragCanvas
        material={baseMaterial}
        passes={[vignettePass]}
        clearColor={[0, 0, 0, 1]}
      >
        <Runtime />
      </FragCanvas>
    </div>
  );
}
```
