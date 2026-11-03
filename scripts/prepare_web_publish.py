"""Stage the rendered, self-contained deck beside the audience voting assets."""
from pathlib import Path
import shutil

project = Path(__file__).resolve().parents[1]
source = project / 'masterclass.html'
if not source.is_file():
    raise SystemExit('Render masterclass.qmd before preparing the web publication.')
target = project / 'live-questions' / 'public' / 'slides'
target.mkdir(parents=True, exist_ok=True)
shutil.copy2(source, target / 'index.html')
print('Presentation staged at /slides/. Existing audience voting paths are unchanged.')
