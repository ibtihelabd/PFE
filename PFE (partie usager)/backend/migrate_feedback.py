"""
migrate_feedback.py
===================
Script de migration one-shot : JSON -> PostgreSQL (table avis_citoyens).
Projet de Fin d Etudes (PFE) -- CETUD / Transport Urbain Dakar.

Objectif
--------
Transferer les avis citoyens preexistants depuis le fichier plat
``data/feedback_citoyens.json`` vers la table PostgreSQL ``avis_citoyens``
de la base ``CETUD_PFE``.

Ce fichier JSON etait l ancien mecanisme de stockage (prototype). Apres la
migration de l architecture vers PostgreSQL, ce script assure la continuite
des donnees en important les onze avis existants dans la nouvelle table.

Usage
-----
A executer UNE SEULE FOIS apres le deploiement initial :

    python migrate_feedback.py

Si le script est relance accidentellement, les enregistrements deja presents
sont detectes par leur identifiant (champ ``id``) et ignores (protection
anti-doublon). Il peut donc etre reexecute sans risque.

Prerequis
---------
- PostgreSQL demarre et accessible a l adresse definie dans DATABASE_URL
  (ou au repli local dans database.py).
- La table ``avis_citoyens`` doit exister (creee automatiquement par
  ``init_db()`` lors du premier demarrage de FastAPI, ou manuellement
  via ``python -c "from database import init_db; init_db()"``.
- Le fichier ``data/feedback_citoyens.json`` doit exister et contenir
  un tableau JSON d objets ayant les champs :
      id, note_satisfaction, mode_utilise, type_probleme (opt.),
      quartier (opt.), commentaire (opt.), date (ISO 8601, opt.)

Sortie attendue
---------------
    =======================================================
      Migration : feedback_citoyens.json -> PostgreSQL
    =======================================================
    [INFO] 11 avis trouves dans le fichier JSON.
    [INFO] Table `avis_citoyens` deja existante - pas de recreation.
    [OK] 11 avis inseres avec succes dans PostgreSQL.
    -------------------------------------------------------
    Migration terminee avec succes.

Auteur  : PFE Transport Urbain Dakar
Version : 1.0
"""

import json
import os
import sys
from datetime import datetime, timezone

# Ajouter le dossier courant au path pour importer database.py
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_db, SessionLocal, AvisCitoyen

# ─────────────────────────────────────────────────────────────────────────────
# Constantes
# ─────────────────────────────────────────────────────────────────────────────
DATA_DIR      = os.path.join(os.path.dirname(__file__), "data")
FEEDBACK_PATH = os.path.join(DATA_DIR, "feedback_citoyens.json")


def _parse_date(raw: str | None) -> datetime:
    """
    Convertit une chaine ISO 8601 en objet datetime UTC.

    Si la chaine est absente ou malformee, retourne la date courante en UTC.
    Si la date est naive (sans fuseau horaire), lui ajoute timezone.utc.

    Parameters
    ----------
    raw : str | None
        Chaine de date au format ISO 8601 (ex. "2026-06-16T23:51:30.061528").

    Returns
    -------
    datetime
        Objet datetime avec timezone UTC.
    """
    if not raw:
        return datetime.now(timezone.utc)
    try:
        dt = datetime.fromisoformat(raw)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.now(timezone.utc)


def migrate() -> None:
    """
    Point d entree principal de la migration.

    Etapes
    ------
    1. Verifier que le fichier source JSON existe.
    2. Charger et parser le JSON.
    3. Appeler ``init_db()`` pour s assurer que la table est prete.
    4. Recuperer les identifiants deja presents en base (protection doublon).
    5. Inserer les enregistrements manquants dans une transaction unique.
    6. Afficher un rapport de synthese.

    Raises
    ------
    SystemExit
        En cas d erreur de lecture JSON ou d echec de transaction PostgreSQL.
    """
    print("=" * 55)
    print("  Migration : feedback_citoyens.json -> PostgreSQL")
    print("=" * 55)

    # -- 1. Verifier la source --------------------------------------------------
    if not os.path.exists(FEEDBACK_PATH):
        print(f"[INFO] Aucun fichier source trouve : {FEEDBACK_PATH}")
        print("       Rien a migrer -- la base sera vide.")
        return

    # -- 2. Charger le JSON -----------------------------------------------------
    with open(FEEDBACK_PATH, "r", encoding="utf-8") as f:
        try:
            entries = json.load(f)
        except json.JSONDecodeError as exc:
            print(f"[ERREUR] Impossible de lire le JSON : {exc}")
            sys.exit(1)

    if not entries:
        print("[INFO] Le fichier JSON est vide -- rien a migrer.")
        return

    print(f"[INFO] {len(entries)} avis trouves dans le fichier JSON.")

    # -- 3. Initialiser la table ------------------------------------------------
    init_db()

    # -- 4. & 5. Inserer les enregistrements ------------------------------------
    db = SessionLocal()
    inserted = 0
    skipped  = 0

    try:
        # Recuperer les IDs deja presents pour eviter les doublons
        existing_ids = {row[0] for row in db.query(AvisCitoyen.id).all()}

        for entry in entries:
            old_id = entry.get("id")

            # Protection anti-doublon : ignorer si l ID est deja en base
            if old_id and old_id in existing_ids:
                skipped += 1
                continue

            row = AvisCitoyen(
                note_satisfaction=int(entry.get("note_satisfaction", 3)),
                mode_utilise=str(entry.get("mode_utilise", "Non precise"))[:100],
                type_probleme=str(entry["type_probleme"])[:100] if entry.get("type_probleme") else None,
                quartier=str(entry["quartier"])[:150]           if entry.get("quartier")      else None,
                commentaire=str(entry["commentaire"])           if entry.get("commentaire")   else None,
                date=_parse_date(entry.get("date")),
            )
            db.add(row)
            inserted += 1

        db.commit()

        # -- 6. Rapport ---------------------------------------------------------
        print(f"[OK] {inserted} avis inseres avec succes dans PostgreSQL.")
        if skipped:
            print(f"[INFO] {skipped} avis ignores (deja presents en base).")

    except Exception as exc:
        db.rollback()
        print(f"[ERREUR] Transaction annulee : {exc}")
        sys.exit(1)
    finally:
        db.close()

    print("-" * 55)
    print("Migration terminee avec succes.")
    print("Vous pouvez maintenant archiver ou supprimer feedback_citoyens.json.")


# ─────────────────────────────────────────────────────────────────────────────
# Point d entree
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    migrate()