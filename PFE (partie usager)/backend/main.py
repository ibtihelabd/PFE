from fastapi import FastAPI, HTTPException, Depends, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import numpy as np
import pandas as pd
import joblib
import json
import os
import jwt
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

# ── Base de données PostgreSQL ────────────────────────────────────────────────
from database import init_db, get_db, AvisCitoyen

app = FastAPI(
    title="API Transport Urbain Dakar — PFE",
    description="Recommandation de mode de transport et segmentation des usagers",
    version="1.0.0"
)


@app.on_event("startup")
def startup_event():
    """Initialise la base de donnees PostgreSQL au demarrage de FastAPI."""
    try:
        init_db()
        print("[OK] Connexion PostgreSQL etablie et base initialisee.")
    except Exception as e:
        print(f"[WARNING] Impossible de se connecter a PostgreSQL : {e}")
        print("   Verifier que PostgreSQL est demarre et que DATABASE_URL est correcte.")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ════════════════════════════════════════════════════════════════════════
# AUTHENTIFICATION JWT — espace décideurs
# ════════════════════════════════════════════════════════════════════════
# Comptes décideurs (CETUD). Pour un PFE : mots de passe en clair côté
# serveur uniquement (jamais exposés au frontend). En production, on
# remplacerait par des hashs (passlib/bcrypt) + une vraie base utilisateurs.
JWT_SECRET     = os.environ.get("JWT_SECRET", "TransportDakar_CETUD_2026_secret_dev")
JWT_ALGORITHM  = "HS256"
JWT_EXPIRE_MIN = 60

DECIDEURS_DB = {
    "planification": {
        "password": "plan2025",
        "userId": "u1",
        "nom": "Directeur Planification",
        "role": "planificateur",
        "roleLabel": "Directeur Planification",
        "roleColor": "#74c0fc",
        "avatar": "DP",
        "allowedRoutes": ["/", "/zones-risque", "/simulateur", "/anomalies", "/segmentation", "/ml-insights", "/evolution", "/satisfaction", "/cockpit"],
    },
    "exploitation": {
        "password": "expl2025",
        "userId": "u2",
        "nom": "Chef Exploitation",
        "role": "exploitation",
        "roleLabel": "Chef d'Exploitation",
        "roleColor": "#ff6b35",
        "avatar": "CE",
        "allowedRoutes": ["/", "/zones-risque", "/simulateur", "/anomalies", "/segmentation", "/evolution", "/satisfaction", "/cockpit"],
    },
}


class LoginRequest(BaseModel):
    login: str
    password: str


def create_access_token(login_id: str, user: dict) -> str:
    payload = {
        "sub": login_id,
        "userId": user["userId"],
        "role": user["role"],
        "nom": user["nom"],
        "roleLabel": user["roleLabel"],
        "roleColor": user["roleColor"],
        "avatar": user["avatar"],
        "allowedRoutes": user["allowedRoutes"],
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MIN),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_decideur(authorization: Optional[str] = Header(None)):
    """Dependency FastAPI : vérifie le JWT envoyé dans 'Authorization: Bearer <token>'.
    Protège les routes réservées aux décideurs CETUD (analytics, ML, anomalies, etc.)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentification requise (token manquant).")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expirée, veuillez vous reconnecter.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide.")
    return payload


@app.post("/auth/login")
def login(creds: LoginRequest):
    user = DECIDEURS_DB.get(creds.login.strip())
    if not user or user["password"] != creds.password:
        raise HTTPException(status_code=401, detail="Identifiants incorrects.")
    token = create_access_token(creds.login.strip(), user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in_min": JWT_EXPIRE_MIN,
        "user": {
            "userId": user["userId"],
            "login": creds.login.strip(),
            "nom": user["nom"],
            "role": user["role"],
            "roleLabel": user["roleLabel"],
            "roleColor": user["roleColor"],
            "avatar": user["avatar"],
            "allowedRoutes": user["allowedRoutes"],
        },
    }


BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "ml_models")

# Mise en cache mémoire du dataset d'anomalies de 14 Mo
ANOMALIES_DF = None
csv_path = os.path.join(MODELS_DIR, "anomalies_results.csv")
if os.path.exists(csv_path):
    print("⏳ Chargement en mémoire du dataset d'anomalies (14 Mo)...")
    ANOMALIES_DF = pd.read_csv(csv_path)
    print(f"✅ Dataset d'anomalies chargé en cache : {len(ANOMALIES_DF)} lignes.")
else:
    print("⚠️ Fichier anomalies_results.csv non trouvé.")

try:
    # K-Means
    kmeans         = joblib.load(os.path.join(MODELS_DIR, "kmeans_model.pkl"))
    scaler_cluster = joblib.load(os.path.join(MODELS_DIR, "kmeans_scaler.pkl"))
    imputer        = joblib.load(os.path.join(MODELS_DIR, "kmeans_imputer.pkl"))

    # Random Forest
    rf         = joblib.load(os.path.join(MODELS_DIR, "rf_model.pkl"))
    imputer_rf = joblib.load(os.path.join(MODELS_DIR, "rf_imputer.pkl"))
    le         = joblib.load(os.path.join(MODELS_DIR, "rf_label_encoder.pkl"))

    # Métadonnées & stats
    with open(os.path.join(MODELS_DIR, "metadata.json"), "r", encoding="utf-8") as f:
        metadata = json.load(f)
    with open(os.path.join(MODELS_DIR, "stats_par_mode.json"), "r", encoding="utf-8") as f:
        stats_par_mode = json.load(f)

    # Modèle Inaccessibilité
    inacc_model   = joblib.load(os.path.join(MODELS_DIR, "inacc_model.pkl"))
    inacc_imputer = joblib.load(os.path.join(MODELS_DIR, "inacc_imputer.pkl"))
    with open(os.path.join(MODELS_DIR, "zones_risque.json"), "r", encoding="utf-8") as f:
        zones_risque = json.load(f)

    # Normaliser les niveaux de risque (ELEVE → ÉLEVÉ, MODERE → MODÉRÉ)
    _norm = {'ELEVE': 'ÉLEVÉ', 'MODERE': 'MODÉRÉ', 'FAIBLE': 'FAIBLE'}
    for z in zones_risque:
        z['niveau_risque'] = _norm.get(z.get('niveau_risque', ''), z.get('niveau_risque', 'FAIBLE'))

    # Fichiers ML supplémentaires générés
    with open(os.path.join(MODELS_DIR, "inacc_features_defaults.json"), "r", encoding="utf-8") as f:
        inacc_defaults = json.load(f)
    with open(os.path.join(MODELS_DIR, "inacc_encoders_mappings.json"), "r", encoding="utf-8") as f:
        inacc_encoders = json.load(f)

    # Satisfaction & écoute usagers (EMD individu — généré par satisfaction_ecoute_usagers.py)
    satisfaction_path = os.path.join(MODELS_DIR, "satisfaction.json")
    if os.path.exists(satisfaction_path):
        with open(satisfaction_path, "r", encoding="utf-8") as f:
            satisfaction_data = json.load(f)
    else:
        satisfaction_data = None
        print("⚠️ Fichier satisfaction.json non trouvé — exécuter satisfaction_ecoute_usagers.py")

    # Features depuis metadata
    FEATURES_CLUSTER = metadata.get('features_cluster', [
        'age', 'sexe', 'niveau_instruction', 'actif', 'etudiant',
        'permis', 'freq_tc', 'nb_deplacements',
        'duree_principale', 'cout_principal'
    ])
    FEATURES_RF = metadata.get('features_rf', [
        'age', 'sexe', 'niveau_instruction', 'actif', 'etudiant',
        'permis', 'freq_tc', 'nb_deplacements', 'nb_vehicules',
        'revenu', 'duree_principale', 'cout_principal'
    ])

    # Variables du modèle d'inaccessibilité
    INACC_NUM_FEATURES = ['M66','M21','M27','M35','M51','M50','M49','M59','M63','dur_sante','dur_hopital','dur_marche','tc_norm_total']
    INACC_CAT_FEATURES = ['I2','M26','M28','M29','M30','M31','M37','M55','M56','M57','M68']
    INACC_ALL_FEATURES = INACC_NUM_FEATURES + INACC_CAT_FEATURES

    print(f"✅ Tous les modèles chargés")
    print(f"   Features RF      : {FEATURES_RF}")
    print(f"   Zones à risque   : {len(zones_risque)} zones")

except Exception as e:
    print(f"❌ Erreur chargement : {e}")
    raise

# ============================================================
# Dictionnaires
# ============================================================
SEGMENT_LABELS = {
    0: "Étudiants",
    1: "Actifs Motorisés",
    2: "Actifs TC"
}

SEGMENT_CONSEILS = {
    0: "Votre profil correspond aux étudiants de Dakar. Les transports en commun économiques (car rapide, DDD) sont les plus adaptés à votre budget.",
    1: "Votre profil correspond aux actifs motorisés. Vous avez un permis et utilisez probablement un véhicule personnel. Le covoiturage peut réduire vos dépenses.",
    2: "Votre profil correspond aux actifs dépendants des TC. Un abonnement mensuel peut réduire vos coûts de déplacement."
}

MODE_ICONS = {
    "Transport Commun": "🚌",
    "Voiture":          "🚗",
    "Taxi/Clando":      "🚕",
    "Moto":             "🏍️",
    "Marche":           "🚶",
    "Vélo":             "🚲",
    "Autre":            "🚐"
}

# Coordonnées GPS approximatives des zones EMD Dakar
ZONES_GPS = {
    'DALIFORD':                              (14.730, -17.302),
    'JAXAAY PARCELLE NIAKOUL RAP TIVAOUANE PEULH-NIAGHA': (14.782, -17.248),
    'THIAROYE SUR MER':                      (14.731, -17.342),
    'BAMBYLOR/SANGALKAM':                    (14.771, -17.153),
    'MALIKA/YEUMBEUL NORD':                  (14.763, -17.311),
    'KEUR MASSAR':                           (14.758, -17.291),
    'MEDINA/GOUNASS':                        (14.740, -17.352),
    'DIAMNIADIO/SEBIKOTANE':                 (14.723, -17.148),
    'DIAMAGUENE/SICAP M\'BAO':               (14.741, -17.323),
    'DIACK SAO/THIAROYE GARE':               (14.743, -17.370),
    'GUINAW RAIL N – S/PIKINE OUEST':        (14.752, -17.392),
    'DJIDAH/THIAROYE/KAO/YEUMB SUD':        (14.732, -17.358),
    'HANN/BEL AIR':                          (14.731, -17.411),
    'RUFISQUE OUEST':                        (14.718, -17.272),
    'RUFISQUE CENTRE (NORD)':                (14.723, -17.281),
    'RUFISQUE EST':                          (14.713, -17.255),
    'MBAO':                                  (14.733, -17.333),
    'SENDOU/YENE':                           (14.682, -17.239),
    'CAMBERENE':                             (14.771, -17.432),
    'SICAP LIBERTE':                         (14.728, -17.460),
    'HLM':                                   (14.730, -17.453),
    'GRAND YOFF':                            (14.752, -17.452),
    'SAM NOTAIRES':                          (14.748, -17.412),
    'N\'DIAREME LIMAMOULAYE':                (14.759, -17.422),
    'BISCUITERIE':                           (14.742, -17.432),
    'BARGNY':                                (14.700, -17.229),
    'YOFF':                                  (14.768, -17.492),
    'WAKHINANE NIMZATT':                     (14.762, -17.441),
    'PATTE D\'OIE':                          (14.758, -17.468),
    'PARCELLES ASSAINIES':                   (14.771, -17.462),
    'PLATEAU':                               (14.672, -17.440),
    'PIKINE EST – SUD/':                     (14.741, -17.392),
    'N\'GOR':                                (14.752, -17.512),
    'FANN/POINT E/AMITIE':                   (14.691, -17.462),
    'DIEUPPEUL DERKLE':                      (14.721, -17.471),
    'OUAKAM':                                (14.712, -17.492),
    'GOLFE SUD':                             (14.681, -17.431),
    'COLOBANE/FASS/GUEULE TAPEE':            (14.682, -17.443),
    'CA MERMOZ/SACRE COEUR':                 (14.731, -17.482),
    'GRAND DAKAR':                           (14.701, -17.443),
    'MEDINA':                                (14.681, -17.432),
}

QUARTIERS = {
    110101: "Cite Bissap",        110102: "Ouagou Niayes 1&2",
    110103: "Usine Bene Tali",    110104: "Usine Niari Tali",
    110105: "Usine Park Kayes",   110201: "Mermoz",
    110202: "Sacre Coeur VDN",    110203: "SICAP Baobab",
    110301: "Camberene Est",      110302: "Camberene Centre",
    110303: "Camberene Ouest",    110401: "Colobane",
    110402: "Fass",               110403: "Gueule Tapee",
    110501: "Castor Derkle",      110502: "Dieuppeul",
    110601: "Amitie Rue 10",      110602: "Fann Hock",
    110603: "Fann Residence",     110604: "Hopital Fann/Universite",
}

# ============================================================
# Schémas Pydantic
# ============================================================
class ProfilUsager(BaseModel):
    age:                int   = Field(..., ge=5,   le=100)
    sexe:               int   = Field(..., ge=1,   le=2)
    niveau_instruction: int   = Field(..., ge=1,   le=4)
    actif:              int   = Field(..., ge=1,   le=2)
    etudiant:           int   = Field(..., ge=1,   le=2)
    permis:             int   = Field(..., ge=1,   le=2)
    freq_tc:            int   = Field(..., ge=1,   le=5)
    nb_deplacements:    int   = Field(..., ge=1,   le=10)
    nb_vehicules:       int   = Field(0,   ge=0,   le=10)
    revenu:             float = Field(0,   ge=0)
    duree_estimee:      float = Field(25,  ge=1,   le=300)
    cout_estime:        float = Field(200, ge=0,   le=5000)
    quartier_depart:    int   = Field(110401)
    quartier_arrivee:   int   = Field(110401)


class ModeInfo(BaseModel):
    mode:             str
    icone:            str
    probabilite:      float
    duree_fourchette: str
    cout_fourchette:  str
    cout_moyen:       str


class ReponseRecommandation(BaseModel):
    segment:          int
    segment_label:    str
    segment_conseil:  str
    mode_recommande:  str
    mode_icone:       str
    top3_modes:       list[ModeInfo]
    duree_fourchette: str
    cout_fourchette:  str
    cout_moyen:       str
    quartier_depart:  str
    quartier_arrivee: str


# ============================================================
# Fonctions de construction des features
# ============================================================
def build_features_cluster(profil: ProfilUsager) -> dict:
    return {
        'age':                profil.age,
        'sexe':               profil.sexe,
        'niveau_instruction': profil.niveau_instruction,
        'actif':              profil.actif,
        'etudiant':           profil.etudiant,
        'permis':             profil.permis,
        'freq_tc':            profil.freq_tc,
        'nb_deplacements':    profil.nb_deplacements,
        'duree_principale':   profil.duree_estimee,
        'cout_principal':     profil.cout_estime,
    }


def build_features_rf(profil: ProfilUsager) -> dict:
    base = {
        'age':                profil.age,
        'sexe':               profil.sexe,
        'niveau_instruction': profil.niveau_instruction,
        'actif':              profil.actif,
        'etudiant':           profil.etudiant,
        'permis':             profil.permis,
        'freq_tc':            profil.freq_tc,
        'nb_deplacements':    profil.nb_deplacements,
        'nb_vehicules':       profil.nb_vehicules,
        'revenu':             profil.revenu,
        'duree_principale':   profil.duree_estimee,
        'cout_principal':     profil.cout_estime,
        'quartier_depart':    profil.quartier_depart,
        'quartier_arrivee':   profil.quartier_arrivee,
    }
    # Garder uniquement les features que le modèle connaît
    return {k: v for k, v in base.items() if k in FEATURES_RF}


# ============================================================
# Fonction de prédiction principale
# ============================================================
def predire(profil: ProfilUsager) -> dict:

    # --- K-Means ---
    X_seg     = pd.DataFrame([build_features_cluster(profil)], columns=FEATURES_CLUSTER)
    X_seg_imp = imputer.transform(X_seg)
    X_seg_sc  = scaler_cluster.transform(X_seg_imp)
    segment   = int(kmeans.predict(X_seg_sc)[0])

    # --- Random Forest ---
    X_rf        = pd.DataFrame([build_features_rf(profil)], columns=FEATURES_RF)
    X_rf_imp    = imputer_rf.transform(X_rf)
    mode_enc    = rf.predict(X_rf_imp)[0]
    probas      = rf.predict_proba(X_rf_imp)[0]
    mode_groupe = le.inverse_transform([mode_enc])[0]

    # Label du segment (nécessaire pour stats segment×mode)
    seg_label = SEGMENT_LABELS.get(segment, '')

    # Top 3 modes
    top3_idx   = np.argsort(probas)[::-1][:3]
    top3_modes = []
    for i in top3_idx:
        mode_name  = le.classes_[i]
        st         = stats_par_mode.get(mode_name, {})
        st_seg     = st.get('par_segment', {}).get(seg_label, {})
        s_top      = st_seg if st_seg else st
        is_free    = mode_name in ("Marche", "Vélo")
        top3_modes.append(ModeInfo(
            mode             = mode_name,
            icone            = MODE_ICONS.get(mode_name, "🚌"),
            probabilite      = round(float(probas[i]) * 100, 1),
            duree_fourchette = f"{s_top.get('duree_q1', s_top.get('duree_min', 0)):.0f} – {s_top.get('duree_q3', s_top.get('duree_max', 0)):.0f} min" if st else "N/A",
            cout_fourchette  = "0 – 0 FCFA" if is_free else (f"{s_top.get('cout_q1', s_top.get('cout_min', 0)):.0f} – {s_top.get('cout_q3', s_top.get('cout_max', 0)):.0f} FCFA" if st else "Gratuit"),
            cout_moyen       = "0 FCFA" if is_free else f"{s_top.get('cout_median', s_top.get('cout_moy', 0)):.0f} FCFA"
        ))

    # Stats mode recommandé — priorité segment × mode
    stats_mode    = stats_par_mode.get(mode_groupe, {})
    seg_label     = SEGMENT_LABELS.get(segment, '')
    stats_seg     = stats_mode.get('par_segment', {}).get(seg_label, {})
    s             = stats_seg if stats_seg else stats_mode

    if mode_groupe in ("Marche", "Vélo") or not stats_mode:
        duree_fourchette = f"{s.get('duree_q1', s.get('duree_min', 5)):.0f} – {s.get('duree_q3', s.get('duree_max', 30)):.0f} min"
        cout_fourchette  = "0 FCFA"
        cout_moyen       = "0 FCFA"
    else:
        duree_fourchette = f"{s.get('duree_q1', s.get('duree_min', 0)):.0f} – {s.get('duree_q3', s.get('duree_max', 0)):.0f} min"
        cout_fourchette  = f"{s.get('cout_q1', s.get('cout_min', 0)):.0f} – {s.get('cout_q3', s.get('cout_max', 0)):.0f} FCFA"
        cout_moyen       = f"{s.get('cout_median', s.get('cout_moy', 0)):.0f} FCFA"

    return {
        "segment":          segment,
        "segment_label":    SEGMENT_LABELS.get(segment, f"Segment {segment}"),
        "segment_conseil":  SEGMENT_CONSEILS.get(segment, ""),
        "mode_recommande":  mode_groupe,
        "mode_icone":       MODE_ICONS.get(mode_groupe, "🚌"),
        "top3_modes":       top3_modes,
        "duree_fourchette": duree_fourchette,
        "cout_fourchette":  cout_fourchette,
        "cout_moyen":       cout_moyen,
        "quartier_depart":  QUARTIERS.get(profil.quartier_depart, f"Quartier {profil.quartier_depart}"),
        "quartier_arrivee": QUARTIERS.get(profil.quartier_arrivee, f"Quartier {profil.quartier_arrivee}"),
    }


# ============================================================
# Endpoints
# ============================================================
@app.get("/")
def accueil():
    return {
        "message": "API Transport Urbain Dakar — PFE",
        "version": "1.0.0",
        "endpoints": [
            "POST /recommander       → Recommandation mode transport",
            "GET  /segments          → Liste des segments usagers",
            "GET  /modes             → Stats par mode",
            "GET  /quartiers         → Liste des quartiers",
            "GET  /zones-risque      → Zones à risque d'inaccessibilité",
            "GET  /zones-risque/resume → Résumé zones",
            "GET  /health            → Santé de l'API"
        ]
    }


@app.get("/health")
def health():
    return {
        "status":       "ok",
        "features_rf":  FEATURES_RF,
        "zones_risque": len(zones_risque)
    }


@app.get("/quartiers")
def get_quartiers():
    return {"quartiers": [{"code": k, "nom": v} for k, v in QUARTIERS.items()]}


@app.get("/segments")
def get_segments(decideur: dict = Depends(get_current_decideur)):
    return {
        "segments": [
            {"id": k, "label": v, "conseil": SEGMENT_CONSEILS[k]}
            for k, v in SEGMENT_LABELS.items()
        ]
    }


@app.get("/modes")
def get_modes(decideur: dict = Depends(get_current_decideur)):
    return {
        "stats_par_mode": [
            {
                "mode":             mode,
                "icone":            MODE_ICONS.get(mode, "🚌"),
                "duree_fourchette": f"{s.get('duree_min',0):.0f} – {s.get('duree_max',0):.0f} min",
                "cout_moy_fcfa":    s.get("cout_moy", 0),
                "cout_fourchette":  f"{s.get('cout_min',0):.0f} – {s.get('cout_max',0):.0f} FCFA",
                "nb_usagers":       int(s.get("nb_usagers", 0))
            }
            for mode, s in stats_par_mode.items()
        ]
    }


@app.post("/recommander", response_model=ReponseRecommandation)
def recommander(profil: ProfilUsager):
    try:
        return predire(profil)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/zones-risque")
def get_zones_risque(decideur: dict = Depends(get_current_decideur)):
    enriched = []
    for z in zones_risque:
        coords = ZONES_GPS.get(z.get('zone', ''))
        enriched.append({
            **z,
            'lat': coords[0] if coords else None,
            'lon': coords[1] if coords else None,
        })
    return {
        "total_zones": len(enriched),
        "zones": sorted(enriched, key=lambda x: x['prob_risque'], reverse=True)
    }

@app.get("/zones-risque/resume")
def get_zones_resume(decideur: dict = Depends(get_current_decideur)):
    # Recalcul dynamique basé sur prob_risque (seuil 0.60 / 0.40)
    for z in zones_risque:
        p = z.get('prob_risque', 0)
        z['niveau_risque'] = 'ÉLEVÉ' if p >= 0.60 else ('MODÉRÉ' if p >= 0.40 else 'FAIBLE')
    eleve  = [z for z in zones_risque if z['niveau_risque'] == 'ÉLEVÉ']
    modere = [z for z in zones_risque if z['niveau_risque'] == 'MODÉRÉ']
    faible = [z for z in zones_risque if z['niveau_risque'] == 'FAIBLE']
    return {
        "total_zones":    len(zones_risque),
        "zones_elevees":  len(eleve),
        "zones_moderees": len(modere),
        "zones_faibles":  len(faible),
        "top5_risque":    sorted(zones_risque, key=lambda x: x['prob_risque'], reverse=True)[:5],
    }
@app.get("/api/segmentation/profils")
def get_segmentation_profils(decideur: dict = Depends(get_current_decideur)):
    """Retourne les profils des segments K-Means pour la visualisation."""
    try:
        seg_labels = metadata.get('segment_labels', {})
        seg_conseils = metadata.get('segment_conseils', {})
        classes_rf = metadata.get('classes_rf', [])

        # Profils enrichis avec descriptions métier
        SEGMENT_META = {
            'Actifs TC réguliers':      { 'icon': '🚌', 'color': '#74c0fc', 'desc': 'Usagers actifs dépendants des transports en commun au quotidien.' },
            'Actifs motorisés':         { 'icon': '🚗', 'color': '#ffa94d', 'desc': 'Actifs possédant un véhicule personnel, faible utilisation des TC.' },
            'Étudiants mobilité douce': { 'icon': '🎓', 'color': '#69db7c', 'desc': 'Jeunes étudiants privilégiant les modes doux et TC économiques.' },
            'Piétons de proximité':     { 'icon': '🚶', 'color': '#da77f2', 'desc': 'Déplacements courts, accessibilité pédestre suffisante.' },
            'Travailleurs informels':   { 'icon': '🏪', 'color': '#ff6b6b', 'desc': 'Secteur informel, horaires atypiques, taxi-clandos et car rapides.' },
        }

        profils = []
        for seg_id, label in seg_labels.items():
            meta = SEGMENT_META.get(label, { 'icon': '👤', 'color': '#94a3b8', 'desc': '' })
            profils.append({
                'id':      int(seg_id),
                'label':   label,
                'conseil': seg_conseils.get(label, seg_conseils.get(str(seg_id), '')),
                'icon':    meta['icon'],
                'color':   meta['color'],
                'desc':    meta['desc'],
            })

        return {
            'segments':     profils,
            'nb_segments':  len(profils),
            'modes_rf':     classes_rf,
            'k_clusters':   metadata.get('k_clusters', len(profils)),
            'rf_accuracy':  metadata.get('rf_accuracy', None),
            'rf_cv_f1':     metadata.get('rf_cv_f1_macro', None),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/satisfaction")
def get_satisfaction(decideur: dict = Depends(get_current_decideur)):
    """
    Retourne les indicateurs de satisfaction & écoute usagers issus de
    l'enquête EMD individu : score de satisfaction par mode de TC,
    indice d'insécurité perçue, incidents subis, difficultés de
    déplacement et gênes piétonnes. Alimente la page
    /decideurs/satisfaction.
    """
    if satisfaction_data is None:
        raise HTTPException(
            status_code=404,
            detail="Données de satisfaction non disponibles. Exécuter satisfaction_ecoute_usagers.py."
        )
    return satisfaction_data


# ── Cellule d'écoute citoyenne (page publique /avis) — PostgreSQL ─────────

class FeedbackCitoyen(BaseModel):
    note_satisfaction: int  = Field(..., ge=1, le=5,    description="Note de 1 (très insatisfait) à 5 (très satisfait)")
    mode_utilise:      str  = Field(...,                description="Mode de transport concerné (Tata, DDD, Taxi, Car rapide, ...)")
    type_probleme: Optional[str] = Field(None,          description="Catégorie du signalement : sécurité, attente, prix, confort, état infrastructure, autre")
    quartier:      Optional[str] = Field(None,          description="Quartier ou zone concernée")
    commentaire:   Optional[str] = Field(None, max_length=600, description="Commentaire libre du citoyen")


@app.post("/api/feedback")
def post_feedback(avis: FeedbackCitoyen, db: Session = Depends(get_db)):
    """
    Cellule d'écoute citoyenne : reçoit un avis/signalement déposé
    publiquement par un usager (page /avis, accessible sans connexion).
    Stocké dans la table PostgreSQL `avis_citoyens`.
    """
    entry = AvisCitoyen(
        note_satisfaction = avis.note_satisfaction,
        mode_utilise      = avis.mode_utilise,
        type_probleme     = avis.type_probleme,
        quartier          = avis.quartier,
        commentaire       = avis.commentaire,
        date              = datetime.now(timezone.utc),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {
        "success": True,
        "message": "Merci pour votre avis, il a bien été enregistré.",
        "id": entry.id,
    }


@app.get("/api/feedback/stats")
def get_feedback_stats(decideur: dict = Depends(get_current_decideur), db: Session = Depends(get_db)):
    """
    Statistiques agrégées en direct sur les avis citoyens déposés via la
    cellule d'écoute publique (/avis). Alimente la section
    «Avis citoyens en direct» de la page /decideurs/satisfaction.
    Données lues depuis PostgreSQL.
    """
    n = db.query(func.count(AvisCitoyen.id)).scalar() or 0
    if n == 0:
        return {
            "n_avis": 0, "note_moyenne": None,
            "repartition_notes": {}, "par_mode": {}, "par_probleme": {},
            "derniers_avis": [],
        }

    # Note moyenne globale
    note_moyenne = round(
        db.query(func.avg(AvisCitoyen.note_satisfaction)).scalar() or 0, 2
    )

    # Répartition par note (1 à 5)
    repartition_notes = {}
    for note_val, count in db.query(AvisCitoyen.note_satisfaction, func.count(AvisCitoyen.id)) \
                             .group_by(AvisCitoyen.note_satisfaction).all():
        repartition_notes[str(note_val)] = count

    # Moyenne par mode
    par_mode = {}
    for mode, cnt, avg_note in db.query(
            AvisCitoyen.mode_utilise,
            func.count(AvisCitoyen.id),
            func.avg(AvisCitoyen.note_satisfaction)
        ).group_by(AvisCitoyen.mode_utilise).all():
        par_mode[mode or "Non précisé"] = {
            "n": cnt,
            "note_moyenne": round(avg_note or 0, 2),
        }

    # Comptage par type de problème
    par_probleme = {}
    for probleme, cnt in db.query(AvisCitoyen.type_probleme, func.count(AvisCitoyen.id)) \
                           .group_by(AvisCitoyen.type_probleme).all():
        par_probleme[probleme or "Non précisé"] = cnt

    # 10 derniers avis
    derniers_rows = db.query(AvisCitoyen).order_by(AvisCitoyen.date.desc()).limit(10).all()
    derniers_avis = [
        {
            "id":                r.id,
            "note_satisfaction": r.note_satisfaction,
            "mode_utilise":      r.mode_utilise,
            "type_probleme":     r.type_probleme,
            "quartier":          r.quartier,
            "commentaire":       r.commentaire,
            "date":              r.date.isoformat() if r.date else None,
        }
        for r in derniers_rows
    ]

    return {
        "n_avis":            n,
        "note_moyenne":      note_moyenne,
        "repartition_notes": repartition_notes,
        "par_mode":          par_mode,
        "par_probleme":      par_probleme,
        "derniers_avis":     derniers_avis,
    }


@app.get("/api/feedback/list")
def list_feedback(
    decideur: dict = Depends(get_current_decideur),
    db:        Session = Depends(get_db),
    page:      int = Query(1, ge=1,   description="Numéro de page"),
    per_page:  int = Query(20, ge=1, le=100, description="Résultats par page"),
    mode:      Optional[str] = Query(None, description="Filtrer par mode de transport"),
    note:      Optional[int] = Query(None, ge=1, le=5, description="Filtrer par note"),
    quartier:  Optional[str] = Query(None, description="Filtrer par quartier"),
):
    """
    Liste paginée des avis citoyens avec filtres optionnels.
    Réservé aux décideurs CETUD authentifiés.
    """
    q = db.query(AvisCitoyen)
    if mode:
        q = q.filter(AvisCitoyen.mode_utilise.ilike(f"%{mode}%"))
    if note:
        q = q.filter(AvisCitoyen.note_satisfaction == note)
    if quartier:
        q = q.filter(AvisCitoyen.quartier.ilike(f"%{quartier}%"))

    total = q.count()
    rows  = q.order_by(AvisCitoyen.date.desc()) \
             .offset((page - 1) * per_page) \
             .limit(per_page).all()

    return {
        "total":    total,
        "page":     page,
        "per_page": per_page,
        "pages":    (total + per_page - 1) // per_page,
        "avis": [
            {
                "id":                r.id,
                "note_satisfaction": r.note_satisfaction,
                "mode_utilise":      r.mode_utilise,
                "type_probleme":     r.type_probleme,
                "quartier":          r.quartier,
                "commentaire":       r.commentaire,
                "date":              r.date.isoformat() if r.date else None,
            }
            for r in rows
        ],
    }


@app.get("/api/feedback/export")
def export_feedback(decideur: dict = Depends(get_current_decideur), db: Session = Depends(get_db)):
    """
    Export complet de tous les avis citoyens en JSON.
    Utile pour les rapports et l'analyse offline. Réservé aux décideurs.
    """
    rows = db.query(AvisCitoyen).order_by(AvisCitoyen.date.asc()).all()
    return {
        "total": len(rows),
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "avis": [
            {
                "id":                r.id,
                "note_satisfaction": r.note_satisfaction,
                "mode_utilise":      r.mode_utilise,
                "type_probleme":     r.type_probleme,
                "quartier":          r.quartier,
                "commentaire":       r.commentaire,
                "date":              r.date.isoformat() if r.date else None,
            }
            for r in rows
        ],
    }


@app.get("/api/anomalies/summary")
def get_summary(decideur: dict = Depends(get_current_decideur)):
    global ANOMALIES_DF
    if ANOMALIES_DF is None:
        csv_path = os.path.join(MODELS_DIR, "anomalies_results.csv")
        if os.path.exists(csv_path):
            ANOMALIES_DF = pd.read_csv(csv_path)
        else:
            raise HTTPException(status_code=500, detail="Dataset anomalies non chargé")
    
    df = ANOMALIES_DF
    return {
        "total": len(df),
        "anomalies": int(df['CONSENSUS'].sum()),
        "sites_at_risk": int(df[df['CONSENSUS']==1]['Identifiant_site_comptage'].nunique()),
        "top_sites": df[df['CONSENSUS']==1]
            .groupby('Description_site_comptage')
            .agg(count=('CONSENSUS','sum'), max_vol=('Nombre_vehicules_amplitude','max'))
            .reset_index().to_dict('records'),
        "by_hour": df.groupby('Heure_debut_comptage')['CONSENSUS'].sum().to_dict()
    }


# ============================================================
# Schéma Pydantic pour la Simulation d'Inaccessibilité (ML)
# ============================================================
class InaccessibiliteSimulationInput(BaseModel):
    distance_tc:        float = Field(5.0, ge=0.0, le=120.0, description="Distance à l'arrêt TC (min)")
    inondations:        str   = Field("Jamais", description="Fréquence des inondations (Jamais, Rarement, Souvent, Tous les jours ou presque)")
    dur_sante:          float = Field(15.0, ge=0.0, le=300.0, description="Temps d'accès au centre de santé (min)")
    dur_hopital:        float = Field(25.0, ge=0.0, le=300.0, description="Temps d'accès à l'hôpital (min)")
    dur_marche:         float = Field(10.0, ge=0.0, le=300.0, description="Temps d'accès au marché (min)")
    tc_disponibles:     float = Field(3.0, ge=0.0, le=8.0, description="Lignes TC disponibles en temps normal")
    revenu:             float = Field(150000.0, ge=0.0, description="Revenu mensuel du ménage (FCFA)")
    budget_transport:   float = Field(25000.0, ge=0.0, description="Budget transport mensuel (FCFA)")
    taille_menage:      int   = Field(5, ge=1, le=50, description="Taille du ménage")
    nb_actifs:          int   = Field(2, ge=0, le=30, description="Membres actifs")
    nb_voitures:        int   = Field(0, ge=0, le=10, description="Voitures possédées")
    nb_motos:           int   = Field(0, ge=0, le=10, description="Motos possédées")
    nb_velos:           int   = Field(0, ge=0, le=10, description="Vélos possédés")
    zone:               str   = Field("110401", description="Zone d'habitation (Strate)")


@app.post("/predict-inaccessibility")
def predict_inaccessibility(inputs: InaccessibiliteSimulationInput, decideur: dict = Depends(get_current_decideur)):
    try:
        # 1. Charger le profil par défaut
        profile = inacc_defaults.copy()

        # 2. Remplacer par les variables dynamiques fournies
        profile['M66'] = inputs.distance_tc
        profile['M68'] = inputs.inondations
        profile['dur_sante'] = inputs.dur_sante
        profile['dur_hopital'] = inputs.dur_hopital
        profile['dur_marche'] = inputs.dur_marche
        profile['tc_norm_total'] = inputs.tc_disponibles
        profile['M59'] = inputs.revenu
        profile['M63'] = inputs.budget_transport
        profile['M21'] = inputs.taille_menage
        profile['M27'] = inputs.nb_actifs
        profile['M51'] = inputs.nb_voitures
        profile['M50'] = inputs.nb_motos
        profile['M49'] = inputs.nb_velos
        profile['I2'] = inputs.zone

        # 3. Encodage catégoriel
        for col in INACC_CAT_FEATURES:
            val = str(profile.get(col, "Inconnu"))
            mapping = inacc_encoders.get(col, {})
            # Récupérer l'index encodé, ou l'index de 'Inconnu' s'il n'existe pas
            encoded_val = mapping.get(val, mapping.get('Inconnu', 0))
            profile[col] = float(encoded_val)

        # 4. Ordonner les features conformément à INACC_ALL_FEATURES
        X_dict = {feat: [float(profile[feat])] for feat in INACC_ALL_FEATURES}
        X_df = pd.DataFrame(X_dict, columns=INACC_ALL_FEATURES)

        # Imputer & Prédire
        X_imp = inacc_imputer.transform(X_df)
        prob = float(inacc_model.predict_proba(X_imp)[0, 1])

        # Calcul d'un niveau de risque textuel
        niveau = "ÉLEVÉ" if prob >= 0.60 else ("MODÉRÉ" if prob >= 0.40 else "FAIBLE")

        # Conseils dynamiques basés sur la prédiction
        conseils = []
        if inputs.distance_tc > 15:
            conseils.append("L'isolement est fortement accentué par la distance aux arrêts de transport en commun (plus de 15 min).")
        if inputs.inondations in ["Souvent", "Tous les jours ou presque"]:
            conseils.append("La vulnérabilité élevée aux inondations perturbe gravement l'accessibilité dans cette strate.")
        if inputs.tc_disponibles < 2:
            conseils.append("Le manque de diversité des lignes de transport disponibles limite les solutions de repli de l'usager.")
        if inputs.revenu < 50000:
            conseils.append("La contrainte budgétaire financière rend l'accès aux transports privés (taxis) impossible.")
        
        if not conseils:
            conseils.append("L'accessibilité de ce profil de ménage est estimée stable et satisfaisante.")

        return {
            "prob_risque": round(prob * 100, 1),
            "niveau_risque": niveau,
            "conseils": conseils,
            "features_importance_factors": [
                {"name": "Distance TC", "value": inputs.distance_tc},
                {"name": "Inondabilité", "value": inputs.inondations},
                {"name": "TC disponibles", "value": inputs.tc_disponibles}
            ]
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ml/features-importance")
def get_features_importance(decideur: dict = Depends(get_current_decideur)):
    try:
        with open(os.path.join(MODELS_DIR, "features_importance.json"), "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur chargement feature importances : {str(e)}")


@app.get("/api/ml/metrics")
def get_ml_metrics(decideur: dict = Depends(get_current_decideur)):
    try:
        with open(os.path.join(MODELS_DIR, "inacc_model_metrics.json"), "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur chargement des métriques : {str(e)}")


@app.get("/api/anomalies/sites")
def get_anomalies_sites(decideur: dict = Depends(get_current_decideur)):
    global ANOMALIES_DF
    if ANOMALIES_DF is None:
        raise HTTPException(status_code=500, detail="Dataset anomalies non chargé")
    
    # Agréger par site de comptage
    # Clé de groupement : Identifiant_site_comptage si disponible, sinon Description
    group_col = 'Identifiant_site_comptage' if 'Identifiant_site_comptage' in ANOMALIES_DF.columns \
                else 'Description_site_comptage'

    agg_dict = dict(
        nom=('Description_site_comptage', 'first'),
        lat=('GPS_Latitude_site', 'first'),
        lon=('GPS_Longitude_site', 'first'),
        total_counts=('CONSENSUS', 'count'),
        anom_counts=('CONSENSUS', 'sum'),
        max_vol=('Nombre_vehicules_amplitude', 'max'),
    )
    if 'Vitesse_moyenne_amplitude' in ANOMALIES_DF.columns:
        agg_dict['speed_moy'] = ('Vitesse_moyenne_amplitude', 'mean')

    sites = (ANOMALIES_DF.groupby(group_col).agg(**agg_dict).reset_index())
    if 'speed_moy' not in sites.columns:
        sites['speed_moy'] = 0.0
    
    sites = sites.fillna(0)
    
    output = []
    id_col = 'Identifiant_site_comptage' if 'Identifiant_site_comptage' in sites.columns \
             else 'Description_site_comptage'
    for _, r in sites.iterrows():
        anoms = int(r['anom_counts'])
        status = "CRITIQUE" if anoms >= 20 else ("ÉLEVÉ" if anoms >= 8 else "MODÉRÉ")
        output.append({
            "id": str(r[id_col]),
            "nom": str(r['nom']),
            "lat": float(r['lat']),
            "lon": float(r['lon']),
            "total_counts": int(r['total_counts']),
            "anom_counts": anoms,
            "max_vol": int(r['max_vol']),
            "speed_moy": round(float(r['speed_moy']), 1),
            "status": status
        })
        
    return sorted(output, key=lambda x: x['anom_counts'], reverse=True)


@app.get("/api/anomalies/sites/{site_id}/details")
def get_site_details(site_id: str, decideur: dict = Depends(get_current_decideur)):
    global ANOMALIES_DF
    if ANOMALIES_DF is None:
        raise HTTPException(status_code=500, detail="Dataset anomalies non chargé")
    
    id_col = 'Identifiant_site_comptage' if 'Identifiant_site_comptage' in ANOMALIES_DF.columns \
             else 'Description_site_comptage'
    df_site = ANOMALIES_DF[ANOMALIES_DF[id_col].astype(str) == site_id]
    if df_site.empty:
        raise HTTPException(status_code=404, detail="Site non trouvé")
        
    # Extraire les anomalies
    df_anoms = df_site[df_site['CONSENSUS'] == 1]
    
    # Groupements
    by_category = df_anoms.groupby('Categorie_vehicule')['CONSENSUS'].sum().to_dict()
    by_hour = df_anoms.groupby('Heure_debut_comptage')['CONSENSUS'].sum().to_dict()
    
    detailed = (df_anoms.sort_values('Nombre_vehicules_amplitude', ascending=False)
                .head(15)
                .reset_index())
                
    detailed_list = []
    for _, r in detailed.iterrows():
        detailed_list.append({
            "date": str(r['Date_comptage']),
            "heure": f"{int(r['Heure_debut_comptage'])}h{int(r['Minute_debut_comptage']):02d}",
            "direction": str(r.get('Description_sens_circulation', r.get('Sens_circulation', 'N/A'))),
            "vehicule": str(r['Categorie_vehicule']),
            "volume": int(r['Nombre_vehicules_amplitude']),
            "vol_moyen": round(float(r['VOL_MEAN']), 1),
            "zscore": round(float(r['ZSCORE']), 2),
            "votes_modeles": {
                "if": int(r['ANOMALY_IF']),
                "lof": int(r['ANOMALY_LOF']),
                "zscore": int(r['ANOMALY_ZSCORE'])
            }
        })
        
    return {
        "site_id": site_id,
        "nom": str(df_site['Description_site_comptage'].iloc[0]),
        "lat": float(df_site['GPS_Latitude_site'].iloc[0]),
        "lon": float(df_site['GPS_Longitude_site'].iloc[0]),
        "total_anom": len(df_anoms),
        "pct_anom": round((len(df_anoms) / len(df_site)) * 100, 2),
        "by_category": by_category,
        "by_hour": by_hour,
        "top_anomalies": detailed_list
    }