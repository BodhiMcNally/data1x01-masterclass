(() => {
  // output/data1x01-masterclass/live-questions/src/shared/protocol.ts
  var PROTOCOL_VERSION = 1;
  var LIMITS = {
    /** Session names: also the Durable Object name and part of the audience URL. */
    sessionPattern: /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/,
    /** Question ids: the fenced div's id, or a generated one. */
    questionIdPattern: /^[A-Za-z0-9][A-Za-z0-9_:.-]{0,63}$/,
    promptChars: 500,
    pollOptions: 26,
    optionChars: 200,
    /** Raw answer text accepted from a phone, before normalization. */
    answerInputChars: 200,
    /** A normalized word-cloud entry is cut to this many characters. */
    answerChars: 40,
    maxWordsCeiling: 10,
    maxAnswersCeiling: 10,
    /** Word-cloud entries included in broadcast results (most frequent first). */
    cloudWords: 100,
    /** Statements in one likert question. */
    likertStatements: 6,
    likertStatementChars: 200,
    /** Points on a likert scale: at least 2, at most this many. */
    likertPoints: 11,
    /** One scale label, and one numeric-scale anchor. */
    likertLabelChars: 40
  };
  var socketPath = (session) => `/api/s/${encodeURIComponent(session)}/ws`;

  // output/data1x01-masterclass/live-questions/src/shared/normalize.ts
  var EDGE_CHARS = `.,;:!?"'()[]{}\u2026\u201C\u201D\u2018\u2019\u201E\u201A\xAB\xBB\u2039\u203A`;
  var EDGE = new RegExp(
    `^[\\s${escapeClass(EDGE_CHARS)}]+|[\\s${escapeClass(EDGE_CHARS)}]+$`,
    "gu"
  );
  var INVISIBLE = /[\p{Cc}​‌⁠﻿]/gu;
  var WHITESPACE = /\s+/gu;
  function escapeClass(chars) {
    return chars.replace(/[\\\]\[^-]/g, "\\$&");
  }
  function strip(text) {
    return text.replace(INVISIBLE, "").replace(WHITESPACE, " ").replace(EDGE, "");
  }
  function normalizeAnswer(raw, maxWords) {
    let text = strip(raw.normalize("NFKC").replace(WHITESPACE, " "));
    if (!text) return null;
    text = text.split(" ").slice(0, Math.max(1, maxWords)).join(" ");
    const chars = Array.from(text);
    if (chars.length > LIMITS.answerChars) text = chars.slice(0, LIMITS.answerChars).join("");
    text = strip(text);
    if (!text) return null;
    return { text, key: text.toLowerCase() };
  }

  // output/data1x01-masterclass/live-questions/src/audience/vote.ts
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === void 0 || v === false) continue;
      if (k === "class") el.className = String(v);
      else el.setAttribute(k, v === true ? "" : String(v));
    }
    for (const c of children) {
      if (c === null || c === void 0 || c === false) continue;
      el.append(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  }
  var letter = (i) => String.fromCharCode(65 + i);
  var plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  var pct = (n, total) => total > 0 ? Math.round(100 * n / total) : 0;
  function tones(n) {
    const steps = { 1: [3], 2: [2, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5] };
    const arm = Math.floor(n / 2);
    const arms = steps[arm] ?? steps[5];
    return Array.from({ length: n }, (_, i) => {
      if (n % 2 === 1 && i === arm) return { side: "mid", step: 0 };
      const away = i < arm ? arm - i : i - (n - arm) + 1;
      return { side: i < arm ? "neg" : "pos", step: arms[away - 1] };
    });
  }
  var statementShown = (q) => !(q.statements.length === 1 && q.statements[0] === q.prompt);
  function storage() {
    try {
      const s = window.localStorage;
      s.setItem("lq:test", "1");
      s.removeItem("lq:test");
      return s;
    } catch {
      return null;
    }
  }
  function randomId() {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  }
  function voterId() {
    const s = storage();
    const existing = s?.getItem("lq:voter");
    if (existing && /^[\x21-\x7e]{1,64}$/.test(existing)) return existing;
    const id = randomId();
    s?.setItem("lq:voter", id);
    return id;
  }
  function initJoin(form) {
    const input = form.querySelector("#join-session");
    const error = form.querySelector("#join-error");
    const fromQuery = new URLSearchParams(location.search).get("session");
    if (fromQuery) input.value = fromQuery;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = input.value.trim();
      if (!LIMITS.sessionPattern.test(name)) {
        error.textContent = name ? "Session names use letters, numbers, - and _ only. Check the name on the slide." : "Type the session name shown on the slide.";
        input.setAttribute("aria-invalid", "true");
        input.focus();
        return;
      }
      location.assign(`/s/${encodeURIComponent(name)}`);
    });
    input.addEventListener("input", () => {
      error.textContent = "";
      input.removeAttribute("aria-invalid");
    });
  }
  var VotePage = class {
    constructor(session) {
      this.session = session;
      const label = document.getElementById("session");
      label.textContent = session;
      document.title = `${session} \xB7 Live Questions`;
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && this.conn === "offline") this.connectNow();
      });
      window.addEventListener("online", () => this.conn === "offline" && this.connectNow());
      this.connect();
    }
    ws = null;
    conn = "connecting";
    retry = 0;
    retryTimer;
    heartbeat;
    state = null;
    mine = { votes: {}, answers: {}, ratings: {} };
    /** Optimistic poll choice while the server confirms it. */
    pendingVote = null;
    /** Optimistic likert ratings while the server confirms them: "id statement" → choice. */
    pendingRatings = /* @__PURE__ */ new Map();
    /** Identity of the view currently in the DOM; rebuilt only when it changes. */
    viewKey = "";
    toastTimer;
    voter = voterId();
    main = document.getElementById("main");
    connEl = document.getElementById("conn");
    toastEl = document.getElementById("toast");
    // -------------------------------------------------------------- socket
    connect() {
      clearTimeout(this.retryTimer);
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${location.host}${socketPath(this.session)}`);
      this.ws = ws;
      ws.addEventListener("open", () => {
        this.send({ t: "hello", v: PROTOCOL_VERSION, role: "audience", voter: this.voter });
      });
      ws.addEventListener("message", (e) => {
        if (typeof e.data !== "string") return;
        let msg;
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }
        this.onMessage(msg);
      });
      ws.addEventListener("close", (e) => {
        if (this.ws !== ws) return;
        this.ws = null;
        clearInterval(this.heartbeat);
        if (this.conn === "outdated" || e.code === 4e3) return this.setConn("outdated");
        this.setConn("offline");
        const delay = Math.min(15e3, 500 * 2 ** this.retry) * (0.75 + Math.random() * 0.5);
        this.retry = Math.min(this.retry + 1, 6);
        this.retryTimer = window.setTimeout(() => this.connect(), delay);
      });
    }
    connectNow() {
      if (this.ws) return;
      this.retry = 0;
      this.connect();
    }
    send(msg) {
      if (this.ws?.readyState !== WebSocket.OPEN) return false;
      this.ws.send(JSON.stringify(msg));
      return true;
    }
    onMessage(msg) {
      switch (msg.t) {
        case "welcome":
          this.retry = 0;
          this.setConn("live");
          clearInterval(this.heartbeat);
          this.heartbeat = window.setInterval(() => this.ws?.send('{"t":"ping"}'), 25e3);
          return;
        case "audience":
          this.state = msg.state;
          if (this.pendingVote && this.pendingVote.id !== msg.state.live?.question.id) this.pendingVote = null;
          if (msg.state.live?.status !== "open") this.pendingRatings.clear();
          return this.render();
        case "you":
          this.mine = { ...msg.mine, ratings: msg.mine.ratings ?? {} };
          if (this.pendingVote && this.mine.votes[this.pendingVote.id] === this.pendingVote.choice) {
            this.pendingVote = null;
          }
          for (const [key, choice] of this.pendingRatings) {
            const [id = "", statement] = key.split(" ");
            if (this.mine.ratings[id]?.[Number(statement)] === choice) this.pendingRatings.delete(key);
          }
          return this.render();
        case "error":
          return this.onError(msg.code, msg.message);
        case "deck":
        case "pong":
          return;
      }
    }
    onError(code, message) {
      this.pendingVote = null;
      this.pendingRatings.clear();
      switch (code) {
        case "closed":
          this.toast("Voting has closed for this question.");
          break;
        case "limit":
          this.toast(/answers/.test(message) ? "You've used all your answers for this question." : "Slow down a little, then try again.");
          break;
        case "version":
          this.setConn("outdated");
          break;
        case "bad-message":
          this.toast(/empty/.test(message) ? "Type a word or two first." : "That didn't go through. Try again.");
          break;
        default:
          this.toast("That didn't go through. Try again.");
      }
      this.render();
    }
    setConn(conn) {
      this.conn = conn;
      this.connEl.dataset.state = conn;
      const text = this.connEl.querySelector(".conn-text");
      text.textContent = { connecting: "Connecting", live: "Live", offline: "Reconnecting", outdated: "Reload needed" }[conn];
      document.body.classList.toggle("is-offline", conn === "offline" || conn === "outdated");
      if (conn === "outdated") {
        this.viewKey = "outdated";
        this.main.replaceChildren(
          h(
            "section",
            { class: "view view-center" },
            h("h1", { class: "prompt" }, "This page is out of date"),
            h("p", { class: "hint" }, "The poll server was updated. Reload to keep voting."),
            h("button", { class: "send wide", type: "button", id: "reload" }, "Reload page")
          )
        );
        document.getElementById("reload").addEventListener("click", () => location.reload());
        return;
      }
      if (conn === "live" && !this.state) return;
      this.render();
    }
    toast(text) {
      this.toastEl.textContent = text;
      this.toastEl.classList.add("show");
      clearTimeout(this.toastTimer);
      this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove("show"), 3200);
    }
    // -------------------------------------------------------------- rendering
    render() {
      if (this.conn === "outdated") return;
      const live = this.state?.live ?? null;
      if (!this.state) return;
      let key;
      if (!live) key = "waiting";
      else if (live.status === "open") key = `open|${JSON.stringify(live.question)}`;
      else {
        const id = live.question.id;
        key = `closed|${JSON.stringify([live, this.mine.votes[id], this.mine.answers[id], this.mine.ratings[id]])}`;
      }
      const rebuild = key !== this.viewKey;
      this.viewKey = key;
      this.main.classList.toggle("is-disabled", this.conn !== "live");
      if (!live) {
        if (rebuild) this.main.replaceChildren(this.waitingView());
        return;
      }
      if (live.status === "open" && live.question.type === "poll") {
        if (rebuild) this.main.replaceChildren(this.pollView(live.question.id, live.question.prompt, live.question.options));
        this.updatePoll(live.question.id);
      } else if (live.status === "open" && live.question.type === "wordcloud") {
        if (rebuild) this.main.replaceChildren(this.cloudView(live.question));
        this.updateCloud(live.question.id, live.question.maxAnswers);
      } else if (live.status === "open" && live.question.type === "likert") {
        if (rebuild) this.main.replaceChildren(this.likertView(live.question));
        this.updateLikert(live.question);
      } else if (rebuild) {
        this.main.replaceChildren(this.resultsView(live));
      }
      if (rebuild) this.main.focus({ preventScroll: true });
    }
    header(prompt, status, note) {
      return h(
        "header",
        { class: "q-head" },
        h("p", { class: `q-status ${status}` }, status === "open" ? "Voting open" : "Voting closed"),
        h("h1", { class: "prompt" }, prompt || "Untitled question"),
        h("p", { class: "hint" }, note)
      );
    }
    waitingView() {
      return h(
        "section",
        { class: "view view-center" },
        h("div", { class: "pulse", "aria-hidden": "true" }),
        h("h1", { class: "lead" }, "Waiting for the next question"),
        h("p", { class: "hint" }, "Keep this page open. It changes on its own when your presenter asks something.")
      );
    }
    // ---- poll
    pollView(id, prompt, options) {
      const list = h("div", { class: "options", role: "radiogroup", "aria-label": prompt || "Options" });
      options.forEach((label, i) => {
        const btn = h(
          "button",
          { class: "option", type: "button", role: "radio", "aria-checked": "false", "data-choice": i },
          h("span", { class: "opt-letter", "aria-hidden": "true" }, letter(i)),
          h("span", { class: "opt-label" }, h("span", { class: "mark" }, label)),
          h("span", { class: "opt-tag" }, "Your vote")
        );
        btn.addEventListener("click", () => this.vote(id, i));
        list.append(btn);
      });
      list.addEventListener("keydown", (e) => {
        const buttons = [...list.querySelectorAll(".option")];
        const at = buttons.indexOf(document.activeElement);
        if (at < 0) return;
        const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        buttons[(at + step + buttons.length) % buttons.length].focus();
      });
      return h(
        "section",
        { class: "view" },
        this.header(prompt, "open", "Tap one. You can change your vote until voting closes."),
        list,
        h("p", { class: "saved", id: "saved", "aria-live": "polite" })
      );
    }
    vote(id, choice) {
      if (this.mine.votes[id] === choice && !this.pendingVote) return;
      if (!this.send({ t: "vote", id, choice })) {
        this.toast("You're offline. Tap again once you're reconnected.");
        return;
      }
      this.pendingVote = { id, choice };
      this.updatePoll(id);
    }
    updatePoll(id) {
      const confirmed = this.mine.votes[id];
      const shown = this.pendingVote?.id === id ? this.pendingVote.choice : confirmed;
      const multiple = this.main.querySelectorAll(".option");
      let tabbable = false;
      multiple.forEach((btn) => {
        const i = Number(btn.dataset.choice);
        const on = i === shown;
        btn.setAttribute("aria-checked", String(on));
        btn.classList.toggle("selected", on);
        btn.classList.toggle("pending", on && this.pendingVote !== null);
        btn.tabIndex = on || shown === void 0 && i === 0 ? 0 : -1;
        tabbable ||= on;
      });
      if (!tabbable && multiple[0]) multiple[0].tabIndex = 0;
      const saved = this.main.querySelector("#saved");
      if (saved) {
        saved.textContent = this.pendingVote?.id === id ? "Sending\u2026" : confirmed !== void 0 ? `Vote saved: ${letter(confirmed)}` : "";
      }
    }
    // ---- word cloud
    cloudView(q) {
      const input = h("input", {
        class: "text-input",
        id: "answer",
        type: "text",
        autocomplete: "off",
        autocapitalize: "sentences",
        enterkeyhint: "send",
        maxlength: LIMITS.answerInputChars,
        placeholder: q.maxWords === 1 ? "One word" : `Up to ${q.maxWords} words`,
        "aria-describedby": "remaining"
      });
      const button = h("button", { class: "send", type: "submit" }, "Send");
      const form = h(
        "form",
        { class: "answer-form", novalidate: true },
        h("label", { class: "field-label visually-hidden", for: "answer" }, "Your answer"),
        h("div", { class: "answer-row" }, input, button),
        h("p", { class: "remaining", id: "remaining", "aria-live": "polite" })
      );
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.answer(q.id, q.maxWords, q.maxAnswers, input);
      });
      const words = q.maxWords === 1 ? "one word" : `up to ${q.maxWords} words`;
      return h(
        "section",
        { class: "view" },
        this.header(
          q.prompt,
          "open",
          q.maxAnswers === 1 ? `Answer in ${words}.` : `Answer in ${words}. You can send ${q.maxAnswers} different answers.`
        ),
        form,
        h("div", { class: "chips-wrap" }, h("h2", { class: "sub", id: "chips-title" }, "Your answers"), h("ul", { class: "chips", id: "chips", "aria-labelledby": "chips-title" }))
      );
    }
    answer(id, maxWords, maxAnswers, input) {
      const n = normalizeAnswer(input.value, maxWords);
      if (!n) {
        this.toast("Type a word or two first.");
        input.focus();
        return;
      }
      const words = normalizeAnswer(input.value, Number.MAX_SAFE_INTEGER)?.text.split(" ").length ?? 0;
      if (words > maxWords) {
        this.toast(maxWords === 1 ? "Just one word, please." : `Keep it to ${maxWords} words, please.`);
        input.select();
        return;
      }
      const sent = this.mine.answers[id] ?? [];
      if (sent.some((a) => a.toLowerCase() === n.key)) {
        this.toast("You already sent that one.");
        input.select();
        return;
      }
      if (sent.length >= maxAnswers) {
        this.toast("You've used all your answers for this question.");
        return;
      }
      if (!this.send({ t: "answer", id, text: input.value })) {
        this.toast("You're offline. Send again once you're reconnected.");
        return;
      }
      input.value = "";
      input.focus();
    }
    updateCloud(id, maxAnswers) {
      const sent = this.mine.answers[id] ?? [];
      const chips = this.main.querySelector("#chips");
      if (chips) {
        const before = chips.children.length;
        chips.replaceChildren(...sent.map((a, i) => h("li", { class: i >= before ? "chip new" : "chip" }, a)));
        chips.parentElement.hidden = sent.length === 0;
      }
      const left = maxAnswers - sent.length;
      const remaining = this.main.querySelector("#remaining");
      if (remaining) {
        remaining.textContent = left > 0 ? sent.length ? `${plural(left, "answer")} left.` : "" : "That's all your answers. Watch the screen.";
      }
      const input = this.main.querySelector("#answer");
      const button = this.main.querySelector(".answer-form .send");
      if (input) input.disabled = left <= 0;
      if (button) button.disabled = left <= 0;
    }
    // ---- likert
    /** Words under a scale: both ends, and the neutral middle of an odd labeled scale. */
    scaleEnds(q) {
      const n = q.labels.length;
      const first = q.labels[0];
      const last = q.labels[n - 1];
      if (q.numeric) {
        const [low, high] = q.anchors ?? ["", ""];
        return h(
          "div",
          { class: "lk-ends", "aria-hidden": "true" },
          h("span", {}, h("b", {}, first), ` = ${low || "lowest"}`),
          h("span", {}, h("b", {}, last), ` = ${high || "highest"}`)
        );
      }
      return h(
        "div",
        { class: "lk-ends", "aria-hidden": "true" },
        h("span", {}, first),
        n % 2 === 1 && n > 2 ? h("span", { class: "lk-mid" }, q.labels[(n - 1) / 2]) : null,
        h("span", {}, last)
      );
    }
    likertView(q) {
      const n = q.labels.length;
      const palette = tones(n);
      const list = h("ol", { class: "lk-list" });
      q.statements.forEach((statement, s) => {
        const titleId = `lk-s${s}`;
        const scale = h("div", {
          class: `lk-scale${q.numeric ? " numeric" : ""}${n > 7 ? " wrap" : ""}`,
          role: "radiogroup",
          "aria-labelledby": statementShown(q) ? titleId : void 0,
          "aria-label": statementShown(q) ? void 0 : q.prompt || "Rating"
        });
        scale.style.setProperty("--n", String(n));
        scale.style.setProperty("--half", String(Math.ceil(n / 2)));
        q.labels.forEach((label, p) => {
          const btn = h(
            "button",
            {
              class: "lk-btn",
              type: "button",
              role: "radio",
              "aria-checked": "false",
              "aria-label": label,
              "data-statement": s,
              "data-choice": p,
              "data-side": q.numeric ? void 0 : palette[p].side,
              "data-step": q.numeric ? void 0 : palette[p].step
            },
            q.numeric ? label : h("span", { class: "lk-dot", "aria-hidden": "true" })
          );
          btn.addEventListener("click", () => this.rate(q, s, p));
          scale.append(btn);
        });
        scale.addEventListener("keydown", (e) => {
          const buttons = [...scale.querySelectorAll(".lk-btn")];
          const at = buttons.indexOf(document.activeElement);
          const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
          if (at < 0 || !step) return;
          e.preventDefault();
          buttons[Math.min(buttons.length - 1, Math.max(0, at + step))].focus();
        });
        list.append(
          h(
            "li",
            { class: "lk-item", "data-statement": s },
            // A lone statement that is the prompt shows its choice in the line below instead.
            statementShown(q) ? h(
              "div",
              { class: "lk-top" },
              h("p", { class: "lk-statement", id: titleId }, statement),
              h("span", { class: "lk-picked", "aria-live": "polite" })
            ) : null,
            scale,
            this.scaleEnds(q)
          )
        );
      });
      const many = q.statements.length > 1;
      return h(
        "section",
        { class: "view" },
        this.header(
          q.prompt,
          "open",
          many ? "Rate each statement. You can change a rating until voting closes." : "Tap one. You can change it until voting closes."
        ),
        list,
        h("p", { class: "saved", id: "saved", "aria-live": "polite" })
      );
    }
    rate(q, statement, choice) {
      const key = `${q.id} ${statement}`;
      const shown = this.pendingRatings.get(key) ?? this.mine.ratings[q.id]?.[statement];
      if (shown === choice) return;
      if (!this.send({ t: "rate", id: q.id, statement, choice })) {
        this.toast("You're offline. Tap again once you're reconnected.");
        return;
      }
      this.pendingRatings.set(key, choice);
      this.updateLikert(q);
    }
    updateLikert(q) {
      const confirmed = this.mine.ratings[q.id] ?? [];
      let rated = 0;
      this.main.querySelectorAll(".lk-item").forEach((item) => {
        const s = Number(item.dataset.statement);
        const pending = this.pendingRatings.get(`${q.id} ${s}`);
        const shown = pending ?? confirmed[s] ?? null;
        if (shown !== null) rated++;
        item.classList.toggle("rated", shown !== null);
        const buttons = item.querySelectorAll(".lk-btn");
        buttons.forEach((btn) => {
          const p = Number(btn.dataset.choice);
          const on = p === shown;
          btn.setAttribute("aria-checked", String(on));
          btn.classList.toggle("selected", on);
          btn.classList.toggle("pending", on && pending !== void 0);
          btn.tabIndex = on || shown === null && p === 0 ? 0 : -1;
        });
        const picked = item.querySelector(".lk-picked");
        if (picked) picked.textContent = shown === null ? "" : q.labels[shown];
      });
      const saved = this.main.querySelector("#saved");
      if (!saved) return;
      const n = q.statements.length;
      const sending = [...this.pendingRatings.keys()].some((k) => k.startsWith(`${q.id} `));
      if (sending) saved.textContent = "Sending\u2026";
      else if (n === 1) saved.textContent = confirmed[0] != null ? `Rating saved: ${q.labels[confirmed[0]]}` : "";
      else saved.textContent = rated === n ? `All ${n} rated. Thanks!` : `${rated} of ${n} rated`;
    }
    likertResults(q, results) {
      const r = results ?? { type: "likert", counts: q.statements.map(() => q.labels.map(() => 0)), voters: 0 };
      const mine = this.mine.ratings[q.id] ?? [];
      const palette = tones(q.labels.length);
      const max = Math.max(1, ...r.counts.flat());
      const list = h("ol", { class: "lk-list" });
      q.statements.forEach((statement, s) => {
        const counts = q.labels.map((_, p) => r.counts[s]?.[p] ?? 0);
        const total = counts.reduce((a, b) => a + b, 0);
        const my = mine[s] ?? null;
        const dist = h("div", { class: "lk-dist", role: "img" });
        dist.style.setProperty("--n", String(q.labels.length));
        const described = [];
        counts.forEach((c, p) => {
          const fill = h("span", {
            class: "lk-bar",
            "data-side": q.numeric ? void 0 : palette[p].side,
            "data-step": q.numeric ? void 0 : palette[p].step
          });
          fill.style.setProperty("--h", `${100 * c / max}%`);
          dist.append(
            h(
              "span",
              { class: p === my ? "lk-col mine" : "lk-col" },
              h("span", { class: "lk-col-n" }, c ? String(c) : ""),
              fill,
              q.numeric ? h("span", { class: "lk-col-label" }, q.labels[p]) : null
            )
          );
          described.push(`${q.labels[p]}: ${plural(c, "person", "people")}`);
        });
        dist.setAttribute("aria-label", described.join(", "));
        let summary;
        if (!total) summary = "No ratings";
        else if (q.numeric) {
          const mean = counts.reduce((a, c, p) => a + c * Number(q.labels[p]), 0) / total;
          summary = `Average ${mean.toFixed(1)} \xB7 ${plural(total, "rating")}`;
        } else {
          const most = Math.max(...counts);
          const tops = q.labels.filter((_, p) => counts[p] === most);
          summary = tops.length === 1 ? `Most common: ${tops[0]} (${pct(most, total)}%)` : `Tied: ${tops.join(", ")} (${pct(most, total)}% each)`;
        }
        list.append(
          h(
            "li",
            { class: "lk-item" },
            h(
              "div",
              { class: "lk-top" },
              statementShown(q) ? h("p", { class: "lk-statement" }, statement) : null,
              my !== null ? h("span", { class: "tag lk-you" }, `You: ${q.labels[my]}`) : null
            ),
            dist,
            q.numeric ? null : this.scaleEnds(q),
            h("p", { class: "lk-summary" }, summary)
          )
        );
      });
      const note = r.voters ? `${plural(r.voters, "person", "people")} rated.` : "No ratings came in for this one.";
      return h("section", { class: "view" }, this.header(q.prompt, "closed", note), list);
    }
    // ---- results
    resultsView(live) {
      const q = live.question;
      const results = live.results;
      if (q.type === "likert") return this.likertResults(q, results?.type === "likert" ? results : null);
      if (q.type === "poll") {
        const r2 = results?.type === "poll" ? results : { type: "poll", counts: q.options.map(() => 0), voters: 0 };
        const total = r2.counts.reduce((a, b) => a + b, 0);
        const max = Math.max(1, ...r2.counts);
        const revealed = live.revealed;
        const mineVote = this.mine.votes[q.id];
        const note2 = revealed ? mineVote === void 0 ? "Here's the answer." : revealed.includes(mineVote) ? "You got it right." : "Not this time. The correct answer is highlighted." : `${plural(r2.voters, "person", "people")} voted.`;
        const rows = h("ol", { class: "bars", "aria-label": "Results" });
        q.options.forEach((label, i) => {
          const n = r2.counts[i] ?? 0;
          const correct = revealed?.includes(i) ?? false;
          const cls = ["bar-row", correct ? "correct" : revealed ? "dim" : "", mineVote === i ? "mine" : ""].join(" ").trim();
          const tags = [
            correct ? h("span", { class: "tag tag-correct" }, "Correct") : null,
            mineVote === i ? h("span", { class: "tag" }, "Your vote") : null
          ];
          const fill = h("span", { class: "bar-fill" });
          fill.style.setProperty("--w", `${100 * n / max}%`);
          rows.append(
            h(
              "li",
              { class: cls },
              h(
                "div",
                { class: "bar-top" },
                h("span", { class: "opt-letter small", "aria-hidden": "true" }, letter(i)),
                h("span", { class: "bar-label" }, h("span", { class: "mark" }, label)),
                h("span", { class: "bar-num" }, `${pct(n, total)}%`, h("span", { class: "visually-hidden" }, `, ${plural(n, "vote")}`))
              ),
              h("div", { class: "bar-track", "aria-hidden": "true" }, fill),
              h("div", { class: "bar-meta" }, ...tags, h("span", { class: "bar-count", "aria-hidden": "true" }, plural(n, "vote")))
            )
          );
        });
        return h("section", { class: "view" }, this.header(q.prompt, "closed", note2), rows);
      }
      const r = results?.type === "wordcloud" ? results : { type: "wordcloud", words: [], voters: 0 };
      const mineKeys = new Set((this.mine.answers[q.id] ?? []).map((a) => a.toLowerCase()));
      const top = Math.max(1, ...r.words.map((w) => w.count));
      const list = h("ol", { class: "ranked", "aria-label": "Answers, most common first" });
      r.words.slice(0, 30).forEach((w) => {
        const fill = h("span", { class: "rank-fill", "aria-hidden": "true" });
        fill.style.setProperty("--w", `${100 * w.count / top}%`);
        const mine = mineKeys.has(w.text.toLowerCase());
        list.append(
          h(
            "li",
            { class: mine ? "rank mine" : "rank" },
            fill,
            h("span", { class: "rank-word" }, w.text),
            mine ? h("span", { class: "tag" }, "Yours") : null,
            h("span", { class: "rank-count" }, String(w.count), h("span", { class: "visually-hidden" }, w.count === 1 ? " person" : " people"))
          )
        );
      });
      const note = r.words.length ? `${plural(r.voters, "person", "people")} answered. Most common first.` : "No answers came in for this one.";
      return h("section", { class: "view" }, this.header(q.prompt, "closed", note), r.words.length ? list : null);
    }
  };
  function boot() {
    const form = document.getElementById("join-form");
    if (form instanceof HTMLFormElement) return initJoin(form);
    const m = /^\/s\/([^/]+)\/?$/.exec(location.pathname);
    const session = m ? decodeURIComponent(m[1]) : "";
    if (!LIMITS.sessionPattern.test(session)) {
      location.replace("/");
      return;
    }
    new VotePage(session);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
