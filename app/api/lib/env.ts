/**
 * Variables d'environnement.
 * Toutes sont OPTIONNELLES : l'appli démarre sur Render même si rien n'est configuré.
 * (Avant, APP_ID / DATABASE_URL / KIMI_* étaient obligatoires en production et faisaient planter le démarrage.)
 */
const get = (name: string): string => (process.env[name] ?? "").trim();

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT || "3000", 10) || 3000,

  // --- Serveur TURN (caméra Poker Face en 4G) : au choix, UNE de ces 3 options ---
  // 1) Metered.ca (le plus simple, offre gratuite) : METERED_DOMAIN=monappli.metered.live  +  METERED_API_KEY=xxxx
  meteredDomain: get("METERED_DOMAIN"),
  meteredApiKey: get("METERED_API_KEY"),
  // 2) Un serveur coturn avec identifiants fixes : TURN_URLS="turn:ip:3478,turns:ip:5349" + TURN_USERNAME + TURN_CREDENTIAL
  turnUrls: get("TURN_URLS"),
  turnUsername: get("TURN_USERNAME"),
  turnCredential: get("TURN_CREDENTIAL"),
  // 3) Un serveur coturn avec "use-auth-secret" : TURN_URLS + TURN_SECRET
  turnSecret: get("TURN_SECRET"),
};
