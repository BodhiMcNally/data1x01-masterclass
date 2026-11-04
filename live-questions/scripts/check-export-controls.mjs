// Exercise the real presenter script with DOM/network stubs, without production sessions or credentials.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

class Element {
  children = []; nodes = new Map(); attributes = new Map(); textContent = ''; hidden = false; disabled = false;
  append(element) { this.children.push(element); }
  remove() {}
  click() { downloads.push(this); }
  addEventListener() {}
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  set innerHTML(html) {
    for (const [, id] of html.matchAll(/id="([^"]+)"/g)) this.nodes.set('#'+id,new Element());
  }
  querySelector(selector) {
    if (!this.nodes.has(selector)) {
      this.nodes.set(selector, selector === 'button' && this.nodes.has('#session-results-export')
        ? this.nodes.get('#session-results-export') : new Element());
    }
    return this.nodes.get(selector);
  }
  showModal() { this.open = true; }
  close() { this.open = false; }
}
const downloads = [], observers = [], blobs = new Map();
const elements = new Map(['start-voting','voting-settings','voting-status','revision-receipt-slide'].map(id=>[id,new Element()]));
const body = new Element(), root = {dataset:{lqMode:'viewer'}};
const storage = new Map([['lq:key:https://voting.test','local-test-key']]);
const store = map => ({getItem:key=>map.get(key) ?? null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)});
let requested;
const context = vm.createContext({
  document:{body,documentElement:root,readyState:'complete',getElementById:id=>elements.get(id) ?? null,
    addEventListener(){},createElement:()=>new Element()},
  MutationObserver:class {constructor(fn){observers.push(fn);}observe(){}},
  localStorage:store(storage),sessionStorage:store(new Map()),
  location:{href:'https://deck.test/slides/?lq-server=https%3A%2F%2Fvoting.test&session=current-session'},
  URL:class extends URL {
    static createObjectURL(blob) { const id='blob:export-'+blobs.size;blobs.set(id,blob);return id; }
    static revokeObjectURL() {}
  },
  fetch:async(url,options)=>{requested={url,options};return new Response('session,record_type\r\ncurrent-session,question\r\n',{headers:{'Content-Type':'text/csv; charset=utf-8'}});},
  AbortSignal,console,setTimeout:fn=>{setImmediate(fn);return 1;},clearTimeout(){},
});
vm.runInContext(readFileSync(fileURLToPath(new URL('../../voting-controls.js',import.meta.url)),'utf8'),context);
const dialog=body.children[0], field=name=>dialog.querySelector('#voting-'+name);
const controls=elements.get('revision-receipt-slide').children[0];
const mode=value=>{root.dataset.lqMode=value;observers.forEach(fn=>fn());};
const click=button=>button.onclick({stopPropagation(){}});
const settled=()=>new Promise(setImmediate);

assert.equal(field('export').disabled,true); assert.equal(controls.hidden,true);
mode('presenter'); assert.equal(field('export').disabled,false); assert.equal(controls.hidden,false);
click(field('export')); assert.equal(field('export').disabled,true); await settled();
assert.equal(requested.url,'https://voting.test/api/s/current-session/export?format=csv');
assert.equal(requested.options.headers.Authorization,'Bearer local-test-key');
assert.equal(requested.url.includes('local-test-key'),false,'key stays out of the URL');
assert.equal(downloads.length,1); assert.equal(downloads[0].download,'session-results-current-session.csv');
assert.match(await blobs.get(downloads[0].href).text(),/current-session,question/);
assert.equal(field('export-status').textContent,'Session CSV downloaded.');
assert.equal(field('export').disabled,false);

context.fetch=async()=>new Response(null,{status:401});
click(controls.querySelector('button'));await settled();
assert.match(field('export-status').textContent,/Presenter access/);assert.equal(downloads.length,1);
context.fetch=async()=>new Response('<html>old server</html>',{headers:{'Content-Type':'text/html'}});
click(field('export'));await settled();assert.match(field('export-status').textContent,/needs the session export update/);
context.fetch=async()=>{throw Object.assign(new Error('timeout'),{name:'TimeoutError'});};
click(field('export'));await settled();assert.match(field('export-status').textContent,/timed out/);

let finish, calls=0;
context.fetch=()=>{calls++;return new Promise(resolve=>{finish=resolve;});};
click(field('export'));click(field('export'));assert.equal(calls,1,'duplicate clicks share one in-flight export');
mode('viewer');finish(new Response('test',{headers:{'Content-Type':'text/csv'}}));await settled();
assert.equal(field('export').disabled,true,'a disconnect does not re-enable the presenter control');
assert.equal(controls.hidden,true);
console.log('Export control checks passed: authenticated download, session selection, access states, errors and duplicate clicks.');
