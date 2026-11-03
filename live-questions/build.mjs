import {build} from 'esbuild';import path from 'node:path';import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),project=path.dirname(here);
const common={bundle:true,target:'es2022',logLevel:'warning'};
await Promise.all([
 build({...common,entryPoints:[here+'/src/deck/plugin.ts'],platform:'browser',format:'iife',outfile:project+'/_extensions/masterclass/live-questions/live-questions.js',banner:{js:'/*! Live Questions 1.2.0 | Sean Davis | MIT | DATA1x01 integration; see live-questions/UPSTREAM.md */'}}),
 build({...common,entryPoints:[here+'/src/audience/vote.ts'],platform:'browser',format:'iife',outfile:here+'/public/vote.js'}),
 build({...common,entryPoints:[here+'/src/server/node/main.ts'],platform:'node',format:'esm',outfile:here+'/server.js',external:['bufferutil','utf-8-validate'],banner:{js:'import {createRequire as __lqCreateRequire} from "node:module"; const require=__lqCreateRequire(import.meta.url);'}}),
 build({...common,entryPoints:[here+'/src/server/cloudflare/worker.ts'],platform:'browser',format:'esm',outfile:here+'/cloudflare-worker.js',external:['cloudflare:workers']})
]);
