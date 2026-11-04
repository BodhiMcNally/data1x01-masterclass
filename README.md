# DATA1x01 Revision Masterclass

An interactive revision presentation for DATA1001 and DATA1901 at the University of Sydney, built with Quarto, Reveal.js and Cloudflare Workers.

I developed this session around a single data story, using 13 multiple-choice questions and three short-answer tasks to connect study design, probability, sampling, regression and hypothesis testing. Worked answers explain both the correct reasoning and the common mistakes behind the distractors.

[Open the presentation](https://data1x01-questions-aa3809.bodhi-mcnally.workers.dev/slides/) · [Session feedback](https://sydney.au1.qualtrics.com/jfe/form/SV_5uoi6W5wJ0Tg9ym)

## Live participation

Students join once through a QR code and participate from their own browser. No app or student account is required for voting.

- **Opening word cloud:** a brief check-in on how students feel about the exam.
- **Live MCQs:** phones follow the active question, with answers editable until voting closes.
- **Confidence ratings:** students select Guessing, Unsure or Confident after voting. The presentation reveals the class distribution as percentages alongside the answer results.
- **Worked explanations:** revealing an answer closes voting and highlights the reasoning behind each option.
- **Revision receipts:** students receive their own priorities from incorrect or low-confidence answers, with Canvas topic links and relevant learning outcomes. Receipts can be downloaded or opened in a personal email app. Email addresses are not collected by the voting service.
- **Session feedback:** a QR code links to a separate, voluntary Qualtrics survey with anonymised responses enabled.

The presentation also includes interactive demonstrations, short-answer marking criteria and an example revision error log. A full-screen control is available throughout the deck; the standard Reveal.js keyboard shortcuts are retained.

## Architecture and publishing

The presentation and audience voting page are hosted together on a Cloudflare Worker. A Durable Object maintains each session's questions, responses and confidence ratings, while WebSockets synchronise the presenter and audience browsers.

Pushes to `main` run the GitHub Actions workflow in `.github/workflows/presentation.yml`:

1. Build the browser and server bundles and run the voting checks.
2. Generate the revision mappings, statistical examples and ggplot2 figures.
3. Render the Quarto presentation and validate the questions and calculations.
4. Save a downloadable HTML artifact and publish to Cloudflare after all checks pass.

Pull requests run the build and validation steps without publishing. Presenter credentials are kept outside the repository. The workflow uses `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets, with the existing Worker selected by the `CLOUDFLARE_WORKER_NAME` repository variable.

## Repository layout

| Path | Purpose |
|---|---|
| `masterclass.qmd` | Presentation content, questions and worked answers |
| `styles.css` | Slide typography and layout |
| `_extensions/masterclass/live-questions/` | Quarto filter and Reveal.js voting plugin |
| `live-questions/src/` | Audience interface, voting protocol and server implementation |
| `live-questions/public/` | Audience pages and feedback redirect |
| `data/`, `figures/`, `scripts/` | Reproducible examples, figures and validation |
| `resources/` | Error-log example, editable template and survey import file |
| `.github/workflows/presentation.yml` | Build, validation and deployment workflow |

## Local development

Open `data1x01-masterclass.Rproj` in RStudio and edit `masterclass.qmd`. Rendering requires Quarto 1.9 or later, Python and R with `ggplot2` installed.

```sh
python -m pip install -r requirements.txt
quarto render masterclass.qmd --to revealjs
```

To rebuild the voting implementation, use Node.js 22 or later:

```sh
cd live-questions
npm ci
npm run build
node scripts/check-learning-features.mjs
```

The rendered HTML is self-contained and supports offline presentation. Live voting requires a connection to the deployed voting service. The optional R Shiny companion runs locally and is separate from the hosted presentation.

Students can return to their revision receipt using the same browser and session, or retain a downloaded copy. Canvas resources require a University login. These formative results support revision planning; they are not an exam score prediction.

## Context and attribution

This is an independent student society revision resource, not an official University assessment or an endorsed course publication. Questions use simulated data and original practice examples.

Live voting builds on Sean Davis's MIT-licensed Live Questions extension. Third-party licences and attribution are retained in `THIRD_PARTY_NOTICES.txt`, `live-questions/UPSTREAM.md` and the extension directory.

**Bodhi McNally** · [bodhimcnally.com](https://bodhimcnally.com/)
