"use strict";
// MT_FIX_LEVELING_404_V1 · safe targeted repair
const fs=require("fs");
const path=require("path");
const project=path.resolve(process.argv[2]||process.cwd());
const stage=path.resolve(process.argv[3]||"");
const ts=require(require.resolve("typescript",{paths:[project]}));
function info(s){console.log("[TITÃ NIVELAMENTO 404] "+s);}
function check(ok,s){if(!ok)throw new Error(s);}
function parseTS(rel,source){
 const type=rel.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS;
 const node=ts.createSourceFile(rel,source,ts.ScriptTarget.Latest,true,type);
 if(node.parseDiagnostics.length){
  const d=node.parseDiagnostics[0],loc=node.getLineAndCharacterOfPosition(d.start||0);
  throw Error("Sintaxe inválida em "+rel+" linha "+(loc.line+1)+": "+ts.flattenDiagnosticMessageText(d.messageText," "));
 }
}
const primary="app/questoes/banco/nivelamento/[attemptId]/page.tsx";
const optional=[
 ["app/questoes/lista/[attemptId]/page.tsx","lesson-list-page.tsx"],
 ["app/nivelamentos/page.tsx","leveling-home-page.tsx"],
 ["components/leveling-question-bank.tsx","leveling-question-bank.tsx"],
 ["components/leveling-learning-center.tsx","leveling-learning-center.tsx"],
 ["lib/leveling-learning-system.ts","leveling-learning-system.ts"],
];
const bridge="import { redirect } from \"next/navigation\";\nimport { requireAuthenticatedUser } from \"@/lib/auth\";\n// MT_FIX_LEVELING_404_BRIDGE_V1: compatibility for historical links.\nexport const dynamic = \"force-dynamic\";\nexport default async function NivelamentoBridge({params}:{params:Promise<{attemptId:string}>}){\n  await requireAuthenticatedUser();\n  const {attemptId}=await params;\n  redirect(\"/questoes/banco/nivelamento/\"+encodeURIComponent(attemptId));\n}\n";
const changes=[];
function queue(rel,data,policy="replace"){
 const target=path.join(project,rel);
 const present=fs.existsSync(target);
 if(policy==="missing"&&present)return;
 const original=present?fs.readFileSync(target,"utf8"):null;
 if(original===data)return;
 parseTS(rel,data);
 changes.push({rel,target,original,data});
}
function run(){
 check(fs.existsSync(path.join(project,"package.json")),"A pasta informada não é a TITÃ.");
 check(fs.existsSync(stage),"Não encontrei o pacote de reparo.");
 const rawRoute=fs.readFileSync(path.join(stage,"leveling-bank-page.tsx"),"utf8");
 check(rawRoute.includes("LevelingQuestionBank")&&rawRoute.includes("attemptId"),
   "O componente da rota principal não corresponde ao nivelamento.");
 queue(primary,rawRoute,"replace");
 for(const [rel,staged] of optional){
  if(!fs.existsSync(path.join(project,rel))){
   const content=fs.readFileSync(path.join(stage,staged),"utf8");
   queue(rel,content,"missing");
  }
 }
 queue("app/nivelamentos/[attemptId]/page.tsx",bridge,"missing");
 queue("app/questoes/nivelamento/[attemptId]/page.tsx",bridge,"missing");
 const launcher="lib/principal-leveling-launch.ts";
 if(fs.existsSync(path.join(project,launcher))){
  const s=fs.readFileSync(path.join(project,launcher),"utf8");
  const idExpression="$"+"{encodeURIComponent(id)}";
  const from="/questoes/lista/"+idExpression+"?mode=leveling";
  const to="/questoes/banco/nivelamento/"+idExpression;
  queue(launcher,s.replace(from,to));
 }else{
  queue(launcher,fs.readFileSync(path.join(stage,"principal-leveling-launch.ts"),"utf8"),"missing");
 }
 const expected=[
   "components/leveling-question-bank.tsx",
   "lib/question-bank.ts",
   "components/question-card.tsx",
   "lib/auth.ts",
   "components/page-shell.tsx",
   "lib/supabase/client.ts",
 ];
 for(const rel of expected){
  check(fs.existsSync(path.join(project,rel))||changes.some(c=>c.rel===rel),
    "Dependência necessária ausente: "+rel+". Nenhum arquivo foi alterado.");
 }
 const bankFile=fs.readFileSync(path.join(stage,"leveling-question-bank.tsx"),"utf8");
 check(bankFile.includes("finalizeLevelingAttempt")&&bankFile.includes("submitAttemptAnswer"),
  "O banco de nivelamentos não passou na verificação de integridade.");
 const backupFolder=path.join(project,".tita-backups","nivelamento-404-"+new Date().toISOString().replace(/[:.]/g,"-"));
 if(changes.length===0){info("As rotas já estão corretas. Reinicie o Next.js e limpe o cache .next se o erro persistir.");return;}
 fs.mkdirSync(backupFolder,{recursive:true});
 const performed=[];
 try{
  for(const c of changes){
   if(c.original!==null){
    const saved=path.join(backupFolder,c.rel);
    fs.mkdirSync(path.dirname(saved),{recursive:true});
    fs.writeFileSync(saved,c.original,"utf8");
   }
   fs.mkdirSync(path.dirname(c.target),{recursive:true});
   const temp=c.target+".tmp-nivelamento-"+process.pid;
   fs.writeFileSync(temp,c.data,"utf8");
   fs.renameSync(temp,c.target);
   performed.push(c);
   info((c.original===null?"Criado":"Corrigido")+" "+c.rel);
  }
 }catch(e){
  for(const c of performed.reverse()){
   try{
    if(c.original===null)fs.rmSync(c.target,{force:true});
    else fs.writeFileSync(c.target,c.original,"utf8");
   }catch{}
  }
  throw e;
 }
 info("Concluído · rotas de nivelamento restauradas, sem alterar questões nem revisões.");
 info("Backup dos arquivos anteriores: "+backupFolder);
 info("Reinicie com npm.cmd run dev e abra o nivelamento novamente.");
}
try{run();}catch(e){
 console.error("[TITÃ NIVELAMENTO 404] ERRO: "+(e instanceof Error?e.message:String(e)));
 process.exitCode=1;
}
