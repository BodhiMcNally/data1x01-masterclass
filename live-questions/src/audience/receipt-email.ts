import type { ReviewItem } from '../shared/protocol';

/** Compose locally. There is deliberately no recipient address or server request. */
export function receiptMailto(fullText: string, rows: ReviewItem[], receiptUrl: string): string {
  const subject = 'My DATA1x01 revision receipt';
  const link = (body: string) => `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (link(fullText).length <= 1900) return link(fullText);

  const priorities = rows.filter(r => r.choice === null || !r.correct || r.confidence === null || r.confidence < 2);
  const lines = [
    'My DATA1x01 revision receipt',
    `${rows.filter(r=>r.choice!==null).length} attempted; ${rows.filter(r=>r.correct).length} correct.`,
    '',
    `Full receipt (open in the same browser used for voting): ${receiptUrl}`,
    'For a complete email copy, attach the downloaded receipt text file.',
    '',
    'Revision priorities:',
  ];
  let included = 0;
  for (const r of priorities) {
    const result = r.choice === null ? 'Not attempted' : `${r.correct ? 'Correct' : 'Incorrect'}; ${r.confidence === null ? 'confidence not recorded' : ['Guessing','Unsure','Confident'][r.confidence]}`;
    const entry = `${r.revision.topic}: ${result} (${r.revision.outcomes.map(o=>o.id).join(', ')})`;
    if (link([...lines, entry, 'Additional topics and Canvas links are in the full receipt.'].join('\n')).length > 1900) break;
    lines.push(entry); included++;
  }
  if (included < priorities.length) lines.push('Additional topics and Canvas links are in the full receipt.');
  if (!priorities.length) lines.push('All recorded answers were correct and confident.');
  return link(lines.join('\n'));
}
