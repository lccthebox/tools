// Runs every current TalkFlow QA script in parallel and exits non-zero when any fails.
// Usage: node talkflow/run-qa.mjs [--all] [--jobs=N] [name-filter]
import {spawn} from "node:child_process";
import {readdir} from "node:fs/promises";
import {availableParallelism} from "node:os";
import {fileURLToPath} from "node:url";
import {join} from "node:path";

const root=fileURLToPath(new URL(".",import.meta.url));

// Scripts that need a deployed URL or an exported topic file; run them by hand.
const MANUAL=new Map([
  ["preview-qa.mjs","needs a preview URL argument"],
  ["print-content-fit-qa.mjs","needs exported topic JSON paths"],
  ["readable-preview-qa.mjs","needs an exported topic file"]
]);

// Scripts for the pre-v4.3 screens (leader sheets, sample topics, Simple/v2 engines).
// They already failed at the v4.1 reset commit; --all still runs them.
const LEGACY=new Map([
  ["bilingual-facts-qa.mjs","v3 Simple story facts"],
  ["conversation-qa.mjs","v2 leader/student conversation screens"],
  ["generation-browser-qa.mjs","legacy engine + Simple admin path"],
  ["member-progress-browser-qa.mjs","member reflection form removed in v4.1"],
  ["navigation-qa.mjs","pre-v4.1 task-home navigation"],
  ["print-qa.mjs","leader print sheets"],
  ["print-redesign-qa.mjs","leader print redesign"],
  ["qa.mjs","sample-topic student view"],
  ["simple-qa.mjs","v3 Simple engine"],
  ["story-word-contract-qa.mjs","v3 Simple story word contract"],
  ["task-home-qa.mjs","pre-v4.1 task-home fixtures"]
]);

const args=process.argv.slice(2),all=args.includes("--all"),jobsArg=args.find(arg=>arg.startsWith("--jobs=")),filter=args.find(arg=>!arg.startsWith("--"))||"";
const jobs=Math.max(1,Number(jobsArg?.slice(7))||Math.min(4,availableParallelism()));
const scripts=(await readdir(root)).filter(name=>/(?:-qa|^qa)\.mjs$|\.test\.mjs$/.test(name)&&name!=="run-qa.mjs"&&!MANUAL.has(name)&&(all||!LEGACY.has(name))&&name.includes(filter)).sort();

function run(name){
  return new Promise(resolve=>{
    const started=Date.now(),child=spawn(process.execPath,[join(root,name)],{cwd:join(root,".."),stdio:["ignore","pipe","pipe"]});
    let output="";child.stdout.on("data",chunk=>output+=chunk);child.stderr.on("data",chunk=>output+=chunk);
    const timer=setTimeout(()=>{output+="\n[run-qa] timed out after 180s";child.kill()},180000);
    child.on("close",code=>{clearTimeout(timer);resolve({name,ok:code===0,seconds:((Date.now()-started)/1000).toFixed(1),output})});
  });
}

const queue=[...scripts],results=[];
await Promise.all(Array.from({length:Math.min(jobs,queue.length)},async()=>{
  while(queue.length){const result=await run(queue.shift());results.push(result);console.log(`${result.ok?"PASS":"FAIL"} ${result.name} (${result.seconds}s)`)}
}));

const failed=results.filter(result=>!result.ok);
for(const result of failed)console.log(`\n--- ${result.name} ---\n${result.output.trim().split("\n").slice(-15).join("\n")}`);
console.log(`\n${results.length-failed.length}/${results.length} passed${all?"":` (skipped ${LEGACY.size} legacy, ${MANUAL.size} manual; use --all for legacy)`}`);
process.exitCode=failed.length?1:0;
