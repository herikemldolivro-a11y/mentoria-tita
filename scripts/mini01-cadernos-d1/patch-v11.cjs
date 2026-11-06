"use strict";
const fs=require("fs"),path=require("path");

function patchMini(source){
  let s=source;
  if(s.includes("MT_MINISSIMULADO_01_V11"))return s;
  if(!s.includes("mt_simulado_question_texts")||!s.includes("displayEnunciado"))throw Error("Leitor sem suporte aos enunciados preparados. Nenhum arquivo alterado.");
  const old='if (!["dia-01-geral","dia-02-geral"].includes(simulado.id)) return;';
  const older='if (simulado.id !== "dia-01-geral") return;';
  const latest='if (!["dia-01-geral","dia-02-geral","dia-02-mini"].includes(simulado.id)) return;';
  if(s.includes(old))s=s.replace(old,latest);
  else if(s.includes(older))s=s.replace(older,latest);
  else if(!s.includes(latest))throw Error("Guarda de simulados nao reconhecida. Arquivo original preservado.");
  s=s.replace('.eq("simulado_id", "dia-01-geral")','.eq("simulado_id", simulado.id)');
  s=s.replace('{preparedError && simulado.id==="dia-01-geral" ?', '{preparedError ?');
  if(!s.includes('.eq("simulado_id", simulado.id)'))throw Error("Consulta de enunciados precisa usar o simulado selecionado.");
  return s.replace('"use client";','"use client";\n// MT_MINISSIMULADO_01_V11');
}
function patchCalendar(source){
  if(source.includes('rpc("get_principal_calendar_hub_v2")'))return source;
  const r=/\.rpc\(\s*(["'])get_principal_calendar_hub\1\s*\)/;
  if(!r.test(source))throw Error("Nao localizei o carregamento do calendario; nenhum arquivo sera alterado.");
  return source.replace(r,'.rpc("get_principal_calendar_hub_v2")');
}
function patchNotebookRunner(source){
  let s=source;
  if(s.includes("MT_CADERNO_VAZIO_EDITOR_V11"))return s;
  const importAnchor='import Link from "next/link";';
  const stateAnchor='  const [loading, setLoading] = useState(true);';
  if(!s.includes(importAnchor)||!s.includes(stateAnchor))throw Error("Editor do caderno: imports ou estado inesperados.");
  const start=s.indexOf('if (!cards.length) return <div');
  const end=s.indexOf("\n",start);
  if(start<0||end<0)throw Error("Nao encontrei o estado do caderno vazio.");
  let line=s.slice(start,end);
  const link=/<Link href="\/caderno" className="[^"]+">VOLTAR AO CADERNO<\/Link>/;
  if(!link.test(line))throw Error("Nao encontrei o botao do caderno vazio.");
  const btn='<button type="button" onClick={() => setEditingEmpty(true)} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[var(--gold)] px-5 text-[10px] font-black text-[#111]">CRIAR FLASHCARDS PARA ESTA REVISÃO</button>';
  const modal='<NotebookManagerModal open={editingEmpty} onClose={() => { setEditingEmpty(false); void loadNotebookById(notebook.id).then((data) => setNotebook(data)); }} lessonId={notebook.lesson_id} lessonTitle={notebook.lesson_title} subjectName={notebook.subject_name} />';
  line=line.replace(link,btn+modal);
  s=s.slice(0,start)+line+s.slice(end);
  s=s.replace(importAnchor,importAnchor+'\nimport { NotebookManagerModal } from "@/components/lesson-notebook-dock";');
  s=s.replace(stateAnchor,stateAnchor+'\n  const [editingEmpty, setEditingEmpty] = useState(false); // MT_CADERNO_VAZIO_EDITOR_V11');
  return s;
}
const edits=[
 ["components/simulado-exam-runner.tsx",patchMini],
 ["lib/principal-calendar-system.ts",patchCalendar],
 ["components/notebook-review-runner.tsx",patchNotebookRunner]
];
function plan(files){
  const modified={};
  for(const [name,fn] of edits){
    if(typeof files[name]!=="string")throw Error("Arquivo ausente: "+name);
    modified[name]=fn(files[name].replace(/\r\n/g,"\n"));
  }
  if(!modified["components/simulado-exam-runner.tsx"].includes('"dia-02-mini"'))throw Error("Mini 01 nao foi ativado.");
  if(!modified["lib/principal-calendar-system.ts"].includes('rpc("get_principal_calendar_hub_v2")'))throw Error("Calendario nao carregara D-1.");
  if(!modified["components/notebook-review-runner.tsx"].includes("CRIAR FLASHCARDS PARA ESTA REVISÃO"))throw Error("Caderno vazio ainda nao oferece editor.");
  return modified;
}
function run(){
 const root=process.cwd();
 const originals={};
 for(const [name] of edits){
  const filepath=path.join(root,name);
  if(!fs.existsSync(filepath))throw Error("Arquivo do TITÃ nao encontrado: "+name);
  originals[name]=fs.readFileSync(filepath,"utf8");
 }
 const updated=plan(originals);
 const tsDir=path.join(root,"node_modules","typescript");
 if(fs.existsSync(tsDir)){
  const ts=require(tsDir);
  for(const [name,contents] of Object.entries(updated)){
   const f=ts.createSourceFile(name,contents,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
   if(f.parseDiagnostics.length)throw Error("Erro TSX em "+name+": "+f.parseDiagnostics.map(e=>ts.flattenDiagnosticMessageText(e.messageText,"\n")).join("; "));
  }
  console.log("[TITA] Sintaxe TypeScript verificada nos 3 arquivos.");
 }
 const changed=Object.keys(updated).filter(name=>updated[name]!==originals[name].replace(/\r\n/g,"\n"));
 if(!changed.length){console.log("[TITA] V11 ja instalada; nada a alterar.");return;}
 const backup=path.join(root,".tita-backups","mini01-cadernos-d1-"+new Date().toISOString().replace(/[:.]/g,"-"));
 fs.mkdirSync(backup,{recursive:true});
 for(const name of changed){
  const dest=path.join(backup,name);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(path.join(root,name),dest);
 }
 const written=[];
 try{
  for(const name of changed){
   const target=path.join(root,name);
   const eol=originals[name].includes("\r\n")?"\r\n":"\n";
   fs.writeFileSync(target,updated[name].replace(/\n/g,eol),"utf8");
   written.push(name);
   console.log("[TITA] Atualizado: "+name);
  }
 }catch(e){
  for(const name of written){try{fs.writeFileSync(path.join(root,name),originals[name],"utf8")}catch{}}
  throw Error("Falha. Restauracao tentada. Backup "+backup+". "+e.message);
 }
 console.log("[TITA] Backup: "+backup);
 console.log("[TITA] V11 OK: Minissimulado 01 + cadernos obrigatorios D-1.");
}
module.exports={plan};
if(require.main===module)run();
