# GitHub and first-slide voting

The updated deck has a **Start live voting** button. Your existing Cloudflare voting server can be used immediately, without another deployment.

## Start using the new button now

1. Keep the old working project folder. It contains your private `.live-questions` connection files.
2. Extract this updated project into a new folder and open `masterclass.html`.
3. On the first slide, click **Start live voting**, then **Import connection files**.
4. Browse to `.live-questions` inside the old working project. Hold Ctrl and select both `server.json` and `presenter-key`. You can also import them separately.
5. Leave **Remember on this browser** checked, then click **Start a new session**.
6. The deck checks that the server accepts the key, reloads into a fresh session and displays the student QR. Future starts on this browser/location use the saved connection directly.

The server address and presenter key can also be entered in the local setup dialog. Never send your key in chat or commit it to GitHub. The key is sent only to the selected voting server over its WebSocket connection. A saved connection belongs to the current browser and origin/file location; import it again after switching devices, browsers or from a local file to the hosted URL.

## Put the source in GitHub

Use a private repository initially. If GitHub has been connected in ChatGPT, the prepared files can be pushed through that connection. Otherwise GitHub Desktop provides a graphical workflow:

1. Install GitHub Desktop from https://desktop.github.com/ and sign in.
2. Use **File > Add local repository** and choose this extracted `data1x01-masterclass` folder.
3. If Desktop says it is not a repository, use its option to create a repository there. Keep the root at the folder containing `masterclass.qmd`, `.gitignore` and `.github`.
4. Review the files. `.live-questions`, `.wrangler`, `.env` and dependency/cache directories are excluded by `.gitignore`.
5. Commit the prepared project, then **Publish repository**. Keep **Keep this code private** selected.

Do not upload the old project folder through the GitHub website: web uploads do not apply your local `.gitignore` rules to selected private files. Use the prepared clean source or GitHub Desktop.

## One-time automatic Cloudflare deployment

The source contains `.github/workflows/presentation.yml`. Pushes to `main` install Python, R, ggplot2 and Quarto, regenerate the teaching figures, validate the question rows, render the HTML and check the numerical examples. Pull requests run these checks without publishing. Each successful build also saves the rendered HTML as a downloadable GitHub Actions artifact.

To enable publication to your existing server:

1. In Cloudflare **Workers & Pages**, find the actual voting Worker. Use the one created by `deploy_live_questions.py`, rather than the `data1001-setup` starter. Your earlier deployment used a name such as `data1x01-questions-aa3809`; confirm the actual name in your account.
2. Note the account ID shown in your Cloudflare dashboard.
3. In Cloudflare's **Account API tokens** settings, select **Create Token**, then the **Edit Cloudflare Workers** permission template. Give the token a clear name such as `data1x01-github-deploy`, scope it to the account containing this Worker and review its permissions before creating it. If your organisation imposes additional policy, use its approved Workers deployment token. Do not use a global API key.
4. In GitHub, open the repository **Settings > Secrets and variables > Actions > Secrets**. Add repository secrets:
   - `CLOUDFLARE_API_TOKEN`: the deployment token.
   - `CLOUDFLARE_ACCOUNT_ID`: the account ID.
5. In the adjacent **Variables** tab, add repository variable `CLOUDFLARE_WORKER_NAME` with your exact existing voting Worker name.
6. Open **Actions > Render and publish presentation > Run workflow**, choosing `main`. The workflow publishes only after the render and checks pass.
7. When it succeeds, open your voting Worker's existing HTTPS URL followed by `/slides/`. That is the hosted presentation. Its first-slide setup defaults to that same voting server address. Import the presenter-key file once on this hosted origin.

The workflow's explicit `--name` selects your existing Worker, even though the generic bundled Wrangler configuration has a template name. The deployment retains the existing Durable Object namespace and existing Cloudflare `PRESENTER_KEY` secret. GitHub does not need the presenter key. This workflow publishes the prepared backend bundle and the rendered deck; changes to backend TypeScript require rebuilding its bundles first using `live-questions/UPSTREAM.md`.

Do not also enable Cloudflare's separate Git-triggered build for the same Worker while using this workflow. Use one deployment pipeline to avoid two builds racing to update the same service.

## Everyday edits

1. Edit `masterclass.qmd` in RStudio, VS Code or GitHub's editor.
2. For MCQs, edit the visible question panel, `.option-text` rows and explanations. Set exactly one `data-correct="true"`. These visible rows are synchronised into native phone polls in the rendered browser, so a changed answer does not require editing a separate question bank.
3. When adding a question, copy a complete MCQ section and give it unique slide and `vote-` IDs. The validation step checks the visible options and correct-answer flag.
4. Commit and push to `main` (GitHub Desktop: **Commit**, then **Push origin**).
5. Wait for the GitHub Action to finish successfully, then refresh `/slides/` before starting a new voting session.
6. Download the workflow's HTML artifact as an offline backup if desired. The first-slide button also works in the downloaded HTML, with a one-time connection import for that file/location.

The original data inventory and statistical checks describe the existing numerical examples. If you change those examples, update their generating data/analysis and checks too. A failed workflow leaves the previous successful deployment in place. Avoid updating the live deck during an active class session.

## R Shiny

The hosted deck has its existing browser interactions. Actual R Shiny execution still needs R and the local companion. Use `Start_Live_Questions` or the documented Shiny launcher for those two actual R widgets; a static hosted HTML page cannot start an R process on your laptop. Normal MCQ voting needs neither Python nor R once the server is deployed.

## Verification limits

The title controls, saved connection, native WebSocket voting, edited phone questions, offline deck and publication staging are checked locally. The GitHub-hosted workflow and production redeployment require the repository connection and your own deployment credentials; the prepared workflow is not itself evidence of a successful GitHub run.

Official references:
- https://quarto.org/docs/publishing/ci.html
- https://developers.cloudflare.com/workers/ci-cd/
- https://developers.cloudflare.com/workers/wrangler/commands/workers/
