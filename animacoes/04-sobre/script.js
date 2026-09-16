document.querySelectorAll('.about-stair-item').forEach(item => {
  new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -5% 0px", threshold: 0 }).observe(item);
});

gsap.registerPlugin(ScrollTrigger);
document.querySelectorAll('.grow-text').forEach((el) => {
  gsap.from(el, {
    scale: 0.2,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out',
    scrollTrigger: { trigger: el, start: 'top 90%' },
  });
});
