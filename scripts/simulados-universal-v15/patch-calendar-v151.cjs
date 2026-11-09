"use strict";
// MT_SIMULADO_UNIVERSAL_CALENDAR_V151
function replaceOnce(s,from,to,at){
 if(s.includes(to))return s;
 if(s.split(from).length!==2)throw Error("Ajuste "+at+": trecho esperado nao encontrado uma unica vez. Nao alterei seus arquivos.");
 return s.replace(from,to);
}
function patchCalendarApi(orig){
 let s=orig;
 if(s.includes("MT_SIMULADO_UNIVERSAL_CALENDAR_API_V15"))return s;
 s=replaceOnce(s,"export type PrincipalCalendarHub = {",[
 'export type PrincipalSimuladoReview = {',
 '  id: string; simulado_id: string; titulo: string; dia_origem: number;',
 '  round_number: number; scheduled_for: string; completed_at: string | null;',
 '  status: "scheduled" | "completed"; question_count: number;',
 '};',
 '',
 'export type PrincipalCalendarHub = {'
 ].join("\n"),"tipo simulado");
 s=replaceOnce(s,"  notebooks: PrincipalNotebookReview[];",
  "  notebooks: PrincipalNotebookReview[];\n  simulado_reviews: PrincipalSimuladoReview[];","lista do hub");
 const spot=/(\bnotebooks:\s*result\?\.notebooks\s*\?\?\s*\[\],)/;
 if(!spot.test(s))throw Error("A leitura do calendario possui outro formato; nenhum arquivo alterado.");
 s=s.replace(spot,"$1\n    simulado_reviews: result?.simulado_reviews ?? [], // MT_SIMULADO_UNIVERSAL_CALENDAR_API_V15");
 return s;
}
function patchCalendar(orig){
 let s=orig;
 if(s.includes("MT_SIMULADO_UNIVERSAL_CALENDAR_V15"))return s;
 s=replaceOnce(s,"  type PrincipalRevision,","  type PrincipalRevision,\n  type PrincipalSimuladoReview,","import do calendário");
 const u=s.indexOf("type CalendarActivity ="),exp=s.indexOf("export function PrincipalCalendar",u);
 const end=s.lastIndexOf(";",exp);
 if(u<0||exp<0||end<u)throw Error("Nao achei a definicao das atividades; calendario preservado.");
 s=s.slice(0,end)+
  "\n  | {\n      kind: \"simulado\";\n      id: string; date: string; completed: boolean;\n"+
  "      subject: string; title: string; eyebrow: string;\n"+
  "      simulado: PrincipalSimuladoReview;\n    }"+s.slice(end);
 s=replaceOnce(s,"  function openActivity(activity: CalendarActivity) {",
  '  function openActivity(activity: CalendarActivity) {\n'+
  '    if (activity.kind === "simulado") {\n'+
  '      router.push("/estudos/simulados?tab=calendario&data="+encodeURIComponent(activity.date)+\n'+
  '        "&simulado="+encodeURIComponent(activity.simulado.simulado_id)+\n'+
  '        "&round="+encodeURIComponent(activity.simulado.id));\n'+
  '      return;\n    }',"abrir resolucao");
 const marker='  const order: Record<CalendarActivity["kind"], number> = {';
 const b=[
  '  const simuladoReviews: CalendarActivity[] = (hub.simulado_reviews ?? [])',
  '    .filter(x=>Boolean(x.scheduled_for))',
  '    .map(x=>({',
  '      kind: "simulado" as const, id: x.id, date: x.scheduled_for,',
  '      completed: x.status === "completed",',
  '      subject: "REVISÃO DE QUESTÕES",',
  '      title: x.titulo+" · "+x.question_count+" questões salvas",',
  '      eyebrow: x.titulo+" · QUESTÕES", simulado: x,',
  '    }));',
  '',
  marker
 ].join("\n");
 s=replaceOnce(s,marker,b,"montar atividades");
 const orderStart=s.indexOf(marker);
 const orderEnd=s.indexOf("};",orderStart);
 if(orderStart<0||orderEnd<0)throw Error("Nao localizei o final da ordenacao.");
 s=s.slice(0,orderEnd)+"    simulado: 4,\n  "+s.slice(orderEnd);
 const returnStart=s.indexOf("return [",orderEnd),returnEnd=s.indexOf("].sort(",returnStart);
 if(returnStart<0||returnEnd<0)throw Error("Nao localizei a lista de atividades.");
 s=s.slice(0,returnEnd)+", ...simuladoReviews"+s.slice(returnEnd);
 const iconFrom='  if (activity.kind === "revision") {\n    return <Sparkles';
 if(s.includes(iconFrom))s=s.replace(iconFrom,
   '  if (activity.kind === "simulado") return <BookOpenText size={15} className={className} />;\n'+iconFrom);
 s=s.replace('  const revisions = activities.filter((item) => item.kind === "revision").length;',
   '  const revisions = activities.filter((item) => item.kind === "revision" || item.kind === "simulado").length;');
 s=s.replace('activity.kind === "revision" ? "REVISÃO" : "PENDENTE"',
   'activity.kind === "simulado" ? "QUESTÕES" : activity.kind === "revision" ? "REVISÃO" : "PENDENTE"');
 s=s.replace('      : "border-violet-300/26 bg-[linear-gradient(90deg,rgba(124,58,237,.13),rgba(7,16,28,.82))]";',
   '      : activity.kind === "simulado"\n        ? "border-cyan-300/45 bg-cyan-300/[.10]"\n        : "border-violet-300/26 bg-[linear-gradient(90deg,rgba(124,58,237,.13),rgba(7,16,28,.82))]";');
 s=s.replace('data-mt-calendar-v52="1"','data-mt-calendar-v52="1" data-mt-universal-simulado="MT_SIMULADO_UNIVERSAL_CALENDAR_V15"');
 if(!s.includes("...simuladoReviews")||!s.includes("&round="+'')){}
 return s;
}
module.exports={patchCalendar,patchCalendarApi};
