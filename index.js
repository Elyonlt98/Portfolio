/* Horizontal panel navigation for lakshya's portfolio.
   Wheel, trackpad, keyboard, swipe, tabs and pager all move between panels.
   Without this script the page is an ordinary vertical page. */
(function () {
  "use strict";

  var doc = document.documentElement;
  var body = document.body;
  var bar = document.querySelector(".bar");
  var track = document.getElementById("track");
  var panels = Array.prototype.slice.call(track.querySelectorAll(".panel"));
  var ids = panels.map(function (p) { return p.id; });
  var n = panels.length;
  var tabsNav = document.querySelector(".bar__nav");
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tabs a"));
  var wipe = document.querySelector(".wipe");
  var prevBtn = document.getElementById("prev");
  var nextBtn = document.getElementById("next");
  var label = document.getElementById("pager-label");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var menu = document.getElementById("menu");
  var menuLinks = Array.prototype.slice.call(menu.querySelectorAll("a"));
  function closeMenu() { menu.hidden = true; label.setAttribute("aria-expanded", "false"); }
  label.addEventListener("click", function () {
    var open = menu.hidden;
    menu.hidden = !open; label.setAttribute("aria-expanded", String(open));
    if (open) { var cur = menu.querySelector('[aria-current="true"]') || menuLinks[0]; cur.focus(); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { closeMenu(); label.focus(); } });
  document.addEventListener("click", function (e) { if (!menu.hidden && !e.target.closest(".menu, #pager-label")) closeMenu(); });

  var names = { intro: "Introduction", about: "About", research: "Research", experience: "Experience",
                projects: "Projects", publications: "Publications", contact: "Contact" };
  var tones = { intro: "dark", projects: "dark", contact: "laser" };

  var index = 0;
  var busyUntil = 0;
  var lastMoveAt = -1e9;

  function now() { return performance.now(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- layout ---------- */
  function measureBar() { doc.style.setProperty("--bar-h", bar.offsetHeight + "px"); }
  function place(i) { track.style.transform = "translate3d(" + (-i * 100) + "vw,0,0)"; }

  function moveInk() {
    var ink = document.querySelector(".tabs__ink");
    var active = tabs.filter(function (a) { return a.getAttribute("data-go") === ids[index]; })[0];
    tabs.forEach(function (a) {
      if (a === active) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
    if (!active) { ink.style.setProperty("--ink-s", 0); return; }
    ink.style.setProperty("--ink-x", active.offsetLeft + "px");
    ink.style.setProperty("--ink-s", active.offsetWidth / 100);
    if (tabsNav.scrollWidth > tabsNav.clientWidth) {
      tabsNav.scrollTo({ left: Math.max(0, active.offsetLeft - 24), behavior: reduce.matches ? "auto" : "smooth" });
    }
  }

  function runWipe(dir, dur) {
    if (!dur) return;
    wipe.classList.remove("is-running");
    wipe.style.setProperty("--wipe-from", dir > 0 ? "104vw" : "-4vw");
    wipe.style.setProperty("--wipe-to", dir > 0 ? "-4vw" : "104vw");
    void wipe.offsetWidth; // restart the transition
    wipe.classList.add("is-running");
  }

  /* ---------- the move ---------- */
  function go(i, opts) {
    opts = opts || {};
    i = clamp(i, 0, n - 1);
    if (i === index && !opts.force) { place(index); return; }

    var dir = i > index ? 1 : -1;
    var dist = Math.abs(i - index) || 1;
    var dur = (reduce.matches || opts.instant) ? 0 : Math.min(1500, 1000 + dist * 100);
    doc.style.setProperty("--t-travel", dur + "ms");

    if (dur) runWipe(dir, dur);
    index = i;
    place(index);

    panels.forEach(function (p, k) { p.inert = k !== index; });
    var id = ids[index];
    body.setAttribute("data-tone", tones[id] || "light");
    doc.style.setProperty("--p", n > 1 ? index / (n - 1) : 0);
    label.textContent = names[id] || id;
    menuLinks.forEach(function (a) {
      if (a.getAttribute("data-go") === id) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
    closeMenu();
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === n - 1;
    if (index > 0) body.classList.add("has-moved");
    moveInk();

    var target = panels[index];
    window.setTimeout(function () {
      target.classList.add("seen");
      if (id === "experience") updateTimeline();
      if (id === "research") startDemo(); else stopDemo(false);
    }, dur * 0.42);

    busyUntil = now() + dur + 120;
    lastMoveAt = now();
    if (opts.focus) target.focus({ preventScroll: true });

    var url = id === "intro" ? location.pathname + location.search : "#" + id;
    if (opts.push) history.pushState(null, "", url); else history.replaceState(null, "", url);
  }

  function step(d, opts) { go(index + d, opts); }

  /* ---------- wheel and trackpad ---------- */
  var acc = 0, accAt = 0, lastAbs = 0, lastEventAt = 0, lastInner = 0;
  panels.forEach(function (p) {
    p.addEventListener("scroll", function () {
      lastInner = now();
      if (p.id === "experience") updateTimeline();
    }, { passive: true });
  });

  window.addEventListener("wheel", function (e) {
    if (e.ctrlKey) return; // pinch zoom
    var t = now();
    var dx = e.deltaX, dy = e.deltaY;
    if (e.deltaMode === 1) { dx *= 32; dy *= 32; }
    var abs = Math.max(Math.abs(dx), Math.abs(dy));

    // trackpads keep sending a decaying tail after a flick; ignore it after a move
    var decaying = (t - lastEventAt < 80) && abs <= lastAbs;
    lastAbs = abs; lastEventAt = t;
    if (t - accAt > 240) acc = 0;
    accAt = t;

    var p = panels[index];
    var horizontal = Math.abs(dx) > Math.abs(dy) * 1.1;

    if (horizontal) {
      e.preventDefault();
      if (t < busyUntil || (decaying && t - lastMoveAt < 1600)) return;
      acc += dx;
      if (Math.abs(acc) > 40) { step(acc > 0 ? 1 : -1); acc = 0; }
      return;
    }

    var room = p.scrollHeight - p.clientHeight;
    var atBottom = p.scrollTop >= room - 2;
    var atTop = p.scrollTop <= 1;
    var inside = p.contains(e.target);

    if ((dy > 0 && !atBottom) || (dy < 0 && !atTop)) {
      if (!inside) { e.preventDefault(); p.scrollBy(0, dy); } // wheel over the bar or pager
      return;
    }
    e.preventDefault();
    if (t < busyUntil || (decaying && t - lastMoveAt < 1600)) return;
    if (t - lastInner < 600) return; // let a scroll that just reached the end settle
    acc += dy;
    if (Math.abs(acc) > 110) { step(acc > 0 ? 1 : -1); acc = 0; }
  }, { passive: false });

  /* ---------- keyboard ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    var tag = e.target && e.target.closest && e.target.closest("input, textarea, select, [contenteditable]");
    if (tag) return;
    var p = panels[index];
    var atBottom = p.scrollTop >= p.scrollHeight - p.clientHeight - 2;
    var atTop = p.scrollTop <= 1;
    var onControl = e.target && e.target.closest && e.target.closest("button, a");
    switch (e.key) {
      case "ArrowRight": e.preventDefault(); step(1, { focus: true }); break;
      case "ArrowLeft": e.preventDefault(); step(-1, { focus: true }); break;
      case "PageDown": if (atBottom) { e.preventDefault(); step(1, { focus: true }); } break;
      case "PageUp": if (atTop) { e.preventDefault(); step(-1, { focus: true }); } break;
      case " ": if (!onControl && atBottom) { e.preventDefault(); step(e.shiftKey ? -1 : 1, { focus: true }); } break;
      case "Home": if (!onControl) { e.preventDefault(); go(0, { focus: true }); } break;
      case "End": if (!onControl) { e.preventDefault(); go(n - 1, { focus: true }); } break;
    }
  });

  /* ---------- touch: the track follows the finger ---------- */
  var sx = 0, sy = 0, st = 0, lastDx = 0, axis = null, tracking = false;
  track.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) { tracking = false; return; }
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = now(); lastDx = 0; axis = null; tracking = true;
  }, { passive: true });

  track.addEventListener("touchmove", function (e) {
    if (!tracking) return;
    var dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
    if (!axis && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      axis = Math.abs(dx) > Math.abs(dy) * 1.15 ? "x" : "y";
      if (axis === "x") track.classList.add("is-dragging");
    }
    if (axis !== "x") return;
    e.preventDefault();
    var off = dx;
    if ((index === 0 && dx > 0) || (index === n - 1 && dx < 0)) off = dx * 0.3; // resist at the ends
    lastDx = dx;
    track.style.transform = "translate3d(calc(" + (-index * 100) + "vw + " + off + "px),0,0)";
  }, { passive: false });

  function endTouch() {
    if (axis === "x") {
      track.classList.remove("is-dragging");
      var v = lastDx / Math.max(1, now() - st);
      if (Math.abs(lastDx) > window.innerWidth * 0.18 || Math.abs(v) > 0.45) step(lastDx < 0 ? 1 : -1);
      else place(index);
    }
    tracking = false; axis = null;
  }
  track.addEventListener("touchend", endTouch);
  track.addEventListener("touchcancel", endTouch);

  /* ---------- links, tabs, pager, history ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-go]");
    if (!a) return;
    var i = ids.indexOf(a.getAttribute("data-go"));
    if (i < 0) return;
    e.preventDefault();
    go(i, { focus: e.detail === 0, push: true });
  });
  document.querySelector(".skip").addEventListener("click", function (e) {
    e.preventDefault(); go(ids.indexOf("about"), { focus: true });
  });
  prevBtn.addEventListener("click", function () { step(-1); });
  nextBtn.addEventListener("click", function () { step(1); });
  window.addEventListener("popstate", function () {
    var i = ids.indexOf(location.hash.slice(1));
    go(i < 0 ? 0 : i);
  });

  /* ---------- entrances ---------- */
  var enter = document.querySelectorAll("[data-enter]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px", threshold: 0.01 });
    enter.forEach(function (el) { io.observe(el); });
  } else {
    enter.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- experience: the timeline fills as you read ---------- */
  var timeline = document.getElementById("timeline");
  var roles = timeline ? Array.prototype.slice.call(timeline.querySelectorAll(".role")) : [];
  function updateTimeline() {
    if (!timeline) return;
    var r = timeline.getBoundingClientRect();
    var mark = window.innerHeight * 0.62;
    timeline.style.setProperty("--fill", clamp((mark - r.top) / r.height, 0, 1).toFixed(3));
    roles.forEach(function (li) { li.classList.toggle("lit", li.getBoundingClientRect().top + 12 < mark); });
  }

  /* ---------- research: the process chain lights up the schematic ---------- */
  var setup = document.getElementById("setup");
  var stepBtns = Array.prototype.slice.call(document.querySelectorAll(".step"));
  var parts = setup ? Array.prototype.slice.call(setup.querySelectorAll("[data-steps]")) : [];
  var demoTimer = null, demoStart = null, demoStep = 0, userTookOver = false;

  function setStep(s) {
    stepBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-step") === s)); });
    setup.classList.toggle("has-step", s > 0);
    parts.forEach(function (el) {
      var list = el.getAttribute("data-steps").split(" ").map(Number);
      el.classList.toggle("on", s > 0 && list.indexOf(s) > -1);
    });
  }
  stepBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      userTookOver = true; stopDemo(false);
      var s = +b.getAttribute("data-step");
      setStep(b.getAttribute("aria-pressed") === "true" ? 0 : s);
    });
  });
  function startDemo() {
    if (reduce.matches || userTookOver || demoTimer || demoStart) return;
    demoStart = window.setTimeout(function () {
      demoStart = null;
      demoStep = demoStep % 5 + 1; setStep(demoStep);
      demoTimer = window.setInterval(function () {
        demoStep = demoStep % 5 + 1; setStep(demoStep);
      }, 2600);
    }, 1800);
  }
  function stopDemo(clear) {
    if (demoStart) { window.clearTimeout(demoStart); demoStart = null; }
    if (demoTimer) { window.clearInterval(demoTimer); demoTimer = null; }
    if (clear) setStep(0);
  }

  /* ---------- start ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  measureBar();
  track.classList.add("is-dragging"); // no transition for the first placement
  var start = ids.indexOf(location.hash.slice(1));
  go(start < 0 ? 0 : start, { instant: true, force: true });
  requestAnimationFrame(function () { requestAnimationFrame(function () { track.classList.remove("is-dragging"); }); });

  var resizeT;
  window.addEventListener("resize", function () {
    track.classList.add("is-dragging");
    measureBar(); place(index); moveInk();
    window.clearTimeout(resizeT);
    resizeT = window.setTimeout(function () { track.classList.remove("is-dragging"); }, 120);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveInk);
})();
