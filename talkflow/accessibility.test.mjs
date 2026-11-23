import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root=process.argv[2]?path.resolve(process.argv[2]):path.resolve(__dirname,'..');test('prepare view buttons expose exactly one pressed state without invalid selected attributes',()=>{const source=fs.readFileSync(path.join(root,'talkflow/app.js'),'utf8');const render=source.split('\n').find(x=>x.includes('function renderPrepareViews()'));for(const mode of ['tasks','month','calendar']){const html=new Function('prepareMode',render+';return renderPrepareViews();')(mode);assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);assert.equal((html.match(/aria-pressed="false"/g)||[]).length,2);assert(!html.includes('aria-selected'));assert(html.includes('data-prepare-mode="'+mode+'" aria-pressed="true"'));}});
