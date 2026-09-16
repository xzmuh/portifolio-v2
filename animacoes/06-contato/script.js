const lenis = new Lenis({
  duration: 1.4,
  easing: (t) => Math.min(1, 1 - Math.pow(2, -10 * t)),
  direction: 'vertical',
  smooth: true,
  mouseMultiplier: 1,
  smoothTouch: false,
  touchMultiplier: 2,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    if (target) lenis.scrollTo(target, { duration: 1.4 });
  });
});

const headerEl = document.querySelector('.header');
let lastScrollY = 0;
lenis.on('scroll', ({ scroll }) => {
  const goingDown = scroll > lastScrollY;
  if (goingDown && scroll > 120) {
    headerEl.classList.add('header--hidden');
  } else {
    headerEl.classList.remove('header--hidden');
  }
  lastScrollY = scroll;
});

const cursor = document.querySelector('.cursor');
window.addEventListener('mousemove', (e) => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
});
document.querySelectorAll('.nav_link').forEach(l => {
  l.addEventListener('mouseenter', () => cursor.classList.add('grow'));
  l.addEventListener('mouseleave', () => cursor.classList.remove('grow'));
});
document.querySelectorAll('.cta, .email_link').forEach(l => {
  l.addEventListener('mouseenter', () => cursor.classList.add('cta-grow'));
  l.addEventListener('mouseleave', () => cursor.classList.remove('cta-grow'));
});
