import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
  size?: number;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, size = 14 }) => {
  const [open, setOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');

  const TOOLTIP_WIDTH = 260;

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const isTop = spaceBelow < 160;
    setPlacement(isTop ? 'top' : 'bottom');

    // Horizontal: try to align right edge with button, but keep on screen
    let left = rect.right - TOOLTIP_WIDTH;
    if (left < 8) left = 8;
    if (left + TOOLTIP_WIDTH > window.innerWidth - 8) {
      left = window.innerWidth - TOOLTIP_WIDTH - 8;
    }

    const top = isTop
      ? rect.top + window.scrollY - 8 // will use bottom positioning via transform
      : rect.bottom + window.scrollY + 8;

    setCoords({ top, left });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Calculate position when opening
  useEffect(() => {
    if (!open) return;
    updatePosition();

    // Reposition on scroll/resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="inline-flex rounded-full p-0.5 transition-all hover:scale-110"
        style={{
          color: open ? 'var(--color-primary)' : 'var(--color-text-muted)',
          opacity: open ? 1 : 0.5,
          verticalAlign: 'middle',
        }}
        title="Info"
        type="button"
      >
        <Info size={size} />
      </button>
      {open && ReactDOM.createPortal(
        <div
          ref={tooltipRef}
          className="animate-fade-in-up"
          style={{
            position: 'absolute',
            zIndex: 150,
            top: placement === 'bottom' ? coords.top : undefined,
            bottom: placement === 'top' ? `calc(100vh - ${coords.top}px + ${window.scrollY}px)` : undefined,
            left: coords.left,
            width: TOOLTIP_WIDTH,
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 12,
            lineHeight: 1.6,
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--glass-border, #e5e7eb)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
            backdropFilter: 'blur(16px)',
            color: 'var(--color-text-secondary, #6b7280)',
            pointerEvents: 'auto' as const,
            ...(placement === 'top' ? { transform: 'translateY(-100%)' } : {}),
          }}
        >
          {text}
        </div>,
        document.body
      )}
    </>
  );
};
