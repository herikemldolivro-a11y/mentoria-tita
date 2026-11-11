"use strict";
// MT_SIMULADO_HIDE_ORIGINAL_PDF_INSTALL_V156
// Removes only the redundant right PDF pane in the existing TITÃ simulado runner.
const fs=require("fs"),path=require("path");
const root=path.resolve(process.argv[2]||process.cwd());
const relative="components/simulado-exam-runner.tsx";
const target=path.join(root,relative);
const marker="MT_SIMULADO_HIDE_ORIGINAL_PDF_PANEL_V156";
function exactlyOnce(s,from,to,label){
 const n=s.split(from).length-1;
 if(n!==1)throw new Error("Não foi possível identificar com segurança "+label+" ("+n+" ocorrências). Nenhuma alteração realizada.");
 return s.replace(from,to);
}
function patch(s){
 if(s.includes(marker))return s;
 if(!s.includes("Questão completa e texto-base original")||
    !s.includes("TEXTO-BASE ORIGINAL DA QUESTÃO")||
    !s.includes("SimuladoFlashcardEditor")||
    !s.includes("saveForRevision"))
   throw Error("Versão diferente do resolvedor de simulados. Arquivo preservado.");
 s=exactlyOnce(s,'// MT_SIMULADO_UNIVERSAL_V15',
   '// MT_SIMULADO_UNIVERSAL_V15\n// '+marker,'marcador');
 s=exactlyOnce(s,'  const [showPdf,setShowPdf] = useState(true);\n','',"estado de visualização PDF");
 s=exactlyOnce(s,
   '  const pdf = simulado.arquivos.prova\n    ? "/api/estudos/simulados/pdf/"+encodeURIComponent(simulado.arquivos.prova)\n    : null;\n\n',
   '',"endereço PDF");
 s=exactlyOnce(s,
  '    <div className={"mt-5 grid gap-5 "+(pdf?"xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]":"xl:grid-cols-1")}>',
  '    <div className="mt-5 grid grid-cols-1 gap-5">',"layout de duas colunas");
 s=exactlyOnce(s,
  'Enunciado integral disponível no documento original exibido ao lado.',
  'Enunciado não cadastrado para esta questão. Confira o caderno de prova original antes de responder.',
  "aviso de enunciado");
 const start='          {pdf ? <><p className="mt-4 text-xs leading-6 text-white/55">';
 const end='            </div>}';
 let i=s.indexOf(start),j=i<0?-1:s.indexOf(end,i);
 if(i<0||j<0||s.indexOf(start,i+1)>=0)throw Error("Bloco do aviso PDF não foi identificado de forma única.");
 const metadata=[
'          {(q.banca || q.prova || q.gabaritoValidado === false) ? <div className="mt-4 space-y-2 text-xs leading-5 text-white/45">',
'              {q.banca ? <p>Banca declarada: {q.banca} {q.ano?"· Ano declarado: "+q.ano:""}</p> : null}',
'              {q.prova ? <p>Prova declarada: {q.prova}</p> : null}',
'              {q.gabaritoValidado===false ? <p className="text-amber-300/70">Gabarito transcrito do TXT enviado; validação independente pendente.</p> : null}',
'            </div> : null}'
 ].join("\n");
 s=s.slice(0,i)+metadata+s.slice(j+end.length);
 const panelStart='      {showPdf && pdf?<div className="min-w-0 rounded-2xl border border-white/15 bg-white/[.025] p-3">';
 const panelEnd='      </div>:null}';
 i=s.indexOf(panelStart);j=i<0?-1:s.indexOf(panelEnd,i);
 if(i<0||j<0||s.indexOf(panelStart,i+1)>=0)throw Error("Painel lateral do PDF não foi identificado de forma única.");
 s=s.slice(0,i)+s.slice(j+panelEnd.length);
 if(s.includes("showPdf")||s.includes("Questão completa e texto-base original")||
    s.includes("const pdf =")||s.includes("<iframe")||
    !s.includes("saveForRevision")||!s.includes("SimuladoFlashcardEditor")||
    !s.includes("onCompleted")||!s.includes("Próxima questão"))
  throw Error("A alteração falhou nos testes de preservação das funções.");
 return s;
}
try{
 if(!fs.existsSync(path.join(root,"package.json")))throw Error("Pasta TITÃ não localizada.");
 if(!fs.existsSync(target))throw Error("Arquivo de resolução não encontrado: "+relative);
 const input=fs.readFileSync(target,"utf8");
 const output=patch(input);
 if(output===input){
   console.log("[TITÃ] O painel PDF já está removido. Basta Ctrl+F5.");
   process.exit(0);
 }
 const ts=require(require.resolve("typescript",{paths:[root]}));
 const ast=ts.createSourceFile(relative,output,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 if(ast.parseDiagnostics.length){
  const e=ast.parseDiagnostics[0],loc=ast.getLineAndCharacterOfPosition(e.start||0);
  throw Error("Falha de sintaxe na linha "+(loc.line+1)+": "+ts.flattenDiagnosticMessageText(e.messageText," "));
 }
 const backups=path.join(root,".tita-backups");
 fs.mkdirSync(backups,{recursive:true});
 const backup=path.join(backups,"simulado-runner-before-hide-pdf-v156-"+new Date().toISOString().replace(/[:.]/g,"-")+".tsx");
 fs.copyFileSync(target,backup);
 const tmp=target+".tmp-hide-pdf-"+process.pid;
 fs.writeFileSync(tmp,output,"utf8");
 try{fs.renameSync(tmp,target);}catch(e){try{fs.rmSync(tmp,{force:true});}catch{}throw e;}
 console.log("[TITÃ] Painel lateral do PDF removido com sucesso.");
 console.log("[TITÃ] O enunciado, o texto-base, os flashcards, as anotações e os botões foram preservados.");
 console.log("[TITÃ] Backup: "+backup);
 console.log("[TITÃ] Atualize o navegador com Ctrl+F5. O Next.js em modo dev atualiza automaticamente.");
}catch(e){
 console.error("[TITÃ] ERRO: "+(e instanceof Error?e.message:String(e)));
 process.exitCode=1;
}
