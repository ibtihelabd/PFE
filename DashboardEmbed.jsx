import { useRef, useCallback } from "react";

/**
 * Intègre le cockpit Knowage "Acceuil" dans l'application React via iframe,
 * et reproduit les 5 boutons de navigation (Trafic, Déplacements, Démographie,
 * Accessibilité, IA) EN DEHORS de Knowage, dans le code de l'application.
 *
 * Pourquoi ça marche ici alors que ça ne marchait pas dans Knowage :
 * Knowage passe tout le HTML des widgets par un sanitizer côté serveur qui
 * supprime systématiquement les balises <script>/<iframe> et les attributs
 * non standards (onclick, ng-click, data-*, etc.) au moment de l'enregistrement
 * du document. Mais ici, les boutons ne font PAS partie du widget Knowage :
 * ils vivent dans le code de TON application, donc rien n'est jamais envoyé
 * au serveur Knowage pour être nettoyé. Le bouton se contente de regarder
 * DANS l'iframe (depuis l'extérieur) et de cliquer sur l'onglet voulu —
 * exactement la même technique de clic JS sur md-tab-item qui a été testée
 * et confirmée fonctionnelle pendant les sessions de debug.
 *
 * ⚠️ Deux prérequis techniques à vérifier avant que ça fonctionne :
 *
 * 1) MÊME ORIGINE (same-origin) : ton appli React et le serveur Knowage
 *    doivent être servis depuis le même domaine (même schéma+host+port),
 *    sinon le navigateur bloque tout accès JS au contenu de l'iframe
 *    (erreur "Blocked a frame with origin ... from accessing a cross-origin frame").
 *    Solution typique : un reverse proxy (nginx, Apache, etc.) qui expose
 *    Knowage sous un chemin de ton propre domaine, ex:
 *      https://tonapp.com/         -> ton appli React
 *      https://tonapp.com/knowage/ -> proxy vers le serveur Knowage
 *
 * 2) AUTORISATION DE FRAMING : le serveur Knowage (ou un proxy devant lui)
 *    peut envoyer un header X-Frame-Options ou Content-Security-Policy
 *    (frame-ancestors) qui empêche purement et simplement d'afficher
 *    Knowage dans une iframe. Il faut vérifier/configurer ces headers côté
 *    serveur Knowage ou proxy pour autoriser le domaine de ton appli.
 *
 * 3) SESSION / AUTHENTIFICATION : l'utilisateur doit être connecté à
 *    Knowage dans le même navigateur (cookie de session) pour que le
 *    dashboard s'affiche directement sans écran de login dans l'iframe.
 */

const KNOWAGE_BASE = "http://localhost:18080"; // adapte selon ton domaine / proxy
const COCKPIT_URL = `${KNOWAGE_BASE}/knowage-vue/workspace/document-composite/Acceuil`;

// Le texte doit correspondre au début du texte visible de l'onglet Knowage
// (accents compris), car on fait un test de préfixe sur le textContent.
const SHEETS = [
  { key: "trafic", label: "Trafic", icon: "🚦" },
  { key: "deplacements", label: "Déplacements", icon: "🚌" },
  { key: "demographie", label: "Démographie", icon: "👥" },
  { key: "accessibilite", label: "Accessibilité", icon: "♿" },
  { key: "ia", label: "IA", icon: "🤖" },
];

export default function DashboardEmbed() {
  const iframeRef = useRef(null);

  const goToSheet = useCallback((label) => {
    const outerDoc = iframeRef.current?.contentDocument;
    if (!outerDoc) {
      console.warn("Iframe Knowage pas encore chargée ou accès cross-origin bloqué.");
      return;
    }

    // Knowage imbrique lui-même le cockpit réel dans une 2e iframe interne.
    const innerFrame = outerDoc.querySelector("iframe.document-execution-iframe");
    const innerDoc = innerFrame?.contentDocument;
    if (!innerDoc) {
      console.warn("Iframe interne du cockpit Knowage introuvable (pas encore rendue ?).");
      return;
    }

    const tabs = Array.from(innerDoc.querySelectorAll("md-tab-item"));
    const target = tabs.find((t) => t.textContent.trim().indexOf(label) === 0);
    if (target) {
      target.click();
    } else {
      console.warn(`Onglet "${label}" introuvable parmi`, tabs.map((t) => t.textContent.trim()));
    }
  }, []);

  return (
    <div className="dashboard-wrapper">
      <div
        className="nav-cards"
        style={{ display: "flex", gap: "12px", marginBottom: "16px" }}
      >
        {SHEETS.map((s) => (
          <button
            key={s.key}
            onClick={() => goToSheet(s.label)}
            style={{
              flex: 1,
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "28px" }}>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      <iframe
        ref={iframeRef}
        src={COCKPIT_URL}
        title="TransportDakar Cockpit"
        style={{ width: "100%", height: "85vh", border: "none" }}
      />
    </div>
  );
}
