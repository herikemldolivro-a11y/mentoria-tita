"use strict";
// MT_ENGLISH_INSTALL_V160 · backup, preflight TS/TSX, rollback
const fs=require("fs"),path=require("path");
const project=path.resolve(process.argv[2]||process.cwd());
const assets=path.resolve(process.argv[3]||"");
const read=(p)=>fs.readFileSync(p,"utf8");
const pathIn=(p)=>path.join(project,p);
const asset=(p)=>read(path.join(assets,p));
if(!fs.existsSync(pathIn("package.json")))throw Error("Execute na pasta raiz da TITÃ.");
const patch=require(path.join(assets,"patch-english-v160.cjs"));
const copy=[
 ["english-daily-routine-v160.tsx","components/english-daily-routine-v160.tsx"],
 ["english-calendar-priority-v160.tsx","components/english-calendar-priority-v160.tsx"],
 ["english-routine-page-v160.tsx","app/ingles/rotina/page.tsx"],
 ["english-ai-route-v160.ts","app/api/ingles/frases/route.ts"],
];
const current={};const updated={};
for(const [src,target] of copy){
 current[target]=fs.existsSync(pathIn(target))?read(pathIn(target)):null;
 updated[target]=asset(src);
}
const local=[
 ["components/english-hub.tsx",patch.patchHub],
 ["components/english-reader.tsx",patch.patchReader],
 ["components/principal-calendar.tsx",patch.patchCalendar],
];
for(const [rel,change] of local){
 if(!fs.existsSync(pathIn(rel)))throw Error("Componente existente ausente: "+rel);
 current[rel]=read(pathIn(rel));
 updated[rel]=change(current[rel]);
}
const required=[
 ["components/english-daily-routine-v160.tsx","MT_ENGLISH_ROUTINE_V160"],
 ["components/english-calendar-priority-v160.tsx","MT_ENGLISH_CALENDAR_PRIORITY_V160"],
 ["components/english-hub.tsx","MT_ENGLISH_HUB_V160"],
 ["components/english-reader.tsx","MT_ENGLISH_READER_RETURN_V160"],
 ["components/principal-calendar.tsx","MT_ENGLISH_CALENDAR_PRIORITY_V160"],
 ["app/api/ingles/frases/route.ts","OPENAI_API_KEY"],
];
for(const [rel,marker] of required)if(!updated[rel].includes(marker))throw Error("Falta componente da versão V16: "+rel);
// Preserve any local simulado integration, but do not REQUIRE that marker:
const simMarker="MT_SIMULADO_UNIVERSAL_CALENDAR_V15";
if(current["components/principal-calendar.tsx"].includes(simMarker) &&
   !updated["components/principal-calendar.tsx"].includes(simMarker))
  throw Error("Proteção de compatibilidade: o calendário perderia a integração existente dos simulados.");
let ts;
try{ts=require(pathIn("node_modules/typescript"));}
catch{throw Error("TypeScript não encontrado; execute npm.cmd install antes. Nada alterado.");}
for(const [rel,source] of Object.entries(updated)){
 const file=ts.createSourceFile(rel,source,ts.ScriptTarget.Latest,true,
  rel.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 if(file.parseDiagnostics.length){
  const errors=file.parseDiagnostics.map(e=>rel+":"+(file.getLineAndCharacterOfPosition(e.start||0).line+1)+" "+ts.flattenDiagnosticMessageText(e.messageText," "));
  throw Error("Código não passou na validação TypeScript (sem alterações locais):\n"+errors.join("\n"));
 }
}
const changed=Object.keys(updated).filter(p=>current[p]!==updated[p]);
if(!changed.length){console.log("[TITÃ V16.0] Já instalado; seus arquivos permanecem iguais.");process.exit(0);}
const tag=new Date().toISOString().replace(/[^0-9]/g,"").slice(0,14)+"-"+Math.random().toString(36).slice(2,7);
const backup=pathIn(".tita-backups/ingles-rotina-v160-"+tag);
for(const rel of changed){
 if(current[rel]!==null){
  const dst=path.join(backup,rel);
  fs.mkdirSync(path.dirname(dst),{recursive:true});
  fs.writeFileSync(dst,current[rel],"utf8");
 }
}
const written=[];
try{
 for(const rel of changed){
  const dst=pathIn(rel),temp=dst+".tita-v160.tmp";
  fs.mkdirSync(path.dirname(dst),{recursive:true});
  try{
   fs.writeFileSync(temp,updated[rel],"utf8");
   fs.copyFileSync(temp,dst);
   written.push(rel);
   if(read(dst)!==updated[rel])throw Error("Verificação da gravação falhou: "+rel);
  }finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
  console.log("[TITÃ V16.0] Instalado: "+rel);
 }
}catch(e){
 console.error("[TITÃ V16.0] Falha; restaurando todos os arquivos modificados.");
 for(const rel of written.reverse()){
  const dst=pathIn(rel);
  try{if(current[rel]===null)fs.unlinkSync(dst);else fs.writeFileSync(dst,current[rel],"utf8");}
  catch{console.error("Não foi possível restaurar "+rel+"; consulte "+backup);}
 }
 throw e;
}
console.log("[TITÃ V16.0] SUCESSO: nova aba /ingles/rotina; prioridade no calendário; revisões D+2, D+4, D+7.");
console.log("[TITÃ V16.0] Os dados do seu vocabulário e simulados não foram apagados.");
console.log("[TITÃ V16.0] Backup: "+backup);
console.log("[TITÃ V16.0] Reinicie o servidor local e atualize o navegador com Ctrl+F5.");
