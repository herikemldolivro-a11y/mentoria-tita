"use strict";
// MT_SIMULADO_UNIVERSAL_INSTALLER_V15
const fs=require("fs");
const path=require("path");
const https=require("https");
const root=process.cwd();
const base="https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-simulados-revisao-universal-v15-20261109/scripts/simulados-universal-v15/";
const userMessage=s=>process.stdout.write("[TITA V15] "+s+"\n");
const files={
 runner:"components/simulado-exam-runner.tsx",
 ui:"components/estudos-simulados.tsx",
 calendar:"components/principal-calendar.tsx",
 api:"lib/principal-calendar-system.ts",
};
function download(url,depth=0){
 return new Promise((resolve,reject)=>{
  if(depth>4)return reject(Error("Excesso de redirecionamentos: "+url));
  let urlWithCache=url+(url.includes("?")?"&":"?")+"v=20261109-v15r3";
  const req=https.get(urlWithCache,{timeout:30000,headers:{"Cache-Control":"no-cache","User-Agent":"Mentoria-Tita-V15"}},r=>{
   if([301,302,307,308].includes(r.statusCode)){
    const dest=r.headers.location;r.resume();
    if(!dest)return reject(Error("Redirecionamento sem destino: "+url));
    return resolve(download(new URL(dest,url).toString(),depth+1));
   }
   if(r.statusCode!==200){r.resume();return reject(Error("Download falhou HTTP "+r.statusCode+": "+url))}
   const chunks=[];r.on("data",b=>chunks.push(b));r.on("end",()=>resolve(Buffer.concat(chunks).toString("utf8")));r.on("error",reject);
  });
  req.on("timeout",()=>req.destroy(Error("Tempo limite ao baixar "+url)));req.on("error",reject);
 });
}
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
 catch{throw Error("TypeScript local nao encontrado. Rode npm.cmd install na pasta da TITÃ antes de instalar; seus arquivos permanecem intactos.");}
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
 userMessage("Baixando os componentes e a integracao com o calendario...");
 const [runner,ui,patch]=await Promise.all([
  download(base+"simulado-exam-runner.tsx"),
  download(base+"estudos-simulados.tsx"),
  download(base+"patch-calendar-v15.cjs"),
 ]);
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
run().catch(e=>{process.stderr.write("[TITA V15] ERRO REAL: "+e.message+"\n");process.exitCode=1;});
