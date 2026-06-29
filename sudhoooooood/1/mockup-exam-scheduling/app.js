(function () {
  "use strict";

  var nav = document.getElementById("nav");
  var navItems = nav.querySelectorAll(".navi");
  var panels = document.querySelectorAll(".pnl");

  nav.addEventListener("click", function (e) {
    var item = e.target.closest(".navi");
    if (!item) return;
    var key = item.dataset.p;
    navItems.forEach(function (n) { n.classList.toggle("on", n === item); });
    panels.forEach(function (p) { p.classList.toggle("on", p.dataset.p === key); });
  });

  var root = document.documentElement;
  var themeBtn = document.getElementById("theme");
  var icon = themeBtn.querySelector("i");

  function prefersDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function isDark() {
    if (root.classList.contains("dark")) return true;
    if (root.classList.contains("light")) return false;
    return prefersDark();
  }
  function syncIcon() {
    icon.className = isDark() ? "ti ti-sun" : "ti ti-moon";
  }
  themeBtn.addEventListener("click", function () {
    var dark = isDark();
    root.classList.remove("dark", "light");
    root.classList.add(dark ? "light" : "dark");
    syncIcon();
  });
  syncIcon();

  var toast = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2200);
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-act]");
    if (!btn) return;
    showToast(btn.dataset.act + " — ตัวอย่าง mockup");
  });
})();
