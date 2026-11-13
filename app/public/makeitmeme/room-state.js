/* État de salon Make It Meme — fonctions pures, sans dépendance au DOM.
   Chargé en global par la page et évalué tel quel par le test Vitest. */
(function (root) {
  "use strict";

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function sanitize(value) {
    if (value === null || typeof value !== "object") return value === undefined ? null : value;
    if (Array.isArray(value)) return value.map(sanitize);
    const clean = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined && typeof item !== "function") clean[String(key)] = sanitize(item);
    }
    return JSON.parse(JSON.stringify(clean));
  }

  /* Applique un patch façon Firestore (`players.<uid>.score`) à un objet d'état. */
  function applyPatch(target, partial) {
    if (!target || !partial || typeof partial !== "object") return target;
    for (const [key, value] of Object.entries(partial)) {
      if (key.includes(".")) {
        const parts = key.split(".");
        let node = target;
        for (let i = 0; i < parts.length - 1; i++) {
          if (typeof node[parts[i]] !== "object" || node[parts[i]] === null) node[parts[i]] = {};
          node = node[parts[i]];
        }
        node[parts[parts.length - 1]] = value;
      } else {
        target[key] = value;
      }
    }
    return target;
  }

  /* Un invité ne peut modifier que son profil de joueur et son propre vote.
     Tout le reste (scores, statut, hôte, configuration) reste réservé à l'hôte. */
  function allowedGuestPatch(playerId, partial) {
    const safe = {};
    if (!playerId || !partial || typeof partial !== "object") return safe;
    for (const [key, value] of Object.entries(partial)) {
      if (key.startsWith("players." + playerId + ".")) {
        safe[key] = value;
        continue;
      }
      const parts = key.split(".");
      if (parts.length === 3 && parts[0] === "votes" && parts[2] === playerId) safe[key] = value;
    }
    return safe;
  }

  root.MimRoomState = { clone, sanitize, applyPatch, allowedGuestPatch };
})(typeof globalThis !== "undefined" ? globalThis : this);
