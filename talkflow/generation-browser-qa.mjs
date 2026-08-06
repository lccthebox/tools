import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";

const root=dirname(fileURLToPath(import.meta.url));
const suites=["generation-engine-qa.mjs","simple-qa.mjs"];
for(const suite of suites){
  const result=spawnSync(process.execPath,[join(root,suite)],{encoding:"utf8",stdio:"pipe"});
  if(result.status!==0){
    process.stderr.write(result.stderr||result.stdout);
    process.exit(result.status||1);
  }
}
console.log("generation-browser-qa: PASS (legacy engine + real Simple admin browser path)");
