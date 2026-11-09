"use strict";
// MT_SIMULADO_UNIVERSAL_CALENDAR_V15
// Patch calendar in place: preserve all local manual notebook functionality.
function replaceExactly(source,before,after,name){
  if(source.includes(after))return source;
  const n=source.split(before).length-1;
  if(n!==1)throw Error("Calendar anchor "+name+" found "+n+" times; no files changed.");
  return source.replace(before,after);
}
function patchCalendarApi(original){
 let s=original;
 if(s.includes("MT_SIMULADO_UNIVERSAL_CALENDAR_API_V15"))return s;
 const typeNew=[
  "export type PrincipalSimuladoReview = {",
  "  id: string; simulado_id: string; titulo: string; dia_origem: number;",
  "  round_number: number; scheduled_for: string; completed_at: string | null;",
  '  status: "scheduled" | "completed"; question_count: number;',
  "};",
  "",
  "export type PrincipalCalendarHub = {"
 ].join("\n");
 s=replaceExactly(s,"export type PrincipalCalendarHub = {",typeNew,"type");
 s=replaceExactly(s,"  notebooks: PrincipalNotebookReview[];\n  leveling_daily_limit:",
   "  notebooks: PrincipalNotebookReview[];\n  simulado_reviews: PrincipalSimuladoReview[];\n  leveling_daily_limit:","hub");
 s=replaceExactly(s,"    notebooks: result?.notebooks ?? [],",
  "    notebooks: result?.notebooks ?? [],\n    simulado_reviews: result?.simulado_reviews ?? [], // MT_SIMULADO_UNIVERSAL_CALENDAR_API_V15","loader");
 return s;
}
function patchCalendar(original){
 let s=original;
 if(s.includes("MT_SIMULADO_UNIVERSAL_CALENDAR_V15"))return s;
 s=replaceExactly(s,"  type PrincipalRevision,\n","  type PrincipalRevision,\n  type PrincipalSimuladoReview,\n","type import");
 const member=[
  "      leveling: PrincipalLeveling;",
  "    }",
  "  | {",
  '      kind: "simulado";',
  "      id: string; date: string; completed: boolean;",
  "      subject: string; title: string; eyebrow: string;",
  "      simulado: PrincipalSimuladoReview;",
  "    };"
 ].join("\n");
 const unionStart=s.indexOf("type CalendarActivity =");
 const unionEnd=s.indexOf(";\n\nexport function PrincipalCalendar",unionStart);
 if(unionStart<0||unionEnd<0)throw Error("Calendar union format unexpected; preserved.");
 s=s.slice(0,unionEnd)+"\n  | {\n      kind: \"simulado\";\n      id: string; date: string; completed: boolean;\n      subject: string; title: string; eyebrow: string;\n      simulado: PrincipalSimuladoReview;\n    }"+s.slice(unionEnd);
 const click=[
  '    if (activity.kind === "simulado") {',
  '      router.push("/estudos/simulados?tab=calendario&data="+encodeURIComponent(activity.date)+',
  '        "&simulado="+encodeURIComponent(activity.simulado.simulado_id)+',
  '        "&round="+encodeURIComponent(activity.simulado.id));',
  "      return;",
  "    }",
  "    void openLeveling(activity.leveling);"
 ].join("\n");
 s=replaceExactly(s,"    void openLeveling(activity.leveling);",click,"day click");
 s=replaceExactly(s,
  '  if (activity.kind === "notebook") {\n    return <NotebookPen size={15} className={className} />;\n  }\n  return <Medal',
  '  if (activity.kind === "notebook") {\n    return <NotebookPen size={15} className={className} />;\n  }\n  if (activity.kind === "simulado") {\n    return <BookOpenText size={15} className={className} />;\n  }\n  return <Medal',"icon");
 const block=[
  "  const simuladoReviews: CalendarActivity[] = (hub.simulado_reviews ?? [])",
  "    .filter(item => Boolean(item.scheduled_for))",
  "    .map(item => ({",
  '      kind: "simulado" as const,',
  "      id: item.id, date: item.scheduled_for,",
  '      completed: item.status === "completed",',
  '      subject: "REVISÃO DE QUESTÕES",',
  '      title: item.titulo + " · " + item.question_count + " questões salvas",',
  '      eyebrow: item.titulo + " · QUESTÕES",',
  "      simulado: item,",
  "    }));",
  "",
  '  const order: Record<CalendarActivity["kind"], number> = {'
 ].join("\n");
 s=replaceExactly(s,'  const order: Record<CalendarActivity["kind"], number> = {',block,"build event");
 s=replaceExactly(s,"    leveling: 2,","    leveling: 2,\n    simulado: 4,","sort");
 const returnRegex=/return (\[\.\.\.revisions[^\]]*\.\.\.levelings[^\]]*)\]\.sort\(/;
 if(!returnRegex.test(s))throw Error("Calendar activities return format unknown; preserved.");
 s=s.replace(returnRegex,(_match,list)=>"return "+list+", ...simuladoReviews].sort(");
 s=s.replace('  const revisions = activities.filter((item) => item.kind === "revision").length;',
  '  const revisions = activities.filter((item) => item.kind === "revision" || item.kind === "simulado").length;');
 s=s.replace('            {completed ? "CONCLUÍDA" : locked ? "BLOQUEADA" : activity.kind === "revision" ? "REVISÃO" : "PENDENTE"}',
  '            {completed ? "CONCLUÍDA" : locked ? "BLOQUEADA" : activity.kind === "simulado" ? "QUESTÕES" : activity.kind === "revision" ? "REVISÃO" : "PENDENTE"}');
 s=s.replace('      : "border-violet-300/26 bg-[linear-gradient(90deg,rgba(124,58,237,.13),rgba(7,16,28,.82))]";',
  '      : activity.kind === "simulado"\n        ? "border-cyan-300/45 bg-[linear-gradient(90deg,rgba(8,145,178,.15),rgba(7,16,28,.82))]"\n        : "border-violet-300/26 bg-[linear-gradient(90deg,rgba(124,58,237,.13),rgba(7,16,28,.82))]";');
 s=s.replace('data-mt-calendar-v52="1"','data-mt-calendar-v52="1" data-mt-universal-simulado="MT_SIMULADO_UNIVERSAL_CALENDAR_V15"');
 return s;
}
module.exports={patchCalendarApi,patchCalendar};
