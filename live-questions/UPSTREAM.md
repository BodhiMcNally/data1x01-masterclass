# Live Questions provenance and course integration

The extension and both server implementations derive from Sean Davis's Live Questions for Quarto revealjs, version 1.2.0, tag commit c45a0dde2ccb556943a46a36126a7608d0c0750e:
https://github.com/seandavi/quarto-revealjs-live-questions/tree/v1.2.0

The MIT licence is retained in LICENSE. The bundled QR generator's notice is retained in _extensions/live-questions/THIRD_PARTY_NOTICES.md. Runtime dependencies are Hono, @hono/node-server, ws and qrcode-generator. Their original licence banners remain in the generated builds.

Local changes:

- Accept a validated lq-server query parameter so one self-contained deck can run offline or connect to a session server without re-rendering.
- Connect the existing answer fragments to the native reveal/close action. A also reveals the course explanations, and Q opens the joining QR.
- Hide the chart when the presenter hides the answer fragments.
- Resynchronise a locally revealed answer after a network reconnect.
- Retain the lock on an already revealed question when navigating back. Resetting the question is required before collecting fresh responses.
- Use actual percentage widths for the bars.
- Bind the local Node service to 127.0.0.1. Only the audience service is exposed by an optional tunnel. The local slide file, presenter key and R server are not exposed by that tunnel.

The original question prompts, answer options, data, mathematical content and explanations in the presentation are unchanged. Poll options are generated from the audited data/questions.json inventory by scripts/sync_live_questions.py. This source inventory must be kept consistent when editing the question text.

The prebuilt browser, Node and Worker bundles are supplied. Running a session does not require rebuilding TypeScript or installing npm packages. Editing/rebuilding the component requires Node 22+ and esbuild; see build.mjs and package.json. Quarto 1.9+ is required to re-render with the extension. The delivered HTML was rendered with Quarto 1.11.9.

## Presenter button update

The controller dispatches `data1001:before-questions` before it reads the native poll data. The presentation header script listens for this event to derive phone prompts, options and correct answers from the visible question panels and answer rows. This keeps browser polling aligned with QMD edits. The separate first-slide controls import local connection files and check presenter authentication using the existing protocol; no server protocol change is required.
