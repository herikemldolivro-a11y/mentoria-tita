"use strict";

/**
 * TITA V13 - route repair.
 * This installer never deletes reviews, notebooks, PDFs, saved answers or Supabase records.
 * It creates missing Next.js routes, preserves customized existing components, verifies
 * the exact files locally, and creates backups before modifying any existing code.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");

const root = process.cwd();
const utf8 = "utf8";
const sources = {
  exam: "https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-simulados-instala-auto-7-dias/scripts/simulados-auto/",
  latest: "https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-mini01-caderno-v12-simplificado-20261106/scripts/mini01-cadernos-v12/",
};
const F = {
  manifest: "private/simulados-pmal/manifest.json",
  mainPage: "app/estudos/simulados/page.tsx",
  examComponent: "components/estudos-simulados.tsx",
  runner: "components/simulado-exam-runner.tsx",
  catalogRoute: "app/api/estudos/simulados/route.ts",
  pdfRoute: "app/api/estudos/simulados/pdf/[arquivo]/route.ts",
  calendarPage: "app/calendario/page.tsx",
  mainCalendarApi: "lib/principal-calendar-system.ts",
  notebookPage: "app/caderno/[notebookId]/page.tsx",
  notebookTemplate: "app/caderno/[notebookId]/template.tsx",
  notebookEditor: "components/notebook-empty-auto-editor.tsx",
};
const exists = (key) => fs.existsSync(path.join(root,key));
const src = (key) => fs.readFileSync(path.join(root,key),utf8);
const msg = (x) => process.stdout.write("[TITA V13] "+x+"\n");
const needs = {
  [F.mainPage]:sources.exam+"page.tsx",
  [F.examComponent]:sources.exam+"estudos-simulados.tsx",
  [F.catalogRoute]:sources.exam+"catalog-route.ts",
  [F.pdfRoute]:sources.exam+"pdf-route.ts",
  [F.notebookEditor]:sources.latest+"notebook-empty-auto-editor.tsx",
  [F.notebookTemplate]:sources.latest+"caderno-template.tsx",
};

function download(url, count=0){
  return new Promise((resolve,reject)=>{
    const request=https.get(url + (url.includes("?")?"&":"?") + "v=20261106-v13r1",{
      headers:{"Cache-Control":"no-cache","User-Agent":"TITA-V13-installer"},
      timeout:30000,
    },response=>{
      if([301,302,307,308].includes(response.statusCode)){
        response.resume();
        if(count>3) return reject(Error("Too many redirects while downloading "+url));
        return resolve(download(response.headers.location,count+1));
      }
      if(response.statusCode!==200){
        response.resume();
        return reject(Error("Falha ao baixar arquivo remoto ("+response.statusCode+"): "+url));
      }
      const chunks=[];
      response.on("data",chunk=>chunks.push(chunk));
      response.on("end",()=>resolve(Buffer.concat(chunks).toString("utf8")));
      response.on("error",reject);
    });
    request.on("timeout",()=>request.destroy(Error("Tempo esgotado ao buscar "+url)));
    request.on("error",reject);
  });
}

function assertRoot(){
  const required=["package.json",F.calendarPage,F.notebookPage,F.mainCalendarApi];
  for(const file of required) {
    if(!exists(file))throw Error("Esta nao e a pasta correta da TITÃ: arquivo ausente "+file);
  }
  if(!exists(F.manifest)){
    throw Error("O pacote dos simulados nao esta nesta pasta: "+F.manifest+". Execute no projeto que possui os 7 dias instalados.");
  }
  const json=JSON.parse(src(F.manifest));
  const list=Array.isArray(json)?json:json.simulados;
  if(!Array.isArray(list) || list.length!==13){
    throw Error("Catalogo local incompleto: esperados 13 simulados (encontrado: "+(list?.length??"invalido")+").");
  }
  const mini=list.find(s=>s.id==="dia-02-mini");
  if(!mini || !Array.isArray(mini.questoes) || mini.questoes.length===0){
    throw Error("Minissimulado 01 nao aparece no catalogo instalado.");
  }
  msg("Pasta validada: "+root);
  msg("Catalogo original preservado: "+list.length+" simulados; mini com "+mini.questoes.length+" questoes.");
}

function safePatchRunner(original){
  if(original.includes('"dia-02-mini"') && original.includes("mt_simulado_question_texts"))return original;
  const arrayOld='["dia-01-geral","dia-02-geral"]';
  const singleOld='if (simulado.id !== "dia-01-geral") return;';
  let result=original;
  if(result.includes(arrayOld))result=result.replace(arrayOld,'["dia-01-geral","dia-02-geral","dia-02-mini"]');
  else if(result.includes(singleOld))result=result.replace(singleOld,
    'if (!["dia-01-geral","dia-02-geral","dia-02-mini"].includes(simulado.id)) return;');
  if(result.includes('"dia-02-mini"') && result.includes("mt_simulado_question_texts"))
    return result;
  return null;
}

function safePatchCalendarApi(original){
  if(original.includes("get_principal_calendar_hub_v2"))return original;
  const rx=/\.rpc\(\s*["']get_principal_calendar_hub["']\s*\)/;
  if(!rx.test(original))return null;
  return original.replace(rx,'.rpc("get_principal_calendar_hub_v2")');
}

function preflight(planned){
  let ts=null;
  try {ts=require(path.join(root,"node_modules","typescript"));}
  catch {msg("TypeScript local indisponivel; verificando os marcadores das rotas.");}
  if(ts){
    for(const [name,code] of Object.entries(planned)){
      if(!/\.(tsx|ts)$/.test(name))continue;
      const parsed=ts.createSourceFile(name,code,ts.ScriptTarget.Latest,true,
        name.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
      if(parsed.parseDiagnostics.length){
        const problems=parsed.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,"\n"));
        throw Error("Sintaxe invalida em "+name+": "+problems.join(" ; "));
      }
    }
    msg("Sintaxe TypeScript validada para todos os arquivos a instalar.");
  }
  if(!planned[F.mainPage].includes("TitaSimuladosSemanaUm"))throw Error("Pagina do simulado invalida.");
  if(!planned[F.examComponent].includes("SimuladoExamRunner"))throw Error("Componente do simulado invalido.");
  if(!planned[F.catalogRoute].includes("manifest.json"))throw Error("API do catalogo invalida.");
  if(!planned[F.pdfRoute].includes("simulados-pmal"))throw Error("Rota dos PDFs invalida.");
  if(!planned[F.runner].includes('"dia-02-mini"'))throw Error("Leitor nao habilita minissimulado.");
  if(!planned[F.mainCalendarApi].includes("get_principal_calendar_hub_v2"))throw Error("Calendario continua sem D-1.");
}

function backupAndWrite(planned){
  const changes=Object.entries(planned).filter(([name,data])=>!exists(name)||src(name)!==data);
  if(!changes.length){msg("Instalacao ja atualizada. Nenhum arquivo regravado.");return;}
  const when=new Date().toISOString().replace(/[:.]/g,"-");
  const base=path.join(root,".tita-backups","repair-404-v13-"+when);
  const orig=new Map();
  for(const [name] of changes){
    const target=path.join(root,name);
    if(fs.existsSync(target)){
      orig.set(name,fs.readFileSync(target));
      const copy=path.join(base,name);
      fs.mkdirSync(path.dirname(copy),{recursive:true});
      fs.copyFileSync(target,copy);
    } else orig.set(name,null);
  }
  const wrote=[];
  try{
    for(const [name,data] of changes){
      const dest=path.join(root,name);
      fs.mkdirSync(path.dirname(dest),{recursive:true});
      const tmp=dest+".v13-"+process.pid+".tmp";
      fs.writeFileSync(tmp,data,utf8);
      fs.renameSync(tmp,dest);
      wrote.push(name);
      msg("Instalado/verificado: "+name);
    }
  }catch(error){
    for(const name of wrote.reverse()){
      const dest=path.join(root,name);
      const prev=orig.get(name);
      try{if(prev)fs.writeFileSync(dest,prev);else fs.unlinkSync(dest);}catch{}
    }
    throw Error("Falha local; tentativa de restauracao executada. Backup "+base+". "+error.message);
  }
  msg("Backup: "+base);
}

async function main(){
  assertRoot();
  const planned={};
  const mustFetch=[];
  for(const [key,url] of Object.entries(needs)){
    if(key===F.notebookTemplate && exists(key)) {
      // Never override a user's custom notebook template.
      planned[key]=src(key);continue;
    }
    if(key===F.notebookTemplate && fs.existsSync(path.join(root,"app/caderno/[notebookId]/layout.tsx"))){
      msg("Layout de caderno personalizado preservado.");continue;
    }
    if(exists(key)){
      planned[key]=src(key);
      if(key===F.examComponent && !planned[key].includes("SimuladoExamRunner"))
        throw Error("Componente de simulados local nao reconhecido; nenhuma alteracao feita.");
      if(key===F.mainPage && !planned[key].includes("TitaSimuladosSemanaUm"))
        throw Error("Pagina do simulado personalizada incompatível. Nao a sobrescrevi.");
      if(key===F.catalogRoute && !planned[key].includes("manifest.json"))
        throw Error("API local de simulados nao reconhecida. Nao sobrescrevi.");
      if(key===F.pdfRoute && !planned[key].includes("simulados-pmal"))
        throw Error("Rota local de PDFs nao reconhecida. Nao sobrescrevi.");
    } else {
      mustFetch.push([key,url]);
    }
  }
  if(exists(F.runner)){
    const patched=safePatchRunner(src(F.runner));
    if(patched!==null)planned[F.runner]=patched;
    else mustFetch.push([F.runner,sources.latest+"runner-v12.tsx"]);
  }else mustFetch.push([F.runner,sources.latest+"runner-v12.tsx"]);

  const calendarOriginal=src(F.mainCalendarApi);
  const calendarPatched=safePatchCalendarApi(calendarOriginal);
  if(calendarPatched===null)throw Error("Nao consegui atualizar o calendario D-1 com seguranca; arquivo original preservado.");
  planned[F.mainCalendarApi]=calendarPatched;

  msg("Rotas ausentes: "+mustFetch.filter(([name])=>name.startsWith("app/")).map(([name])=>name).join(", "));
  const remote=await Promise.all(mustFetch.map(async ([name,url])=>[name,await download(url)]));
  for(const [name,data] of remote)planned[name]=data;
  preflight(planned);
  backupAndWrite(planned);

  const mandatory=[F.mainPage,F.examComponent,F.runner,F.catalogRoute,F.pdfRoute,F.calendarPage,F.notebookPage];
  for(const name of mandatory)if(!exists(name))throw Error("Rota continua ausente apos instalar: "+name);
  msg("VERIFICACAO FINAL OK: /calendario, /estudos/simulados, /caderno/[notebookId].");
  msg("Nenhuma linha do banco, gabarito, notebook concluido ou nivelamento foi alterado.");
}
main().catch(e=>{console.error("[TITA V13] CAUSA ESPECIFICA: "+e.message);process.exitCode=1;});
