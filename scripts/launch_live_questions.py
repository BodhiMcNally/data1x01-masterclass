"""Present the local deck with the bundled Live Questions service.

The default mode creates a temporary Cloudflare voting URL. --rehearsal uses
localhost only. --server uses an already deployed Live Questions server.
"""
from __future__ import annotations
import argparse, hashlib, http.server, json, os, platform, queue, re, secrets
import shutil, signal, socket, subprocess, sys, tarfile, threading, time
import urllib.error, urllib.parse, urllib.request, webbrowser, zipfile
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
STATE = PROJECT / '.live-questions'
CACHE = Path(os.environ.get('LOCALAPPDATA', str(Path.home() / '.cache'))) / 'data1x01-live-questions'
SESSION_RE = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$')
CHILDREN: list[subprocess.Popen] = []
STOP = threading.Event()


def log(message):
    print(message, flush=True)


def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers={'User-Agent': 'DATA1x01-Live-Questions'})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def download(url, destination, expected=None):
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(destination.name + '.download')
    req = urllib.request.Request(url, headers={'User-Agent': 'DATA1x01-Live-Questions'})
    digest = hashlib.sha256()
    try:
        with urllib.request.urlopen(req, timeout=120) as response, temporary.open('wb') as out:
            while chunk := response.read(1024 * 1024):
                out.write(chunk)
                digest.update(chunk)
        if expected and digest.hexdigest().lower() != expected.lower():
            raise RuntimeError('Downloaded dependency failed its SHA-256 check.')
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)
    return destination


def node_binary(explicit=None):
    candidate = explicit or shutil.which('node')
    if candidate:
        result = subprocess.run([candidate, '--version'], capture_output=True, text=True, check=True)
        if int(result.stdout.strip().lstrip('v').split('.')[0]) >= 22:
            return candidate
    system, machine = platform.system(), platform.machine().lower()
    arch = 'arm64' if machine in ('aarch64', 'arm64') else 'x64'
    osname = {'Windows': 'win', 'Darwin': 'darwin', 'Linux': 'linux'}.get(system)
    if not osname:
        raise RuntimeError('Install Node.js 22 or later, then run this launcher again.')
    suffix = '.zip' if system == 'Windows' else '.tar.gz'
    manifest = fetch('https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt').decode()
    target = next((line.split() for line in manifest.splitlines()
                   if re.search(r'node-v22\.[\d.]+-' + osname + '-' + arch + re.escape(suffix) + r'$', line)), None)
    if not target:
        raise RuntimeError('Could not locate the official Node.js download for this computer.')
    checksum, name = target
    folder = CACHE / name.removesuffix(suffix)
    binary = folder / ('node.exe' if system == 'Windows' else 'bin/node')
    if binary.exists():
        return str(binary)
    log('Installing a portable Node.js runtime from nodejs.org. This runs once.')
    archive = download('https://nodejs.org/dist/latest-v22.x/' + name, CACHE / name, checksum)
    if suffix == '.zip':
        with zipfile.ZipFile(archive) as z:
            base = CACHE.resolve()
            if any(not (base / n).resolve().is_relative_to(base) for n in z.namelist()):
                raise RuntimeError('Invalid Node.js archive path.')
            z.extractall(CACHE)
    else:
        with tarfile.open(archive) as t:
            t.extractall(CACHE, filter='data')
    if not binary.exists():
        raise RuntimeError('The Node.js runtime did not unpack correctly.')
    return str(binary)


def tunnel_binary(explicit=None):
    if explicit or shutil.which('cloudflared'):
        return explicit or shutil.which('cloudflared')
    system, machine = platform.system(), platform.machine().lower()
    arch = 'arm64' if machine in ('aarch64', 'arm64') else 'amd64'
    if system == 'Windows':
        name = 'cloudflared-windows-' + arch + '.exe'
    elif system == 'Darwin':
        name = 'cloudflared-darwin-' + arch + '.tgz'
    elif system == 'Linux':
        name = 'cloudflared-linux-' + arch
    else:
        raise RuntimeError('Install cloudflared from Cloudflare, then run the launcher again.')
    release = '2026.10.7'
    binary = CACHE / ('cloudflared-' + release + ('.exe' if system == 'Windows' else ''))
    if binary.exists():
        return str(binary)
    log('Installing cloudflared from Cloudflare’s official release. This runs once.')
    metadata = json.loads(fetch('https://api.github.com/repos/cloudflare/cloudflared/releases/tags/' + release))
    asset = next((a for a in metadata['assets'] if a['name'] == name), None)
    if not asset:
        raise RuntimeError('No official cloudflared binary was found for this computer.')
    digest = asset.get('digest') or ''
    expected = digest.removeprefix('sha256:') if digest.startswith('sha256:') else None
    if name.endswith('.tgz'):
        archive = download(asset['browser_download_url'], CACHE / name, expected)
        with tarfile.open(archive) as t:
            member = next(m for m in t.getmembers() if Path(m.name).name == 'cloudflared' and m.isfile())
            data = t.extractfile(member).read()
            binary.write_bytes(data)
    else:
        download(asset['browser_download_url'], binary, expected)
    binary.chmod(binary.stat().st_mode | 0o111)
    return str(binary)


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


def wait_http(url, seconds=25):
    end = time.monotonic() + seconds
    last = None
    while time.monotonic() < end:
        try:
            return fetch(url, timeout=4)
        except (OSError, urllib.error.URLError) as exc:
            last = exc
            if STOP.wait(.25):
                break
    raise RuntimeError('Could not reach the voting service: ' + str(last))


def start_child(command, env=None, output=None):
    child = subprocess.Popen(command, cwd=PROJECT, env=env, stdout=output,
                             stderr=subprocess.STDOUT if output is not None else None,
                             stdin=subprocess.DEVNULL)
    CHILDREN.append(child)
    return child


def get_key(path, create):
    if path.exists():
        key = path.read_text().strip()
    elif create:
        path.parent.mkdir(parents=True, exist_ok=True)
        key = secrets.token_hex(24)
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as file:
            file.write(key + '\n')
    else:
        raise RuntimeError('A deployed server needs its presenter key. Use --key-file PATH.')
    if not key or len(key) > 256:
        raise RuntimeError('The presenter key file is empty or invalid.')
    return key


class Slides(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        path = urllib.parse.urlsplit(self.path).path
        if path not in ('/', '/masterclass.html'):
            self.send_error(404)
            return
        data = (PROJECT / 'masterclass.html').read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *_):
        pass  # Never put the presenter-key query string in terminal logs.


def start_tunnel(binary, origin):
    tunnel = start_child([binary, 'tunnel', '--no-autoupdate', '--protocol', 'http2',
                          '--url', origin], output=subprocess.PIPE)
    found = queue.Queue()
    def reader():
        with (STATE / 'tunnel.log').open('w') as out:
            for raw in iter(tunnel.stdout.readline, b''):
                line = raw.decode(errors='replace')
                out.write(line)
                out.flush()
                match = re.search(r'https://[a-z0-9-]+\.trycloudflare\.com', line)
                if match:
                    found.put(match.group())
    threading.Thread(target=reader, daemon=True).start()
    try:
        url = found.get(timeout=40)
    except queue.Empty:
        raise RuntimeError('Cloudflare did not create a voting URL. Check .live-questions/tunnel.log or configure the permanent Worker with scripts/deploy_live_questions.py.')
    if wait_http(url + '/healthz', 30).strip() != b'ok':
        raise RuntimeError('The temporary voting URL did not pass its connection check.')
    return url


def find_rscript(explicit):
    if explicit or shutil.which('Rscript'):
        return explicit or shutil.which('Rscript')
    if platform.system() == 'Windows':
        matches = sorted(Path('C:/Program Files/R').glob('*/bin/Rscript.exe'))
        if matches:
            return str(matches[-1])
    raise RuntimeError('Rscript was not found. Install R or pass --rscript PATH, or leave out --with-shiny.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--rehearsal', action='store_true', help='Test on this computer only, without a public tunnel')
    modes.add_argument('--server', help='An existing HTTPS Live Questions server')
    modes.add_argument('--temporary-link', action='store_true', help='Use a temporary Cloudflare link even if a permanent server is configured')
    parser.add_argument('--session', help='Room name; default is a fresh room for each launch')
    parser.add_argument('--key-file', type=Path, help='Presenter-key file for an existing server')
    parser.add_argument('--with-shiny', action='store_true', help='Also start the existing local R Shiny widgets')
    parser.add_argument('--shiny', help='Use a Shiny companion already running on localhost')
    parser.add_argument('--rscript', help='Optional Rscript executable path')
    parser.add_argument('--node', help='Optional Node.js executable path')
    parser.add_argument('--cloudflared', help='Optional cloudflared executable path')
    parser.add_argument('--no-browser', action='store_true', help='Print joining instructions without opening a browser')
    parser.add_argument('--ready-file', type=Path, help=argparse.SUPPRESS)
    args = parser.parse_args()
    if not (PROJECT / 'masterclass.html').exists():
        parser.error('Extract the complete project before running this launcher.')
    saved_server=STATE/'server.json'
    if not args.server and not args.rehearsal and not args.temporary_link and saved_server.exists():
        args.server=json.loads(saved_server.read_text())['server']
    session = args.session or 'data1x01-' + secrets.token_hex(4)
    if not SESSION_RE.fullmatch(session):
        parser.error('Session names use letters, numbers, - and _ only, up to 64 characters.')
    STATE.mkdir(exist_ok=True, mode=0o700)
    key_path = (args.key_file or STATE / 'presenter-key').resolve()
    key = get_key(key_path, create=not args.server)
    try:
        if args.server:
            parsed = urllib.parse.urlsplit(args.server)
            if parsed.scheme != 'https' or not parsed.netloc or parsed.path not in ('', '/') or parsed.query or parsed.fragment or parsed.username:
                parser.error('--server must be an HTTPS origin without a path or query.')
            server = args.server.rstrip('/')
            wait_http(server + '/healthz')
        else:
            node = node_binary(args.node)
            port = free_port()
            env = dict(os.environ, PORT=str(port), PRESENTER_KEY=key,
                       PUBLIC_DIR=str(PROJECT / 'live-questions/public'), DATA_DIR=str(STATE / 'sessions'))
            output = (STATE / 'server.log').open('w')
            start_child([node, str(PROJECT / 'live-questions/server.js')], env, output)
            origin = 'http://127.0.0.1:' + str(port)
            wait_http(origin + '/healthz')
            if args.rehearsal:
                server = origin
                log('Rehearsal mode: the voting page works on this computer only.')
            else:
                log('Connecting the voting page. The presentation stays on your laptop.')
                server = start_tunnel(tunnel_binary(args.cloudflared), origin)
        query = urllib.parse.urlencode({'lq-server': server, 'session': session, 'presenter': key})
        shiny = args.shiny
        if args.with_shiny:
            rscript = find_rscript(args.rscript)
            port = free_port()
            rfile = PROJECT / 'live-questions/start_shiny.R'
            env = dict(os.environ, LQ_SHINY_PORT=str(port))
            output = (STATE / 'shiny.log').open('w')
            start_child([rscript, str(rfile)], env, output)
            shiny = 'http://127.0.0.1:' + str(port)
            wait_http(shiny, 40)
        if shiny:
            parsed = urllib.parse.urlsplit(shiny)
            if parsed.scheme != 'http' or parsed.hostname not in ('localhost', '127.0.0.1', '::1'):
                parser.error('The Shiny companion must be running on localhost.')
            presentation = shiny.rstrip('/') + '/deck/masterclass.html?' + query + '&shiny=1'
        else:
            httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Slides)
            threading.Thread(target=httpd.serve_forever, daemon=True).start()
            presentation = 'http://127.0.0.1:' + str(httpd.server_port) + '/masterclass.html?' + query
        audience = server + '/s/' + session
        # Reopen on this computer without printing the private key.
        local_link = STATE / 'open-presentation.html'
        safe = presentation.replace('&', '&amp;').replace('"', '&quot;')
        local_link.write_text('<!doctype html><meta name="referrer" content="no-referrer"><meta http-equiv="refresh" content="0;url=' + safe + '"><title>Open DATA1x01 revision</title>')
        if os.name != 'nt':
            local_link.chmod(0o600)
        log('Voting page: ' + audience)
        log('Session: ' + session)
        log('Your presentation is opening locally. Press Q for the large joining QR.')
        log('Space / right arrow reveals the answer and voting results. A does the same.')
        log('Keep this window open during the session. Press Ctrl+C to finish.')
        log('Reopen the presentation from .live-questions/open-presentation.html if needed.')
        if args.ready_file:
            # An explicit test-only file, private and excluded from every deliverable.
            args.ready_file.write_text(json.dumps({'presentation': presentation, 'audience': audience,
                                                   'server': server, 'session': session}))
            if os.name != 'nt':
                args.ready_file.chmod(0o600)
        if not args.no_browser:
            webbrowser.open(presentation)
        while not STOP.wait(.5):
            if any(p.poll() is not None for p in CHILDREN):
                raise RuntimeError('A live service stopped. Check .live-questions/ logs; the offline presentation is still available.')
    finally:
        for child in reversed(CHILDREN):
            if child.poll() is None:
                child.terminate()
                try:
                    child.wait(timeout=4)
                except subprocess.TimeoutExpired:
                    child.kill()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        STOP.set()
        log('\nLive session ended.')
    except Exception as exc:
        log('Could not start live voting: ' + str(exc))
        sys.exit(1)
