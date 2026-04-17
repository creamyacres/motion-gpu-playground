import { useState, CSSProperties } from 'react';
import { effects } from './effects';
import type { EffectMeta } from './effects';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const S = {
  root: {
    display: 'flex',
    width: '100%',
    height: '100%',
    background: '#0a0a0a',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: '#ccc',
    overflow: 'hidden',
  } satisfies CSSProperties,

  sidebar: {
    width: 232,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #1e1e1e',
    background: '#0d0d0d',
  } satisfies CSSProperties,

  sidebarHeader: {
    padding: '18px 20px 14px',
    borderBottom: '1px solid #1a1a1a',
  } satisfies CSSProperties,

  logoLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#444',
    marginBottom: 3,
  } satisfies CSSProperties,

  logoTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#e8e8e8',
    letterSpacing: '-0.01em',
  } satisfies CSSProperties,

  sectionLabel: {
    padding: '14px 20px 6px',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#3a3a3a',
  } satisfies CSSProperties,

  nav: {
    flex: 1,
    overflowY: 'auto' as const,
    paddingBottom: 12,
  } satisfies CSSProperties,

  effectBtn: (active: boolean): CSSProperties => ({
    display: 'block',
    width: '100%',
    padding: '9px 20px',
    background: active ? '#161616' : 'transparent',
    border: 'none',
    borderLeft: `2px solid ${active ? '#c96a20' : 'transparent'}`,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.1s',
  }),

  effectName: (active: boolean): CSSProperties => ({
    fontSize: 13,
    fontWeight: 500,
    color: active ? '#e8e8e8' : '#888',
    marginBottom: 2,
    letterSpacing: '-0.01em',
  }),

  effectDesc: {
    fontSize: 11,
    color: '#3d3d3d',
    lineHeight: 1.4,
  } satisfies CSSProperties,

  tags: {
    display: 'flex',
    gap: 4,
    marginTop: 5,
    flexWrap: 'wrap' as const,
  } satisfies CSSProperties,

  tag: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: '#3a3a3a',
    background: '#181818',
    border: '1px solid #222',
    borderRadius: 3,
    padding: '1px 5px',
  } satisfies CSSProperties,

  sidebarFooter: {
    padding: '12px 20px',
    borderTop: '1px solid #1a1a1a',
    fontSize: 11,
    color: '#2e2e2e',
  } satisfies CSSProperties,

  main: {
    flex: 1,
    position: 'relative' as const,
    overflow: 'hidden',
  } satisfies CSSProperties,

  badge: {
    position: 'absolute' as const,
    bottom: 16,
    right: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '5px 12px',
    pointerEvents: 'none' as const,
  } satisfies CSSProperties,

  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#c96a20',
    boxShadow: '0 0 6px #c96a2088',
  } satisfies CSSProperties,

  badgeText: {
    fontSize: 11,
    fontWeight: 500,
    color: '#666',
    letterSpacing: '0.03em',
  } satisfies CSSProperties,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EffectItem({ effect, active, onClick }: {
  effect: EffectMeta;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button style={S.effectBtn(active)} onClick={onClick}>
      <div style={S.effectName(active)}>{effect.name}</div>
      <div style={S.effectDesc}>{effect.description}</div>
      {active && (
        <div style={S.tags}>
          {effect.tags.map(tag => (
            <span key={tag} style={S.tag}>{tag}</span>
          ))}
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main playground
// ---------------------------------------------------------------------------

export default function Playground() {
  const [activeId, setActiveId] = useState(effects[0].id);
  const active = effects.find(e => e.id === activeId) ?? effects[0];
  const ActiveComponent = active.component;

  return (
    <div style={S.root}>
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside style={S.sidebar}>
        <div style={S.sidebarHeader}>
          <div style={S.logoLabel}>Motion GPU</div>
          <div style={S.logoTitle}>Playground</div>
        </div>

        <div style={S.sectionLabel}>Effects · {effects.length}</div>

        <nav style={S.nav}>
          {effects.map(effect => (
            <EffectItem
              key={effect.id}
              effect={effect}
              active={effect.id === activeId}
              onClick={() => setActiveId(effect.id)}
            />
          ))}
        </nav>

        <div style={S.sidebarFooter}>
          Add effects in <code style={{ color: '#3a3a3a', fontSize: 10 }}>src/effects/index.ts</code>
        </div>
      </aside>

      {/* ── Canvas ──────────────────────────────────────────────────── */}
      <main style={S.main}>
        <ActiveComponent />

        <div style={S.badge}>
          <div style={S.badgeDot} />
          <span style={S.badgeText}>{active.name}</span>
        </div>
      </main>
    </div>
  );
}
