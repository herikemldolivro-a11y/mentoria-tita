import { rmSync } from "node:fs";

rmSync(".next", { recursive: true, force: true });
rmSync("tsconfig.tsbuildinfo", { force: true });

console.log("CACHE DO NEXT LIMPO PARA BUILD DE PRODUCAO");