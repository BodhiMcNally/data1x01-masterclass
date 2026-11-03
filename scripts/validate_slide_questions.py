"""Catch incomplete MCQ edits before publishing; the visible rows drive phones."""
from pathlib import Path
import re

source = (Path(__file__).resolve().parents[1] / 'masterclass.qmd').read_text(encoding='utf-8')
questions = []
for section in re.split(r'(?m)(?=^## )', source):
    heading = section.split('\n', 1)[0]
    if '.mcq' not in heading:
        continue
    name = re.search(r'#([\w-]+)', heading).group(1)
    rows = re.findall(r'::: \{\.answer-row\s+data-correct="(true|false)"\s+data-option="([A-Z])"\}', section)
    options = re.findall(r'::: \{\.option-text\}\s*\n(.*?)\n:::', section, re.S)
    assert 2 <= len(rows) <= 26, f'{name}: provide 2-26 answer rows'
    assert len(options) == len(rows), f'{name}: each answer row needs option-text'
    assert sum(correct == 'true' for correct, _ in rows) == 1, f'{name}: mark exactly one answer data-correct="true"'
    assert [letter for _, letter in rows] == list('ABCDEFGHIJKLMNOPQRSTUVWXYZ'[:len(rows)]), f'{name}: label the options in order'
    assert all(0 < len(re.sub(r'[`*]', '', option).strip()) <= 200 for option in options), f'{name}: each phone option must be 1-200 characters'
    assert f'#vote-{name}' in section, f'{name}: add the native poll header with a matching vote ID'
    questions.append(name)
assert questions and len(questions) == len(set(questions)), 'Give every MCQ a unique slide ID'
print(f'Validated {len(questions)} MCQs from the visible slide source.')
