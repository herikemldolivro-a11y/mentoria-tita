"use strict";
// MT_SIMULADOS_CATALOGO_ROUTE_REPAIR_V3
// Repairs missing/unregistered Next.js catalog endpoint, without touching user data.
const fs=require("fs");
const path=require("path");
const root=path.resolve(process.argv[2] || process.cwd());
const staging=path.resolve(process.argv[3] || "");
const marker="MT_SIMULADOS_CATALOGO_RECOVERY_V2";
function say(message){console.log("[TITÃ CATÁLOGO V3] "+message);}
function check(condition,message){if(!condition)throw new Error(message);}
function read(p){return fs.readFileSync(p,"utf8");}
function findAppRoot(){
 const candidates=["app","src/app"];
 for(const folder of candidates){
  if(fs.existsSync(path.join(root,folder,"estudos","simulados","page.tsx")) ||
     fs.existsSync(path.join(root,folder,"estudos","simulados","page.jsx")) ||
     fs.existsSync(path.join(root,folder,"estudos","simulados","page.js"))) return folder;
 }
 for(const folder of candidates)if(fs.existsSync(path.join(root,folder)) && fs.statSync(path.join(root,folder)).isDirectory())return folder;
 throw new Error("Não foi encontrada a pasta app do Next.js na TITÃ.");
}
try{
 check(fs.existsSync(path.join(root,"package.json")),"Pasta do projeto TITÃ não encontrada.");
 const ui=path.join(root,"components","estudos-simulados.tsx");
 check(fs.existsSync(ui),"A tela components/estudos-simulados.tsx não foi encontrada.");
 const component=read(ui);
 const targetUrl="/api/estudos/simulados/catalogo-v2";
 check(component.includes(targetUrl) && component.includes("fetch(catalogApi"),
  "A versão local da tela não usa a rota catálogo-v2. Nenhum arquivo foi alterado.");
 const manifest=path.join(root,"private","simulados-pmal","manifest.json");
 check(fs.existsSync(manifest),"O catálogo privado não foi encontrado: private/simulados-pmal/manifest.json.");
 const parsed=JSON.parse(read(manifest));
 const entries=Array.isArray(parsed)?parsed:parsed && parsed.simulados;
 check(Array.isArray(entries)&&entries.length>0,"O catálogo local não possui simulados válidos.");
 check(entries.every(s=>s && typeof s.id==="string" && Array.isArray(s.questoes)),"A estrutura do catálogo não é compatível.");
 const ids=new Set(entries.map(s=>s.id));
 check(ids.size===entries.length,"Há identificadores duplicados no catálogo. Corrija antes de continuar.");
 const appDir=findAppRoot();
 const rel=path.join(appDir,"api","estudos","simulados","catalogo-v2","route.ts");
 const destination=path.join(root,rel);
 const sourceFile=path.join(staging,"catalogo-v2-route.ts");
 check(fs.existsSync(sourceFile),"Arquivo de reparo da rota não foi baixado.");
 const source=read(sourceFile);
 check(source.includes(marker) && source.includes("export async function GET()") &&
 source.includes("supabase.auth.getUser()") && source.includes("private\", \"simulados-pmal") &&
 source.includes("NextResponse.json"),"Rota não passou na validação de segurança; nada alterado.");
 check(!fs.existsSync(path.join(path.dirname(destination),"page.tsx")),
  "Existe um page.tsx conflitante na pasta da API. Nenhum arquivo foi alterado.");
 const ts=require(require.resolve("typescript",{paths:[root]}));
 const ast=ts.createSourceFile(rel,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 if(ast.parseDiagnostics.length){
   const d=ast.parseDiagnostics[0],pos=ast.getLineAndCharacterOfPosition(d.start||0);
   throw new Error("Rota com sintaxe inválida, linha "+(pos.line+1)+": "+ts.flattenDiagnosticMessageText(d.messageText," "));
 }
 const previous=fs.existsSync(destination)?read(destination):null;
 if(previous !== null && previous!==source && !previous.includes(marker)){
  throw new Error("Existe outra implementação da rota catalogo-v2. Arquivo preservado para evitar sobrescrita.");
 }
 if(previous!==source){
  const backupDir=path.join(root,".tita-backups");
  fs.mkdirSync(backupDir,{recursive:true});
  if(previous!==null){
    const backup=path.join(backupDir,"catalogo-v2-before-repair-v3-"+new Date().toISOString().replace(/[:.]/g,"-")+".ts");
    fs.copyFileSync(destination,backup);
    say("Backup da rota anterior: "+backup);
  }
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  const tmp=destination+".tmp-repair-"+process.pid;
  fs.writeFileSync(tmp,source,"utf8");
  try{fs.renameSync(tmp,destination);}catch(e){try{fs.rmSync(tmp,{force:true});}catch{}throw e;}
  say("Rota instalada: "+rel.replace(/\\/g,"/"));
 }else{
  say("Rota já está no local correto: "+rel.replace(/\\/g,"/"));
 }
 check(read(destination)===source,"A verificação do arquivo instalado falhou.");
 say("Catálogo preservado: "+entries.length+" atividades, "+[...new Set(entries.map(x=>x.dia))].length+" dias.");
 say("Nenhuma questão, resposta, gabarito, PDF ou revisão foi modificada.");
 say("IMPORTANTE: reinicie o npm.cmd run dev (Ctrl+C no terminal antigo) e depois use Ctrl+F5.");
 say("URL de teste: http://localhost:3000"+targetUrl);
}catch(e){
 console.error("[TITÃ CATÁLOGO V3] ERRO: "+(e instanceof Error?e.message:String(e)));
 process.exitCode=1;
}