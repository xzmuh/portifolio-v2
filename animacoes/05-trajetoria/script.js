(function setupExperienceScroll() {
  if (!window.gsap || !window.ScrollTrigger) return;
  var pinWrap = document.querySelector('.experience-pin');
  var track = document.querySelector('.experience_track');
  var wipeGray = document.querySelector('.experience_colorwipe--gray');
  var wipeDark = document.querySelector('.experience_colorwipe--dark');
  if (!pinWrap || !track || !wipeGray || !wipeDark) return;

  gsap.registerPlugin(ScrollTrigger);

  var startWhenReady = function (run) {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(run, run);
    } else {
      run();
    }
  };

  startWhenReady(setupWhenFontsReady);

  function setupWhenFontsReady() {
    ScrollTrigger.matchMedia({
      "all": function () {
        var getScrollAmount = function () { return track.scrollWidth - window.innerWidth; };
        var moveLen = getScrollAmount() * 0.55;
        var holdLen = window.innerHeight * 0.15;
        var moveFrac = moveLen / (moveLen + holdLen);

        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: pinWrap,
            start: "top top",
            end: function () { return "+=" + (moveLen + holdLen); },
            scrub: 0.3,
            pin: true,
            invalidateOnRefresh: true
          }
        });
        gsap.set(pinWrap, { color: "#0b0b0b" });
        gsap.set([wipeGray, wipeDark], { clipPath: "inset(0 0 0 100%)" });

        tl.to(track, { x: function () { return -getScrollAmount(); }, ease: "none", duration: moveFrac }, 0)
          .to(wipeGray, { clipPath: "inset(0 0 0 0%)", ease: "none", duration: moveFrac / 2 }, 0)
          .to(wipeDark, { clipPath: "inset(0 0 0 0%)", ease: "none", duration: moveFrac / 2 }, moveFrac / 2)
          .set(pinWrap, { color: "#ffffff" }, moveFrac / 2)
          .to({}, { duration: 1 - moveFrac }, moveFrac);

        return function () {
          if (tl.scrollTrigger) tl.scrollTrigger.kill();
          tl.kill();
          gsap.set(pinWrap, { clearProps: "color" });
          gsap.set(track, { clearProps: "transform" });
          gsap.set([wipeGray, wipeDark], { clearProps: "clipPath" });
        };
      }
    });
  }
})();
