/**
 * setupProxy.js — proxy de dev pour Create React App (react-scripts).
 *
 * Pourquoi : le serveur Knowage tourne sur http://localhost:18080 et
 * l'appli React sur http://localhost:3000. Ce sont deux origines
 * différentes (même host, port différent), donc le navigateur interdit
 * tout accès JS au contenu d'une iframe Knowage embarquée directement
 * via http://localhost:18080/... (erreur "Blocked a frame with origin...").
 *
 * Ce fichier fait passer toutes les requêtes commençant par "/knowage"
 * faites depuis localhost:3000 vers le vrai serveur Knowage sur
 * localhost:18080, SANS réécrire les chemins (le serveur Knowage utilise
 * déjà ces préfixes-là, donc on les garde identiques). Le navigateur ne
 * voit alors plus qu'UNE seule origine (localhost:3000), donc l'iframe
 * devient accessible en JS depuis le code React (cf. pages/CockpitDakar.jsx).
 *
 * Préfixes Knowage concernés (tous commencent par "knowage", sans "/"
 * après — d'où le test manuel ci-dessous plutôt qu'un mount Express
 * classique) :
 * - /knowage-vue/*           -> l'appli Vue.js de Knowage (le cockpit lui-même)
 * - /knowage/*               -> les API REST génériques (restful-services, etc.)
 * - /knowagecockpitengine/*  -> les appels AJAX du moteur de cockpit
 *   (exécution des widgets, navigation entre sheets, etc.)
 * - et d'autres préfixes du même type selon le widget
 *   (knowagechartengine, knowagepivotengine, knowagemap, knowagehtmlengine...)
 *
 * IMPORTANT — pourquoi pas app.use(/^\/knowage/, proxy) : testé et
 * confirmé que dans cette config (Express 4.x tel qu'utilisé par
 * webpack-dev-server / react-scripts), un mount avec un RegExp brut ne
 * matchait pas les requêtes (vérifié par un test isolé : le middleware
 * n'était jamais invoqué, toutes les requêtes "knowage*" retombaient
 * sur le fallback SPA de CRA, qui renvoie index.html avec un 200 —
 * d'où les comportements bizarres observés : pas de 404 mais pas le
 * bon contenu non plus). La solution fiable : un middleware "catch-all"
 * classique (app.use sans path) qui teste req.url lui-même en JS et
 * délègue au proxy seulement si ça commence par "/knowage".
 *
 * react-scripts charge ce fichier automatiquement au démarrage du
 * serveur de dev (`npm start`) — aucune configuration supplémentaire
 * n'est nécessaire. http-proxy-middleware est déjà fourni par
 * react-scripts (présent dans node_modules), donc rien à installer.
 *
 * ATTENTION : ceci ne couvre que le mode développement (`npm start`). En
 * production (`npm run build` + serveur statique/nginx), il faudra
 * configurer un reverse proxy équivalent côté serveur (voir le
 * commentaire en bas de ce fichier).
 *
 * ATTENTION : après TOUTE modification de ce fichier, il faut redémarrer
 * `npm start` — react-scripts ne le recharge qu'au démarrage.
 */

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  const proxy = createProxyMiddleware({
    target: 'http://localhost:18080',
    changeOrigin: true,
    ws: true, // Knowage utilise des websockets pour certaines mises a jour live
    // Pas de pathRewrite : les chemins restent identiques entre notre proxy
    // et le serveur Knowage, seul l'hote:port change.
    onProxyRes: function (proxyRes) {
      // Knowage peut envoyer un header qui empeche le framing.
      // On le retire pour permettre l'affichage dans notre <iframe>.
      delete proxyRes.headers['x-frame-options'];
      delete proxyRes.headers['content-security-policy'];
    },
  });

  app.use(function (req, res, next) {
    if (/^\/knowage/.test(req.url)) {
      return proxy(req, res, next);
    }
    next();
  });
};

/*
 * Equivalent en PRODUCTION (nginx) :
 *
 * server {
 *     listen 80;
 *     server_name tonapp.com;
 *
 *     location ~ ^/knowage {
 *         proxy_pass http://localhost:18080;
 *         proxy_set_header Host $host;
 *         proxy_hide_header X-Frame-Options;
 *         proxy_hide_header Content-Security-Policy;
 *     }
 *
 *     location / {
 *         root /var/www/transportdakar/build;   # build React (npm run build)
 *         try_files $uri /index.html;
 *     }
 * }
 */
