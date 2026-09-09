import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || process.cwd());
const roots = ["app", "components", "lib"];
const allowed = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"]);
const ignored = new Set(["node_modules", ".next", ".git"]);

const badPatterns = [
  /Ã[\x80-\xBF©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿]/u,
  /Â[\x80-\xBF ¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿]/u,
  /â€[“”˜™š›œž]/u,
  /â[\x80-\x9F]/u,
  /\uFFFD/u,
];

const problems = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full);
      continue;
    }

    if (!allowed.has(path.extname(entry.name).toLowerCase())) continue;

    const relative = path.relative(root, full).split(path.sep).join("/");
    const lines = fs.readFileSync(full, "utf8").split(/\r?\n/u);

    lines.forEach((line, index) => {
      if (badPatterns.some((pattern) => pattern.test(line))) {
        problems.push(`${relative}:${index + 1}: ${line.trim().slice(0, 240)}`);
      }

      if (/TROCAR PARA PRF/iu.test(line)) {
        problems.push(`${relative}:${index + 1}: comando indevido para trocar para PRF`);
      }
    });
  }
}

for (const folder of roots) walk(path.join(root, folder));

if (problems.length) {
  console.error("ERROS REAIS DE TEXTO NA INTERFACE:");
  for (const problem of problems) console.error(problem);
  process.exit(1);
}

console.log("Integridade da interface OK.");
