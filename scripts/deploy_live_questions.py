"""Deploy the included Live Questions Worker to your Cloudflare account.
Run once on the presentation laptop. Cloudflare's own browser login grants access.
"""
from pathlib import Path
import json,os,re,secrets,shutil,subprocess,sys
from launch_live_questions import PROJECT,STATE,node_binary,get_key


def main():
    STATE.mkdir(exist_ok=True,mode=0o700)
    node=Path(node_binary()).resolve()
    candidates=[node.parent/'node_modules/npm/bin/npx-cli.js',
                node.parent.parent/'lib/node_modules/npm/bin/npx-cli.js']
    system=shutil.which('npx')
    if system and Path(system).resolve().suffix=='.js':candidates.append(Path(system).resolve())
    cli=next((p for p in candidates if p.is_file()),None)
    if cli is None:raise RuntimeError('npx was not found. Install the standard Node.js distribution, then retry.')
    command=[str(node),str(cli),'--yes','wrangler@4.150.0']
    env=dict(os.environ)
    env['PATH']=str(node.parent)+os.pathsep+env.get('PATH','')
    work=PROJECT/'live-questions'
    who=subprocess.run(command+['whoami'],cwd=work,env=env,capture_output=True,text=True,encoding="utf-8",errors="replace")
    if who.returncode or re.search(r'not authenticated|not logged|not currently logged',who.stdout+who.stderr,re.I):
        print('Sign in to your Cloudflare account in the browser that opens.',flush=True)
        subprocess.run(command+['login'],cwd=work,env=env,check=True)
    namefile=STATE/'worker-name'
    if namefile.exists():name=namefile.read_text().strip()
    else:
        name='data1x01-questions-'+secrets.token_hex(3)
        namefile.write_text(name+'\n')
    if not re.fullmatch(r'data1x01-questions-[a-f0-9]{6}',name):raise RuntimeError('The saved Worker name is invalid.')
    print('Deploying your voting service. The slide deck stays on your laptop.',flush=True)
    result=subprocess.run(command+['deploy','--name',name],cwd=work,env=env,capture_output=True,text=True,encoding="utf-8",errors="replace")
    print(result.stdout,flush=True)
    if result.stderr:print(result.stderr,file=sys.stderr,flush=True)
    result.check_returncode()
    urls=re.findall(r'https://[a-zA-Z0-9.-]+\.workers\.dev',result.stdout+result.stderr)
    if not urls:raise RuntimeError('Deployment finished but its workers.dev URL could not be read.')
    key=get_key(STATE/'presenter-key',True)
    result=subprocess.run(command+['secret','put','PRESENTER_KEY','--name',name],cwd=work,env=env,input=key+'\n',capture_output=True,text=True,encoding="utf-8",errors="replace")
    if result.returncode:
        print(result.stdout,file=sys.stderr);print(result.stderr,file=sys.stderr);result.check_returncode()
    config={'server':urls[-1],'worker':name}
    (STATE/'server.json').write_text(json.dumps(config,indent=2)+'\n')
    print('Voting service configured: '+urls[-1],flush=True)
    print('Now open Start_Live_Questions.bat or run python scripts/launch_live_questions.py.',flush=True)


if __name__=='__main__':
    try:main()
    except (Exception,KeyboardInterrupt) as exc:
        print('Deployment was not completed: '+str(exc),file=sys.stderr);sys.exit(1)
