"use strict";
// MT_SIMULADO_FLASHCARD_INSTALL_V154
// Source files are staged and syntax-validated before any local modification.
const fs=require("fs"),path=require("path");
const project=path.resolve(process.argv[2]||process.cwd());
const assets=path.resolve(process.argv[3]||"");
function requireFile(p,label){if(!fs.existsSync(p))throw Error("Arquivo não encontrado ("+label+"): "+p);return fs.readFileSync(p,"utf8");}
function validateExactlyOne(s,marker,label){if(!s.includes(marker))throw Error(label+" ausente; instale antes a V15.3.");}
const patch=require(path.join(assets,"patch-calendar-flashcards-v154.cjs"));
const files=[
  ["simulado-exam-runner.tsx","components/simulado-exam-runner.tsx"],
  ["estudos-simulados.tsx","components/estudos-simulados.tsx"],
  ["simulado-flashcards-v154.tsx","components/simulado-flashcards.tsx"],
];
const old={};const planned={};
for(const [src,dest] of files){
  const target=path.join(project,dest);
  old[dest]=fs.existsSync(target)?fs.readFileSync(target,"utf8"):null;
  planned[dest]=requireFile(path.join(assets,src),src);
}
for(const dest of ["components/principal-calendar.tsx","lib/principal-calendar-system.ts"]){
  const target=path.join(project,dest);
  old[dest]=requireFile(target,dest);
}
validateExactlyOne(old["components/simulado-exam-runner.tsx"]||"","MT_SIMULADO_MANUAL_SELECTION_V153","Simulado V15.3");
validateExactlyOne(old["components/estudos-simulados.tsx"]||"","MT_SIMULADO_MANUAL_SELECTION_V153","Estudos V15.3");
validateExactlyOne(planned["components/simulado-exam-runner.tsx"],"MT_SIMULADO_FLASHCARDS_V154","Runner V15.4");
validateExactlyOne(planned["components/estudos-simulados.tsx"],"MT_SIMULADO_FLASHCARDS_V154","Estudos V15.4");
validateExactlyOne(planned["components/simulado-flashcards.tsx"],"MT_SIMULADO_FLASHCARDS_V154","Editor V15.4");
if(!planned["components/estudos-simulados.tsx"].includes("mt_simulado_round_selections")||
   !planned["components/simulado-exam-runner.tsx"].includes("mt_simulado_round_selections"))
   throw Error("Proteção de seleção MANUAL ausente; a instalação foi interrompida.");
planned["components/principal-calendar.tsx"]=patch.patchCalendar(old["components/principal-calendar.tsx"]);
planned["lib/principal-calendar-system.ts"]=patch.patchCalendarApi(old["lib/principal-calendar-system.ts"]);
if(!planned["components/principal-calendar.tsx"].includes("MT_SIMULADO_FLASHCARD_CALENDAR_V154")||
   !planned["lib/principal-calendar-system.ts"].includes("MT_SIMULADO_FLASHCARD_CALENDAR_API_V154"))
   throw Error("A integração do calendário não pôde ser validada.");
let ts;
try{ts=require(path.join(project,"node_modules","typescript"));}
catch{throw Error("TypeScript não encontrado na TITÃ. Execute npm.cmd install; nenhum arquivo foi alterado.");}
for(const [rel,source] of Object.entries(planned)){
  const ast=ts.createSourceFile(rel,source,ts.ScriptTarget.Latest,true,
    rel.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  if(ast.parseDiagnostics.length){
    const errors=ast.parseDiagnostics.map(err=>{
      const {line}=ast.getLineAndCharacterOfPosition(err.start||0);
      return rel+":"+(line+1)+" "+ts.flattenDiagnosticMessageText(err.messageText," ");
    });
    throw Error("SINTAXE INVÁLIDA; instalação cancelada:\n"+errors.join("\n"));
  }
}
const changes=Object.keys(planned).filter(rel=>old[rel]!==planned[rel]);
if(!changes.length){console.log("[TITÃ V15.4] Já instalado; nenhuma alteração necessária.");process.exit(0);}
const tag=new Date().toISOString().replace(/[^0-9]/g,"").slice(0,14)+"-"+Math.random().toString(36).slice(2,7);
const backup=path.join(project,".tita-backups","simulado-flashcards-v154-"+tag);
for(const rel of changes){
  if(old[rel]!==null){
    const dst=path.join(backup,rel);
    fs.mkdirSync(path.dirname(dst),{recursive:true});
    fs.writeFileSync(dst,old[rel],"utf8");
  }
}
const written=[];
try{
  for(const rel of changes){
    const dst=path.join(project,rel),tmp=dst+".tita-v154.tmp";
    fs.mkdirSync(path.dirname(dst),{recursive:true});
    try{
      fs.writeFileSync(tmp,planned[rel],"utf8");
      fs.copyFileSync(tmp,dst);
      if(fs.readFileSync(dst,"utf8")!==planned[rel])throw Error("Falha de verificação: "+rel);
      written.push(rel);
      console.log("[TITÃ V15.4] Instalado: "+rel);
    }finally{try{fs.unlinkSync(tmp);}catch{}}
  }
}catch(err){
  console.error("[TITÃ V15.4] Erro; restaurando arquivos anteriores...");
  for(const rel of written.reverse()){
    const dst=path.join(project,rel);
    try{if(old[rel]===null)fs.unlinkSync(dst);else fs.writeFileSync(dst,old[rel],"utf8");}catch(e){console.error("Restaure manualmente: "+rel+" de "+backup);}
  }
  throw err;
}
console.log("[TITÃ V15.4] SUCESSO. Caderno na resolução + véspera no calendário principal.");
console.log("[TITÃ V15.4] Seleção de questões SOMENTE MANUAL; respostas e históricos preservados.");
console.log("[TITÃ V15.4] Backup: "+backup);
console.log("[TITÃ V15.4] Atualize o navegador com Ctrl+F5 e reinicie o servidor local se necessário.");
