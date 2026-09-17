import json, base64, urllib.request

TOKEN = __import__('os').environ.get('GITHUB_TOKEN', '')
OWNER = 'ibtihelabd'
REPO  = 'PFE'

def api(path, method='GET', body=None):
    url = f'https://api.github.com/repos/{OWNER}/{REPO}/contents/{path}'
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method,
          headers={'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github+json',
                   'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def delete_file(path, sha):
    try:
        api(path, 'DELETE', {'message': f'Remove rapport LaTeX: {path}', 'sha': sha})
        print(f'DELETED: {path}')
    except Exception as e:
        print(f'ERR {path}: {e}')

def delete_folder(folder):
    try:
        items = api(folder)
    except:
        print(f'NOT FOUND: {folder}')
        return
    for item in items:
        if item['type'] == 'file':
            delete_file(item['path'], item['sha'])
        elif item['type'] == 'dir':
            delete_folder(item['path'])

delete_folder('rapport')
print('Done.')
