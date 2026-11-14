/* Thème clair/sombre partagé : mémorise le choix et ajoute un bouton flottant.
   Les pages qui gèrent déjà leur propre panneau de réglages n'incluent pas ce script. */
"use strict";
(function () {
  var KEY = "soiree:theme";
  function stored() {
    try {
      var t = localStorage.getItem(KEY);
      if (t === "light" || t === "dark") return t;
      // Le hub enregistre son réglage dans « soiree:set » : on le suit s'il n'y
      // a pas encore de choix propre au jeu.
      var o = JSON.parse(localStorage.getItem("soiree:set") || "{}");
      if (o && (o.theme === "light" || o.theme === "dark")) return o.theme;
    } catch (e) {}
    return null;
  }
  function save(t) {
    try { localStorage.setItem(KEY, t); } catch (e) {}
    try {
      var o = JSON.parse(localStorage.getItem("soiree:set") || "{}");
      o = o && typeof o === "object" ? o : {};
      o.theme = t;
      localStorage.setItem("soiree:set", JSON.stringify(o));
    } catch (e) {}
  }
  function apply(t) {
    document.documentElement.dataset.theme = t;
    var b = document.getElementById("themebtn");
    if (b) {
      b.textContent = t === "dark" ? "☀️" : "🌙";
      b.setAttribute("aria-label", t === "dark" ? "Passer en thème clair" : "Passer en thème sombre");
      b.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
    }
  }
  var pref = stored();
  if (pref) apply(pref);

  function mount() {
    if (document.getElementById("themebtn")) return;
    var b = document.createElement("button");
    b.id = "themebtn";
    b.className = "themebtn";
    b.type = "button";
    b.addEventListener("click", function () {
      var t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      save(t);
      apply(t);
    });
    document.body.appendChild(b);
    apply(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
