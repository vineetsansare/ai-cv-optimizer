import React, { useEffect, useRef } from 'react';

interface StardustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  maxLife: number;
  life: number;
  isStar: boolean;
}

export const CursorTrailProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Accessibility check: respect prefers-reduced-motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const particles: StardustParticle[] = [];
    let lastX = -100;
    let lastY = -100;
    let moveTimeout: number;

    const colors = [
      'rgba(210, 187, 255, ', // Soft Violet
      'rgba(255, 223, 130, ', // Gold Sparkle
      'rgba(147, 230, 255, ', // Stardust Cyan
      'rgba(255, 255, 255, '  // Pure White Glow
    ];

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX: x, clientY: y } = e;

      // Check element under cursor: suppress trail if hovering over interactive inputs/buttons
      const hoveredElement = document.elementFromPoint(x, y);
      if (hoveredElement) {
        const tagName = hoveredElement.tagName.toLowerCase();
        if (
          tagName === 'input' ||
          tagName === 'button' ||
          tagName === 'textarea' ||
          tagName === 'select' ||
          hoveredElement.closest('.glass-card') ||
          hoveredElement.closest('button') ||
          hoveredElement.closest('input')
        ) {
          // Suppress particles over controls to maintain total readability
          return;
        }
      }

      clearTimeout(moveTimeout);
      moveTimeout = window.setTimeout(() => {
        // Move stopped
      }, 100);

      const dx = x - lastX;
      const dy = y - lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 6) {
        // Emit 1-3 tiny stardust particles per movement step
        const spawnCount = Math.min(3, Math.floor(dist / 8) + 1);

        for (let i = 0; i < spawnCount; i++) {
          const size = Math.random() * 2.8 + 1.2;
          const maxLife = Math.floor(Math.random() * 20) + 35; // ~600-900ms at 60fps

          particles.push({
            x: x + (Math.random() - 0.5) * 8,
            y: y + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 0.6,
            vy: Math.random() * 0.4 + 0.1, // Gently drift downward
            size,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: Math.random() * 0.7 + 0.3,
            maxLife,
            life: 0,
            isStar: Math.random() > 0.65
          });
        }

        lastX = x;
        lastY = y;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Draw 4-point star sparkle
    const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.quadraticCurveTo(cx, cy, cx + r, cy);
      ctx.quadraticCurveTo(cx, cy, cx, cy + r);
      ctx.quadraticCurveTo(cx, cy, cx - r, cy);
      ctx.quadraticCurveTo(cx, cy, cx, cy - r);
      ctx.closePath();
      ctx.fill();
    };

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        const lifeRatio = p.life / p.maxLife;
        const currentAlpha = p.alpha * (1 - lifeRatio);

        if (lifeRatio >= 1 || currentAlpha <= 0.01) {
          particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = `${p.color}${currentAlpha})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `${p.color}0.8)`;

        if (p.isStar) {
          drawStar(ctx, p.x, p.y, p.size * 1.5);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 9999,
          opacity: 0.95
        }}
      />
      {children}
    </>
  );
};
