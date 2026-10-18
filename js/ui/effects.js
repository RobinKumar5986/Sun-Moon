import { $ } from './dom.js';

const COLORS = ['#ff4fa3', '#ffd23f', '#8b5cf6', '#38bdf8', '#34d399', '#ff8a00', '#ffffff'];

class Effects {
  constructor() {
    this.particles = [];
    this.paused = false;
    this.frame = 0;
  }

  init() {
    this.canvas = $('#fx');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
  }

  burst(x, y, { count = 14, colors = COLORS, speed = 4, size = 5 } = {}) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const v = speed * (0.6 + Math.random() * 0.8);
      this.particles.push({
        x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - 1,
        size: size * (0.6 + Math.random() * 0.8), color: colors[i % colors.length],
        life: 1, decay: 0.025 + Math.random() * 0.02, gravity: 0.12, spin: 0, angle: 0, shape: 'star',
      });
    }
    this.start();
  }

  confetti(count = 140) {
    const w = window.innerWidth;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * w, y: -20 - Math.random() * window.innerHeight * 0.5,
        vx: (Math.random() - 0.5) * 2.5, vy: 2 + Math.random() * 3,
        size: 6 + Math.random() * 6, color: COLORS[i % COLORS.length],
        life: 1, decay: 0.0035 + Math.random() * 0.003, gravity: 0.03,
        spin: (Math.random() - 0.5) * 0.3, angle: Math.random() * Math.PI, shape: 'rect',
      });
    }
    this.start();
  }

  start() {
    if (!this.frame && !this.paused) this.frame = requestAnimationFrame(() => this.loop());
  }

  pause() {
    this.paused = true;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  resume() {
    this.paused = false;
    if (this.particles.length) this.start();
  }

  loop() {
    this.frame = 0;
    const { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles = this.particles.filter((p) => p.life > 0 && p.y < window.innerHeight + 40);
    for (const p of this.particles) {
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      p.life -= p.decay;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else this.star(ctx, p.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (this.particles.length) this.start();
    else ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  star(ctx, r) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const radius = i % 2 ? r * 0.4 : r;
      const a = (Math.PI / 4) * i;
      ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    }
    ctx.closePath();
    ctx.fill();
  }
}

export const effects = new Effects();
