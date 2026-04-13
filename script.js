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
  nav.classList.toggle('scrolled', y > 80);
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

// Horizontal scroll — drag to scroll
const wrapper = document.querySelector('.horizontal-wrapper');
const track = document.getElementById('horizontalTrack');
const progressBar = document.getElementById('horizontalProgress');

let isDragging = false;
let startX;
let scrollLeft;

wrapper.addEventListener('mousedown', (e) => {
  isDragging = true;
  wrapper.style.cursor = 'grabbing';
  startX = e.pageX - wrapper.offsetLeft;
  scrollLeft = wrapper.scrollLeft;
});

wrapper.addEventListener('mouseleave', () => {
  isDragging = false;
  wrapper.style.cursor = 'grab';
});

wrapper.addEventListener('mouseup', () => {
  isDragging = false;
  wrapper.style.cursor = 'grab';
});

wrapper.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  e.preventDefault();
  const x = e.pageX - wrapper.offsetLeft;
  const walk = (x - startX) * 1.5;
  wrapper.scrollLeft = scrollLeft - walk;
});

// Progress bar for horizontal scroll
wrapper.addEventListener('scroll', () => {
  const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;
  const pct = maxScroll > 0 ? (wrapper.scrollLeft / maxScroll) * 100 : 0;
  progressBar.style.width = pct + '%';
});

// Mouse wheel horizontal scroll support
wrapper.addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    e.preventDefault();
    wrapper.scrollLeft += e.deltaY;
  }
}, { passive: false });

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
