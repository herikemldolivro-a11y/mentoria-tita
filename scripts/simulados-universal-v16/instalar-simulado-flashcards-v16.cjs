"use strict";
// MT_SIMULADO_NOTEBOOK_D1_INSTALLER_V16
// Applies only 3 simulation components + 2 calendar adapters.
const fs=require("fs");
const path=require("path");
const root=process.cwd();
function info(s){process.stdout.write("[TITA V16] "+s+"\n");}
function read(p){return fs.readFileSync(path.join(root,p),"utf8");}
function ensureFiles(){
 const required=[
  "package.json","app/calendario/page.tsx","app/estudos/simulados/page.tsx",
  "components/simulado-exam-runner.tsx","components/estudos-simulados.tsx",
  "components/principal-calendar.tsx","lib/principal-calendar-system.ts"
 ];
 for(const p of required){
  if(!fs.existsSync(path.join(root,p)))throw Error("Pasta ou versao da TITÃ incorreta; falta: "+p);
 }
 if(!read("components/simulado-exam-runner.tsx").includes("MT_SIMULADO_MANUAL_SELECTION_V153")||
    !read("components/estudos-simulados.tsx").includes("MT_SIMULADO_MANUAL_SELECTION_V153"))
  throw Error("A V15.3 de selecao manual deve estar instalada antes da V16. Nenhum arquivo alterado.");
 if(!read("components/principal-calendar.tsx").includes('kind: "simulado"'))
  throw Error("Seu calendario ainda nao tem a integracao dos simulados da V15.2. Nada alterado.");
}
function asset(name){
 const dir=process.env.TITA_V16_ASSET_DIR;
 if(!dir)throw Error("Pasta temporaria de arquivos V16 nao informada.");
 const p=path.join(dir,name);
 if(!fs.existsSync(p))throw Error("Arquivo V16 nao foi baixado: "+name);
 return fs.readFileSync(p,"utf8");
}
function assertSource(code,marker,name){
 if(!code.includes(marker)||code.length<200)throw Error("Arquivo V16 invalido: "+name);
}
function inspectTS(files){
 let ts;
 try{ts=require(path.join(root,"node_modules","typescript"));}
 catch{throw Error("TypeScript nao encontrado em node_modules. Instale as dependencias antes de atualizar. Nenhum arquivo alterado.");}
 for(const [name,code] of Object.entries(files)){
  const sf=ts.createSourceFile(name,code,ts.ScriptTarget.Latest,true,name.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  if(sf.parseDiagnostics.length){
   const details=sf.parseDiagnostics.map(d=>{
    const pos=sf.getLineAndCharacterOfPosition(d.start||0);
    return "L"+(pos.line+1)+":"+(pos.character+1)+" "+ts.flattenDiagnosticMessageText(d.messageText,"\n");
   }).join("; ");
   throw Error("Sintaxe invalida em "+name+" => "+details);
  }
 }
 info("Sintaxe TSX/TS dos cinco arquivos: OK.");
}
function rollback(changes,originals){
 for(const name of changes.reverse()){
  try{
   const dest=path.join(root,name),before=originals[name];
   if(before===null){fs.unlinkSync(dest);}else{fs.writeFileSync(dest,before);}
  }catch(e){info("ALERTA restaure do backup: "+name+" erro "+e.message);}
 }
}
function writeAll(planned,originals){
 const changes=Object.entries(planned).filter(([name,data])=>originals[name]===null ||
    originals[name].replace(/\r\n/g,"\n")!==data.replace(/\r\n/g,"\n"));
 if(!changes.length){info("V16 ja instalada. Nenhum arquivo regravado.");return;}
 const backup=path.join(root,".tita-backups","simulado-caderno-d1-v16-"+new Date().toISOString().replace(/[:.]/g,"-"));
 for(const [name] of changes){
  if(originals[name]!==null){
   const file=path.join(backup,name);
   fs.mkdirSync(path.dirname(file),{recursive:true});
   fs.copyFileSync(path.join(root,name),file);
  }
 }
 const changed=[];
 try{
  for(const [name,code] of changes){
   const dest=path.join(root,name);
   fs.mkdirSync(path.dirname(dest),{recursive:true});
   const stage=dest+".v16-"+process.pid+".tmp";
   fs.writeFileSync(stage,code,"utf8");
   try{fs.copyFileSync(stage,dest);}
   finally{try{fs.unlinkSync(stage);}catch{}}
   changed.push(name);
   if(fs.readFileSync(dest,"utf8")!==code)throw Error("Falha na verificacao de "+name);
   info("Atualizado: "+name);
  }
 }catch(e){
  rollback(changed,originals);
  throw Error("Falha ao instalar. Alteracoes restauradas. Backup: "+backup+". Causa: "+e.message);
 }
 info("Backup anterior: "+backup);
}
function run(){
 ensureFiles();
 const runner=asset("simulado-exam-runner.tsx");
 const ui=asset("estudos-simulados.tsx");
 const notebooks=asset("simulado-flashcards.tsx");
 const patchSource=asset("patch-calendar-d1-v16.cjs");
 assertSource(runner,"MT_SIMULADO_D1_FLASHCARDS_V16","leitor de questoes");
 assertSource(ui,"MT_SIMULADO_D1_FLASHCARDS_V16","pagina de simulados");
 assertSource(notebooks,"MT_SIMULADO_FLASHCARDS_V16","editor e leitor flashcard");
 assertSource(patchSource,"MT_SIMULADO_D1_CALENDAR_PATCH_V16","integrador do calendario");
 const patchModule={exports:{}};
 new Function("module","exports","require",patchSource)(patchModule,patchModule.exports,require);
 const {patchCalendarApi,patchCalendar}=patchModule.exports;
 if(typeof patchCalendarApi!=="function"||typeof patchCalendar!=="function")
  throw Error("O integrador de calendario nao possui as funcoes esperadas.");
 const names={
  runner:"components/simulado-exam-runner.tsx",
  ui:"components/estudos-simulados.tsx",
  notebooks:"components/simulado-flashcards.tsx",
  calendar:"components/principal-calendar.tsx",
  api:"lib/principal-calendar-system.ts"
 };
 const originals={};
 for(const name of Object.values(names)){
  originals[name]=fs.existsSync(path.join(root,name))?fs.readFileSync(path.join(root,name),"utf8"):null;
 }
 const planned={
  [names.runner]:runner,
  [names.ui]:ui,
  [names.notebooks]:notebooks,
  [names.calendar]:patchCalendar(originals[names.calendar]),
  [names.api]:patchCalendarApi(originals[names.api]),
 };
 if(patchCalendar(planned[names.calendar])!==planned[names.calendar]||
    patchCalendarApi(planned[names.api])!==planned[names.api])
  throw Error("Teste de idempotencia do calendario falhou. Nenhum arquivo alterado.");
 if(!planned[names.calendar].includes('"&notebook=1"') ||
    !planned[names.calendar].includes("simuladoNotebooks")||
    !planned[names.api].includes("notebook_count: number") ||
    !planned[names.ui].includes('url.get("notebook")==="1"') ||
    !planned[names.runner].includes("SimuladoFlashcardEditor"))
  throw Error("Integracao incompleta entre o simulado, calendario e caderno.");
 inspectTS(planned);
 writeAll(planned,originals);
 info("SUCESSO: caderno com texto e prints dentro da resolucao + revisao D-1 no calendario.");
 info("Questões, respostas, datas, cadernos das aulas e nivelamentos NAO foram alterados.");
}
try{run();}catch(e){
 info("FALHA DETALHADA: "+e.message);
 if(e.stack)info("LOCAL DO ERRO: "+e.stack.split("\n").slice(0,4).join(" | "));
 process.exitCode=1;
}
