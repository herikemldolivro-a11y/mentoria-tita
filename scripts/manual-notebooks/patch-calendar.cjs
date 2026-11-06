"use strict";
// Isolated calendar integration for manual notebooks. Never replace the whole file.
// Re-runnable: every modification has a stable sentinel. Backups before writing.
const fs=require("fs");
const path=require("path");
const crypto=require("crypto");
const root=process.cwd();
const file=path.join(root,"components","principal-calendar.tsx");
if(!fs.existsSync(file))throw new Error("Calendário principal não encontrado.");
let src=fs.readFileSync(file,"utf8");
const initial=src;
const originalEol=src.includes("\r\n")?"\r\n":"\n";
src=src.replace(/\r\n/g,"\n");
function must(label,fn){
  if(fn()) {process.stdout.write("[TITA] "+label+" OK\n");return;}
  throw new Error("Não consegui localizar a seção "+label+" na sua versão. Calendário original preservado.");
}
function alter(label,predicate,pattern,replacement){
 if(predicate(src)){process.stdout.write("[TITA] "+label+" já instalado\n");return true;}
 if(!pattern.test(src))return false;
 src=src.replace(pattern,replacement);
 process.stdout.write("[TITA] "+label+" aplicado\n");
 return true;
}
must("importação caderno",()=>alter("import manual",s=>s.includes('from "@/components/mt-manual-notebooks"'),/(\bimport\s+\{\s*LevelingLimitToast\s*\}\s+from\s+["']@\/components\/leveling-limit-toast["'];)/,
'$1\nimport { ManualNotebookDayItems, useManualNotebookCounts } from "@/components/mt-manual-notebooks";'));
must("contagem automática",()=>alter("manual counts",s=>s.includes("const manualNotebookCounts = useManualNotebookCounts();"),
/(export function PrincipalCalendar\([^\n]*\)\s*\{\s*\n\s*const router = useRouter\(\);)/,
'$1\n  const manualNotebookCounts = useManualNotebookCounts();'));
must("dias com cadernos",()=>alter("dia manual",s=>s.includes("const manualNotebookCount = manualNotebookCounts[key] ?? 0;"),
/const hasActivities = dayActivities\.length\s*>\s*0;/,
'const manualNotebookCount = manualNotebookCounts[key] ?? 0;\n                const hasActivities = dayActivities.length > 0 || manualNotebookCount > 0;'));
must("status do dia",()=>alter("status manual",s=>s.includes("dayActivities.length > 0 && manualNotebookCount === 0 && dayActivities.every"),
/hasActivities\s*&&\s*dayActivities\.every\(\(item\)\s*=>\s*item\.completed\)/,
'dayActivities.length > 0 && manualNotebookCount === 0 && dayActivities.every((item) => item.completed)'));
must("liberar dia vazio",()=>alter("dia clicável",s=>s.includes('onClick={() => setSelectedDate(key)}'),
/onClick=\{\(\)\s*=>\s*hasActivities\s*&&\s*setSelectedDate\(key\)\}/,
'onClick={() => setSelectedDate(key)}'));
must("sem bloquear dia",()=>alter("dia vazio",s=>s.includes('disabled={false}') || !s.includes('disabled={!hasActivities}'),
/disabled=\{!hasActivities\}/,'disabled={false}'));
must("visual caderno",()=>alter("linha caderno",s=>s.includes('<ManualNotebookDayItems date={date} />'),
/(\{activities\.map\(\(activity\)\s*=>\s*\()/,
'<ManualNotebookDayItems date={date} />\n            $1'));
must("botão de caderno",()=>alter("botão caderno",s=>s.includes('CRIAR CADERNO DE ANOTAÇÕES'),
/ADICIONAR REVISÃO NESTE DIA/g,
'CRIAR CADERNO DE ANOTAÇÕES'));
must("abrir editor",()=>alter("criar com data",s=>s.includes("router.push(\`/caderno/manual/novo?date="),
/onAddRevision=\{\(\)\s*=>\s*\{\s*setPrefillDate\(selectedDate\);\s*setSelectedDate\(null\);\s*setAddOpen\(true\);\s*\}\}/,
'onAddRevision={() => {\n            const chosenDate = selectedDate || dateKey(new Date());\n            setSelectedDate(null);\n            router.push(\`/caderno/manual/novo?date=\${encodeURIComponent(chosenDate)}\`);\n          }}'));
// Optional cyan tag inside day grid; not a blocker if user customized the cell markup.
if(!src.includes('CADERNO AVULSO · {manualNotebookCount}')){
 const badgeReg=/(\)\s*:\s*\(\s*<div className="mt-6 text-center text-\[8px\] text-white\/18">—<\/div>\s*\)\}\s*)(<\/button>)/;
 if(badgeReg.test(src)){
  src=src.replace(badgeReg,'$1{manualNotebookCount > 0 ? <span className="absolute bottom-1 left-1 rounded border border-cyan-300/50 bg-[#083341] px-1.5 py-0.5 text-[7px] font-black text-cyan-200">CADERNO AVULSO · {manualNotebookCount}</span> : null}\n                  $2');
  process.stdout.write("[TITA] distintivo ciano aplicado\n");
 } else process.stdout.write("[TITA] célula customizada; caderno será destacado dentro do modal\n");
}
if(!src.includes("<ManualNotebookDayItems date={date} />")||!src.includes("CRIAR CADERNO DE ANOTAÇÕES")||!src.includes("useManualNotebookCounts()"))
 throw new Error("Falha na validação da integração. Arquivo original preservado.");
if(src===initial.replace(/\r\n/g,"\n")){process.stdout.write("[TITA] Calendário já atualizado. Nenhuma alteração necessária.\n");process.exit(0);}
const dir=path.join(root,".tita-backups","caderno-manual-"+new Date().toISOString().replace(/[:.]/g,"-"));
fs.mkdirSync(dir,{recursive:true});
fs.copyFileSync(file,path.join(dir,"principal-calendar.tsx"));
const tmp=file+".mtmanual-"+process.pid+".tmp";
try{
 fs.writeFileSync(tmp,src.replace(/\n/g,originalEol),"utf8");
 fs.renameSync(tmp,file);
}catch(e){try{fs.unlinkSync(tmp)}catch{}throw e;}
process.stdout.write("[TITA] Calendário preservado + caderno manual conectado. Backup: "+dir+"\n");
