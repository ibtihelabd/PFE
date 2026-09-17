import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getSession, canAccess } from '../auth';

/**
 * ProtectedRoute — Garde d'accès avec RBAC
 * - Redirige vers /login-decideurs si non connecté ou session expirée
 * - Affiche une page "Accès refusé" si le rôle n'a pas les droits sur cette route
 */
export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login-decideurs" replace state={{ from: location }} />;
  }

  const session = getSession();
  // Extraire le sous-chemin relatif à /decideurs (ex: "" | "zones-risque" | "anomalies")
  const subPath = location.pathname.replace('/decideurs', '').replace(/^\//, '');

  if (!canAccess(session, subPath)) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--dtk-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, sans-serif', flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>
          🔒
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--dtk-text)', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
            Accès refusé
          </h2>
          <p style={{ color: 'var(--dtk-muted)', fontSize: 13, margin: '0 0 4px' }}>
            Votre rôle <strong style={{ color: session?.roleColor }}>{session?.roleLabel}</strong> n'a pas accès à cette section.
          </p>
          <p style={{ color: 'var(--dtk-vmuted)', fontSize: 12, margin: 0 }}>
            Contactez l'administrateur CETUD pour obtenir les droits nécessaires.
          </p>
        </div>
        <a href="/decideurs" style={{
          marginTop: 8, padding: '10px 24px', borderRadius: 10,
          background: 'var(--dtk-panel)', border: '1px solid var(--dtk-border)',
          color: 'var(--dtk-sub)', textDecoration: 'none', fontSize: 13,
          transition: 'all 0.2s',
        }}>
          ← Retour au tableau de bord
        </a>
      </div>
    );
  }

  return children;
}
