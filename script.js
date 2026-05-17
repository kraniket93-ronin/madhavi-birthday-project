// ===== LOADING SCREEN =====
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  const counterEl = preloader.querySelector('.loader-counter');
  const fillEl = preloader.querySelector('.loader-fill');
  const words = preloader.querySelectorAll('.loader-word');

  let wordIndex = 0;
  const WORD_INTERVAL = 900;   // ms between words
  const COUNTER_DURATION = 2700; // total counter time
  const COMPLETE_DELAY = 400;  // delay after 100 before fade-out

  // Show first word immediately
  if (words[0]) words[0].classList.add('active');

  // Rotate words: "Made" → "For" → "Madhavi"
  const wordTimer = setInterval(() => {
    if (wordIndex < words.length - 1) {
      words[wordIndex].classList.remove('active');
      words[wordIndex].classList.add('exit');
      wordIndex++;
      // Small delay so exit plays before entrance
      setTimeout(() => {
        words[wordIndex].classList.add('active');
      }, 150);
    } else {
      clearInterval(wordTimer);
    }
  }, WORD_INTERVAL);

  // Counter 000 → 100 over 2.7s
  let startTime = null;
  let completed = false;

  function updateCounter(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / COUNTER_DURATION, 1);
    const value = Math.round(progress * 100);

    counterEl.textContent = value.toString().padStart(3, '0');
    fillEl.style.transform = `scaleX(${progress})`;

    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    } else if (!completed) {
      completed = true;
      // Wait 400ms, then fade out loader
      setTimeout(() => {
        preloader.classList.add('hidden');
        initAnimations();
      }, COMPLETE_DELAY);
    }
  }

  requestAnimationFrame(updateCounter);
});

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

    // Start on first user interaction
    const startOnInteract = () => {
      if (!this.isPlaying) this.toggle();
      document.removeEventListener('click', startOnInteract);
      document.removeEventListener('scroll', startOnInteract);
    };
    document.addEventListener('click', startOnInteract, { once: true });
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

// Close mobile menu on link click
document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
  });
});

// Active nav link on scroll
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

// ===== SCROLL ANIMATIONS =====
function initAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.delay) || 0;
        setTimeout(() => entry.target.classList.add('visible'), delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
}

// ===== SMOOTH SCROLL FOR NAV LINKS =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ===== SCROLL EVENTS =====
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateActiveNav();
      // Hide scroll indicator after scrolling
      const indicator = document.querySelector('.scroll-indicator');
      if (indicator && window.scrollY > 100) {
        indicator.style.opacity = '0';
      }
      ticking = false;
    });
    ticking = true;
  }
});

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

  // Interaction state
  activeSlideIndex: -1,
  clickPinnedIndex: -1,
  mouseInViewport: false,
  mouseX: 0,
  mouseY: 0,

  // Per-slide projected data (updated each frame)
  slideScreenX: [],
  slideAngles: [],

  // Carousel geometry
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

    // ---- Mouse tracking on viewport ----
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

    // ---- Click to pin/unpin ----
    this.viewport.addEventListener('click', (e) => {
      const rect = this.viewport.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const nearest = this._findNearestSlide(mx, my);

      if (nearest === -1) return;

      if (this.clickPinnedIndex === nearest) {
        // Unpin
        this.clickPinnedIndex = -1;
        this._setActive(-1);
        this.paused = false;
      } else {
        // Pin this slide
        this.clickPinnedIndex = nearest;
        this._setActive(nearest);
        this.paused = true;
      }
    });

    // Click outside viewport to unpin
    document.addEventListener('click', (e) => {
      if (this.clickPinnedIndex !== -1 && !this.viewport.contains(e.target)) {
        this.clickPinnedIndex = -1;
        this._setActive(-1);
        this.paused = false;
      }
    });

    // ---- Touch support ----
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
      }
    }, { passive: true });

    // Start rendering
    this.render();
  },

  // Find the slide whose projected screen center is closest to mouse
  _findNearestSlide(mx, my) {
    const vpHeight = this.viewport.offsetHeight;
    const slideH = this.slides[0] ? this.slides[0].offsetHeight : 400;
    const slideW = this.slides[0] ? this.slides[0].offsetWidth : 280;
    const centerY = vpHeight / 2;
    const halfH = slideH / 2 + 40;

    // Mouse must be within vertical bounds of slides
    if (my < centerY - halfH || my > centerY + halfH) return -1;

    let bestIdx = -1;
    let bestDist = Infinity;
    const maxAngle = (this.slideCount * this.anglePerSlide) / 2.2;

    for (let i = 0; i < this.slideCount; i++) {
      const absAngle = Math.abs(this.slideAngles[i]);
      if (absAngle > maxAngle) continue;

      const sx = this.slideScreenX[i];
      // Projected half-width narrows as slide rotates
      const cosAngle = Math.cos((this.slideAngles[i] * Math.PI) / 180);
      const projHalfW = (slideW / 2) * Math.abs(cosAngle) + 40;
      const dist = Math.abs(mx - sx);

      if (dist < projHalfW && dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    // Fallback: find absolute nearest visible slide
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
    // Don't override click-pinned state
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

    // Remove old active
    if (this.activeSlideIndex >= 0 && this.activeSlideIndex < this.slideCount) {
      this.slides[this.activeSlideIndex].classList.remove('slide-active');
    }

    this.activeSlideIndex = idx;

    // Add new active
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
    const perspective = 1200; // Must match CSS perspective value

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

      // Store projected screen X for hit testing
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
      // Disable native pointer-events — we handle everything at viewport level
      slide.style.pointerEvents = 'none';
    }

    this.rafId = requestAnimationFrame(() => this.render());
  }
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  MusicController.init();
  CurvedCarousel.init();
});
