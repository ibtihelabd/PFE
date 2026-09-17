import json, base64, urllib.request, re

TOKEN = __import__('os').environ.get('GITHUB_TOKEN', '')
OWNER = 'ibtihelabd'
REPO  = 'PFE'

def get_file(repo_path):
    url = f'https://api.github.com/repos/{OWNER}/{REPO}/contents/{repo_path}'
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github+json'})
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())
    return base64.b64decode(data['content']).decode('utf-8'), data['sha']

def put_file(repo_path, content, sha, msg):
    encoded = base64.b64encode(content.encode('utf-8')).decode()
    body = {'message': msg, 'content': encoded, 'sha': sha}
    data = json.dumps(body).encode()
    url = f'https://api.github.com/repos/{OWNER}/{REPO}/contents/{repo_path}'
    req = urllib.request.Request(url, data=data, method='PUT',
          headers={'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r: pass

def nuclear_clean(text):
    lines = text.split('\n')
    out = []
    skip_heading = False
    heading_level = 0
    for line in lines:
        stripped = line.strip()
        # Detecter heading avec soutenance
        m = re.match(r'^(#{1,4})\s+', line)
        if m and 'soutenance' in line.lower():
            heading_level = len(m.group(1))
            skip_heading = True
            continue
        # Fin du bloc heading soutenance si nouveau heading de meme niveau
        if skip_heading and m:
            if len(m.group(1)) <= heading_level:
                skip_heading = False
        if skip_heading:
            continue
        # Supprimer lignes avec emoji soutenance (sans >)
        if re.search(r'[Qq]uestion possib.*[Ss]outenance', line):
            continue
        # Supprimer blockquotes soutenance
        if re.search(r'^\s*>\s*.*[Ss]outenance', line):
            continue
        # Supprimer lignes de TOC avec soutenance
        if re.search(r'\[.*[Ss]outenance.*\]\(#', line):
            continue
        out.append(line)
    result = '\n'.join(out)
    result = re.sub(r'\n{3,}', '\n\n', result)
    return result

files = [
    'documentation/02_Frontend.md',
    'documentation/08_Knowage.md',
    'documentation/09_Integration.md',
    'documentation/README.md',
    'documentation/03_Backend_FastAPI.md',
]

for fp in files:
    original, sha = get_file(fp)
    before = len(re.findall(r'[Ss]outenance', original))
    cleaned = nuclear_clean(original)
    after = len(re.findall(r'[Ss]outenance', cleaned))
    put_file(fp, cleaned, sha, 'Clean: remove all soutenance Q&A lines (emoji + blockquote)')
    print(f'OK: {fp} ({before} -> {after})')
