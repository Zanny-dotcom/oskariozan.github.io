/* ============================
   Z BIKES — Interactions
   ============================ */

// Preloader
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('preloader').classList.add('done');
  }, 1800);
});

// Nav scroll effect
const nav = document.getElementById('nav');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  nav.classList.toggle('scrolled', y > 10);
  lastScroll = y;
});

// Mobile menu toggle
const navToggle = document.getElementById('navToggle');
const mobileMenu = document.getElementById('mobileMenu');

navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('active');
  mobileMenu.classList.toggle('open');
  document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
});

// Close mobile menu on link click
document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('active');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  });
});

// Scroll-triggered reveal animations
const reveals = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.15,
  rootMargin: '0px 0px -60px 0px'
});

reveals.forEach(el => revealObserver.observe(el));

// Stat counter animation
const statNumbers = document.querySelectorAll('.stat-number');

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.dataset.count);
      animateCount(el, target);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

statNumbers.forEach(el => counterObserver.observe(el));

function animateCount(el, target) {
  const duration = 1500;
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

// Smooth parallax on hero elements
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  const hero = document.querySelector('.hero-content');
  if (hero && y < window.innerHeight) {
    hero.style.transform = `translateY(${y * 0.15}px)`;
    hero.style.opacity = 1 - (y / window.innerHeight) * 0.6;
  }
});

// Process step hover line animation
document.querySelectorAll('.process-step').forEach(step => {
  step.addEventListener('mouseenter', () => {
    step.style.borderColor = 'var(--gold-dark)';
  });
  step.addEventListener('mouseleave', () => {
    step.style.borderColor = '';
  });
});

// Lightbox (me page)
const lightbox = document.getElementById('lightbox');
if (lightbox) {
  const tiles = Array.from(document.querySelectorAll('.photo-tile[data-lightbox-index]'));
  const photos = tiles.map(t => t.querySelector('img').src);
  const imgEl = document.getElementById('lightboxImage');
  const backdrop = document.getElementById('lightboxBackdrop');
  const counter = document.getElementById('lightboxCounter');
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');
  const closeBtn = document.getElementById('lightboxClose');
  let current = 0;

  function render(i) {
    current = i;
    imgEl.classList.add('switching');
    setTimeout(() => {
      imgEl.src = photos[i];
      backdrop.style.backgroundImage = `url("${photos[i]}")`;
      counter.textContent = `${String(i + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}`;
      prevBtn.classList.toggle('hidden', i === 0);
      nextBtn.classList.toggle('hidden', i === photos.length - 1);
      imgEl.classList.remove('switching');
    }, 150);
  }

  function openLightbox(i) {
    render(i);
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  tiles.forEach(t => t.addEventListener('click', () => {
    openLightbox(parseInt(t.dataset.lightboxIndex, 10));
  }));

  closeBtn.addEventListener('click', closeLightbox);
  prevBtn.addEventListener('click', () => { if (current > 0) render(current - 1); });
  nextBtn.addEventListener('click', () => { if (current < photos.length - 1) render(current + 1); });

  // Click on empty space (backdrop or stage padding) closes
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox || e.target === backdrop || e.target.classList.contains('lightbox-stage')) {
      closeLightbox();
    }
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft' && current > 0) render(current - 1);
    else if (e.key === 'ArrowRight' && current < photos.length - 1) render(current + 1);
  });

  // Touch swipe
  let touchStartX = null;
  lightbox.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  lightbox.addEventListener('touchend', e => {
    if (touchStartX == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && current < photos.length - 1) render(current + 1);
      else if (dx > 0 && current > 0) render(current - 1);
    }
    touchStartX = null;
  }, { passive: true });
}

// Story viewer (me page)
const storyViewer = document.getElementById('storyViewer');
if (storyViewer) {
  const circles = Array.from(document.querySelectorAll('.story-circle'));
  const videoEl = document.getElementById('storyVideo');
  const progressFill = document.getElementById('storyProgressFill');
  const closeBtn = document.getElementById('storyViewerClose');
  const muteBtn = document.getElementById('storyMuteToggle');
  const prevZone = storyViewer.querySelector('.story-tap-prev');
  const nextZone = storyViewer.querySelector('.story-tap-next');
  let current = 0;

  function tryPlay() {
    try {
      const p = videoEl.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) {}
  }

  function loadStory(i) {
    const c = circles[i];
    if (!c) return;
    current = i;
    progressFill.style.width = '0%';
    videoEl.poster = c.dataset.poster || '';

    const onReady = () => {
      videoEl.removeEventListener('loadedmetadata', onReady);
      videoEl.removeEventListener('canplay', onReady);
      tryPlay();
    };
    videoEl.addEventListener('loadedmetadata', onReady, { once: true });
    videoEl.addEventListener('canplay', onReady, { once: true });

    videoEl.src = c.dataset.video;
    videoEl.load();
    // Warm attempt — may be rejected pre-metadata on iOS, the ready handlers retry.
    tryPlay();
  }

  function openStory(i) {
    storyViewer.classList.add('open');
    storyViewer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    videoEl.muted = true;
    storyViewer.classList.remove('is-unmuted');
    // Consume the user-gesture token synchronously before any src mutation.
    tryPlay();
    loadStory(i);
  }

  function closeStory() {
    storyViewer.classList.remove('open');
    storyViewer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();
    progressFill.style.width = '0%';
  }

  function next() {
    if (current < circles.length - 1) loadStory(current + 1);
    else closeStory();
  }

  function prev() {
    if (current > 0) loadStory(current - 1);
  }

  circles.forEach((c, i) => c.addEventListener('click', () => openStory(i)));
  closeBtn.addEventListener('click', closeStory);
  prevZone.addEventListener('click', prev);
  nextZone.addEventListener('click', next);

  // Video progress
  videoEl.addEventListener('timeupdate', () => {
    if (!videoEl.duration) return;
    progressFill.style.width = `${(videoEl.currentTime / videoEl.duration) * 100}%`;
  });

  // Auto-close when video ends
  videoEl.addEventListener('ended', closeStory);

  // Tap video to toggle mute (first tap), or pause/play on subsequent
  videoEl.addEventListener('click', () => {
    if (videoEl.muted) {
      videoEl.muted = false;
      storyViewer.classList.add('is-unmuted');
    } else {
      if (videoEl.paused) videoEl.play(); else videoEl.pause();
    }
  });

  muteBtn.addEventListener('click', e => {
    e.stopPropagation();
    videoEl.muted = !videoEl.muted;
    storyViewer.classList.toggle('is-unmuted', !videoEl.muted);
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (!storyViewer.classList.contains('open')) return;
    if (e.key === 'Escape') closeStory();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'ArrowRight') next();
  });

  // Swipe down to close (mobile)
  let touchStartY = null;
  storyViewer.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  storyViewer.addEventListener('touchend', e => {
    if (touchStartY == null) return;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (dy > 80) closeStory();
    touchStartY = null;
  }, { passive: true });
}
