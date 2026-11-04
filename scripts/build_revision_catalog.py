"""Derive personal revision links from the same QMD and audited source inventory."""
from pathlib import Path
import csv, html, json, re

root = Path(__file__).resolve().parents[1]
qmd = (root / 'masterclass.qmd').read_text(encoding='utf-8')
blueprint = (root / 'docs/Curriculum_Blueprint.md').read_text(encoding='utf-8')
outcomes = dict(re.findall(r'^\| (LO\d+) \| ([^|]+) \|', blueprint, re.M))
sources = list(csv.DictReader((root / 'docs/source-manifest.csv').open(encoding='utf-8')))
catalog = {}
for section in re.split(r'(?=^## )', qmd, flags=re.M):
    match = re.match(r'## (Q\d+)\s+(.+?)\s+\{#(q\d+)\b', section)
    if not match:
        continue
    label, topic, slide_id = match.groups()
    footer = re.search(r'<footer class="slide-source">(.*?)</footer>', section, re.S)
    if not footer:
        raise ValueError(f'{label} needs a source footer')
    topic_numbers = re.findall(r'>Topic (\d+)</a>', footer[1])
    resources = []
    for n in dict.fromkeys(topic_numbers):
        candidates = [r for r in sources if r['title'].startswith(f'Topic {n}:') and '/pages/' in r['url']]
        if not candidates:
            raise ValueError(f'Topic {n} has no audited Canvas topic page')
        r = candidates[0]
        resources.append({'label': r['title'].split(': DATA1001')[0], 'url': r['url']})
    resources.append({'label': 'Exam preparation and sample papers', 'url': 'https://canvas.sydney.edu.au/courses/74355/pages/getting-ready-for-the-exam'})
    ids = list(dict.fromkeys(re.findall(r'LO\d+', footer[1])))
    catalog[slide_id] = {'topic': f'{label}: {html.unescape(topic.strip())}',
        'outcomes': [{'id': i, 'text': outcomes[i].strip()} for i in ids], 'resources': resources}
if len(catalog) != 13:
    raise ValueError(f'Expected 13 MCQs, found {len(catalog)}')
(root / 'data/revision-catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Revision receipt maps built for 13 questions from audited topic pages and learning outcomes.')
