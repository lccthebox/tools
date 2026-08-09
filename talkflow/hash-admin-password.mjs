import crypto from "node:crypto";
import readline from "node:readline";

function readHidden(prompt) {
  return new Promise(resolve => {
    if (!process.stdin.isTTY) {
      let value = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", chunk => { value += chunk; });
      process.stdin.on("end", () => resolve(value.trim()));
      return;
    }
    process.stdout.write(prompt);
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    let value = "";
    const onKey = (text, key) => {
      if (key?.ctrl && key.name === "c") process.exit(130);
      if (key?.name === "return") {
        process.stdin.setRawMode(false); process.stdin.off("keypress", onKey); process.stdout.write("\n"); resolve(value); return;
      }
      if (key?.name === "backspace") value = value.slice(0, -1);
      else if (text && !key?.ctrl && !key?.meta) value += text;
    };
    process.stdin.on("keypress", onKey);
  });
}

const password = await readHidden("관리자 비밀번호를 입력하세요: ");
if (password.length < 12) throw new Error("관리자 비밀번호는 12자 이상이어야 합니다.");
const salt = crypto.randomBytes(16), cost = 16384, blockSize = 8, parallelization = 1;
const digest = crypto.scryptSync(password, salt, 32, { N: cost, r: blockSize, p: parallelization, maxmem: 64 * 1024 * 1024 });
process.stdout.write(`TALKFLOW_ADMIN_PASSWORD_HASH=scrypt$${cost}$${blockSize}$${parallelization}$${salt.toString("base64url")}$${digest.toString("base64url")}\n`);
process.stdout.write(`TALKFLOW_SESSION_SECRET=${crypto.randomBytes(32).toString("base64url")}\n`);
