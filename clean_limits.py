import json, base64, urllib.request, re

TOKEN = __import__('os').environ.get('GITHUB_TOKEN', '')
OWNER = 'ibtihelabd'
REPO  = 'PFE'

def get_file(fp):
    url = f'https://api.github.com/repos/{OWNER}/{REPO}/contents/{fp}'
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github+json'})
    with urllib.request.urlopen(req) as r:
        d = json.loads(r.read())
    return base64.b64decode(d['content']).decode('utf-8'), d['sha']

def put_file(fp, content, sha, msg):
    encoded = base64.b64encode(content.encode('utf-8')).decode()
    body = {'message': msg, 'content': encoded, 'sha': sha}
    url = f'https://api.github.com/repos/{OWNER}/{REPO}/contents/{fp}'
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method='PUT',
          headers={'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r: pass

# Patterns de sections a supprimer (limites, risques, faiblesses)
LIMIT_PATTERNS = [
    r'limit',       # limites, limitations
    r'risque',      # risques
    r'faiblesse',   # faiblesses
    r'inconv',      # inconvenients
    r'manque',      # manques
    r'am.lioration',# ameliorations futures
    r'piste',       # pistes d evolution
    r'volution',    # evolutions futures
    r'todo',        # TODO
    r'travail.futur',
    r'non.r.solu',  # non resolu
    r'incoh.rence', # incoherence
    r'cod.*en.dur', # code en dur
    r'point.*faible',
    r'dette.*tech',  # dette technique
]

def is_limit_heading(line):
    m = re.match(r'^(#{1,4})\s+', line)
    if not m:
        return False, 0
    text = line.lower()
    for p in LIMIT_PATTERNS:
        if re.search(p, text, re.I):
            return True, len(m.group(1))
    return False, 0

def clean_limits(text):
    lines = text.split('\n')
    out   = []
    skip  = False
    lvl   = 0
    for line in lines:
        is_lim, lv = is_limit_heading(line)
        if is_lim:
            lvl  = lv
            skip = True
            continue
        # Fin du skip : prochain heading de meme niveau ou superieur
        m = re.match(r'^(#{1,4})\s+', line)
        if skip and m and len(m.group(1)) <= lvl:
            skip = False
        if skip:
            continue
        out.append(line)
    result = '\n'.join(out)
    return re.sub(r'\n{3,}', '\n\n', result)

files = [
    'documentation/01_Architecture.md',
    'documentation/02_Frontend.md',
    'documentation/03_Backend_FastAPI.md',
    'documentation/04_Base_de_donnees.md',
    'documentation/05_ETL.md',
    'documentation/06_DataWarehouse.md',
    'documentation/07_MachineLearning.md',
    'documentation/08_Knowage.md',
    'documentation/09_Integration.md',
    'documentation/README.md',
]

for fp in files:
    orig, sha = get_file(fp)
    cleaned   = clean_limits(orig)
    if cleaned != orig:
        put_file(fp, cleaned, sha, 'Clean: remove limitations/risks/weaknesses sections')
        removed = len(orig.split('\n')) - len(cleaned.split('\n'))
        print(f'UPDATED: {fp} (-{removed} lignes)')
    else:
        print(f'SKIP: {fp} (aucune section limite trouvee)')
