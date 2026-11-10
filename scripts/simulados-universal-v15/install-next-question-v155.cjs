"use strict";
// MT_SIMULADO_NEXT_QUESTION_INSTALL_V155
const fs=require("fs"),path=require("path");
const project=path.resolve(process.argv[2]||process.cwd());
const assets=path.resolve(process.argv[3]||"");
const target=path.join(project,"components","simulado-exam-runner.tsx");
if(!fs.existsSync(path.join(project,"package.json"))||!fs.existsSync(target))
  throw Error("Não localizei a TITÃ e seu componente de simulados. Nenhum arquivo alterado.");
const original=fs.readFileSync(target,"utf8");
const patch=require(path.join(assets,"patch-next-question-v155.cjs")).patch;
const updated=patch(original);
if(updated===original){
  console.log("[TITÃ V15.5] Botão Próxima questão já instalado. Nenhuma alteração necessária.");
  process.exit(0);
}
if(!updated.includes("onClick={saveForRevision}")||
   !updated.includes("mt_simulado_round_selections")||
   updated.includes("MT_SIMULADO_FLASHCARDS_V154")!==original.includes("MT_SIMULADO_FLASHCARDS_V154"))
  throw Error("Uma proteção do runner não passou; nenhum arquivo alterado.");
let ts;
try{ts=require(path.join(project,"node_modules","typescript"));}
catch{throw Error("TypeScript não encontrado na TITÃ. Execute npm.cmd install antes; nenhum arquivo alterado.");}
const file=ts.createSourceFile(target,updated,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
if(file.parseDiagnostics.length){
  const messages=file.parseDiagnostics.map(e=>{
    const line=file.getLineAndCharacterOfPosition(e.start||0).line+1;
    return "linha "+line+": "+ts.flattenDiagnosticMessageText(e.messageText," ");
  });
  throw Error("A alteração não passou no teste de sintaxe TSX. Nenhum arquivo alterado:\n"+messages.join("\n"));
}
const stamp=new Date().toISOString().replace(/[^0-9]/g,"").slice(0,14);
const backup=path.join(project,".tita-backups","simulado-next-question-v155-"+stamp,
  "components","simulado-exam-runner.tsx");
fs.mkdirSync(path.dirname(backup),{recursive:true});
fs.copyFileSync(target,backup);
let changed=false;
const stage=target+".v155-"+Math.random().toString(36).slice(2)+".tmp";
try{
  fs.writeFileSync(stage,updated,"utf8");
  fs.copyFileSync(stage,target);changed=true;
  if(fs.readFileSync(target,"utf8")!==updated)throw Error("Conteúdo divergente após instalação.");
}catch(e){
  if(changed){try{fs.copyFileSync(backup,target);}catch(x){console.error("Restaure manualmente: "+backup);}}
  throw e;
}finally{
  try{fs.unlinkSync(stage);}catch{}
}
console.log("[TITÃ V15.5] SUCESSO: botão Próxima questão adicionado exatamente acima do enunciado.");
console.log("[TITÃ V15.5] Navega usando move(1); anotações são preservadas e questões NÃO são selecionadas automaticamente.");
console.log("[TITÃ V15.5] Última questão: botão desabilitado. Backup em: "+backup);
console.log("[TITÃ V15.5] Pressione Ctrl+F5 no navegador após atualizar.");
