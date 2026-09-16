gsap.registerPlugin(ScrollTrigger);

document.querySelectorAll('.works-item').forEach(item => {
  new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0 }).observe(item);
});

gsap.set('.img-reveal_block', { y: '0%' });
gsap.set('.featured .img-reveal_img', { scale: 1.15 });
gsap.to('.img-reveal_block', {
  y: '-100%', ease: 'power4.out', duration: 1.2,
  scrollTrigger: { trigger: '.featured', start: 'top 80%' },
});
gsap.to('.featured .img-reveal_img', {
  scale: 1, ease: 'power4.out', duration: 1.2,
  scrollTrigger: { trigger: '.featured', start: 'top 80%' },
});

const cursor = document.querySelector('.cursor');
window.addEventListener('mousemove', (e) => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
});
document.querySelectorAll('.project_item').forEach(l => {
  l.addEventListener('mouseenter', () => cursor.classList.add('blur-grow'));
  l.addEventListener('mouseleave', () => cursor.classList.remove('blur-grow'));
});
