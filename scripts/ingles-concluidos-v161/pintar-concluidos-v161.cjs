"use strict";
// MT_ENGLISH_COMPLETED_GREEN_INSTALL_V161
const fs=require("fs"), path=require("path");
const relative="components/english-week-screen.tsx";
const marker="MT_ENGLISH_COMPLETED_GREEN_V161";
const edits=[["  const completed = data?.texts.filter((text) => text.status === \"completed\").length ?? 0;","  // MT_ENGLISH_COMPLETED_GREEN_V161 · leitura concluída recebe destaque verde sem alterar o progresso.\n  const completed = data?.texts.filter((text) => text.status === \"completed\").length ?? 0;"],["            <section key={day} className=\"rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5\">","            <section key={day} className={items.every((item) => item.status === \"completed\") ? \"rounded-[24px] border border-emerald-400/35 bg-emerald-400/[.035] p-5\" : \"rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5\"}>"],["                <h2 className=\"mt-1 font-serif text-2xl text-[var(--ink)]\">{items.length} {items.length === 1 ? \"texto\" : \"textos\"}</h2>","                <h2 className=\"mt-1 font-serif text-2xl text-[var(--ink)]\">{items.length} {items.length === 1 ? \"texto\" : \"textos\"} {items.every((item) => item.status === \"completed\") ? <span className=\"ml-2 align-middle text-xs font-black uppercase tracking-[.09em] text-emerald-500\">✓ Dia concluído</span> : null}</h2>"],["                  <article key={text.id} className=\"rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4\">","                  <article key={text.id} className={text.status === \"completed\" ? \"rounded-2xl border border-emerald-400/55 bg-emerald-400/[.075] p-4 shadow-[inset_0_0_0_1px_rgba(52,211,153,.09)]\" : \"rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4\"}>"],["                      <div className=\"grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] text-[var(--gold-bright)]\">","                      <div className={text.status === \"completed\" ? \"grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-400/50 bg-emerald-400/15 text-emerald-500\" : \"grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] text-[var(--gold-bright)]\"}>"],["                        <h3 className=\"mt-2 font-serif text-xl leading-tight text-[var(--ink)]\">{text.title}</h3>","                        {text.status === \"completed\" ? <span className=\"mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/45 bg-emerald-400/15 px-2.5 py-1 text-[8px] font-black tracking-[.1em] text-emerald-500\"><CheckCircle2 size={12} /> CONCLUÍDO</span> : null}\n                        <h3 className={text.status === \"completed\" ? \"mt-2 font-serif text-xl leading-tight text-emerald-500\" : \"mt-2 font-serif text-xl leading-tight text-[var(--ink)]\"}>{text.title}</h3>"],["                        <Link href={`/ingles/texto/${text.id}`} className=\"mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-strong)] px-3 text-[8px] font-black text-[var(--gold-bright)]\">","                        <Link href={`/ingles/texto/${text.id}`} className={text.status === \"completed\" ? \"mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-400/10 px-3 text-[8px] font-black text-emerald-500 transition hover:bg-emerald-400/20\" : \"mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-strong)] px-3 text-[8px] font-black text-[var(--gold-bright)]\"}>"]];
function apply(src){
 if(src.includes(marker))return src;
 if(!src.includes("get_my_english_week") || !src.includes("EnglishWeekScreen") || !src.includes('text.status === "completed"'))
   throw Error("A tela local de Inglês não é compatível. Nenhum arquivo foi alterado.");
 let updated=src;
 for(const [from,to] of edits){
   const n=updated.split(from).length-1;
   if(n!==1)throw Error("Trecho de interface não localizado unicamente ("+n+"). Nenhum arquivo foi alterado.");
   updated=updated.replace(from,to);
 }
 if(!updated.includes(marker)||!updated.includes("CONCLUÍDO")||!updated.includes("get_my_english_week")||!updated.includes("RELER")||!updated.includes("INICIAR"))
    throw Error("Verificação de integridade falhou. Nada foi alterado.");
 return updated;
}
module.exports={apply};
if(require.main===module){
 try{
   const root=path.resolve(process.argv[2]||process.cwd()),file=path.join(root,relative);
   if(!fs.existsSync(path.join(root,"package.json"))||!fs.existsSync(file))throw Error("Abra o PowerShell na pasta mentoria-tita.");
   const original=fs.readFileSync(file,"utf8"),next=apply(original);
   if(original===next){console.log("[TITÃ] Destaque verde já instalado. Só Ctrl+F5.");process.exit(0);}
   const ts=require(require.resolve("typescript",{paths:[root]}));
   const parsed=ts.createSourceFile(relative,next,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
   if(parsed.parseDiagnostics.length){
      const diag=parsed.parseDiagnostics[0],loc=parsed.getLineAndCharacterOfPosition(diag.start||0);
      throw Error("Erro de sintaxe na linha "+(loc.line+1)+": "+ts.flattenDiagnosticMessageText(diag.messageText," "));
   }
   const dir=path.join(root,".tita-backups");fs.mkdirSync(dir,{recursive:true});
   const backup=path.join(dir,"english-week-before-green-v161-"+new Date().toISOString().replace(/[:.]/g,"-")+".tsx");
   fs.copyFileSync(file,backup);
   const temporary=file+".mt-green-"+process.pid;
   fs.writeFileSync(temporary,next,"utf8");
   try{fs.renameSync(temporary,file);}catch(e){try{fs.rmSync(temporary,{force:true});}catch{}throw e;}
   console.log("[TITÃ] CONCLUÍDO: cartões concluídos em verde, com selo, título e ícone.");
   console.log("[TITÃ] Dados, palavras, revisões e botão de releitura preservados.");
   console.log("[TITÃ] Backup: "+backup);
   console.log("[TITÃ] Pressione Ctrl+F5 no navegador se o servidor já estiver aberto.");
 }catch(e){console.error("[TITÃ] ERRO: "+(e instanceof Error?e.message:String(e)));process.exitCode=1;}
}
