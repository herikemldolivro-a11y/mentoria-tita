import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || process.cwd());
const roots = ["app", "components", "lib"];
const allowed = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"]);
const ignored = new Set(["node_modules", ".next", ".git"]);

const replacements = [
  ["â€”", "—"], ["â€“", "–"], ["â€™", "’"], ["â€˜", "‘"], ["â€œ", "“"], ["â€", "”"],
  ["â€¢", "•"], ["â€¦", "…"], ["Â ", " "], ["Âº", "º"], ["Âª", "ª"], ["Â§", "§"],
  ["Ã¡", "á"], ["Ã¢", "â"], ["Ã£", "ã"], ["Ã©", "é"], ["Ãª", "ê"], ["Ã­", "í"],
  ["Ã³", "ó"], ["Ã´", "ô"], ["Ãµ", "õ"], ["Ãº", "ú"], ["Ã§", "ç"], ["Ã±", "ñ"],
  ["Ã", "Á"], ["Ã€", "À"], ["Ã‚", "Â"], ["Ã‰", "É"], ["ÃŠ", "Ê"], ["Ã", "Í"],
  ["Ã“", "Ó"], ["Ã”", "Ô"], ["Ã•", "Õ"], ["Ãš", "Ú"], ["Ã‡", "Ç"],
];

function fix(text) {
  let current = text.replace(/\uFEFF/gu, "");
  for (let pass = 0; pass < 6; pass += 1) {
    const before = current;
    for (const [broken, fixed] of replacements) current = current.split(broken).join(fixed);
    if (before === current) break;
  }
  return current;
}

let changed = 0;

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

    const before = fs.readFileSync(full, "utf8");
    const after = fix(before);

    if (after !== before) {
      fs.writeFileSync(full, after, "utf8");
      changed += 1;
      console.log("Texto de interface corrigido:", path.relative(root, full));
    }
  }
}

for (const folder of roots) walk(path.join(root, folder));
console.log(`Varredura da interface concluída. Arquivos corrigidos: ${changed}.`);
