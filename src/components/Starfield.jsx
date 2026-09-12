import { useEffect, useRef } from 'react';

export default function Starfield({ count = 140 }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ 
    x: -1000, 
    y: -1000, 
    vx: 0, 
    vy: 0, 
    lastX: -1000, 
    lastY: -1000 
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let particles = [];

    const resize = () => {
      const oldWidth = canvas.width;
      const oldHeight = canvas.height;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Rescale existing particles into the new bounds instead of
      // leaving them stranded in the old (pre-resize) coordinate space
      if (particles.length && oldWidth && oldHeight) {
        const scaleX = canvas.width / oldWidth;
        const scaleY = canvas.height / oldHeight;
        particles.forEach((p) => {
          p.x *= scaleX;
          p.y *= scaleY;
        });
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // Color distribution strictly following design rules
    const getColor = () => {
      const r = Math.random();
      if (r < 0.70) return '242, 237, 230'; // 70% warm white
      if (r < 0.95) return '212, 168, 67';  // 25% gold
      return '244, 114, 22';              // 5% orange
    };

    // Particle initialization across Far & Near depth layers
    particles = Array.from({ length: count }, () => {
      const depth = Math.random(); // 0 = Far, 1 = Near
      const isNear = depth > 0.5;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        baseRadius: isNear ? Math.random() * 1.2 + 1.4 : Math.random() * 0.6 + 0.6,
        radius: 0,
        speedY: -(Math.random() * 0.20 + 0.05) * (0.5 + depth * 0.5),
        speedX: (Math.random() - 0.5) * 0.08 * (0.5 + depth * 0.5),
        opacity: isNear ? Math.random() * 0.3 + 0.45 : Math.random() * 0.2 + 0.25,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.015 + 0.008,
        color: getColor(),
        depth,
        vx: 0,
        vy: 0,
      };
    });

    const onMouseMove = (e) => {
      const m = mouseRef.current;
      m.vx = e.clientX - m.lastX;
      m.vy = e.clientY - m.lastY;
      m.x = e.clientX;
      m.y = e.clientY;
      m.lastX = e.clientX;
      m.lastY = e.clientY;
    };

    const onMouseLeave = () => {
      const m = mouseRef.current;
      m.x = -1000;
      m.y = -1000;
      m.vx = 0;
      m.vy = 0;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);

    let time = 0;
    const draw = () => {
      time += 0.005;

      // Soft trail clear for fluid motion rendering
      ctx.fillStyle = 'rgba(10, 10, 15, 0.35)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const mouse = mouseRef.current;

      for (const p of particles) {
        // 1. Radius sine pulse breathing (+/- 25%)
        p.pulsePhase += p.pulseSpeed;
        p.radius = p.baseRadius * (1 + 0.25 * Math.sin(p.pulsePhase));

        // 2. Wave flow field calculation
        const noiseAngle = Math.sin(p.x * 0.003 + time) * Math.cos(p.y * 0.003 + time) * Math.PI;
        const driftX = Math.cos(noiseAngle) * 0.15;
        const driftY = Math.sin(noiseAngle) * 0.15;

        // 3. Cursor force repulsion with momentum vector transfer
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 140 && dist > 0) {
          const force = ((140 - dist) / 140) * 2.5;
          const angle = Math.atan2(dy, dx);

          // Push particles away along repulsion angle + apply cursor momentum
          p.vx += Math.cos(angle) * force * 0.25 + mouse.vx * 0.02;
          p.vy += Math.sin(angle) * force * 0.25 + mouse.vy * 0.02;

          // Temporary opacity flare near cursor
          p.opacity = Math.min(p.opacity + force * 0.15, 0.8);
        } else {
          p.opacity = Math.max(p.opacity - 0.003, p.depth > 0.5 ? 0.45 : 0.25);
        }

        // Apply friction dampening
        p.vx *= 0.92;
        p.vy *= 0.92;

        p.x += p.speedX + driftX + p.vx;
        p.y += p.speedY + driftY + p.vy;

        // Screen boundary wrap
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        // Render particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}