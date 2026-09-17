"""
database.py
===========
Configuration SQLAlchemy + PostgreSQL pour la plateforme Transport Urbain Dakar.
Projet de Fin d Etudes (PFE) -- CETUD.

Description
-----------
Ce module assure trois responsabilites :

  1. Initialiser le moteur SQLAlchemy vers la base PostgreSQL ``CETUD_PFE``
     (base existante, aussi utilisee pour les donnees ETL : EMD, trafic, menages).

  2. Definir le modele ORM ``AvisCitoyen`` (table ``avis_citoyens``) qui
     stocke les retours deposes via la cellule d ecoute publique (/avis).

  3. Fournir les utilitaires ``init_db()`` et ``get_db()`` consommes par
     le serveur FastAPI (main.py).

Configuration
-------------
La chaine de connexion est lue depuis la variable d environnement DATABASE_URL.
Si absente, un repli local est utilise (developpement uniquement) :

    postgresql://postgres:<mdp>@localhost:5432/CETUD_PFE

Surcharger en production :

    $env:DATABASE_URL = "postgresql://user:pass@host:5432/dbname"

Table creee
-----------
``avis_citoyens`` -- sept colonnes (voir classe AvisCitoyen) :
    id                INTEGER PRIMARY KEY AUTOINCREMENT
    note_satisfaction INTEGER NOT NULL  (1=tres insatisfait, 5=tres satisfait)
    mode_utilise      VARCHAR(100) NOT NULL
    type_probleme     VARCHAR(100) NULL
    quartier          VARCHAR(150) NULL
    commentaire       TEXT NULL
    date              TIMESTAMP NULL  (UTC, positionne automatiquement)

Dependances
-----------
    sqlalchemy >= 2.0.0
    psycopg2-binary >= 2.9.0

Auteur  : PFE Transport Urbain Dakar
Version : 1.0
"""

import os
from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Text, DateTime,
    create_engine, inspect,
)
from sqlalchemy.orm import declarative_base, sessionmaker

# ─────────────────────────────────────────────────────────────────────────────
# Connexion PostgreSQL
# ─────────────────────────────────────────────────────────────────────────────
# La variable DATABASE_URL suit le format standard SQLAlchemy :
#   postgresql://<user>:<password>@<host>:<port>/<dbname>
#
# Note securite PFE : le mot de passe est code en dur ici uniquement
# a des fins de developpement local. En production, utiliser DATABASE_URL.
#
DATABASE_URL: str = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:753159@localhost:5432/CETUD_PFE",
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # Verifie la connexion avant chaque usage du pool
    pool_size=5,          # Connexions persistantes dans le pool
    max_overflow=10,      # Connexions supplementaires autorisees en pic de charge
    echo=False,           # Mettre a True pour logger les requetes SQL (debug)
)

# Fabrique de sessions SQLAlchemy (une session = une transaction logique)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Classe de base dont heritent tous les modeles ORM
Base = declarative_base()


# ─────────────────────────────────────────────────────────────────────────────
# Modele ORM -- table avis_citoyens
# ─────────────────────────────────────────────────────────────────────────────
class AvisCitoyen(Base):
    """
    Modele ORM representant un avis depose par un citoyen via la cellule
    d ecoute publique (page /avis, sans authentification requise).

    Colonnes
    --------
    id : int
        Cle primaire auto-incrementee par PostgreSQL.
    note_satisfaction : int
        Note de 1 (tres insatisfait) a 5 (tres satisfait). Obligatoire.
    mode_utilise : str
        Mode de transport concerne (ex. Tata, DDD, Car rapide, Taxi).
    type_probleme : str | None
        Categorie du probleme : securite, attente, prix, confort, infrastructure.
    quartier : str | None
        Quartier ou zone geographique. Facultatif.
    commentaire : str | None
        Commentaire libre (max. 600 car., controle par le schema Pydantic).
    date : datetime | None
        Horodatage UTC, positionne automatiquement a l insertion.

    Exemple d insertion
    -------------------
        entry = AvisCitoyen(
            note_satisfaction=4,
            mode_utilise="Tata",
            commentaire="Tres bondee.",
            date=datetime.now(timezone.utc),
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)  # Recupere l id genere par PostgreSQL
    """

    __tablename__ = "avis_citoyens"

    id                = Column(Integer,     primary_key=True, index=True, autoincrement=True)
    note_satisfaction = Column(Integer,     nullable=False)       # 1 a 5
    mode_utilise      = Column(String(100), nullable=False)       # Tata, DDD, Taxi ...
    type_probleme     = Column(String(100), nullable=True)        # securite, attente ...
    quartier          = Column(String(150), nullable=True)
    commentaire       = Column(Text,        nullable=True)
    date              = Column(DateTime,    default=lambda: datetime.now(timezone.utc))

    def __repr__(self) -> str:
        return (
            f"<AvisCitoyen id={self.id} note={self.note_satisfaction} "
            f"mode='{self.mode_utilise}' date={self.date}>"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Initialisation de la base
# ─────────────────────────────────────────────────────────────────────────────
def init_db() -> None:
    """
    Cree la table ``avis_citoyens`` si elle n existe pas encore.
    Operation idempotente : aucune modification si la table est deja presente.

    Appelee au demarrage de FastAPI via ``@app.on_event("startup")``.
    En cas d erreur de connexion, une exception SQLAlchemy est propagee
    et visible dans les logs du serveur.
    """
    inspector = inspect(engine)
    if not inspector.has_table("avis_citoyens"):
        Base.metadata.create_all(bind=engine)
        print("[OK] Table `avis_citoyens` creee dans PostgreSQL.")
    else:
        print("[INFO] Table `avis_citoyens` deja existante - pas de recreation.")


# ─────────────────────────────────────────────────────────────────────────────
# Dependency FastAPI -- injection de session
# ─────────────────────────────────────────────────────────────────────────────
def get_db():
    """
    Generateur de session SQLAlchemy injecte dans les endpoints FastAPI
    via ``Depends(get_db)``.

    Cycle de vie
    ------------
    1. Ouvre une session (connexion issue du pool).
    2. Cede la session a l endpoint (yield).
    3. Ferme systematiquement la session apres la reponse HTTP (finally).

    Garantit qu aucune connexion n est laissee ouverte indefiniment et
    que les transactions non validees sont annulees automatiquement.

    Exemple
    -------
        @app.get("/exemple")
        def exemple(db: Session = Depends(get_db)):
            return db.query(AvisCitoyen).all()

    Yields
    ------
    Session
        Session SQLAlchemy active, prete pour les operations CRUD.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()