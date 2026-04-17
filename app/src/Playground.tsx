import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { effects } from './effects';
import type { EffectMeta } from './effects';

// ---------------------------------------------------------------------------
// Mobile breakpoint hook
// ---------------------------------------------------------------------------

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

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

  // ── Desktop sidebar ──────────────────────────────────────────────────────

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

  // ── Canvas ───────────────────────────────────────────────────────────────

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

  // ── Mobile bottom bar ────────────────────────────────────────────────────

  mobileBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    background: 'rgba(10,10,10,0.8)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    zIndex: 20,
  } satisfies CSSProperties,

  mobileBarLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 1,
  } satisfies CSSProperties,

  mobileBarLabel: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#444',
  } satisfies CSSProperties,

  mobileBarName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#e8e8e8',
    letterSpacing: '-0.01em',
  } satisfies CSSProperties,

  mobileMenuBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '7px 12px',
    cursor: 'pointer',
    color: '#888',
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '0.02em',
  } satisfies CSSProperties,

  // ── Mobile sheet ─────────────────────────────────────────────────────────

  sheetBackdrop: (open: boolean): CSSProperties => ({
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 30,
    opacity: open ? 1 : 0,
    pointerEvents: open ? 'auto' : 'none',
    transition: 'opacity 0.25s',
  }),

  sheet: (open: boolean): CSSProperties => ({
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    background: '#0d0d0d',
    borderTop: '1px solid #222',
    borderRadius: '14px 14px 0 0',
    transform: open ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
    maxHeight: '75vh',
    display: 'flex',
    flexDirection: 'column',
  }),

  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    background: '#333',
    margin: '12px auto 0',
    flexShrink: 0,
  } satisfies CSSProperties,

  sheetHeader: {
    padding: '14px 20px 10px',
    borderBottom: '1px solid #1a1a1a',
    flexShrink: 0,
  } satisfies CSSProperties,

  sheetTitle: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#444',
  } satisfies CSSProperties,

  sheetNav: {
    overflowY: 'auto' as const,
    paddingBottom: 32,
  } satisfies CSSProperties,

  sheetEffectBtn: (active: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '14px 20px',
    background: active ? '#161616' : 'transparent',
    border: 'none',
    borderBottom: '1px solid #141414',
    cursor: 'pointer',
    textAlign: 'left',
    gap: 12,
  }),

  sheetDot: (active: boolean): CSSProperties => ({
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: active ? '#c96a20' : '#2a2a2a',
    boxShadow: active ? '0 0 6px #c96a2088' : 'none',
    flexShrink: 0,
  }),

  sheetEffectText: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  } satisfies CSSProperties,

  sheetEffectName: (active: boolean): CSSProperties => ({
    fontSize: 15,
    fontWeight: 500,
    color: active ? '#e8e8e8' : '#777',
    letterSpacing: '-0.01em',
  }),

  sheetEffectDesc: {
    fontSize: 12,
    color: '#3a3a3a',
    lineHeight: 1.4,
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const active = effects.find(e => e.id === activeId) ?? effects[0];
  const ActiveComponent = active.component;
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close sheet on outside tap
  const handleBackdropClick = () => setSheetOpen(false);

  // Swipe-down to close
  const touchStartY = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches[0].clientY - touchStartY.current > 60) setSheetOpen(false);
  };

  if (!isMobile) {
    return (
      <div style={S.root}>
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

  // ── Mobile layout ──────────────────────────────────────────────────────
  return (
    <div style={{ ...S.root, flexDirection: 'column', position: 'relative' }}>
      {/* Full-screen canvas */}
      <main style={{ ...S.main, flex: 1 }}>
        <ActiveComponent />
      </main>

      {/* Bottom bar */}
      <div style={S.mobileBar}>
        <div style={S.mobileBarLeft}>
          <span style={S.mobileBarLabel}>Motion GPU</span>
          <span style={S.mobileBarName}>{active.name}</span>
        </div>
        <button style={S.mobileMenuBtn} onClick={() => setSheetOpen(true)}>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
            <rect width="14" height="1.5" rx="0.75" fill="currentColor"/>
            <rect y="4.25" width="10" height="1.5" rx="0.75" fill="currentColor"/>
            <rect y="8.5" width="6" height="1.5" rx="0.75" fill="currentColor"/>
          </svg>
          Effects
        </button>
      </div>

      {/* Backdrop */}
      <div style={S.sheetBackdrop(sheetOpen)} onClick={handleBackdropClick} />

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        style={S.sheet(sheetOpen)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div style={S.sheetHandle} />
        <div style={S.sheetHeader}>
          <div style={S.sheetTitle}>Effects · {effects.length}</div>
        </div>
        <nav style={S.sheetNav}>
          {effects.map(effect => (
            <button
              key={effect.id}
              style={S.sheetEffectBtn(effect.id === activeId)}
              onClick={() => { setActiveId(effect.id); setSheetOpen(false); }}
            >
              <div style={S.sheetDot(effect.id === activeId)} />
              <div style={S.sheetEffectText}>
                <span style={S.sheetEffectName(effect.id === activeId)}>{effect.name}</span>
                <span style={S.sheetEffectDesc}>{effect.description}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
