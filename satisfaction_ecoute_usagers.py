"""
Module Satisfaction & Ecoute Usagers — PFE Transport Urbain Dakar
====================================================================
Exploite le fichier individu de l'EMD (CETUD_BD_EMD_INDIVIDU_LIBELLE.xlsx),
qui contient ~60 variables de perception/opinion non utilisees par les
autres modeles (segmentation, anomalies, inaccessibilite) :

  - 6 criteres de satisfaction par mode de TC le plus utilise
    (prix, proximite arret, attente, vitesse, place dispo, securite/accidents)
  - Sentiment d'insecurite (vol, agression, harcelement) de jour/nuit,
    a pied / en TC / en voiture
  - Incidents subis reellement (vol, agression, harcelement) en attendant
    ou a bord d'un TC depuis 2014
  - Activites non realisees a cause de difficultes de deplacement
    + nature de la difficulte (cout, distance, duree, embouteillages...)
  - Genes pietonnes (trottoirs, inondations, eclairage, accidents, odeurs)

Sortie : backend/ml_models/satisfaction.json, consomme par
GET /api/satisfaction (cf. main.py) et affiche sur la page
/decideurs/satisfaction du frontend.
"""

import json
import os
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_XLSX = os.path.join(BASE_DIR, "PFE (partie usager)", "CETUD_BD_EMD_INDIVIDU_LIBELLE.xlsx")
OUT_PATH = os.path.join(BASE_DIR, "PFE (partie usager)", "backend", "ml_models", "satisfaction.json")


def clean_col(s):
    return s.replace("\xa0", " ").strip()


def pct(series, positive_values):
    """% de reponses positives parmi les reponses valides (hors 9/NSP/NaN)."""
    s = series.dropna()
    s = s[~s.isin([9, "9", "NSP"])]
    if len(s) == 0:
        return None
    return round(100 * s.isin(positive_values).sum() / len(s), 1)


def likert_score(series):
    """
    Transforme D'accord / Indifferent / Pas d'accord en score 0-100
    (D'accord=100, Indifferent=50, Pas d'accord=0), moyenne ponderee.
    """
    mapping = {"D'accord": 100, "D’accord": 100, "Indifferent": 50, "Pas d'accord": 0, "Pas d’accord": 0}
    s = series.dropna()
    s = s[~s.isin([9, "9", "NSP"])]
    s = s.map(mapping).dropna()
    if len(s) == 0:
        return None
    return round(s.mean(), 1)


def main():
    print(f"Lecture {SRC_XLSX} ...")
    df = pd.read_excel(SRC_XLSX)
    df.columns = [clean_col(c) for c in df.columns]
    print(f"{len(df)} individus, {len(df.columns)} colonnes")

    n_total = len(df)

    # ------------------------------------------------------------------
    # 1) Satisfaction par mode de TC (criteres Likert, mode le + utilise)
    # ------------------------------------------------------------------
    criteres = {
        "prix": "Le 1er TC est-il bon marche ?",
        "proximite": "le 1er TC s'arrete-t-il pres de mon domicile",
        "attente": "Je l'attends peu de temps le 1er TC",
        "vitesse": "Le 1er TC est rapide",
        "confort_place": "J'ai assez de place dans le 1er TC",
        "securite_accidents": "Je ne risque pas d'accidents dans le 1er TC",
    }
    # gerer les apostrophes typographiques differentes dans les noms de colonnes reels
    def find_col(approx):
        approx_n = approx.replace("'", "’")
        for c in df.columns:
            if c == approx or c == approx_n:
                return c
        # fallback : recherche floue par mots-cles
        return None

    real_cols = {}
    for key, approx in criteres.items():
        c = find_col(approx)
        if c is None:
            # recherche par sous-chaine sur les mots significatifs
            for col in df.columns:
                if approx.split()[0].lower() in col.lower() and "1er TC" in col:
                    c = col
                    break
        real_cols[key] = c

    mode_col = find_col("1er mode de TC le plus utilise")
    satisfaction_par_mode = {}
    if mode_col:
        modes = df[mode_col].dropna().unique()
        for mode in modes:
            if str(mode) in ("9", "nan"):
                continue
            sub = df[df[mode_col] == mode]
            n = len(sub)
            if n < 15:
                continue
            scores = {}
            for key, col in real_cols.items():
                if col and col in sub.columns:
                    scores[key] = likert_score(sub[col])
            valid_scores = [v for v in scores.values() if v is not None]
            global_score = round(np.mean(valid_scores), 1) if valid_scores else None
            satisfaction_par_mode[str(mode)] = {
                "n": int(n),
                "score_global": global_score,
                "criteres": scores,
            }
        # tri par score global desc
        satisfaction_par_mode = dict(
            sorted(satisfaction_par_mode.items(), key=lambda kv: (kv[1]["score_global"] or 0), reverse=True)
        )

    # ------------------------------------------------------------------
    # 2) Indice d'insecurite percue (jour/nuit, a pied / TC / voiture)
    # ------------------------------------------------------------------
    insecurity_cols = {
        "pied_quartier_jour": "Crainte de vole ou d'agression dans la journee pandant un deplacement a pied, dans votre quartier",
        "pied_ailleurs_jour": "Crainte de vole ou d'agression dans la journee pandant un deplacement a pied, ailleurs",
        "tc_jour": "Crainte de vole ou d'agression dans la journee pandant un deplacement en TC",
        "voiture_jour": "Crainte de vole ou d'agression dans la journee pandant un deplacement en voiture",
        "pied_quartier_nuit": "Crainte de vole ou d'agression dans la nuit pandant un deplacement a pied, dans votre quartier",
        "pied_ailleurs_nuit": "Crainte de vole ou d'agression dans la nuit pandant un deplacement a pied, ailleurs",
        "tc_nuit": "Crainte de vole ou d'agression dans la nuit pandant un deplacement en transport en commun",
        "voiture_nuit": "Crainte de vole ou d'agression dans la nuit pandant un deplacement en voiture",
    }
    insecurite = {}
    for key, name in insecurity_cols.items():
        c = find_col(name)
        if c is None:
            for col in df.columns:
                if name[:40].lower() in col.lower():
                    c = col
                    break
        if c:
            insecurite[key] = pct(df[c], ["Oui"])

    # incidents reellement subis (depuis 2014), en attente / a bord d'un TC
    incident_cols = {
        "vol_argent_attente": "Depuis janvier 2014, en attendant un TC, avez-vous eu des problemes de vol d'argent",
        "vol_telephone_attente": "Depuis janvier 2014, en attendant un TC, avez-vous eu des problemes  de vol de telephone",
        "agression_verbale_attente": "Depuis janvier 2014, en attendant un TC, avez-vous eu des problemes d agression verbale",
        "agression_physique_attente": "Depuis janvier 2014, en attendant un TC, avez-vous eu des problemes d agression physique",
        "harcelement_attente": "Depuis janvier 2014, en attendant un TC, avez-vous eu des problemes d harcelement",
        "vol_argent_abord": "Depuis janvier 2014, avez-vous eu le probleme de vol d argent dans un TC",
        "agression_verbale_abord": "Depuis janvier 2014, avez-vous eu le probleme d agression verbale dans un TC",
        "agression_physique_abord": "Depuis janvier 2014, avez-vous eu le probleme d agression physique dans un TC",
        "harcelement_abord": "Depuis janvier 2014, avez-vous eu le probleme d harcelement dans un TC",
    }
    incidents = {}
    for key, name in incident_cols.items():
        c = find_col(name)
        if c is None:
            sig = name.split(",")[-1].strip().lower()[:25]
            for col in df.columns:
                if sig in col.lower():
                    c = col
                    break
        if c:
            incidents[key] = pct(df[c], ["Oui"])

    # ------------------------------------------------------------------
    # 3) Activites non realisees + nature de la difficulte
    # ------------------------------------------------------------------
    activite_col = find_col(
        "Activites non realisees dans la region de Dakar a cause de difficultes de deplacements lors des 7 derniers jours"
    )
    if activite_col is None:
        for col in df.columns:
            if "Activites non realisees" in col:
                activite_col = col
                break

    pct_activites_annulees = pct(df[activite_col], ["Oui"]) if activite_col else None

    diff1_col = find_col("1ere difficulte")
    diff2_col = find_col("2ieme difficulte")
    difficultes = {}
    for col in [diff1_col, diff2_col]:
        if col and col in df.columns:
            vc = df[col].dropna()
            vc = vc[~vc.isin([9, "9"])]
            for val, count in vc.value_counts().items():
                difficultes[val] = difficultes.get(val, 0) + int(count)
    difficultes = dict(sorted(difficultes.items(), key=lambda kv: kv[1], reverse=True))

    # ------------------------------------------------------------------
    # 4) Genes pietonnes
    # ------------------------------------------------------------------
    genes_cols = {
        "encombrement_trottoirs": "encombrement des trottoirs",
        "mauvais_etat_trottoirs": "mauvais etat ou l'absence de trottoirs",
        "inondations": "inondations en saison des pluies",
        "manque_eclairage": "manque d'eclairage la nuit",
        "risque_accidents": "risque d'accidents de la route",
        "mauvaises_odeurs": "mauvaises odeurs, les ordures",
        "usage_passerelles": "usage des passerelles pour pietons",
    }
    genes = {}
    for key, sig in genes_cols.items():
        sig_clean = sig.replace("'", "’")
        c = None
        for col in df.columns:
            if "Genes pendant le deplacement a pied" in col and (sig in col or sig_clean in col):
                c = col
                break
        if c:
            genes[key] = pct(df[c], ["Oui"])

    # ------------------------------------------------------------------
    # KPIs globaux + recommandations
    # ------------------------------------------------------------------
    score_global_reseau = None
    if satisfaction_par_mode:
        weighted = [(v["score_global"], v["n"]) for v in satisfaction_par_mode.values() if v["score_global"] is not None]
        if weighted:
            score_global_reseau = round(sum(s * n for s, n in weighted) / sum(n for _, n in weighted), 1)

    insecurite_tc_globale = None
    if "tc_jour" in insecurite and "tc_nuit" in insecurite:
        vals = [v for v in [insecurite.get("tc_jour"), insecurite.get("tc_nuit")] if v is not None]
        if vals:
            insecurite_tc_globale = round(np.mean(vals), 1)

    recommandations = []
    if satisfaction_par_mode:
        pire_mode = min(satisfaction_par_mode.items(), key=lambda kv: (kv[1]["score_global"] or 100))
        pire_critere = min(
            ((k, v) for k, v in pire_mode[1]["criteres"].items() if v is not None),
            key=lambda kv: kv[1],
            default=None,
        )
        if pire_critere:
            recommandations.append({
                "categorie": "Qualite de service",
                "texte": (
                    f"Le mode « {pire_mode[0]} » obtient le score de satisfaction le plus bas "
                    f"({pire_mode[1]['score_global']}/100), tire vers le bas par le critere "
                    f"« {pire_critere[0]} » ({pire_critere[1]}/100). Prioriser une action corrective sur ce point."
                ),
            })
    if insecurite_tc_globale and insecurite_tc_globale > 25:
        recommandations.append({
            "categorie": "Securite",
            "texte": (
                f"{insecurite_tc_globale}% des usagers craignent un vol/agression en TC. "
                "Renforcer la presence de controleurs/agents de securite sur les lignes les plus frequentees "
                "et ameliorer l'eclairage aux points d'arret."
            ),
        })
    if pct_activites_annulees and pct_activites_annulees > 5:
        top_diff = next(iter(difficultes), None)
        recommandations.append({
            "categorie": "Inclusion sociale",
            "texte": (
                f"{pct_activites_annulees}% des usagers ont du renoncer a une activite faute de transport, "
                + (f"la cause la plus citee etant « {top_diff} »." if top_diff else "")
            ),
        })
    if genes.get("inondations") and genes["inondations"] > 40:
        recommandations.append({
            "categorie": "Infrastructure pietonne",
            "texte": (
                f"{genes['inondations']}% des pietons signalent des inondations genant leurs deplacements : "
                "croiser avec les zones a risque (module Zones a risque) pour cibler les investissements de drainage."
            ),
        })

    result = {
        "n_individus": int(n_total),
        "score_satisfaction_global": score_global_reseau,
        "insecurite_tc_globale": insecurite_tc_globale,
        "pct_activites_non_realisees": pct_activites_annulees,
        "satisfaction_par_mode": satisfaction_par_mode,
        "insecurite_percue": insecurite,
        "incidents_subis": incidents,
        "difficultes_deplacement": difficultes,
        "genes_pietonnes": genes,
        "recommandations": recommandations,
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\nExporte -> {OUT_PATH}")
    print(f"Score satisfaction global reseau : {score_global_reseau}")
    print(f"Insecurite TC (jour/nuit moyenne) : {insecurite_tc_globale}%")
    print(f"% activites non realisees         : {pct_activites_annulees}%")
    print(f"{len(satisfaction_par_mode)} modes de TC analyses")
    print(f"{len(recommandations)} recommandations generees")


if __name__ == "__main__":
    main()
