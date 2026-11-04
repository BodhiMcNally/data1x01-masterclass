# Session results export

The presentation provides **Export session CSV** in **Voting settings** and on the personal revision-receipt slide. Downloads are enabled only while connected as presenter; the receipt-slide control is hidden otherwise. Export before ending voting or starting a new session. Downloading does not close voting, reveal answers or reset responses.

The report is a snapshot of the session named in the presentation URL. It includes stored responses from students who have disconnected and survives a server restart. A reset removes the affected results from future exports. Only questions opened during that session appear; short-answer tasks are not automatically marked.

## Rows

Filter `record_type` to work with one level of detail.

| Record type | Contents |
|---|---|
| `question` | One row per question, with MCQ accuracy and confidence statistics or word-cloud/rating participation totals |
| `option` | One row per MCQ option, including its label, response count, percentage and revealed correctness |
| `topic` | Combined results for each Canvas topic linked to the MCQs |
| `learning_outcome` | Combined results for each linked learning outcome |
| `wordcloud_response` | Each distinct normalised phrase and its frequency, including the opening exam-feelings check-in |
| `rating` | A count for each statement and scale label, if a rating-scale question is used |
| `session` | Session metadata when no questions have been opened |

The hidden receipt trigger is omitted. Word-cloud export includes every stored phrase, including phrases outside the slide's top-100 display limit. Moderated phrases are retained with `hidden=true`; filter these out when sharing a report. A phrase can contain several words because the check-in accepts short responses.

## Counts and percentages

| Field | Definition |
|---|---|
| `session_participants` | Distinct anonymous browser identities that submitted any response in this session |
| `responding_students` | Distinct browser identities that answered the relevant question or at least one MCQ linked to the topic/outcome |
| `responses` | Number of current answers across the included questions; a changed answer replaces the earlier answer |
| `question_count` | Number of questions included in the row |
| `graded_responses` | Answers to MCQs for which the presenter has revealed the correct option |
| `correct_responses`, `incorrect_responses` | Answer counts among graded responses; blank when none are graded |
| `accuracy_pct` | Correct responses divided by graded responses |
| `incorrect_students` | Distinct students with at least one incorrect graded response |
| `confidence_responses` | Answers with a Guessing, Unsure or Confident rating |
| `guessing_responses`, `unsure_responses`, `confident_responses` | Rating counts; a student may contribute more than once across several questions |
| `guessing_pct`, `unsure_pct`, `confident_pct` | Each rating count divided by confidence responses |
| `unrated_responses` | Answers without a rating on questions with confidence enabled |
| `low_confidence_students` | Distinct students who selected Guessing or Unsure at least once |
| `revision_priority_students` | Distinct students with an incorrect answer, a low-confidence answer or both |
| `revision_priority_pct` | Revision-priority students divided by responding students |
| `response_count`, `response_pct` | Option, phrase or rating frequency; denominator is answers to that MCQ, students answering that word cloud or ratings for that statement respectively |

Percentages use a 0–100 scale and are rounded to two decimal places. A percentage is blank when its denominator is zero. Word-cloud percentages can add to more than 100% when students submit multiple phrases.

Topic and learning-outcome student counts deduplicate across questions and across incorrect/low-confidence flags. These groups overlap, so their student counts must not be added together. Response counts and confidence distributions are counts of answers rather than unique students across questions. Missing ratings do not imply low confidence. Unrevealed MCQs contribute confidence information but no correctness information.

`concept` identifies the question's revision concept. `topic` contains its linked Canvas topics. `learning_outcome_id`, `learning_outcome` and `canvas_resources` preserve the course mapping used by personal receipts. Summary topics and outcomes indicate where a question warrants revision; they do not establish which part of a multi-topic question caused a mistake.

## Access and format

The existing authenticated export endpoint supports `GET /api/s/:session/export?format=csv` with `Authorization: Bearer <PRESENTER_KEY>`. Without `format=csv`, it retains the JSON question results and adds the aggregate `report`. Both formats require presenter access and use `Cache-Control: no-store`.

No names, email addresses or browser identity values are added to the report. The server uses random browser identities internally to count unique participation; these are not verified headcounts, so someone using multiple browsers can be counted more than once. Free-text phrases contain what students submitted.

CSV files use UTF-8 with a byte-order mark for Excel, quoted text fields and CRLF row endings. Text beginning with a spreadsheet formula trigger is prefixed with an apostrophe. Session name and export time are included on every row. The presenter key is never placed in the URL, downloaded file or public presentation source.
