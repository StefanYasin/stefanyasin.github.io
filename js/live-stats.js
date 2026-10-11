/* Fills the "Live from GitHub" strip from data/stats.json.
   Values are baked into the HTML too, so the strip is correct with JS off or if the fetch fails. */
(function () {
  var strip = document.getElementById("liveStats");
  if (!strip) return;
  var src = strip.getAttribute("data-src") || "data/stats.json";

  function set(key, value) {
    document.querySelectorAll('[data-live="' + key + '"]').forEach(function (el) {
      el.textContent = value;
    });
  }

  function shortDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  }

  fetch(src + "?v=" + Date.now(), { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function (d) {
      if (typeof d.publicTools === "number") set("publicTools", String(d.publicTools));
      if (typeof d.stars === "number") set("stars", String(d.stars));
      if (typeof d.commitsLast365 === "number") set("commits", String(d.commitsLast365));
      if (d.lastShip) {
        set("lastShip", d.lastShip.repo);
        var link = document.querySelector('[data-live-link="lastShip"]');
        if (link && d.lastShip.url) link.setAttribute("href", d.lastShip.url);
      }
      if (d.generatedAt) set("stamp", "GitHub API, refreshed " + shortDate(d.generatedAt));
      strip.classList.add("is-live");
    })
    .catch(function () {
      set("stamp", "GitHub API unreachable right now. Numbers shown are the last known values.");
    });
})();
