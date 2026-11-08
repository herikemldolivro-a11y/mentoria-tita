"use strict";
// TITA V14 — No reload on empty notebook editor close.
// Changes ONLY components/notebook-empty-auto-editor.tsx.
const fs=require("fs"),path=require("path");
const NAME="components/notebook-empty-auto-editor.tsx";
function patch(source){
  if(!source.includes("NotebookEmptyAutoEditor")||!source.includes("NotebookManagerModal")||!source.includes("CADERNO ANTES DA REVISÃO")){
    throw Error("Este nao e o editor do caderno vazio da TITÃ. Nenhum arquivo sera alterado.");
  }
  let out=source.replace(/\r\n/g,"\n");
  if(!out.includes('router.replace("/calendario")')){
    let found=false;
    const exact='onClose={() => { setOpen(false); window.location.reload(); }}';
    if(out.includes(exact)){
      out=out.replace(exact,'onClose={() => { setOpen(false); router.replace("/calendario"); }}');
      found=true;
    } else {
      const rx=/onClose=\{\(\)\s*=>\s*\{\s*setOpen\(false\);\s*window\.location\.reload\(\);\s*\}\}/;
      if(rx.test(out)){
        out=out.replace(rx,'onClose={() => { setOpen(false); router.replace("/calendario"); }}');
        found=true;
      } else {
        const legacy='onClose={() => setOpen(false)}';
        if(out.includes(legacy)){
          out=out.replace(legacy,'onClose={() => { setOpen(false); router.replace("/calendario"); }}');
          found=true;
        }
      }
    }
    if(!found) throw Error("O fechamento do editor tem outro formato. Preservando seu arquivo e informando o erro.");
  }
  if(!out.includes('import { useRouter } from "next/navigation";')&&!out.includes("import {useRouter} from 'next/navigation';")&&!/import\s*\{[^}]*\buseRouter\b[^}]*\}\s*from\s*["']next\/navigation["']/.test(out)){
    if(!out.includes('import { useEffect, useState } from "react";'))throw Error("Nao identifiquei os imports do editor. Nao alterei nada.");
    out=out.replace('import { useEffect, useState } from "react";',
      'import { useEffect, useState } from "react";\nimport { useRouter } from "next/navigation";');
  }
  if(!/\bconst router\s*=\s*useRouter\(\)/.test(out)){
    const anchor='export function NotebookEmptyAutoEditor({ notebookId }: { notebookId: string }) {';
    if(!out.includes(anchor))throw Error("Nao localizei a funcao do editor para configurar a navegacao.");
    out=out.replace(anchor,anchor+'\n  const router = useRouter();');
  }
  if(!out.includes("Voltar ao calendário")&&out.includes('<NotebookPen size={17}/> Criar flashcards\n      </button>')){
    out=out.replace('<NotebookPen size={17}/> Criar flashcards\n      </button>',
      '<NotebookPen size={17}/> Criar flashcards\n      </button>\n      <button type="button" className="ml-3 mt-3 inline-flex min-h-11 items-center rounded-lg border border-cyan-300/40 px-4 text-sm font-bold text-cyan-200" onClick={() => router.replace("/calendario")}>Voltar ao calendário</button>');
  }
  if(out.includes("window.location.reload()")||!out.includes('onClose={() => { setOpen(false); router.replace("/calendario"); }}')){
    throw Error("O fechamento antigo ainda existe. Nenhum arquivo alterado.");
  }
  return out;
}
function main(){
  const root=process.cwd(),file=path.join(root,NAME);
  if(!fs.existsSync(path.join(root,"app","calendario","page.tsx"))||!fs.existsSync(path.join(root,"package.json")))
    throw Error("Execute na pasta real da TITÃ. Calendario nao localizado.");
  if(!fs.existsSync(file))throw Error("Editor de caderno vazio nao instalado neste projeto: "+file);
  const original=fs.readFileSync(file,"utf8"),updated=patch(original);
  const typescript=path.join(root,"node_modules","typescript");
  if(fs.existsSync(typescript)){
    const ts=require(typescript),f=ts.createSourceFile(NAME,updated,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    if(f.parseDiagnostics.length){
      throw Error("Sintaxe TSX invalida: "+f.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,"\n")).join("; "));
    }
    console.log("[TITA V14] TypeScript TSX verificado: OK");
  }
  if(updated===original.replace(/\r\n/g,"\n")){
    console.log("[TITA V14] Editor ja corrigido. Nenhuma alteracao.");
    return;
  }
  const backupDir=path.join(root,".tita-backups","caderno-close-v14-"+new Date().toISOString().replace(/[:.]/g,"-"));
  fs.mkdirSync(backupDir,{recursive:true});
  fs.copyFileSync(file,path.join(backupDir,"notebook-empty-auto-editor.tsx"));
  const staged=file+".tita-v14-"+process.pid+".tmp";
  try{
    fs.writeFileSync(staged,updated.replace(/\n/g,original.includes("\r\n")?"\r\n":"\n"),"utf8");
    fs.renameSync(staged,file);
  }catch(e){
    try{fs.unlinkSync(staged)}catch{}
    try{fs.writeFileSync(file,original,"utf8")}catch{}
    throw Error("Erro ao salvar; versao anterior restaurada: "+e.message);
  }
  console.log("[TITA V14] X e clique fora agora VOLTAM AO CALENDARIO sem recarregar o editor.");
  console.log("[TITA V14] Backup: "+backupDir);
}
module.exports={patch};
if(require.main===module){try{main()}catch(e){console.error("[TITA V14] ERRO: "+e.message);process.exitCode=1;}}
