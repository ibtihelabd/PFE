# 🚌 Backend FastAPI — Transport Urbain Dakar

## 📁 Structure du dossier

```
backend/
├── main.py              ← API FastAPI
├── requirements.txt     ← Dépendances Python
├── README.md
└── ml_models/           ← Copie tes fichiers .pkl ici !
    ├── kmeans_model.pkl
    ├── kmeans_scaler.pkl
    ├── kmeans_imputer.pkl
    ├── rf_model.pkl
    ├── rf_imputer.pkl
    ├── rf_label_encoder.pkl
    ├── metadata.json
    └── stats_par_mode.json
```

## ⚙️ Installation

```bash
# 1. Créer un environnement virtuel
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

# 2. Installer les dépendances
pip install -r requirements.txt
```

## ▶️ Lancement

```bash
uvicorn main:app --reload --port 8000
```

## 🌐 Tester l'API

- Documentation interactive : http://localhost:8000/docs
- Health check            : http://localhost:8000/health
- Segments usagers        : http://localhost:8000/segments
- Stats par mode          : http://localhost:8000/modes

## 📬 Tester l'endpoint principal

```bash
curl -X POST http://localhost:8000/recommander \
  -H "Content-Type: application/json" \
  -d '{
    "age": 20,
    "sexe": 1,
    "niveau_instruction": 4,
    "actif": 2,
    "etudiant": 1,
    "permis": 2,
    "freq_tc": 1,
    "nb_deplacements": 4,
    "nb_vehicules": 0,
    "revenu": 0,
    "duree_estimee": 25,
    "cout_estime": 200
  }'
```

## 📦 Endpoints disponibles

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/` | Accueil API |
| GET | `/health` | Santé de l'API |
| GET | `/segments` | Liste des segments usagers |
| GET | `/modes` | Statistiques par mode |
| POST | `/recommander` | Recommandation complète (3 modèles) |
