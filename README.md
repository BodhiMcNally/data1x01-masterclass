# DATA1x01 final exam revision

Bodhi McNally's 41-slide revision presentation contains 13 MCQs and three short-answer tasks. The teaching content, questions, answers and mark allocations are unchanged. Live Questions now lets students join once by QR code, vote from a phone and see the class response distribution when the answer appears.

## Start voting from the first slide

Open **masterclass.html** and click **Start live voting**. No terminal is needed once your Cloudflare voting server has been deployed.

On first use, click **Import connection files**. In the copy of the project where your working deployment was configured, open **.live-questions** and select both **server.json** and **presenter-key** (hold Ctrl on Windows to select both). Importing reads these files locally. Click **Start a new session**. With **Remember on this browser** selected, future sessions start directly from the title button.

The key remains in this browser and is never included in the student QR, published HTML or GitHub repository. Treat the saved browser profile as a presenter device. Use **Voting settings** to replace or forget the saved connection, or end the active session. Starting a new session gives a new joining QR; refreshing the active presentation keeps its existing session.

The server address is your actual voting Worker, such as the URL shown after **Voting service configured**. The Hello World setup Worker is a separate starter app.

Slides also work directly from a downloaded HTML file. Browser storage belongs to that file/location: moving the deck, using a different browser or switching to the hosted URL may require importing the connection again.

The native MCQ poll fields are refreshed in the browser from each visible question panel, option text and `data-correct` answer rows. When editing a question in **masterclass.qmd**, edit those visible rows and explanations together. The old audited `data/questions.json` file is an archive of the original questions; do not run `sync_live_questions.py` over new edits unless you have deliberately updated that inventory.

## GitHub updates and automatic publication

See **GITHUB_SETUP.md** for the one-time setup. The included workflow renders the QMD after commits to **main**, checks the calculations and saves a downloadable HTML artifact. Once you configure the repository's Cloudflare secrets and existing Worker name, it also publishes the updated deck at **your existing voting server URL followed by /slides/**.

Open the hosted presentation and use its first-slide voting button. After the initial connection import on that browser/origin, no terminal is needed for presenting. Existing Cloudflare presenter secrets remain in Cloudflare across updates. Never put presenter keys in GitHub secrets or source files; the workflow does not need them.

Actual R Shiny widgets still require the local R companion. The hosted static deck retains the existing browser interactions; use the local Shiny launcher when you need the actual R widgets.

## Legacy local launcher and first deployment

Extract the whole project first. The presentation stays on your laptop. Students connect to a separate voting URL through their browser, with no app, account or Canvas login.

For a permanent voting URL, run this once from the extracted project folder:

```bash
python scripts/deploy_live_questions.py
```

The setup uses Cloudflare's own browser sign-in, deploys the included Worker and saves the address and presenter key locally. A Cloudflare account is required for this option. The service uses the same upstream Live Questions protocol and SQLite Durable Object implementation. It can use the Workers Free plan, subject to Cloudflare's limits. The script does not select or purchase a paid plan.

Then, on Windows, open **Start_Live_Questions.bat**. On macOS or Linux run:

```bash
python3 scripts/launch_live_questions.py
```

The launcher opens the local presentation with the correct server, session and presenter role. It creates a fresh room each time, so rehearsal answers do not appear in the event. Leave its terminal window open while presenting. Press Ctrl+C when finished.

The first launch can install a portable Node.js 22 runtime from nodejs.org if a suitable Node version is not already installed. It verifies the official download's SHA-256 checksum. Python 3.12+ is required. Windows users can use `py -3` in place of `python`.

### Temporary link without an account

If no permanent server has been configured, the launcher starts the bundled Node service locally and tries to create a temporary Cloudflare Tunnel. A portable cloudflared binary is downloaded from Cloudflare's official release if needed. Only the audience voting service goes through the tunnel. Your slide file, presenter key and Shiny server stay local.

Quick Tunnels are intended for testing and development. They have no uptime guarantee, a new hostname after each restart and a 200 in-flight request limit. That limit should not be treated as a guaranteed class-size allowance. Use the permanent Worker setup for the event, especially for a large audience. Details: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/.

The current build environment blocks the outbound network connection used by cloudflared. Public tunnel operation could not be verified here. Local browser voting, late joining, reconnects, QR decoding, 100 simultaneous voter connections and polling alongside Shiny were tested. The permanent Worker build and deployment setup are included, but no Worker was deployed to a user account in this session. Check the public joining link from a phone before the event.

### Controls

- **Space / right arrow:** reveal the explanations, close voting and show the A–D response distribution. The next press continues the presentation.
- **A:** equivalent answer reveal on an MCQ.
- **Q:** enlarge the joining QR on any slide. Escape or a click closes it.
- **Left arrow:** hide the explanations/results or return to the previous slide.
- **O:** overview. **F:** full screen.

A joining QR appears on the title and each MCQ. The smaller MCQ QR can be clicked to enlarge it. Students scan once; their phones follow the active question. Late arrivals join the current question. Between questions, they see the previous closed result until the next question opens.

Students can change an answer while voting is open. Refreshing the same browser retains its vote. Results stay hidden during voting. Revealing the answer closes voting and shows percentages, response count and percentage correct. Going back to a revealed question keeps it locked. The extension's Reset control is available through its native interface if a deliberate fresh poll is needed. An individual browser identity is used, rather than an authenticated person, so these are formative polls.

### Shiny and voting together

With R, shiny and ggplot2 installed, run:

```bash
python scripts/launch_live_questions.py --with-shiny
```

The launcher starts the local R Shiny companion as well as the polling connection. If Rscript is not found, pass its path with `--rscript PATH`. Alternatively, launch the companion yourself, then use `--shiny http://127.0.0.1:PORT`.

The Shiny presentation opens as a top-level page, allowing it to control the live polls. Its two R widgets remain embedded. No R server is needed on students' phones.

## Rehearse locally

This tests everything on one computer without Cloudflare:

```bash
python scripts/launch_live_questions.py --rehearsal
```

Open the printed voting URL in a separate browser or private window to act as a student. The rehearsal localhost QR works only on that computer. For a real phone, use a permanent server or temporary public link.

For a room with a specific name, add `--session data1x01-nov10`. Reusing a room preserves its results, so use a fresh name for rehearsal. To use another existing server, pass `--server https://YOUR-SERVER --key-file PATH`.

The `.live-questions` folder contains local keys, logs and session data. It is created on your computer and excluded from the distributed project. Keep it private. The public student QR never includes the presenter key. If the presentation tab is accidentally closed while the launcher is still running, reopen `.live-questions/open-presentation.html`.

## Present offline

Open **masterclass.html** directly. It is self-contained, including its fonts, images and local interactions. Without a voting-server configuration, the extra QR and response charts are hidden and no polling connection is attempted. The original option selection, answer reveals, sample-size controls and CI controls still work. Source, website and email links need an internet connection.

To use R Shiny without polling:

```r
install.packages(c("shiny", "ggplot2"))
source("launch_shiny.R")
```

The final slide links to https://bodhimcnally.com/ and Bodhi's university email. Its resource QR is separate from the voting QR.

## Edit and render

The extension requires **Quarto 1.9 or later**. The delivered version was rendered with Quarto 1.11.9 and Pandoc 3.10. Install the Python dependencies and R's ggplot2, then run from the project root:

```bash
python -m pip install -r requirements.txt
quarto render masterclass.qmd --to revealjs
```

The pre-render hooks regenerate the simulated data and all five ggplot2 figures. Install the bundled DejaVu fonts for matching plot typography.

Edit **masterclass.qmd**. The `.answer-reason` fragments retain index 0, so all four explanations appear together. Edit the visible question panels, option text, correct-answer flags and explanations together. The phone questions follow these visible rows automatically. Run `python scripts/validate_slide_questions.py` before rendering. The original `data/questions.json` inventory is retained as an archive. The source contains ordinary native `.poll` blocks, using the included Live Questions extension.

The prebuilt browser and server bundles are included. You do not need npm or TypeScript builds to present. To edit the extension/server implementation, see `live-questions/UPSTREAM.md` and run `npm install` then `npm run build` in the live-questions folder. Re-render the QMD after rebuilding the browser plugin.

To independently check the statistics and rebuild the guide:

```bash
python scripts/check_statistics.py
python scripts/build_teaching_guide.py
```

## Included files

| File/folder | Contents |
|---|---|
| masterclass.html / masterclass.qmd | Standalone presentation and editable source |
| Start_Live_Questions.bat / .command | Local session launcher |
| scripts/launch_live_questions.py | Server selection, temporary link, local presentation and optional Shiny |
| scripts/deploy_live_questions.py | One-time Cloudflare Worker deployment |
| _extensions/live-questions/ | Native Quarto filter, browser plugin and licences |
| live-questions/ | Node and Worker builds, audience page and editable upstream-derived source |
| live-questions-bridge.js | Same-slide answer/closing/results integration |
| launch_shiny.R / shiny/app.R | Existing actual R widgets |
| Teaching_Guide.pdf | MCQ reasoning, short-answer marks and delivery instructions |
| resources/ | Editable Notion-style error log and CSV template |
| data/, scripts/, figures/, assets/ | Reproducible course examples and verified assets |
| docs/live-questions-*.json | Actual integration, offline, load and QR checks, plus the public-network limitation |
| docs/Question_QA.md / Curriculum_Blueprint.md | Academic alignment, ten outcomes and 60-minute plan |

## Course alignment

The shared DATA1001/DATA1901 Semester 2 2026 core and current practice papers guide the original questions. The last academic revision reopened the current learning map, exam preparation, both practice sections, Topics 4 and 8 and selected challenges, supplementing the full written-source inventory. This change adds voting only and preserves the academic wording and existing source/outcome footnotes.

Recordings and separately linked interview transcripts remain outside the original review. Some quiz equation images were unavailable as text. No official detailed extended-answer marking scheme was linked. The short-answer allocations are suggested practice marks. SA3 addresses the reporting component of LO10, rather than the full teamwork and oral-presentation outcome.

The project contains original questions and simulated data. Restricted course PDFs, authentication material and browser research captures are not included. There is no appendix, references slide, presenter-note content or countdown.
