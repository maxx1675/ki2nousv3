/* Bibliothèque locale de contenus (liens, photos, vidéos, textes, sons).
   Stockée dans IndexedDB sur l'appareil : elle survit aux rechargements et aux
   parties, sans passer par le serveur. Chaque jeu utilise son propre espace
   (`game`) pour ne pas mélanger les contenus. */
"use strict";
(function () {
  var DB_NAME = "soiree-lib";
  var STORE = "items";
  var VERSION = 1;
  var _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error("IndexedDB indisponible"));
      var req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var st = db.createObjectStore(STORE, { keyPath: "id" });
          st.createIndex("game", "game", { unique: false });
          st.createIndex("ts", "ts", { unique: false });
        }
      };
      req.onsuccess = function () { _db = req.result; resolve(_db); };
      req.onerror = function () { reject(req.error || new Error("Ouverture IndexedDB impossible")); };
    });
  }

  function run(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode);
        var store = tx.objectStore(STORE);
        var out;
        try { out = fn(store); } catch (e) { reject(e); return; }
        tx.oncomplete = function () { resolve(out && "result" in out ? out.result : out); };
        tx.onerror = function () { reject(tx.error || new Error("Écriture impossible")); };
        tx.onabort = function () { reject(tx.error || new Error("Écriture annulée")); };
      });
    });
  }

  function reqToPromise(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  var Lib = {
    /** Liste les contenus d'un jeu, du plus récent au plus ancien. */
    list: function (game) {
      return run("readonly", function (store) {
        var idx = store.index("game");
        return reqToPromise(idx.getAll(String(game || "")));
      }).then(function (rows) {
        return (rows || []).sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
      }).catch(function () { return []; });
    },
    get: function (id) {
      return run("readonly", function (store) { return reqToPromise(store.get(String(id))); }).catch(function () { return null; });
    },
    /** Ajoute ou remplace un contenu. `item` doit avoir id, game, kind, label, ref. */
    put: function (item) {
      if (!item || !item.id || !item.game) return Promise.resolve(false);
      var row = {
        id: String(item.id),
        game: String(item.game),
        kind: String(item.kind || ""),
        label: String(item.label || "").slice(0, 80),
        ref: String(item.ref || ""),
        data: typeof item.data === "string" ? item.data : "",
        by: String(item.by || ""),
        partyId: String(item.partyId || ""),
        ts: Number(item.ts) || Date.now()
      };
      return run("readwrite", function (store) {
        return reqToPromise(store.put(row));
      }).then(function () { return true; }).catch(function () { return false; });
    },
    del: function (id) {
      return run("readwrite", function (store) { return reqToPromise(store.delete(String(id))); }).then(function () { return true; }).catch(function () { return false; });
    },
    clear: function (game) {
      return this.list(game).then(function (rows) {
        return Promise.all(rows.map(function (r) { return Lib.del(r.id); }));
      }).catch(function () { return []; });
    },
    /** Garde au maximum `max` contenus pour un jeu (les plus anciens partent). */
    trim: function (game, max) {
      return this.list(game).then(function (rows) {
        var extra = rows.slice(Math.max(0, max || 80));
        return Promise.all(extra.map(function (r) { return Lib.del(r.id); }));
      }).catch(function () { return []; });
    }
  };

  window.Lib = Lib;
})();
