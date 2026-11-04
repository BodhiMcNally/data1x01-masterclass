import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=mkdtempSync(path.join(tmpdir(),'data1x01-test-'));
try {
 const outfile=path.join(dir,'learning-check.cjs');
 await build({entryPoints:[path.join(root,'src/server/learning-features.test.ts')],outfile,bundle:true,platform:'node',format:'cjs',target:'es2022'});
 const result=spawnSync(process.execPath,[outfile],{stdio:'inherit'});
 process.exitCode=result.status??1;
} finally {rmSync(dir,{recursive:true,force:true});}
