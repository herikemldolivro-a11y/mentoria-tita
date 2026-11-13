"use strict";
// MT_SIMULADOS_CATALOGO_RECOVERY_INSTALL_V2
const fs=require("fs"),path=require("path");
const root=path.resolve(process.argv[2]||process.cwd());
const stage=path.resolve(process.argv[3]||"");
const UI="components/estudos-simulados.tsx";
const ROUTE="app/api/estudos/simulados/catalogo-v2/route.ts";
const MARK="MT_SIMULADOS_CATALOGO_RECOVERY_UI_V2";
const prefix="[TITÃ CATÁLOGO V2] ";
const log=t=>console.log(prefix+t);
function assert(ok,msg){if(!ok)throw Error(msg);}
function read(p){return fs.readFileSync(p,"utf8");}
function parseTs(ts,rel,source){
 const kind=rel.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS;
 const tree=ts.createSourceFile(rel,source,ts.ScriptTarget.Latest,true,kind);
 if(tree.parseDiagnostics.length){
  const x=tree.parseDiagnostics[0],loc=tree.getLineAndCharacterOfPosition(x.start||0);
  throw Error(rel+" tem erro de sintaxe na linha "+(loc.line+1)+": "+ts.flattenDiagnosticMessageText(x.messageText," "));
 }
}
function patchUi(source){
 if(source.includes(MARK))return source;
 assert(source.includes("TitaSimuladosSemanaUm")&&source.includes("mt_simulado_saved_questions"),
   "A tela de simulados não é compatível; nenhuma alteração aplicada.");
 const from='const api = "/api/estudos/simulados";';
 const to='const api = "/api/estudos/simulados";\nconst catalogApi = "/api/estudos/simulados/catalogo-v2"; // '+MARK;
 const oldFetch='fetch(api,{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error("Falha ao carregar o catálogo de simulados.");return r.json()})';
 const newFetch='fetch(catalogApi,{cache:"no-store"}).then(async r=>{if(!r.ok){let detail="";try{const problem=await r.json();detail=String(problem.error||"");}catch{}throw new Error("Falha ao carregar o catálogo de simulados (HTTP "+r.status+")"+(detail?": "+detail:"."));}return r.json()})';
 for(const [a,b,label] of [[from,to,"const api"],[oldFetch,newFetch,"consulta do catálogo"]]){
  const n=source.split(a).length-1;
  assert(n===1,"Não encontrei o trecho esperado '"+label+"' de forma única ("+n+"). Nenhuma alteração aplicada.");
  source=source.replace(a,b);
 }
 assert(source.includes(MARK)&&source.includes("toggleSave(current,q.numero)")&&
   source.includes("SimuladoFlashcardReview")&&source.includes("mt_finish_simulado_round")&&
   source.includes("const api =")&&source.includes("const catalogApi ="),
   "Validação de preservação do código falhou.");
 return source;
}
function run(){
 assert(fs.existsSync(path.join(root,"package.json")),"Não encontrei a pasta mentoria-tita.");
 const manifest=path.join(root,"private/simulados-pmal/manifest.json");
 const localUI=path.join(root,UI);
 const routeSource=path.join(stage,"catalogo-v2-route.ts");
 assert(fs.existsSync(manifest)&&fs.existsSync(localUI)&&fs.existsSync(routeSource),
  "Arquivos necessários ausentes. Confirme que a instalação dos simulados foi feita.");
 const parsed=JSON.parse(read(manifest));
 const catalog=Array.isArray(parsed)?parsed:parsed?.simulados;
 assert(Array.isArray(catalog)&&catalog.length,"A lista do manifest.json é inválida. Arquivo não alterado.");
 const counts=new Map();
 const ids=new Set();
 for(const [i,x] of catalog.entries()){
  assert(x && typeof x.id==="string" && Number.isInteger(x.dia) &&
    Array.isArray(x.questoes)&&x.questoes.length>=1&&x.arquivos,
    "Simulado "+(i+1)+" está inválido no manifest.json. Nada foi alterado.");
  assert(!ids.has(x.id),"ID de simulado duplicado: "+x.id);
  ids.add(x.id);
  counts.set(x.dia,(counts.get(x.dia)||0)+1);
 }
 const wanted=Array.from({length:17},(_,i)=>i+8);
 const missing=wanted.filter(d=>(counts.get(d)||0)<3);
 assert(!missing.length,
   "Os dias "+missing.join(", ")+" não possuem as 3 atividades previstas. A instalação anterior precisa ser conferida. Nenhum arquivo alterado.");
 log("Manifesto válido: "+catalog.length+" simulados; dias 08 a 24 completos.");
 const uiNow=read(localUI);
 const uiNext=patchUi(uiNow);
 const routeNow=fs.existsSync(path.join(root,ROUTE))?read(path.join(root,ROUTE)):null;
 const routeNext=read(routeSource);
 assert(routeNext.includes("MT_SIMULADOS_CATALOGO_RECOVERY_V2")&&routeNext.includes("supabase.auth.getUser()")&&routeNext.includes('private", "simulados-pmal"'),
  "Rota nova não passou na verificação de segurança. Nada alterado.");
 assert(routeNow===null||routeNow===routeNext||routeNow.includes("MT_SIMULADOS_CATALOGO_RECOVERY_V2"),
  "Já existe outra implementação da rota catalogo-v2. Nada alterado.");
 const ts=require(require.resolve("typescript",{paths:[root]}));
 parseTs(ts,UI,uiNext);
 parseTs(ts,ROUTE,routeNext);
 log("Sintaxe da tela e da API validada com TypeScript.");
 const modifications=[];
 if(uiNow!==uiNext)modifications.push({name:UI,original:uiNow,after:uiNext});
 if(routeNow!==routeNext)modifications.push({name:ROUTE,original:routeNow,after:routeNext});
 if(!modifications.length){log("Correção já instalada. Pressione Ctrl+F5 no navegador.");return;}
 const backupDir=path.join(root,".tita-backups","catalogo-simulados-v2-"+new Date().toISOString().replace(/[:.]/g,"-"));
 fs.mkdirSync(backupDir,{recursive:true});
 for(const item of modifications){
  if(item.original===null)continue;
  const b=path.join(backupDir,item.name);
  fs.mkdirSync(path.dirname(b),{recursive:true});
  fs.writeFileSync(b,item.original,"utf8");
 }
 const written=[];
 try{
  for(const item of modifications){
   const target=path.join(root,item.name);
   fs.mkdirSync(path.dirname(target),{recursive:true});
   const temporary=target+".tita-cat-v2-"+process.pid+".tmp";
   fs.writeFileSync(temporary,item.after,"utf8");
   fs.renameSync(temporary,target);
   written.push(item);
   log("OK "+item.name);
  }
  for(const item of modifications)
   assert(read(path.join(root,item.name))===item.after,"Conferência posterior falhou: "+item.name);
 }catch(e){
  for(const item of written.reverse()){
   try{
    const target=path.join(root,item.name);
    if(item.original===null)fs.rmSync(target,{force:true});
    else fs.writeFileSync(target,item.original,"utf8");
   }catch{}
  }
  throw Error("Falha ao instalar. A versão anterior foi restaurada: "+e.message);
 }
 log("SUCESSO. Catálogo carregado por rota independente, sem alterar PDFs nem revisões.");
 log("Backup: "+backupDir);
 log("Se o Next.js já estava ligado, dê Ctrl+F5. Se falhar, pare e reinicie npm.cmd run dev.");
}
try{run();}catch(e){console.error(prefix+"ERRO: "+(e instanceof Error?e.message:String(e)));process.exitCode=1;}
