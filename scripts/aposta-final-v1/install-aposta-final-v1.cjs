"use strict";
// MT_APOSTA_FINAL_INSTALLER_V1 · downloads staged by PowerShell
const fs=require("fs"),path=require("path");
const root=path.resolve(process.argv[2]||process.cwd());
const stage=path.resolve(process.argv[3]||"");
function log(t){console.log("[TITÃ APOSTA FINAL] "+t);}
function insist(ok,msg){if(!ok)throw Error(msg);}
insist(fs.existsSync(path.join(root,"package.json")),"Pasta da TITÃ inválida.");
insist(fs.existsSync(stage),"Arquivos de instalação não foram baixados.");
const ts=require(require.resolve("typescript",{paths:[root]}));
const {patchRunner}=require(path.join(stage,"patch-aposta-final-runner.cjs"));
const {applyFile}=require(path.join(stage,"patch-aposta-final-shell.cjs"));
const targets=[
 ["data/aposta-final/semana-01-direito-penal.json","semana-01-direito-penal.json","new"],
 ["components/aposta-final-experience.tsx","aposta-final-experience.tsx","new"],
 ["components/aposta-final-calendar-v1.tsx","aposta-final-calendar-v1.tsx","new"],
 ["app/aposta-final/page.tsx","aposta-final-page.tsx","new"],
 ["components/simulado-exam-runner.tsx",null,"runner"],
 ["components/pmal-home-experience.tsx",null,"shell"],
 ["components/pmal-study-path.tsx",null,"shell"],
 ["app/calendario/page.tsx",null,"shell"],
 ["components/principal-calendar.tsx",null,"shell"],
];
const changes=[];
let backupRoot=null;
function checkTSX(relative,source){
 const file=ts.createSourceFile(relative,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 if(file.parseDiagnostics.length){
   const first=file.parseDiagnostics[0];
   const loc=file.getLineAndCharacterOfPosition(first.start||0);
   const why=ts.flattenDiagnosticMessageText(first.messageText,"\n");
   throw Error("Sintaxe inválida em "+relative+" · linha "+(loc.line+1)+": "+why);
 }
}
function preflight(){
 const catalogue=JSON.parse(fs.readFileSync(path.join(stage,"semana-01-direito-penal.json"),"utf8"));
 insist(catalogue.version==="MT_APOSTA_FINAL_V1","Arquivo de questões sem identificação esperada.");
 insist(catalogue.semana===1 && catalogue.materia==="Direito Penal","Matéria não corresponde à Semana 1.");
 insist(catalogue.dias?.length===7,"Devem existir exatamente sete dias.");
 const expected=[30,30,15,30,15,30,60];
 let unique=new Set(),num=0;
 catalogue.dias.forEach((day,i)=>{
   insist(day.dia===i+1&&day.questoes.length===expected[i],"Quantidade divergente no dia "+(i+1));
   const perDay=new Set();
   for(const q of day.questoes){
     insist(q.numero===perDay.size+1,"Numeração fora da ordem no dia "+day.dia);
     insist(q.uuid && q.enunciado && ["C","E"].includes(q.gabarito),"Questão incompleta no dia "+day.dia);
     insist(!perDay.has(q.uuid),"Questão duplicada no mesmo dia.");
     perDay.add(q.uuid);unique.add(q.uuid);num++;
   }
 });
 insist(num===210&&unique.size===210,"Conferência das 210 questões não passou.");
 const runnerPath=path.join(root,"components/simulado-exam-runner.tsx");
 const flashcards=path.join(root,"components/simulado-flashcards.tsx");
 insist(fs.existsSync(runnerPath),"Runner dos simulados não encontrado. Instale a versão dos simulados V15.5 antes.");
 insist(fs.existsSync(flashcards),"Caderno de flashcards dos simulados não encontrado. Instale a V15.4 antes.");
 for(const [rel,staged,kind] of targets){
   const dest=path.join(root,rel);
   insist(kind==="new"||fs.existsSync(dest),"Arquivo essencial não encontrado: "+rel);
   const original=fs.existsSync(dest)?fs.readFileSync(dest,"utf8"):null;
   let after;
   if(kind==="new"){
     after=fs.readFileSync(path.join(stage,staged),"utf8");
     if(rel.endsWith(".tsx"))insist(after.includes("ApostaFinal"),"Componente da Aposta Final não confere: "+rel);
   }else if(kind==="runner")after=patchRunner(original);
   else after=applyFile(rel,original);
   if(rel.endsWith(".tsx"))checkTSX(rel,after);
   if(after!==original)changes.push({rel,dest,original,after});
 }
 return {total:num,changes};
}
function backupAndWrite(){
 backupRoot=path.join(root,".tita-backups","aposta-final-v1-"+new Date().toISOString().replace(/[:.]/g,"-"));
 fs.mkdirSync(backupRoot,{recursive:true});
 const written=[];
 try{
   for(const c of changes){
     if(c.original!==null){
       const backup=path.join(backupRoot,c.rel);
       fs.mkdirSync(path.dirname(backup),{recursive:true});
       fs.writeFileSync(backup,c.original,"utf8");
     }
     fs.mkdirSync(path.dirname(c.dest),{recursive:true});
     const temporary=c.dest+".aposta-final-stage-"+process.pid;
     fs.writeFileSync(temporary,c.after,"utf8");
     fs.renameSync(temporary,c.dest);
     written.push(c);
     log("OK "+c.rel);
   }
 }catch(e){
   for(const c of written.reverse()){
     try{if(c.original===null)fs.rmSync(c.dest,{force:true});else fs.writeFileSync(c.dest,c.original,"utf8");}catch{}
   }
   throw e;
 }
}
try{
 log("Conferindo as 210 questões, 7 dias e integridade das telas...");
 const result=preflight();
 log("Banco validado: "+result.total+" itens, 7 dias · Dia 7 com 60 questões.");
 if(!changes.length){
   log("Tudo já instalado. Nenhum arquivo precisava ser alterado.");
 }else{
   backupAndWrite();
   log(changes.length+" arquivos atualizados com segurança.");
   log("Cópia de segurança: "+backupRoot);
 }
 log("A APOSTA FINAL está disponível no CFO PMAL: http://localhost:3000/aposta-final");
 log("Reinicie o servidor ou use Ctrl+F5 para visualizar.");
 log("Nenhuma questão, revisão ou flashcard existente foi apagado.");
}catch(e){console.error("[TITÃ APOSTA FINAL] ERRO: "+(e instanceof Error?e.message:String(e)));process.exitCode=1;}
