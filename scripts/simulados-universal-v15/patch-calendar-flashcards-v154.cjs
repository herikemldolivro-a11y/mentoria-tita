"use strict";
// MT_SIMULADO_FLASHCARD_CALENDAR_PATCH_V154
// Apply ONLY to an existing V15/15.3 local calendar. Preserve other activities.
function replaceOnce(source,from,to,label){
  if(source.includes(to))return source;
  const n=source.split(from).length-1;
  if(n!==1)throw Error("Calendário V15.3 incompatível: "+label+" ("+n+" ocorrências). Nada foi alterado.");
  return source.replace(from,to);
}
function patchCalendarApi(orig){
  let s=orig;
  if(s.includes("MT_SIMULADO_FLASHCARD_CALENDAR_API_V154"))return s;
  if(!s.includes("MT_SIMULADO_UNIVERSAL_CALENDAR_API_V15"))throw Error("Integração V15 do calendário não instalada.");
  s=replaceOnce(s,
    '  status: "scheduled" | "completed"; question_count: number;',
    '  status: "scheduled" | "completed"; question_count: number;\n'+
    '  notebook_count: number; notebook_date: string; notebook_completed: boolean; notebook_completed_at: string | null; // MT_SIMULADO_FLASHCARD_CALENDAR_API_V154',
    "tipo de revisão de simulado");
  return s;
}
function patchCalendar(orig){
  let s=orig;
  if(s.includes("MT_SIMULADO_FLASHCARD_CALENDAR_V154"))return s;
  if(!s.includes("MT_SIMULADO_UNIVERSAL_CALENDAR_V15"))throw Error("Integração V15 do calendário não instalada.");
  s=replaceOnce(s,
    '  | {\n      kind: "simulado";',
    '  | {\n      kind: "simulado-notebook";\n      id: string; date: string; completed: boolean;\n'+
    '      subject: string; title: string; eyebrow: string;\n      simulado: PrincipalSimuladoReview;\n    }\n'+
    '  | {\n      kind: "simulado";',
    "tipo atividade caderno de simulado");
  s=replaceOnce(s,
    '    if (activity.kind === "simulado") {',
    '    if (activity.kind === "simulado-notebook") {\n'+
    '      router.push("/estudos/simulados?tab=calendario&data="+encodeURIComponent(activity.date)+\n'+
    '        "&simulado="+encodeURIComponent(activity.simulado.simulado_id)+\n'+
    '        "&round="+encodeURIComponent(activity.simulado.id)+"&notebook=1");\n'+
    '      return;\n    }\n'+
    '    if (activity.kind === "simulado") {',
    "abrir caderno correto");
  const order='  const order: Record<CalendarActivity["kind"], number> = {';
  const notebookBlock=[
    '  const simuladoNotebooks: CalendarActivity[] = (hub.simulado_reviews ?? [])',
    '    .filter(x=>x.notebook_count>0 && Boolean(x.notebook_date))',
    '    .map(x=>({',
    '      kind:"simulado-notebook" as const,',
    '      id:"caderno-"+x.id, date:x.notebook_date, completed:Boolean(x.notebook_completed),',
    '      subject:"CADERNO DE SIMULADO",',
    '      title:x.titulo+" · "+x.notebook_count+" flashcard(s)",',
    '      eyebrow:x.titulo+" · CADERNO (VÉSPERA)",',
    '      simulado:x,',
    '    }));',
    '',
    order
  ].join('\n');
  s=replaceOnce(s,order,notebookBlock,"construir caderno na véspera");
  if(!/simulado:\s*4,/.test(s))throw Error("Ordem da revisão V15 não localizada.");
  s=s.replace(/simulado:\s*4,/,'simulado: 4,\n    "simulado-notebook": 1,');
  s=replaceOnce(s,'...simuladoReviews].sort(', '...simuladoReviews, ...simuladoNotebooks].sort(', "exibir cadernos");
  s=replaceOnce(s,'  if (activity.kind === "simulado") return <BookOpenText size={15} className={className} />;',
    '  if (activity.kind === "simulado-notebook") return <NotebookPen size={15} className={className} />;\n'+
    '  if (activity.kind === "simulado") return <BookOpenText size={15} className={className} />;',
    "ícone dos flashcards");
  s=replaceOnce(s,'activity.kind === "simulado" ? "QUESTÕES" :',
    'activity.kind === "simulado-notebook" ? "CADERNO" : activity.kind === "simulado" ? "QUESTÕES" :',
    "rótulo caderno");
  s=replaceOnce(s,'data-mt-universal-simulado="MT_SIMULADO_UNIVERSAL_CALENDAR_V15"',
    'data-mt-universal-simulado="MT_SIMULADO_UNIVERSAL_CALENDAR_V15" data-mt-simulado-flashcards="MT_SIMULADO_FLASHCARD_CALENDAR_V154"',
    "marcador de versão");
  return s;
}
module.exports={patchCalendar,patchCalendarApi};
