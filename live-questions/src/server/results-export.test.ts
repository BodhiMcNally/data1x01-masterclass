import assert from 'node:assert/strict';
import { Room } from './room';
import { createApp } from './app';
import { CSV_COLUMNS, sessionCsv } from './results-export';
import type { PollQuestion, Question } from '../shared/protocol';

const presenter = {role:'deck' as const, voter:'presenter-private-id', presenter:true};
const student = (voter: string) => ({role:'audience' as const, voter, presenter:false});
const room = Room.create('export-check');
const send = (sender: typeof presenter | ReturnType<typeof student>, msg: any) => {
  assert.equal(room.apply(sender, msg).ok, true);
};
const q: PollQuestion = {
  type:'poll', id:'q1', prompt:'=2+2, "quoted"\nA new line', options:['Wrong', 'Correct'], confidence:true,
  revision:{topic:'Q1: Study design', outcomes:[{id:'LO2',text:'Identify study design'}],
    resources:[{label:'Topic 1: Introduction',url:'https://canvas.sydney.edu.au/courses/74355/pages/topic-1-introduction'}]},
};
const vote = (id: string, voter: string, choice: number, confidence?: number) => {
  send(student(voter), {t:'vote', id, choice});
  if (confidence !== undefined) send(student(voter), {t:'confidence', id, choice:confidence});
};
send(presenter,{t:'open', question:q});
vote(q.id, 'private-a', 0, 2); vote(q.id, 'private-b', 1, 0);
vote(q.id, 'private-c', 0, 1); vote(q.id, 'private-d', 1);
send(presenter,{t:'reveal',id:q.id,correct:[1]});
const q2: PollQuestion = {...q,id:'q2',prompt:'Second question',revision:{...q.revision!,
  outcomes:[...q.revision!.outcomes,{id:'LO9',text:'Critique bias'}]}};
send(presenter,{t:'open',question:q2});
vote(q2.id, 'private-a', 0, 0); vote(q2.id, 'private-b', 1, 1);
vote(q2.id, 'private-c', 1, 2); vote(q2.id, 'private-e', 1, 2);
send(presenter,{t:'reveal',id:q2.id,correct:[1]});
const ungraded = {...q,id:'unrevealed'};
delete ungraded.revision;
send(presenter,{t:'open',question:ungraded});
vote('unrevealed','private-a',0,2); vote('unrevealed','private-f',1,0);
const mood: Question = {type:'wordcloud',id:'exam-feelings',prompt:'How do you feel before the session?',maxWords:3,maxAnswers:3};
send(presenter,{t:'open',question:mood});
send(student('private-a'),{t:'answer',id:mood.id,text:'Nervous'});
send(student('private-b'),{t:'answer',id:mood.id,text:'nervous'});
send(student('private-c'),{t:'answer',id:mood.id,text:'hopeful, "ready"'});
send(student('private-g'),{t:'answer',id:mood.id,text:'@SUM(1+1)'});
send(presenter,{t:'hide',id:mood.id,text:'nervous',hidden:true});

const data = room.export(), rows = data.report.rows;
assert.equal(data.report.participants,7,'distinct browser participants across all questions');
const first = rows.find(r=>r.record_type==='question' && r.question_id===q.id)!;
assert.equal(first.responses,4); assert.equal(first.correct_responses,2); assert.equal(first.incorrect_responses,2);
assert.equal(first.guessing_pct,33.33); assert.equal(first.unsure_pct,33.33); assert.equal(first.confident_pct,33.33);
assert.equal(first.unrated_responses,1,'unrated answers are not classified as low confidence');
assert.equal(first.low_confidence_students,2); assert.equal(first.revision_priority_students,3);
assert.equal(first.accuracy_pct,50); assert.equal(first.revision_priority_pct,75);
const topic = rows.find(r=>r.record_type==='topic')!;
assert.equal(topic.topic,'Topic 1: Introduction'); assert.equal(topic.question_count,2);
assert.equal(topic.responding_students,5); assert.equal(topic.responses,8); assert.equal(topic.graded_responses,8);
assert.equal(topic.correct_responses,5); assert.equal(topic.incorrect_responses,3); assert.equal(topic.accuracy_pct,62.5);
assert.equal(topic.incorrect_students,2); assert.equal(topic.low_confidence_students,3);
assert.equal(topic.revision_priority_students,3,'overlapping flags and multiple questions do not double-count students');
assert.equal(topic.revision_priority_pct,60);
const lo2 = rows.find(r=>r.record_type==='learning_outcome' && r.learning_outcome_id==='LO2')!;
assert.equal(lo2.revision_priority_students,3); assert.equal(lo2.question_count,2);
assert.equal(rows.find(r=>r.record_type==='learning_outcome' && r.learning_outcome_id==='LO9')!.question_count,1);
const notRevealed = rows.find(r=>r.record_type==='question' && r.question_id==='unrevealed')!;
assert.equal(notRevealed.answer_revealed,false); assert.equal(notRevealed.graded_responses,0);
assert.equal(notRevealed.incorrect_responses,''); assert.equal(notRevealed.accuracy_pct,'');
assert.equal(notRevealed.revision_priority_students,1,'unrevealed answers contribute confidence only');
const words = rows.filter(r=>r.record_type==='wordcloud_response');
assert.equal(words.length,3); assert.equal(words.find(r=>r.response_text==='Nervous')!.response_count,2);
assert.equal(words.find(r=>r.response_text==='Nervous')!.hidden,true,'moderation is preserved as a flag');
assert.equal(rows.filter(r=>r.record_type==='option').length,6);
assert.equal(rows.find(r=>r.record_type==='option' && r.question_id===q.id && r.option==='B')!.correct_option,true);

const csv = sessionCsv(data,'2026-11-04T12:00:00.000Z');
assert.ok(csv.startsWith('\uFEFF'+CSV_COLUMNS.join(',')+'\r\n'));
assert.ok(csv.includes('"\'=2+2, ""quoted""\nA new line"'),'quotes, commas, newlines and formulas handled');
assert.ok(csv.includes('"\'@SUM(1+1"'),'normalised student text cannot become an Excel formula');
assert.equal(/private-[a-z]|presenter-private-id|"voter"/.test(JSON.stringify(data)),false,'no identifiers in either export format');
assert.deepEqual(Room.restore(room.session, room.dump()).export(),data,'exports survive persistence and deployment restarts');
assert.equal(Room.create('separate').export().report.participants,0,'session isolation');
const emptyCsv = sessionCsv(Room.create('empty').export());
assert.ok(emptyCsv.includes('"session"'),'empty exports retain session metadata');

// Export every phrase, even when the slide displays only the top 100 entries.
const many = Room.create('many-words');
many.apply(presenter,{t:'open',question:mood});
for (let i=0;i<105;i++) many.apply(student('word-'+i),{t:'answer',id:mood.id,text:'feeling '+i});
assert.equal((many.export().questions[mood.id].results as any).words.length,100);
assert.equal(many.export().report.rows.filter(r=>r.record_type==='wordcloud_response').length,105);

// The same authenticated endpoint serves CSV and JSON. Query-string keys never authorise an export.
let calls = 0;
const app = createApp({presenterKey:()=> 'export-test-key', socket:()=>new Response(null,{status:426}),
  exportRoom:async()=>{calls++;return room.export();},asset:()=>new Response(null,{status:404})});
for (const request of [
  new Request('http://test/api/s/export-check/export?format=csv'),
  new Request('http://test/api/s/export-check/export?format=csv&key=export-test-key'),
  new Request('http://test/api/s/export-check/export?format=csv',{headers:{Authorization:'Bearer wrong'}}),
]) assert.equal((await app.request(request)).status,401);
assert.equal(calls,0,'unauthorised requests never read session results');
const headers = {Authorization:'Bearer export-test-key'};
const download = await app.request('http://test/api/s/export-check/export?format=csv',{headers});
assert.equal(download.status,200); assert.match(download.headers.get('Content-Type')!,/^text\/csv/);
assert.equal(download.headers.get('Cache-Control'),'no-store');
assert.match(download.headers.get('Content-Disposition')!,/attachment; filename="session-results-export-check.csv"/);
assert.ok((await download.text()).includes('learning_outcome'));
const json = await (await app.request('http://test/api/s/export-check/export',{headers})).json();
assert.deepEqual(json,data,'existing JSON question results remain available');
const preflight = await app.request('http://test/api/s/export-check/export?format=csv',{method:'OPTIONS'});
assert.equal(preflight.status,204); assert.equal(preflight.headers.get('Access-Control-Allow-Headers'),'Authorization');
assert.equal((await app.request('http://test/api/s/invalid%3Aname/export?format=csv',{headers})).status,404);
send(presenter,{t:'reset'});
assert.equal(room.export().report.participants,0); assert.deepEqual(room.export().report.rows,[],'reset removes exported responses');
console.log('Session export checks passed: CSV, question and concept totals, unique students, confidence, word clouds, privacy, authorisation and persistence.');
