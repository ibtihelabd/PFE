# Plateforme Decisionnelle Transport Urbain Dakar — PFE CETUD

> **Projet de Fin d'Etudes** | Systeme d'aide a la decision pour les transports urbains de Dakar  
> Developpe en collaboration avec le **CETUD** (Conseil Executif des Transports Urbains de Dakar)

---

## Structure du projet

```
PFE dev/
├── PFE (partie usager)/          # Application web (Backend + Frontend)
│   ├── backend/                  # API FastAPI (Python)
│   │   ├── main.py               # 18+ endpoints REST
│   │   ├── database.py           # SQLAlchemy + PostgreSQL (avis citoyens)
│   │   ├── migrate_feedback.py   # Migration JSON → PostgreSQL (one-shot)
│   │   ├── train_inaccessibility_model.py
│   │   ├── sauvegarder_inacc_model.py
│   │   ├── requirements.txt
│   │   └── ml_models/            # Modeles ML (non versionnes)
│   └── frontend/                 # Interface React 18
│       ├── src/
│       │   ├── pages/            # 11 pages (WelcomePage, FormPage, ...)
│       │   ├── components/
│       │   └── App.js
│       └── package.json
│
├── Rapport_PFE_LaTeX/            # Rapport scientifique
│   ├── rapport_pfe/
│   │   ├── main.tex              # Document racine LaTeX
│   │   ├── chapters/             # 13 chapitres
│   │   └── figures/              # Illustrations
│   └── Rapport_PFE_CETUD.pdf    # PDF compile (derniere version)
│
├── Presentation_PFE/             # Diaporama de soutenance
│   └── Presentation_PFE_CETUD_v3.pptx
│
├── Documentation_Projet/         # Documentation technique (Markdown)
│   ├── 01_Architecture.md
│   ├── 02_Frontend.md
│   ├── 03_Backend_FastAPI.md
│   ├── 04_Base_de_donnees.md
│   ├── 05_ETL.md
│   ├── 06_DataWarehouse.md
│   ├── 07_MachineLearning.md
│   ├── 08_Knowage.md
│   └── 09_Integration.md
│
└── demo/                         # Videos de demonstration (non versionnees)
```

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend API | FastAPI (Python 3.12) |
| Base de donnees | PostgreSQL 17 (`CETUD_PFE`) |
| ORM | SQLAlchemy 2.0 + psycopg2-binary |
| Machine Learning | scikit-learn, XGBoost, joblib |
| Frontend | React 18, Framer Motion, Recharts, Leaflet |
| Authentification | JWT (HS256) |
| BI / Cockpit | Knowage 8 |
| ETL | Talend Open Studio |
| Rapport | LaTeX (Overleaf) |

---

## Installation rapide

### Prerequis
- Python 3.12+
- PostgreSQL 17 avec la base `CETUD_PFE`
- Node.js 18+

### Backend

```bash
cd "PFE (partie usager)/backend"
pip install -r requirements.txt

# Configurer la connexion PostgreSQL (optionnel, voir database.py)
# $env:DATABASE_URL = "postgresql://postgres:mdp@localhost:5432/CETUD_PFE"

# Lancer le serveur
uvicorn main:app --reload --port 8000
```

La table `avis_citoyens` est creee automatiquement au premier demarrage.

### Frontend

```bash
cd "PFE (partie usager)/frontend"
npm install
npm start
```

L'application est accessible sur `http://localhost:3000`.

---

## Comptes de demonstration

| Role | Login | Mot de passe |
|------|-------|-------------|
| Directeur Planification | `planification` | `plan2025` |
| Chef d'Exploitation | `exploitation` | `expl2025` |

> La page citoyenne (`/avis`, formulaire de recommandation) est accessible sans connexion.

---

## Modules de l'application

| Module | Route | Acces |
|--------|-------|-------|
| Accueil citoyen | `/` | Public |
| Formulaire recommandation | `/formulaire` | Public |
| Cellule d'ecoute | `/avis` | Public |
| Tableau de bord | `/decideurs` | Decideurs |
| Zones a risque | `/decideurs/zones-risque` | Decideurs |
| Simulateur | `/decideurs/simulateur` | Decideurs |
| Anomalies trafic | `/decideurs/anomalies` | Decideurs |
| Segmentation | `/decideurs/segmentation` | Decideurs |
| Evolution temporelle | `/decideurs/evolution` | Decideurs |
| Satisfaction & Ecoute | `/decideurs/satisfaction` | Decideurs |
| Audit ML | `/decideurs/ml-insights` | Planificateur uniquement |

---

## Base de donnees — table avis_citoyens

Les avis citoyens sont stockes dans PostgreSQL (`CETUD_PFE`) :

```
avis_citoyens
├── id                INTEGER PK AUTOINCREMENT
├── note_satisfaction INTEGER NOT NULL  (1–5)
├── mode_utilise      VARCHAR(100) NOT NULL
├── type_probleme     VARCHAR(100) NULL
├── quartier          VARCHAR(150) NULL
├── commentaire       TEXT NULL
└── date              TIMESTAMP NULL  (UTC)
```

Migration des donnees existantes :
```bash
python migrate_feedback.py
```

---



## Auteur

**Ibtihel Abdellaoui** — Etudiante dernière année cycle ingénieur 
Projet de Fin d Etudes — 2025-2026  
Encadrement : SIMAC
