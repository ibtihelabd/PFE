/**
 * auth.js — Authentification décideurs CETUD
 * Le frontend ne stocke plus de mots de passe ni de logique de vérification :
 * tout est validé côté serveur (FastAPI) qui renvoie un vrai JWT signé.
 * Ce fichier ne fait que stocker ce token et l'attacher aux requêtes API.
 */

const API_URL   = 'http://localhost:8000';
const TOKEN_KEY = 'dtk_session';

// Comptes de démonstration (affichage uniquement dans la page de login —
// les mots de passe réels sont vérifiés côté backend dans DECIDEURS_DB).
export const USERS = [
  {
    id: 'u1',
    login: 'planification',
    password: 'plan2025',
    nom: 'Directeur Planification',
    role: 'planificateur',
    roleLabel: 'Directeur Planification',
    roleColor: '#74c0fc',
    avatar: 'DP',
  },
  {
    id: 'u2',
    login: 'exploitation',
    password: 'expl2025',
    nom: 'Chef Exploitation',
    role: 'exploitation',
    roleLabel: "Chef d'Exploitation",
    roleColor: '#ff6b35',
    avatar: 'CE',
  },
];

// ── Décode la partie payload d'un JWT (sans vérifier la signature —
//    la vérification cryptographique réelle est faite côté serveur) ──────
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ── Login : appelle le backend FastAPI /auth/login ────────────────────────
export async function login(loginInput, passwordInput) {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginInput.trim(), password: passwordInput }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.detail || 'Identifiants incorrects.' };
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    return { success: true, user: data.user };
  } catch {
    return { success: false, error: "Impossible de contacter le serveur. Vérifiez que FastAPI tourne sur le port 8000." };
  }
}

// ── Logout ─────────────────────────────────────────────────────────────────
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// ── Vérifier session (décodage local du JWT pour l'UI ; la vraie
//    vérification de signature/expiration est faite par le backend
//    sur chaque appel API protégé) ──────────────────────────────────────────
export function getSession() {
  const token = getToken();
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) { logout(); return null; }

  if (payload.exp && Date.now() >= payload.exp * 1000) {
    logout();
    return null;
  }

  return {
    id: payload.userId,
    login: payload.sub,
    nom: payload.nom,
    role: payload.role,
    roleLabel: payload.roleLabel,
    roleColor: payload.roleColor,
    avatar: payload.avatar,
    allowedRoutes: payload.allowedRoutes || [],
    expiresAt: payload.exp * 1000,
  };
}

export function isAuthenticated() {
  return getSession() !== null;
}

// ── RBAC : vérifier accès à une route ─────────────────────────────────────
export function canAccess(session, subPath) {
  if (!session) return false;
  const path = subPath === '' ? '/' : `/${subPath}`;
  return session.allowedRoutes.includes(path);
}

// ── Temps restant de session ───────────────────────────────────────────────
export function getSessionTimeLeft() {
  const session = getSession();
  if (!session) return 0;
  return Math.max(0, session.expiresAt - Date.now());
}

// ── authFetch : wrapper fetch() qui attache automatiquement le JWT ────────
//    À utiliser pour tous les appels API des pages décideurs.
//    En cas de 401 (token absent/expiré/invalide), déconnecte et redirige.
export async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    logout();
    window.location.href = '/login-decideurs';
  }
  return res;
}
