// LavaLamp.tsx
// GPU-rendered lava lamp: warm-colored metaball blobs that rise, merge, and split
// Uses the inverse-distance-squared metaball field technique

import { FragCanvas, useFrame } from '@motion-core/motion-gpu/react';
import { defineMaterial, ShaderPass } from '@motion-core/motion-gpu';

const lavaMaterial = defineMaterial({
  fragment: `
    fn frag(uv: vec2f) -> vec4f {
      let t   = motiongpuFrame.time * 0.5;
      let res = motiongpuFrame.resolution;

      // Aspect-corrected, centered coordinate space so blobs stay circular
      let aspect = res.x / res.y;
      let ap = vec2f((uv.x - 0.5) * aspect, uv.y - 0.5);

      // ------------------------------------------------------------------
      // Six blobs — independent x-wobble and vertical rise cycle per blob.
      // Centers are in the same aspect-corrected space as ap.
      // ------------------------------------------------------------------

      let b0 = vec2f(0.13 * sin(t * 0.71 + 0.00) * aspect, 0.32 * sin(t * 0.41 + 0.00));
      let b1 = vec2f(0.17 * sin(t * 0.53 + 2.09) * aspect, 0.38 * sin(t * 0.37 + 2.09));
      let b2 = vec2f(0.09 * sin(t * 0.67 + 4.19) * aspect, 0.35 * sin(t * 0.61 + 4.19));
      let b3 = vec2f(0.19 * cos(t * 0.43 + 1.05) * aspect, 0.40 * cos(t * 0.47 + 1.05));
      let b4 = vec2f(0.15 * cos(t * 0.59 + 3.14) * aspect, 0.30 * sin(t * 0.29 + 3.14));
      let b5 = vec2f(0.11 * sin(t * 0.79 + 5.24) * aspect, 0.42 * cos(t * 0.33 + 5.24));

      // ------------------------------------------------------------------
      // Metaball field: sum of r²/d² per blob.
      // Blobs that drift close will sum past the threshold and merge.
      // ------------------------------------------------------------------

      var field = 0.0;
      field += 0.0100 / max(dot(ap - b0, ap - b0), 0.0001); // r = 0.10
      field += 0.0081 / max(dot(ap - b1, ap - b1), 0.0001); // r = 0.09
      field += 0.0064 / max(dot(ap - b2, ap - b2), 0.0001); // r = 0.08
      field += 0.0121 / max(dot(ap - b3, ap - b3), 0.0001); // r = 0.11
      field += 0.0081 / max(dot(ap - b4, ap - b4), 0.0001); // r = 0.09
      field += 0.0064 / max(dot(ap - b5, ap - b5), 0.0001); // r = 0.08

      let inside = smoothstep(0.90, 1.10, field);
      let glow   = smoothstep(0.0,  0.90, field) * 0.30;

      // ------------------------------------------------------------------
      // Warm color palette: red-orange at base → orange → yellow-gold at top
      // ------------------------------------------------------------------

      let bg  = vec3f(0.055, 0.025, 0.006);
      let c0  = vec3f(0.88,  0.13,  0.01);
      let c1  = vec3f(1.00,  0.50,  0.04);
      let c2  = vec3f(1.00,  0.83,  0.22);
      let h   = uv.y;
      let blobColor  = mix(mix(c0, c1, clamp(h * 1.6, 0.0, 1.0)), c2, h * h * 0.9);
      let brightness = 1.0 + field * 0.07;

      var color = bg;
      color += vec3f(0.30, 0.08, 0.01) * glow;
      color  = mix(color, blobColor * brightness, inside);

      return vec4f(color, 1.0);
    }
  `,
});

const vignettePass = new ShaderPass({
  fragment: `
    fn shade(inputColor: vec4f, uv: vec2f) -> vec4f {
      let d = length(uv - 0.5);
      let vignette = 1.0 - smoothstep(0.40, 0.78, d) * 0.72;
      return vec4f(inputColor.rgb * vignette, inputColor.a);
    }
  `,
});

function LavaRuntime() {
  useFrame(() => {});
  return null;
}

export default function LavaLamp() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#0e0603' }}>
      <FragCanvas
        material={lavaMaterial}
        passes={[vignettePass]}
        clearColor={[0.022, 0.010, 0.002, 1]}
        renderMode="always"
      >
        <LavaRuntime />
      </FragCanvas>
    </div>
  );
}
