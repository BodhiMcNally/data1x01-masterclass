"""Refresh the phone prompts/options from the audited question inventory."""
from pathlib import Path
import json,re
P=Path(__file__).resolve().parents[1]
s=(P/'masterclass.qmd').read_text()

def plain(t):
    t=t.replace('**','').replace('`','').replace('$','')
    t=re.sub(r'\\+',lambda m:chr(92),t)
    for a,b in [(r'\sim','~'),(r'\mu_D','μD'),(r'\text{After}','After'),
                (r'\text{Before}','Before'),(r'\bar{X}','X̄'),('H_0','H₀')]:
        t=t.replace(a,b)
    return t

for item in json.loads((P/'data/questions.json').read_text()):
    n=item['number'];prompt=f"Q{n}. "+plain(item['stem'])
    if any(token in item['stimulus'] for token in ['```','<img','|---']):prompt+=' Refer to the code, plot or table on the presentation.'
    assert len(prompt)<=500
    prompt=prompt.replace('"','&quot;')
    poll=f'::: {{.poll .mcq-vote-header #vote-q{n} results="hidden" prompt="{prompt}"}}\n'
    for letter in 'ABCD':poll+=f"- [{'x' if letter==item['answer'] else ' '}] {item['options'][letter]}\n"
    poll+=':::'
    pattern=rf'::: \{{\.poll \.mcq-vote-header #vote-q{n} .*?\n:::'
    s,count=re.subn(pattern,lambda m:poll,s,count=1,flags=re.S)
    assert count==1,(n,count)
(P/'masterclass.qmd').write_text(s)
print('13 phone prompts and option sets updated.')
