"use strict";
// MT_ENGLISH_PATCH_V160. Patches existing local files; never replaces full calendar.
function once(source,from,to,label){
  if(source.includes(to))return source;
  const count=source.split(from).length-1;
  if(count!==1)throw Error("Inglês V16: ponto de integração incompatível ("+label+", "+count+"). Arquivos locais preservados.");
  return source.replace(from,to);
}
function patchHub(original){
  if(original.includes("MT_ENGLISH_HUB_V160"))return original;
  let s=original;
  const anchor='      <div className="mt-5 flex flex-wrap gap-2">';
  const block=[
    anchor,
    '        {/* MT_ENGLISH_HUB_V160 */}',
    '        <Link href="/ingles/rotina" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300/45 bg-amber-300/10 px-4 text-[10px] font-black tracking-[.07em] text-amber-600 dark:text-amber-300">',
    '          <BookOpenText size={16} /> REORGANIZAR · 2 TEXTOS/DIA',
    '        </Link>',
  ].join('\n');
  s=once(s,anchor,block,"aba reorganizar");
  return s;
}
function patchReader(original){
  if(original.includes("MT_ENGLISH_READER_RETURN_V160"))return original;
  let s=original;
  s=once(s,
    '  const returnToPmal = searchParams.get("return") === "pmal"; // MT_PMAL_ENGLISH_RETURN_V12_7',
    '  const returnToPmal = searchParams.get("return") === "pmal"; // MT_PMAL_ENGLISH_RETURN_V12_7\n'+
    '  const returnToDaily = searchParams.get("return") === "rotina"; // MT_ENGLISH_READER_RETURN_V160',
    "origem da rotina diária");
  const quoted=String.fromCharCode(96);
  const dynamicWeek=quoted+'/ingles/semana/'+'$'+'{data.text.week_number}'+quoted;
  s=once(s,
    'href={returnToPmal ? "/cronograma" : '+dynamicWeek+'}',
    'href={returnToDaily ? "/ingles/rotina" : returnToPmal ? "/cronograma" : '+dynamicWeek+'}',
    "link voltar");
  s=once(s,
    '{returnToPmal ? "VOLTAR AO CFO PMAL" : '+quoted+'SEMANA '+'$'+'{data.text.week_number}'+quoted+'}',
    '{returnToDaily ? "VOLTAR À ROTINA" : returnToPmal ? "VOLTAR AO CFO PMAL" : '+quoted+'SEMANA '+'$'+'{data.text.week_number}'+quoted+'}',
    "rótulo voltar");
  s=once(s,
    'router.push('+dynamicWeek+')',
    'router.push(returnToDaily ? "/ingles/rotina" : '+dynamicWeek+')',
    "voltar após conclusão");
  return s;
}
function patchCalendar(original){
  if(original.includes("MT_ENGLISH_CALENDAR_PRIORITY_V160"))return original;
  let s=original;
  const anchor='import { listenStudyUpdated } from "@/lib/study-database";';
  s=once(s,anchor,
    anchor+'\nimport { EnglishCalendarPriority } from "@/components/english-calendar-priority-v160";',
    "import do calendário");
  const rootModal='      {selectedDate ? (\n        <DayActivitiesModal';
  s=once(s,rootModal,
    '      {/* MT_ENGLISH_CALENDAR_PRIORITY_V160 · tarefas no fim do calendário */}\n'+
    '      <EnglishCalendarPriority date={selectedDate ?? undefined} />\n\n'+rootModal,
    "prioridade no fim do calendário");
  const detail='          <div className="mt-4 overflow-hidden rounded-[18px] border border-amber-300/15';
  s=once(s,detail,
    '          <EnglishCalendarPriority date={date} compact />\n\n'+detail,
    "prioridade ao abrir o dia");
  return s;
}
module.exports={patchHub,patchReader,patchCalendar};
