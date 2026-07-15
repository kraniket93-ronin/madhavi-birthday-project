// ===== SURPRISE LANDING + PARTICLE DOT TEXT GREETING =====
window.addEventListener('load', () => {
  const landing = document.getElementById('surprise-landing');
  const btn = document.getElementById('surprise-btn');
  const greeting = document.getElementById('birthday-greeting');

  btn.addEventListener('click', () => {
    // Hide landing
    landing.classList.add('hidden');
    setTimeout(() => { landing.style.display = 'none'; }, 800);

    // Show greeting
    greeting.classList.remove('greeting-hidden');

    // Start music on click
    MusicController.play();

    // Start particle text animation
    ParticleTextGreeting.init('greeting-canvas', () => {
      // On complete: fade out greeting, show main page
      greeting.classList.add('greeting-exit');
      setTimeout(() => {
        greeting.style.display = 'none';
        initAnimations();
      }, 1200);
    });
  });
});

// ===== PARTICLE DOT TEXT GREETING SYSTEM =====
const ParticleTextGreeting = {
  canvas: null,
  ctx: null,
  offCanvas: null,
  offCtx: null,
  particles: [],
  words: ['HAPPY', 'BIRTHDAY', 'TO YOU', 'MADHAVI'],
  currentWordIndex: 0,
  wordStartTime: 0,
  wordDuration: 3000, // Exactly 3.0 seconds per word (4 words * 3s = 12s total)
  onComplete: null,
  rafId: null,
  bgColor: { r: 26, g: 14, b: 10 }, // warm dark brown #1a0e0a
  frameCount: 0,

  init(canvasId, onComplete) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.onComplete = onComplete;

    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Offscreen canvas for text pixel sampling
    this.offCanvas = document.createElement('canvas');
    this.offCtx = this.offCanvas.getContext('2d');

    // Create particle pool
    const count = window.innerWidth < 600 ? 800 : 1500;
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        tx: 0, ty: 0,
        ox: 0, oy: 0,
        size: Math.random() * 1.8 + 1,
        delay: 0,
        curveAmp: 0,
        disperseAngle: 0,
        disperseDist: 0,
        hasTarget: false,
        hue: Math.random() * 30 - 10,  // slight color variation
        brightness: Math.random() * 0.4 + 0.6,
        twinkleOffset: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.03 + 0.01
      });
    }

    // Start with first word
    this.currentWordIndex = 0;
    this.wordStartTime = performance.now();
    this.assignTargets(this.words[0]);

    this.render();
  },

  resize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  },

  getTextPixels(text) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.offCanvas.width = w;
    this.offCanvas.height = h;

    const ctx = this.offCtx;
    ctx.clearRect(0, 0, w, h);

    // Calculate optimal font size
    let fontSize;
    if (text === 'MADHAVI') {
      fontSize = Math.min(w * 0.14, h * 0.35, 180);
    } else if (text === 'TO YOU') {
      fontSize = Math.min(w * 0.12, h * 0.3, 150);
    } else {
      fontSize = Math.min(w * 0.15, h * 0.35, 200);
    }

    // Use a bold, blocky font for the LED dot look
    ctx.font = `900 ${fontSize}px "Playfair Display", "Georgia", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(text, w / 2, h / 2);

    // Sample pixels to find text positions
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const pixels = [];
    const gap = window.innerWidth < 600 ? 5 : 4;

    for (let y = 0; y < h; y += gap) {
      for (let x = 0; x < w; x += gap) {
        const i = (y * w + x) * 4;
        if (data[i + 3] > 128) {
          pixels.push({ x, y });
        }
      }
    }

    return pixels;
  },

  assignTargets(text) {
    const pixels = this.getTextPixels(text);

    // Shuffle pixels for natural distribution
    for (let i = pixels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pixels[i], pixels[j]] = [pixels[j], pixels[i]];
    }

    // Ensure enough particles in pool
    while (this.particles.length < pixels.length) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        tx: 0, ty: 0,
        ox: 0, oy: 0,
        size: Math.random() * 1.8 + 1,
        delay: 0,
        curveAmp: 0,
        disperseAngle: 0,
        disperseDist: 0,
        hasTarget: false,
        hue: Math.random() * 30 - 10,
        brightness: Math.random() * 0.4 + 0.6,
        twinkleOffset: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.03 + 0.01
      });
    }

    // Get boundaries of the text for staggered delay calculation
    let leftEdge = this.canvas.width * 0.15;
    let rightEdge = this.canvas.width * 0.85;
    if (pixels.length > 0) {
      leftEdge = Math.min(...pixels.map(p => p.x));
      rightEdge = Math.max(...pixels.map(p => p.x));
    }
    const textWidth = rightEdge - leftEdge || 1;

    // Assign targets and delays
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.ox = p.x;
      p.oy = p.y;
      p.disperseAngle = Math.random() * Math.PI * 2;
      p.disperseDist = 200 + Math.random() * 400;

      if (i < pixels.length) {
        p.tx = pixels[i].x;
        p.ty = pixels[i].y;
        p.hasTarget = true;
        
        // Stagger delay based on X coordinate (left-to-right sequential forming)
        // Max delay 450ms, so left letters form first, then right letters
        p.delay = ((pixels[i].x - leftEdge) / textWidth) * 450;
        
        // Curve amplitude for flowing paths
        p.curveAmp = (Math.random() - 0.5) * 60;
      } else {
        // Float off to random edges if they are extra particles
        p.tx = Math.random() * this.canvas.width;
        p.ty = Math.random() < 0.5 ? -60 - Math.random() * 100 : this.canvas.height + 60 + Math.random() * 100;
        p.hasTarget = false;
        p.delay = Math.random() * 300;
        p.curveAmp = 0;
      }
    }
  },

  render() {
    if (!this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.frameCount++;

    // Clear with semi-transparent background for trailing glow tail
    ctx.fillStyle = `rgba(${this.bgColor.r}, ${this.bgColor.g}, ${this.bgColor.b}, 0.22)`;
    ctx.fillRect(0, 0, w, h);

    const elapsed = performance.now() - this.wordStartTime;

    // Premium easing functions
    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
    const easeInCubic = (t) => t * t * t;

    for (const p of this.particles) {
      let px = p.x;
      let py = p.y;
      let alpha = p.brightness;

      if (elapsed < 2400) {
        // Converge + Hold phases (0ms to 2400ms)
        const start = p.delay;
        const duration = 650; // Each particle takes 650ms to converge

        if (elapsed < start) {
          // Remain at origin
          px = p.ox;
          py = p.oy;
          alpha *= Math.min(1, elapsed / (start || 1)) * 0.6;
        } else if (elapsed < start + duration) {
          // Converging movement
          const t = (elapsed - start) / duration;
          const u = easeOutQuart(t);
          px = p.ox + (p.tx - p.ox) * u;
          py = p.oy + (p.ty - p.oy) * u;

          // Beautiful organic curve/arc to make merging look sequential and fluid
          const curve = Math.sin(t * Math.PI) * p.curveAmp * (1 - t);
          py += curve;
        } else {
          // Fully settled on the word letters with subtle organic breathing wave
          const breatheTime = elapsed - (start + duration);
          px = p.tx + Math.sin(breatheTime * 0.003 + p.twinkleOffset) * 0.7;
          py = p.ty + Math.cos(breatheTime * 0.003 + p.twinkleOffset) * 0.7;
        }
      } else {
        // Dissolve phase (2400ms to 3000ms)
        const t = Math.min(1, (elapsed - 2400) / 600);
        const u = easeInCubic(t);
        
        px = p.tx + Math.cos(p.disperseAngle) * p.disperseDist * u;
        py = p.ty + Math.sin(p.disperseAngle) * p.disperseDist * u;
        
        // Fade out
        alpha *= (1 - t);
      }

      // Store current coordinate so next word transitions seamlessly from this point
      p.x = px;
      p.y = py;

      // Skip rendering if way off-screen
      if (px < -100 || px > w + 100 || py < -100 || py > h + 100) continue;

      // Twinkle effect
      const twinkle = 0.65 + 0.35 * Math.sin(this.frameCount * p.twinkleSpeed + p.twinkleOffset);
      const drawAlpha = alpha * twinkle;

      if (drawAlpha <= 0.01) continue;

      // Rose/pink glow matching Aura template
      const glowR = p.size * 3.5;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, glowR);
      const r = 220 + p.hue * 0.5;
      const g = 80 + p.hue * 0.8;
      const b = 90 + p.hue * 0.3;
      
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${drawAlpha * 0.45})`);
      grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${drawAlpha * 0.15})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(px - glowR, py - glowR, glowR * 2, glowR * 2);

      // Core dot
      ctx.beginPath();
      ctx.arc(px, py, p.size * 0.75, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${drawAlpha})`;
      ctx.fill();
    }

    // Phase management: advance words at exactly 3.0s intervals
    if (elapsed >= this.wordDuration) {
      this.currentWordIndex++;
      if (this.currentWordIndex < this.words.length) {
        this.wordStartTime = performance.now();
        this.assignTargets(this.words[this.currentWordIndex]);
        this.rafId = requestAnimationFrame(() => this.render());
      } else {
        // All words finished! Call onComplete
        if (this.onComplete) {
          this.onComplete();
          this.canvas = null; // stop further render loop
        }
      }
    } else {
      this.rafId = requestAnimationFrame(() => this.render());
    }
  }
};

// ===== FLOATING PARTICLES =====
const ParticleSystem = {
  canvas: null,
  ctx: null,
  particles: [],
  count: 60,
  rafId: null,

  init() {
    this.canvas = document.getElementById('particles-bg');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Reduce particles on mobile
    if (window.innerWidth < 768) this.count = 30;

    for (let i = 0; i < this.count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        r: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.5 + 0.1,
        gold: Math.random() > 0.4
      });
    }
    this.render();
  },

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fillStyle = p.gold
        ? `rgba(201, 169, 110, ${p.alpha})`
        : `rgba(240, 236, 230, ${p.alpha * 0.6})`;
      this.ctx.fill();
    }

    this.rafId = requestAnimationFrame(() => this.render());
  }
};

// ===== CURSOR GLOW (desktop only) =====
const CursorGlow = {
  el: null,
  mx: 0, my: 0,
  cx: 0, cy: 0,

  init() {
    if ('ontouchstart' in window || window.innerWidth < 1024) return;
    this.el = document.getElementById('cursor-glow');
    if (!this.el) return;

    document.addEventListener('mousemove', (e) => {
      this.mx = e.clientX;
      this.my = e.clientY;
      this.el.classList.add('visible');
    });

    document.addEventListener('mouseleave', () => {
      this.el.classList.remove('visible');
    });

    this.animate();
  },

  animate() {
    this.cx += (this.mx - this.cx) * 0.08;
    this.cy += (this.my - this.cy) * 0.08;
    if (this.el) {
      this.el.style.left = this.cx + 'px';
      this.el.style.top = this.cy + 'px';
    }
    requestAnimationFrame(() => this.animate());
  }
};

// ===== MUSIC CONTROLLER =====
const MusicController = {
  audio: null,
  isPlaying: false,
  volume: 0.4,

  init() {
    this.audio = document.getElementById('bg-music');
    if (this.audio) this.audio.volume = this.volume;

    const toggle = document.getElementById('music-toggle');
    toggle.classList.add('paused');
    toggle.addEventListener('click', () => this.toggle());
  },

  play() {
    if (this.audio) {
      this.audio.play().catch(() => {});
      this.isPlaying = true;
      document.getElementById('music-toggle').classList.remove('paused');
    }
  },

  pause() {
    if (this.audio) this.audio.pause();
    this.isPlaying = false;
    document.getElementById('music-toggle').classList.add('paused');
  },

  toggle() {
    this.isPlaying ? this.pause() : this.play();
  }
};

// ===== NAVIGATION =====
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  mobileMenu.classList.toggle('open');
});

document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
  });
});

const sections = document.querySelectorAll('.section[id]');
const navLinks = document.querySelectorAll('.nav-link');

function updateActiveNav() {
  const scrollPos = window.scrollY + window.innerHeight / 3;
  sections.forEach(section => {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    const id = section.getAttribute('id');
    if (scrollPos >= top && scrollPos < top + height) {
      navLinks.forEach(l => l.classList.remove('active'));
      const activeLink = document.querySelector(`.nav-link[data-section="${id}"]`);
      if (activeLink) activeLink.classList.add('active');
    }
  });
}

// ===== SCROLL ANIMATIONS (enhanced with stagger) =====
function initAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.delay) || 0;
        setTimeout(() => entry.target.classList.add('visible'), delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
}

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ===== PARALLAX TEXT (subtle depth on scroll) =====
function updateParallax() {
  const scrollY = window.scrollY;
  document.querySelectorAll('.hero-title-line, .section-title').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      const offset = (rect.top - window.innerHeight / 2) * 0.02;
      el.style.transform = `translateY(${offset}px)`;
    }
  });
}

// ===== SCROLL EVENTS =====
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateActiveNav();
      updateParallax();
      const indicator = document.querySelector('.scroll-indicator');
      if (indicator && window.scrollY > 100) {
        indicator.style.opacity = '0';
      }
      ticking = false;
    });
    ticking = true;
  }
});

// ===== MOBILE TOUCH: TAP TO TOGGLE B/W =====
if ('ontouchstart' in window) {
  document.querySelectorAll('.hero-img, .day-image, .muse-image, .toast-img, .stars-img, .verses-image').forEach(el => {
    el.addEventListener('touchstart', function(e) {
      // Toggle a class for sustained color on tap
      this.classList.toggle('touch-active');
    }, { passive: true });
  });

  // Add touch-active CSS rule dynamically
  const style = document.createElement('style');
  style.textContent = `
    .touch-active img { filter: grayscale(0%) contrast(1) !important; transform: scale(1.03) !important; }
    .touch-active { box-shadow: 0 0 30px rgba(201,169,110,0.35) !important; }
  `;
  document.head.appendChild(style);
}

// ===== CURVED 3D CAROUSEL =====
const CurvedCarousel = {
  track: null,
  viewport: null,
  slides: [],
  slideCount: 0,
  angleOffset: 0,
  speed: 0.12,
  paused: false,
  rafId: null,

  activeSlideIndex: -1,
  clickPinnedIndex: -1,
  mouseInViewport: false,
  mouseX: 0,
  mouseY: 0,

  slideScreenX: [],
  slideAngles: [],

  radius: 800,
  anglePerSlide: 22,

  init() {
    this.viewport = document.getElementById('gallery-viewport');
    this.track = document.getElementById('gallery-track');
    if (!this.viewport || !this.track) return;

    this.slides = Array.from(this.track.querySelectorAll('.gallery-slide'));
    this.slideCount = this.slides.length;
    this.slideScreenX = new Array(this.slideCount).fill(0);
    this.slideAngles = new Array(this.slideCount).fill(0);

    this.updateRadius();
    window.addEventListener('resize', () => this.updateRadius());

    // Mouse tracking
    this.viewport.addEventListener('mousemove', (e) => {
      this.mouseInViewport = true;
      const rect = this.viewport.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      this._updateHover();
    });

    this.viewport.addEventListener('mouseenter', () => {
      this.mouseInViewport = true;
    });

    this.viewport.addEventListener('mouseleave', () => {
      this.mouseInViewport = false;
      if (this.clickPinnedIndex === -1) {
        this._setActive(-1);
        this.paused = false;
      }
    });

    // Click to pin/unpin
    this.viewport.addEventListener('click', (e) => {
      const rect = this.viewport.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const nearest = this._findNearestSlide(mx, my);

      if (nearest === -1) return;

      if (this.clickPinnedIndex === nearest) {
        this.clickPinnedIndex = -1;
        this._setActive(-1);
        this.paused = false;
      } else {
        this.clickPinnedIndex = nearest;
        this._setActive(nearest);
        this.paused = true;
      }
    });

    document.addEventListener('click', (e) => {
      if (this.clickPinnedIndex !== -1 && !this.viewport.contains(e.target)) {
        this.clickPinnedIndex = -1;
        this._setActive(-1);
        this.paused = false;
      }
    });

    // Touch support
    this.viewport.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      const rect = this.viewport.getBoundingClientRect();
      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;
      const nearest = this._findNearestSlide(mx, my);

      if (nearest === -1) return;

      if (this.clickPinnedIndex === nearest) {
        this.clickPinnedIndex = -1;
        this._setActive(-1);
        this.paused = false;
      } else {
        this.clickPinnedIndex = nearest;
        this._setActive(nearest);
        this.paused = true;
        // Auto-resume after 3s on mobile
        clearTimeout(this._mobileResumeTimer);
        this._mobileResumeTimer = setTimeout(() => {
          this.clickPinnedIndex = -1;
          this._setActive(-1);
          this.paused = false;
        }, 3000);
      }
    }, { passive: true });

    this.render();
  },

  _findNearestSlide(mx, my) {
    const vpHeight = this.viewport.offsetHeight;
    const slideH = this.slides[0] ? this.slides[0].offsetHeight : 400;
    const slideW = this.slides[0] ? this.slides[0].offsetWidth : 280;
    const centerY = vpHeight / 2;
    const halfH = slideH / 2 + 40;

    if (my < centerY - halfH || my > centerY + halfH) return -1;

    let bestIdx = -1;
    let bestDist = Infinity;
    const maxAngle = (this.slideCount * this.anglePerSlide) / 2.2;

    for (let i = 0; i < this.slideCount; i++) {
      const absAngle = Math.abs(this.slideAngles[i]);
      if (absAngle > maxAngle) continue;

      const sx = this.slideScreenX[i];
      const cosAngle = Math.cos((this.slideAngles[i] * Math.PI) / 180);
      const projHalfW = (slideW / 2) * Math.abs(cosAngle) + 40;
      const dist = Math.abs(mx - sx);

      if (dist < projHalfW && dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) {
      for (let i = 0; i < this.slideCount; i++) {
        const absAngle = Math.abs(this.slideAngles[i]);
        if (absAngle > maxAngle * 0.85) continue;
        const dist = Math.abs(mx - this.slideScreenX[i]);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
    }

    return bestIdx;
  },

  _updateHover() {
    if (!this.mouseInViewport) return;
    if (this.clickPinnedIndex !== -1) return;

    const nearest = this._findNearestSlide(this.mouseX, this.mouseY);
    if (nearest !== -1) {
      this._setActive(nearest);
      this.paused = true;
    } else {
      this._setActive(-1);
      this.paused = false;
    }
  },

  _setActive(idx) {
    if (idx === this.activeSlideIndex) return;

    if (this.activeSlideIndex >= 0 && this.activeSlideIndex < this.slideCount) {
      this.slides[this.activeSlideIndex].classList.remove('slide-active');
    }

    this.activeSlideIndex = idx;

    if (idx >= 0 && idx < this.slideCount) {
      this.slides[idx].classList.add('slide-active');
    }
  },

  updateRadius() {
    const vw = window.innerWidth;
    if (vw <= 600) {
      this.radius = 500;
      this.anglePerSlide = 28;
    } else if (vw <= 1024) {
      this.radius = 650;
      this.anglePerSlide = 25;
    } else {
      this.radius = 800;
      this.anglePerSlide = 22;
    }
  },

  render() {
    if (!this.paused) {
      this.angleOffset -= this.speed;
    }

    const totalArc = this.slideCount * this.anglePerSlide;
    if (this.angleOffset < -totalArc) this.angleOffset += totalArc;
    if (this.angleOffset > 0) this.angleOffset -= totalArc;

    const vpWidth = this.viewport ? this.viewport.offsetWidth : window.innerWidth;
    const vpCenterX = vpWidth / 2;
    const perspective = 1200;

    for (let i = 0; i < this.slideCount; i++) {
      let angle = (i * this.anglePerSlide) + this.angleOffset;

      while (angle < -totalArc / 2) angle += totalArc;
      while (angle > totalArc / 2) angle -= totalArc;

      this.slideAngles[i] = angle;

      const slide = this.slides[i];
      const rad = (angle * Math.PI) / 180;

      const x = Math.sin(rad) * this.radius;
      const z = (Math.cos(rad) * this.radius) - this.radius;
      const rotY = -angle;

      const scale3d = perspective / Math.max(1, perspective - z);
      this.slideScreenX[i] = vpCenterX + (x * scale3d);

      const absAngle = Math.abs(angle);
      const maxVisible = totalArc / 2.2;
      let opacity = 1;
      if (absAngle > maxVisible * 0.7) {
        opacity = Math.max(0, 1 - (absAngle - maxVisible * 0.7) / (maxVisible * 0.3));
      }

      let zIndex = Math.round(1000 - absAngle * 10);
      if (i === this.activeSlideIndex) {
        zIndex = 2000;
      }

      slide.style.transform = `translateX(${x}px) translateZ(${z}px) rotateY(${rotY}deg)`;
      slide.style.opacity = opacity;
      slide.style.zIndex = zIndex;
      slide.style.pointerEvents = 'none';
    }

    this.rafId = requestAnimationFrame(() => this.render());
  }
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  MusicController.init();
  CurvedCarousel.init();
  ParticleSystem.init();
  CursorGlow.init();
});
