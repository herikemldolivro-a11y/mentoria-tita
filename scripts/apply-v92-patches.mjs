import fs from "node:fs";
import path from "node:path";
const root = path.resolve(process.argv[2] || process.cwd());
const packagePath = path.join(root, "package.json");
if (!fs.existsSync(packagePath)) throw new Error(`package.json não encontrado em ${root}`);
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
pkg.scripts ||= {};
const guard = "node scripts/repair-mojibake.mjs . && node scripts/check-mojibake.mjs .";
function installGuard(name) {
  const current = pkg.scripts[name] || "";
  if (!current.includes("check-mojibake.mjs")) pkg.scripts[name] = current ? `${guard} && ${current}` : guard;
}
installGuard("prebuild");
installGuard("predev");
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
for (const rel of ["components/app-topbar.tsx", "lib/navigation.ts"]) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  let text = fs.readFileSync(file, "utf8");
  text = text.replaceAll("/cronograma/semana-1", "/cronograma").replaceAll("Cronograma — Semana 1", "Cronograma");
  fs.writeFileSync(file, text, "utf8");
}
console.log("Proteção de UTF-8 instalada em prebuild/predev e navegação normalizada.");
