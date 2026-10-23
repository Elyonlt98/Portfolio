// Footer year, back-to-top, scroll progress, reveals and timeline fill.
(function () {
  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Reveal elements once as they enter the viewport.
  var items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || reduce) {
    items.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  var toTop = document.querySelector(".totop");
  var timeline = document.querySelector(".timeline");
  var nodes = timeline ? timeline.querySelectorAll(".timeline__item") : [];
  var ticking = false;

  function update() {
    ticking = false;
    var max = doc.scrollHeight - window.innerHeight;
    doc.style.setProperty("--scroll", max > 0 ? Math.min(1, window.scrollY / max) : 0);
    if (toTop) toTop.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.8);

    if (timeline && !reduce) {
      var r = timeline.getBoundingClientRect();
      var mark = window.innerHeight * 0.6;
      var fill = Math.max(0, Math.min(1, (mark - r.top) / r.height));
      timeline.style.setProperty("--fill", fill.toFixed(3));
      nodes.forEach(function (n) {
        n.classList.toggle("lit", n.getBoundingClientRect().top + 10 < mark);
      });
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();
