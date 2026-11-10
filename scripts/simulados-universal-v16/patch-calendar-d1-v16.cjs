"use strict";
// MT_SIMULADO_D1_CALENDAR_PATCH_V16
// Adds an independently completed D-1 flashcard task for every scheduled simulado review.
function patchCalendarApi(source) {
  if(source.includes("MT_SIMULADO_D1_CALENDAR_API_V16"))return source;
  const start=source.indexOf("export type PrincipalSimuladoReview = {");
  const end=source.indexOf("};",start);
  if(start<0||end<0)throw Error("V15 calendar API not installed: PrincipalSimuladoReview missing.");
  const segment=source.slice(start,end);
  if(segment.includes("notebook_count"))return source;
  const extra=[
    "  notebook_count: number;",
    "  notebook_date: string;",
    "  notebook_completed: boolean;",
    "  notebook_completed_at: string | null; // MT_SIMULADO_D1_CALENDAR_API_V16",
    ""
  ].join("\n");
  return source.slice(0,end)+extra+source.slice(end);
}
function patchCalendar(original) {
  let s=original;
  if(s.includes("MT_SIMULADO_D1_CALENDAR_PATCH_V16"))return s;
  if(!s.includes('kind: "simulado"'))throw Error("Instale a V15.2 antes da V16 (simulado ausente no calendario).");
  const unionStart=s.indexOf("type CalendarActivity =");
  const exported=s.indexOf("export function PrincipalCalendar",unionStart);
  const unionEnd=s.lastIndexOf(";",exported);
  if(unionStart<0||exported<0||unionEnd<unionStart)throw Error("Nao encontrei tipo de atividade do calendario.");
  const variant=[
    "  | {",
    '      kind: "simulado-notebook";',
    "      id: string; date: string; completed: boolean;",
    "      subject: string; title: string; eyebrow: string;",
    "      simulado: PrincipalSimuladoReview;",
    "    }"
  ].join("\n");
  s=s.slice(0,unionEnd)+"\n"+variant+s.slice(unionEnd);

  const open='  function openActivity(activity: CalendarActivity) {';
  const openPatch=[
    open,
    '    if (activity.kind === "simulado-notebook") {',
    "      setSelectedDate(null);",
    '      router.push("/estudos/simulados?tab=calendario&data="+encodeURIComponent(activity.date)+',
    '        "&simulado="+encodeURIComponent(activity.simulado.simulado_id)+',
    '        "&round="+encodeURIComponent(activity.simulado.id)+"&notebook=1");',
    "      return;",
    "    }"
  ].join("\n");
  if(s.split(open).length!==2)throw Error("Nao encontrei rotina abrir atividade no calendario.");
  s=s.replace(open,openPatch);

  const marker='  const order: Record<CalendarActivity["kind"], number> = {';
  const addition=[
    "  const simuladoNotebooks: CalendarActivity[] = (hub.simulado_reviews ?? [])",
    "    .filter(item => Number(item.notebook_count) > 0 && Boolean(item.notebook_date))",
    '    .filter(item => item.status !== "completed" || Boolean(item.notebook_completed))',
    "    .map(item => ({",
    '      kind: "simulado-notebook" as const,',
    '      id: "sim-nb-"+item.id,',
    "      date: item.notebook_date,",
    "      completed: Boolean(item.notebook_completed),",
    '      subject: "FLASHCARDS · SIMULADO",',
    '      title: item.titulo+" · "+item.notebook_count+" flashcard(s)",',
    '      eyebrow: "CADERNO D−1 · "+item.titulo,',
    "      simulado: item,",
    "    }));",
    "",
    marker
  ].join("\n");
  if(s.split(marker).length!==2)throw Error("Nao encontrei lista de atividades do calendario.");
  s=s.replace(marker,addition);
  const orderAt=s.indexOf(marker);
  const orderEnd=s.indexOf("};",orderAt);
  if(orderEnd<0)throw Error("Nao encontrei fim da lista de tipos.");
  s=s.slice(0,orderEnd)+'    "simulado-notebook": 3,\n  '+s.slice(orderEnd);
  const listStart=s.indexOf("return [",orderEnd);
  const listEnd=s.indexOf("].sort(",listStart);
  if(listStart<0||listEnd<0)throw Error("Nao encontrei retorno de atividades do calendario.");
  s=s.slice(0,listEnd)+", ...simuladoNotebooks"+s.slice(listEnd);

  const iconStart=s.indexOf("function ActivityIcon({");
  const iconBrace=s.indexOf("}) {",iconStart);
  if(iconStart<0||iconBrace<0)throw Error("Nao encontrei icones das atividades.");
  s=s.slice(0,iconBrace+4)+
    '\n  if (activity.kind === "simulado-notebook") return <NotebookPen size={15} className={className} />;'+s.slice(iconBrace+4);

  s=s.replace('activity.kind === "simulado" ? "QUESTÕES" :',
    'activity.kind === "simulado-notebook" ? "CADERNO D−1" : activity.kind === "simulado" ? "QUESTÕES" :');
  s=s.replace('    : locked\n      ? "border-white/10 bg-white/[.025] opacity-65"',
    '    : activity.kind === "simulado-notebook"\n      ? "border-violet-300/45 bg-[linear-gradient(90deg,rgba(139,92,246,.16),rgba(7,16,28,.82))]"\n    : locked\n      ? "border-white/10 bg-white/[.025] opacity-65"');
  s=s.replace('data-mt-universal-simulado="MT_SIMULADO_UNIVERSAL_CALENDAR_V15"',
    'data-mt-universal-simulado="MT_SIMULADO_UNIVERSAL_CALENDAR_V15" data-mt-d1-simulado="MT_SIMULADO_D1_CALENDAR_PATCH_V16"');
  if(!s.includes("MT_SIMULADO_D1_CALENDAR_PATCH_V16")){
    // Make sure installing twice is safe even if a customized calendar omitted the old data attribute.
    s=s.replace('data-mt-calendar-v52="1"',
      'data-mt-calendar-v52="1" data-mt-d1-simulado="MT_SIMULADO_D1_CALENDAR_PATCH_V16"');
  }
  if(!s.includes('"&notebook=1"')||!s.includes("...simuladoNotebooks"))
    throw Error("A integracao de cadernos nao esta completa. Nenhum arquivo alterado.");
  return s;
}
module.exports={patchCalendarApi,patchCalendar};
