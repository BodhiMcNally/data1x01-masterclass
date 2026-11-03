# Completed checks

The 41-slide presentation contains 13 MCQs, three short-answer tasks and brief content reviews. Its final slide contains Bodhi's actual photo, website QR and email. There is no appendix, references slide, presenter-note content or countdown. Each teaching slide has a visible module/topic and learning-outcome footnote. Literature citations sit on the relevant learning-advice slides.

The question audit connects every stem and distractor to the current course. This revision reopened Canvas after sign-in: the learning map, exam-preparation page, current MCQ and extended-answer samples, Topics 4 and 8 and selected challenges. All ten user-supplied outcome numbers also match the official S2 2026 DATA1001 outline. The blueprint retains the initial written review's coverage and limits. No unpublished final examination was used.

Five questions add privacy/data linkage, measurement error, Binomial code, bootstrap resampling and goodness of fit. Each question has one best answer. Required arithmetic is exact and manageable without a calculator, or R output is supplied. Short answers allocate 4, 4 and 5 marks through separate one-mark criteria. These are suggested practice marks, with equivalent correct reasoning allowed.

Actual R checks execute the Normal options, affine summaries, old/new paired tests, regression, chi-squared independence, measurement SE, Binomial options, bootstrap code, goodness of fit and the SA3 ggplot. All five static figures come from ggplot2. The independent Python checker passes 31 numerical checks plus table-count, ID and score-bound checks. Results are included as text and JSON.

Chrome Headless 130.0.6723.58 opens the complete HTML in offline mode, inspects all 41 slides and captures every question and revealed state. All 13 MCQs begin with no visible explanations. Selecting an option then pressing Space reveals all four reasons on the same slide. Left arrow hides them again. Exactly one answer is marked correct on each question. Correct/incorrect words accompany colour.

The layout check includes text, code, mathematics, tables, images, buttons, SVG and clearance above source footnotes. The completed pass has no overflowing elements, footer collisions, broken or zero-sized images, JavaScript errors or external resource requests. A separate copy of the HTML is opened in an otherwise empty folder, offline, to confirm that its 11 embedded images and local fonts work. Website and email links target Bodhi's correct addresses. There are no raw unrendered mathematics spans.

The offline sample-size controls produce SE 0.12 and 0.06 for n=100 and 400. The CI controls correctly distinguish retaining a null of 0 from rejecting 1.25 and keep the confidence interval fixed. The actual R Shiny app is separately exercised over HTTP and WebSocket: both iframes connect, replace their local fallback controls, react to inputs and produce the expected R outputs. Their viewport and plot-image bounds are checked. The app runs on localhost only. It is included in the complete project, rather than pretending that static HTML runs R.

Every slide's final state is visually reviewed. The seven-page answer guide is rendered to page images and inspected. The Notion-style error log is an original labelled mockup, with an editable HTML and CSV template. The user-supplied facetious quotation retains its wording and typo, with no invented attribution.

The archive is checked for required source, HTML, data, figures, assets, Shiny code, guide and documentation. Restricted course text, browser research captures, authentication material, tool binaries, caches and temporary files are excluded. The 60-minute plan is a desk rehearsal, not a completed classroom timing trial.


## Live voting checks

The same 41 slides now contain 13 native Live Questions polls with an adapter to the existing answer fragments. A source comparison confirms that all academic wording, options, answers and explanations are unchanged. Live browser tests verify answer changes, same-browser vote persistence, results hidden while voting, the expected 0/33/67/0 percent distribution, answer locking, the native A shortcut, a late arrival at Q2, navigation back to a locked question and reconnection without losing results. A reveal made during a disconnection is synchronised and locked after reconnection.

All 13 response headers fit beside their headings, with no body/footer collisions. The joining QR decodes to the correct audience session URL and contains no presenter key. A separate test creates 100 simultaneous audience WebSocket connections and obtains exactly 25 votes for each option. A viewer cannot control questions, closed votes are rejected and the raw export requires the presenter key.

The Shiny companion now opens the deck as a top-level page, so it can be the polling presenter while both R widgets remain embedded. Combined polling/Shiny browser tests pass. The unconfigured standalone HTML still opens in an empty folder offline, hides the extra polling controls, has 41 slides, intact fonts/images and no external requests or JavaScript errors.

Cloudflare Tunnel cannot establish its outbound network connection from this build environment. A public tunnel and a user-owned Worker deployment have not been verified. The package includes the actual upstream-derived Worker build and deployment script, a local Node backend and a temporary-link launcher. The public network limitation is recorded explicitly in live-questions-connectivity.json and README.md.
