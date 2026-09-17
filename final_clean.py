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

def clean(text):
    lines = text.split('\n')
    out = []
    skip = False
    lvl  = 0
    for line in lines:
        # Heading contenant soutenance -> skip jusqu'au prochain heading meme niveau
        m = re.match(r'^(#{1,4})\s+', line)
        if m and re.search(r'[Ss]outenance', line):
            lvl  = len(m.group(1))
            skip = True
            continue
        if skip and m and len(m.group(1)) <= lvl:
            skip = False
        if skip:
            continue
        # Lignes isolees avec soutenance (emoji, blockquote, TOC, inline note)
        if re.search(r'[Ss]outenance', line):
            continue
        out.append(line)
    result = '\n'.join(out)
    return re.sub(r'\n{3,}', '\n\n', result)

for fp in [
    'documentation/09_Integration.md',
    'documentation/README.md',
    'documentation/02_Frontend.md',
    'documentation/08_Knowage.md',
    'documentation/03_Backend_FastAPI.md',
    'documentation/07_MachineLearning.md',
]:
    orig, sha = get_file(fp)
    before = len(re.findall(r'[Ss]outenance', orig))
    cleaned = clean(orig)
    after  = len(re.findall(r'[Ss]outenance', cleaned))
    if after != before:
        put_file(fp, cleaned, sha, 'Clean: remove all remaining soutenance references')
        print(f'UPDATED: {fp} ({before} -> {after})')
    else:
        print(f'SKIP (no change): {fp} ({before})')
