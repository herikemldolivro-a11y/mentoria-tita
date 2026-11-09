"use strict";
// MT_SIMULADO_UNIVERSAL_INSTALLER_V15
// MT_SIMULADO_UNIVERSAL_OFFLINE_ASSETS_V151
const fs=require("fs");
const path=require("path");
// Download handled by PowerShell WebClient for Windows proxy compatibility.
const root=process.cwd();

const userMessage=s=>process.stdout.write("[TITA V15] "+s+"\n");
const files={
 runner:"components/simulado-exam-runner.tsx",
 ui:"components/estudos-simulados.tsx",
 calendar:"components/principal-calendar.tsx",
 api:"lib/principal-calendar-system.ts",
};
function validateProject(){
 for(const rel of ["package.json","app/calendario/page.tsx","app/estudos/simulados/page.tsx","private/simulados-pmal/manifest.json",...Object.values(files)]){
  if(!fs.existsSync(path.join(root,rel)))throw Error("Projeto errado ou modulo nao instalado; arquivo nao encontrado: "+rel);
 }
 let manifest=JSON.parse(fs.readFileSync(path.join(root,"private/simulados-pmal/manifest.json"),"utf8"));
 if(!Array.isArray(manifest.simulados))throw Error("Catalogo local de simulados invalido.");
 userMessage("TITÃ localizada: "+root+" ("+manifest.simulados.length+" simulados existentes).");
}
function validateSyntax(planned){
 let ts;
 try{ts=require(path.join(root,"node_modules","typescript"))}
 catch{throw Error("TypeScript nao encontrado em node_modules. Nenhum arquivo modificado. Execute npm.cmd install no projeto antes de repetir.");}
 for(const [rel,content] of Object.entries(planned)){
  const tsx=rel.endsWith(".tsx");
  const f=ts.createSourceFile(rel,content,ts.ScriptTarget.Latest,true,tsx?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  if(f.parseDiagnostics.length){
   const d=f.parseDiagnostics.map(x=>{
    const pos=f.getLineAndCharacterOfPosition(x.start||0);
    return (pos.line+1)+":"+(pos.character+1)+" "+ts.flattenDiagnosticMessageText(x.messageText,"\n");
   });
   throw Error("Sintaxe invalida no arquivo "+rel+": "+d.join("; "));
  }
 }
 userMessage("TypeScript: sintaxe de todos os 4 arquivos validada.");
}
async function run(){
 validateProject();
 userMessage("Usando 3 arquivos ja baixados pelo PowerShell (sem rede do Node.js)...");
 const assets=process.env.TITA_V15_ASSET_DIR;
 if(!assets||!fs.existsSync(assets))throw Error("Os arquivos da V15.1 nao foram baixados pelo PowerShell. Nenhum arquivo do projeto foi alterado.");
 const readAsset=name=>{
  const full=path.join(assets,name);
  if(!fs.existsSync(full))throw Error("Falta arquivo baixado: "+name+". Seus arquivos foram preservados.");
  return fs.readFileSync(full,"utf8");
 };
 const runner=readAsset("simulado-exam-runner.tsx");
 const ui=readAsset("estudos-simulados.tsx");
 const patch=readAsset("patch-calendar-v151.cjs");
 if(!runner.includes("MT_SIMULADO_UNIVERSAL_V15")||!runner.includes("mt_simulado_round_answers")||
    !ui.includes("MT_SIMULADO_UNIVERSAL_V15")||!ui.includes("mt_finish_simulado_round")||
    !patch.includes("MT_SIMULADO_UNIVERSAL_CALENDAR_V15"))
   throw Error("Arquivos baixados nao passaram pela verificacao de integridade.");
 const patchModule={exports:{}};
 // Evaluate only the first-party patch source from the pinned repository branch.
 new Function("module","exports","require",patch)(patchModule,patchModule.exports,require);
 const {patchCalendar,patchCalendarApi}=patchModule.exports;
 if(typeof patchCalendar!=="function"||typeof patchCalendarApi!=="function")throw Error("Integracao do calendario nao carregou.");
 const old={};for(const rel of Object.values(files))old[rel]=fs.readFileSync(path.join(root,rel),"utf8");
 const planned={
  [files.runner]:runner,
  [files.ui]:ui,
  [files.calendar]:patchCalendar(old[files.calendar]),
  [files.api]:patchCalendarApi(old[files.api]),
 };
 if(!planned[files.calendar].includes("MT_SIMULADO_UNIVERSAL_CALENDAR_V15") ||
    !planned[files.api].includes("MT_SIMULADO_UNIVERSAL_CALENDAR_API_V15"))
  throw Error("Calendario nao esta pronto para exibir a revisao de questoes.");
 validateSyntax(planned);
 const changed=Object.entries(planned).filter(([rel,code])=>code.replace(/\r\n/g,"\n")!==old[rel].replace(/\r\n/g,"\n"));
 if(!changed.length){userMessage("Versao V15 ja instalada; arquivos nao foram regravados.");return;}
 const backup=path.join(root,".tita-backups","simulados-universal-v15-"+new Date().toISOString().replace(/[:.]/g,"-"));
 for(const [rel] of changed){
  let dest=path.join(backup,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(path.join(root,rel),dest);
 }
 const changedFiles=[];
 try{
  for(const [rel,data] of changed){
   const dest=path.join(root,rel);
   const eol=old[rel].includes("\r\n")?"\r\n":"\n";
   const stage=dest+".v15-"+process.pid+".tmp";
   fs.writeFileSync(stage,data.replace(/\r?\n/g,eol),"utf8");
   fs.renameSync(stage,dest);
   changedFiles.push(rel);
   userMessage("Atualizado: "+rel);
  }
  for(const [rel,code] of changed){
   if(fs.readFileSync(path.join(root,rel),"utf8").replace(/\r\n/g,"\n")!==code.replace(/\r\n/g,"\n"))
    throw Error("Apos salvar, arquivo divergiu: "+rel);
  }
 }catch(e){
  for(const rel of changedFiles.reverse())try{fs.copyFileSync(path.join(backup,rel),path.join(root,rel))}catch{}
  throw Error("Falha; arquivos modificados restaurados do backup "+backup+". "+e.message);
 }
 userMessage("SUCESSO. Sistema universal de simulados + calendario principal atualizado.");
 userMessage("Backup dos arquivos anteriores: "+backup);
 userMessage("O banco ja contem as rodadas existentes e preserva os historicos.");
}
run().catch(e=>{
 process.stdout.write("[TITA V15] FALHA DETALHADA: "+e.message+"\n");
 if(e.stack)process.stdout.write("[TITA V15] DIAGNOSTICO: "+e.stack.split("\n").slice(0,5).join(" | ")+"\n");
 process.exitCode=1;
});
