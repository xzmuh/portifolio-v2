const items = document.querySelectorAll(".service_list p, .service_list");
items.forEach(item => {
  new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal');
        const svc = entry.target.closest('.service');
        if (svc) svc.classList.add('reveal');
      }
    });
  }, { rootMargin: "0px 0px -15% 0px", threshold: 0 }).observe(item);
});
