// Footer year and back-to-top button visibility.
(function () {
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  var toTop = document.querySelector(".totop");
  if (!toTop) return;
  function update() {
    toTop.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.8);
  }
  window.addEventListener("scroll", update, { passive: true });
  update();
})();
