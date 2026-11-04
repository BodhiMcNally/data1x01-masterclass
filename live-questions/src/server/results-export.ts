/** Presenter-only, aggregate session reporting. Voter IDs never leave this module. */
import type { QuestionState } from '../shared/protocol';
import type { QuestionData, RoomData } from './room';

export const CSV_COLUMNS = [
  'session', 'exported_at', 'session_participants', 'record_type',
  'question_id', 'question_type', 'prompt', 'status', 'answer_revealed',
  'concept', 'topic', 'learning_outcome_id', 'learning_outcome', 'canvas_resources',
  'question_count', 'responding_students', 'responses', 'graded_responses',
  'correct_responses', 'incorrect_responses', 'accuracy_pct', 'incorrect_students',
  'confidence_responses', 'guessing_responses', 'guessing_pct', 'unsure_responses',
  'unsure_pct', 'confident_responses', 'confident_pct', 'unrated_responses',
  'low_confidence_students', 'revision_priority_students', 'revision_priority_pct',
  'option', 'option_text', 'correct_option', 'response_text', 'response_count',
  'response_pct', 'hidden',
] as const;
type Column = typeof CSV_COLUMNS[number];
export type ReportRow = Partial<Record<Column, string | number | boolean>>;
export interface SessionReport { participants: number; rows: ReportRow[] }
export interface SessionExport {
  session: string;
  live: string | null;
  questions: Record<string, QuestionState>;
  report: SessionReport;
}

const pct = (n: number, denominator: number): number | '' => denominator ? Math.round(n / denominator * 10000) / 100 : '';

class PollTotals {
  students = new Set<string>();
  incorrect = new Set<string>();
  low = new Set<string>();
  priority = new Set<string>();
  responses = 0;
  graded = 0;
  correct = 0;
  wrong = 0;
  confidence = [0, 0, 0];
  unrated = 0;
  questionCount = 0;

  add(entry: QuestionData): void {
    if (entry.question.type !== 'poll') return;
    this.questionCount++;
    const confidence = new Map(entry.confidence ?? []);
    for (const [voter, choice] of entry.votes) {
      this.students.add(voter);
      this.responses++;
      const wrong = entry.revealed !== null && !entry.revealed.includes(choice);
      if (entry.revealed !== null) {
        this.graded++;
        if (wrong) { this.wrong++; this.incorrect.add(voter); }
        else this.correct++;
      }
      const rating = entry.question.confidence ? confidence.get(voter) : undefined;
      if (rating !== undefined) this.confidence[rating]++;
      else if (entry.question.confidence) this.unrated++;
      const low = rating === 0 || rating === 1;
      if (low) this.low.add(voter);
      if (wrong || low) this.priority.add(voter);
    }
  }

  row(): ReportRow {
    const rated = this.confidence.reduce((a, b) => a + b, 0);
    return {
      question_count: this.questionCount, responding_students: this.students.size,
      responses: this.responses, graded_responses: this.graded,
      correct_responses: this.graded ? this.correct : '',
      incorrect_responses: this.graded ? this.wrong : '',
      accuracy_pct: pct(this.correct, this.graded),
      incorrect_students: this.graded ? this.incorrect.size : '',
      confidence_responses: rated,
      guessing_responses: this.confidence[0], guessing_pct: pct(this.confidence[0], rated),
      unsure_responses: this.confidence[1], unsure_pct: pct(this.confidence[1], rated),
      confident_responses: this.confidence[2], confident_pct: pct(this.confidence[2], rated),
      unrated_responses: this.unrated, low_confidence_students: this.low.size,
      revision_priority_students: this.priority.size,
      revision_priority_pct: pct(this.priority.size, this.students.size),
    };
  }
}

function topics(entry: QuestionData): string[] {
  if (entry.question.type !== 'poll' || !entry.question.revision) return [];
  const revision = entry.question.revision;
  const canvas = revision.resources.filter(r => /^Topic\s+\d+\b/i.test(r.label)).map(r => r.label);
  return [...new Set(canvas.length ? canvas : [revision.topic.replace(/^Q\d+:\s*/, '')])];
}

/** Reads the stored responses, including all cloud phrases, rather than the 100-word display limit. */
export function buildSessionReport(data: RoomData): SessionReport {
  const participants = new Set<string>();
  const rows: ReportRow[] = [];
  const groups = new Map<string, { info: ReportRow; totals: PollTotals }>();
  const addGroup = (key: string, info: ReportRow, entry: QuestionData) => {
    let group = groups.get(key);
    if (!group) groups.set(key, group = { info, totals: new PollTotals() });
    group.totals.add(entry);
  };

  for (const entry of data.questions) {
    const q = entry.question;
    for (const [voter] of [...entry.votes, ...entry.answers, ...(entry.ratings ?? [])]) participants.add(voter);
    // This hidden question only triggers the personal receipt; it is not a survey item.
    if (q.id === 'revision-receipt' && q.type === 'wordcloud') continue;
    const base: ReportRow = {
      question_id: q.id, question_type: q.type, prompt: q.prompt, status: entry.status,
      question_count: 1,
    };
    if (q.type === 'poll') {
      const revision = q.revision;
      const canvasTopics = topics(entry);
      Object.assign(base, {
        answer_revealed: entry.revealed !== null, concept: revision?.topic ?? '',
        topic: canvasTopics.join(' | '),
        learning_outcome_id: revision?.outcomes.map(o => o.id).join(' | ') ?? '',
        learning_outcome: revision?.outcomes.map(o => `${o.id}: ${o.text}`).join(' | ') ?? '',
        canvas_resources: revision?.resources.map(r => `${r.label}: ${r.url}`).join(' | ') ?? '',
      });
      const totals = new PollTotals(); totals.add(entry);
      rows.push({ ...base, record_type: 'question', ...totals.row() });
      const counts = q.options.map(() => 0);
      for (const [, choice] of entry.votes) counts[choice]++;
      q.options.forEach((text, i) => rows.push({
        ...base, record_type: 'option', option: String.fromCharCode(65 + i), option_text: text,
        correct_option: entry.revealed === null ? '' : entry.revealed.includes(i),
        response_count: counts[i], response_pct: pct(counts[i], entry.votes.length),
      }));
      for (const topic of canvasTopics) addGroup('topic:' + topic, { record_type: 'topic', topic }, entry);
      for (const outcome of new Map(revision?.outcomes.map(o => [o.id, o]) ?? []).values()) {
        addGroup('outcome:' + outcome.id, {
          record_type: 'learning_outcome', learning_outcome_id: outcome.id, learning_outcome: outcome.text,
        }, entry);
      }
    } else if (q.type === 'wordcloud') {
      const tally = new Map<string, number>();
      for (const [, answers] of entry.answers) for (const answer of answers) tally.set(answer.key, (tally.get(answer.key) ?? 0) + 1);
      const display = new Map(entry.display), hidden = new Map(entry.hidden);
      rows.push({ ...base, record_type: 'question', responding_students: entry.answers.length,
        responses: [...tally.values()].reduce((a, b) => a + b, 0) });
      for (const [key, count] of [...tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
        rows.push({ ...base, record_type: 'wordcloud_response', response_text: display.get(key) ?? key,
          response_count: count, responding_students: entry.answers.length,
          response_pct: pct(count, entry.answers.length), hidden: hidden.has(key) });
      }
    } else {
      const ratings = entry.ratings ?? [];
      rows.push({ ...base, record_type: 'question', responding_students: ratings.length,
        responses: ratings.reduce((n, [, values]) => n + values.filter(v => v !== null).length, 0) });
      q.statements.forEach((statement, i) => {
        const counts = q.labels.map(() => 0);
        for (const [, values] of ratings) if (values[i] !== null) counts[values[i]!]++;
        const n = counts.reduce((a, b) => a + b, 0);
        q.labels.forEach((label, choice) => rows.push({ ...base, record_type: 'rating',
          concept: statement, response_text: label, response_count: counts[choice], response_pct: pct(counts[choice], n) }));
      });
    }
  }
  rows.push(...[...groups.values()].map(group => ({ ...group.info, ...group.totals.row() })));
  return { participants: participants.size, rows };
}

/** Quoted RFC 4180 cells, UTF-8 BOM for Excel and formula-safe free text. */
function cell(value: string | number | boolean | undefined): string {
  if (value === undefined) return '';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  const safe = /^\s*[=+@-]|^[\t\r\n]/.test(value) ? "'" + value : value;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export function sessionCsv(data: SessionExport, exportedAt = new Date().toISOString()): string {
  const rows = data.report.rows.length ? data.report.rows : [{ record_type: 'session' }];
  return '\uFEFF' + CSV_COLUMNS.join(',') + '\r\n' + rows.map(row => {
    const full: ReportRow = { ...row, session: data.session, exported_at: exportedAt, session_participants: data.report.participants };
    return CSV_COLUMNS.map(column => cell(full[column])).join(',');
  }).join('\r\n') + '\r\n';
}
