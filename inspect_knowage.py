import json, base64, urllib.request, re, sys

TOKEN = __import__('os').environ.get('GITHUB_TOKEN', '')
OWNER = 'ibtihelabd'
REPO  = 'PFE'

def get_file(repo_path):
    url = f'https://api.github.com/repos/{OWNER}/{REPO}/contents/{repo_path}'
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github+json'})
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())
    content = base64.b64decode(data['content']).decode('utf-8')
    return content, data['sha']

def put_file(repo_path, content, sha, msg):
    encoded = base64.b64encode(content.encode('utf-8')).decode()
    body = {'message': msg, 'content': encoded, 'sha': sha}
    data = json.dumps(body).encode()
    url = f'https://api.github.com/repos/{OWNER}/{REPO}/contents/{repo_path}'
    req = urllib.request.Request(url, data=data, method='PUT',
          headers={'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        pass

# Verifier les lignes problematiques dans 08_Knowage
content, sha = get_file('documentation/08_Knowage.md')
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'soutenance' in line.lower():
        sys.stdout.buffer.write(f'{i}: {repr(line[:150])}\n'.encode('utf-8'))
