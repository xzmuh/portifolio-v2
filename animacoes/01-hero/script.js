gsap.registerPlugin(ScrollTrigger);

const headerEl = document.querySelector('.header');
let lastScrollY = 0;
window.addEventListener('scroll', () => {
  const scroll = window.scrollY;
  const goingDown = scroll > lastScrollY;
  if (goingDown && scroll > 120) {
    headerEl.classList.add('header--hidden');
  } else {
    headerEl.classList.remove('header--hidden');
  }
  lastScrollY = scroll;
});

gsap.set('.img-reveal_wrap', { opacity: 0 });
gsap.set('#h1, #h3', { x: '-100vw', opacity: 0 });
gsap.set('#h2, #h4', { x: '100vw', opacity: 0 });

gsap.to('.img-reveal_wrap', { opacity: 1, duration: 1.5, ease: 'power2.out' });
gsap.to('#h1', { x: 0, opacity: 1, duration: 1, ease: 'expo.out' });
gsap.to('#h2', { x: 0, opacity: 1, duration: 2, ease: 'expo.out' });
gsap.to('#h3', { x: 0, opacity: 1, duration: 3, ease: 'expo.out' });
gsap.to('#h4', { x: 0, opacity: 1, duration: 4, ease: 'expo.out' });

const headingInners = document.querySelectorAll('.hero_heading-inner');
const image = document.querySelector('.img-reveal_img');

const headingMoves = Array.from(headingInners).map(el => ({
  x: gsap.quickTo(el, 'x', { duration: 1, ease: 'power3' }),
  y: gsap.quickTo(el, 'y', { duration: 1, ease: 'power3' }),
}));
const imageX = gsap.quickTo(image, 'x', { duration: 1.2, ease: 'power3' });
const imageY = gsap.quickTo(image, 'y', { duration: 1.2, ease: 'power3' });

window.addEventListener('mousemove', (e) => {
  const xPercent = (e.clientX / window.innerWidth - 0.5) * 2;
  const yPercent = (e.clientY / window.innerHeight - 0.5) * 2;

  headingMoves.forEach(({ x, y }) => {
    x(xPercent * 30);
    y(yPercent * 20);
  });

  imageX(-xPercent * 25);
  imageY(-yPercent * 15);
});

gsap.from('.emoji', {
  scale: 0,
  duration: 1.25,
  ease: 'expo.out',
  scrollTrigger: { trigger: '.emoji', start: 'top 85%' },
});
