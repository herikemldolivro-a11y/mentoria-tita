"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const DAY_RE=/\bDIA\s*(\d{1,3})\b/i;
const WEEKDAY_RE=/^(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)(-feira)?$/i;
const DATE_RE=/\b\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?\b/g;
const DATE_TEST_RE=/\b\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?\b/;
type LessonPreview={lesson_title:string;pdf_path:string|null};
function leaves(root:Element){return Array.from(root.querySelectorAll<HTMLElement>("*")).filter(el=>el.children.length===0&&Boolean(el.textContent?.trim()));}
function lessonCard(el:HTMLElement,main:Element){let node:HTMLElement|null=el;for(let d=0;node&&node!==main&&d<7;d++,node=node.parentElement){const t=node.textContent??"";if((/AULA\s*\d+/i.test(t)||/ABRIR AULA/i.test(t)||/QUESTÕES/i.test(t))&&t.length<1700)return node;}return el.parentElement;}
function closestSection(el:HTMLElement|null){let n:HTMLElement|null=el;for(let d=0;n&&d<7;d++,n=n.parentElement){if(n.tagName==="SECTION"||n.tagName==="ARTICLE")return n;}return el?.parentElement??null;}

export function ScheduleExperienceEnhancer(){
  const pathname=usePathname();
  useEffect(()=>{
    let alive=true;let observer:MutationObserver|null=null;let frame=0;let previews:LessonPreview[]=[];
    const relevant=pathname.startsWith("/cronograma")||pathname.startsWith("/desempenho")||pathname.startsWith("/revisoes/");
    if(!relevant)return;

    async function loadPreviews(){if(!pathname.startsWith("/cronograma"))return;try{const supabase=createClient();const {data:auth}=await supabase.auth.getUser();if(!auth.user)return;const {data:profile}=await supabase.from("profiles").select("active_study_plan_id").eq("id",auth.user.id).maybeSingle();if(!profile?.active_study_plan_id)return;const {data}=await supabase.from("study_lesson_catalog").select("lesson_title,pdf_path").eq("plan_id",profile.active_study_plan_id);previews=(data??[]) as LessonPreview[];}catch{}}

    function apply(){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const main=document.querySelector("main");if(!main)return;const all=leaves(main);const mainText=main.textContent??"";
      if(pathname.startsWith("/cronograma")){
        const lessonDetailPath=/^\/cronograma\/semana-\d+\/[^/]+\/[^/]+\/?$/.test(pathname); // MT_NO_PREVIEW_ON_LESSON_DETAIL_V1
        const previewAllowed=/^\/cronograma(?:\/semana-\d+)?(?:\/[^/]+)?\/?$/.test(pathname);
        const isLessonDetail=lessonDetailPath||/ETAPA\s*0?1\s*[·•-]\s*TEORIA|Escolha como estudar esta aula/i.test(mainText);
        const nums=[...new Set(all.map(el=>el.textContent?.match(DAY_RE)?.[1]).filter(Boolean).map(Number))].sort((a,b)=>a-b);const local=new Map(nums.map((n,i)=>[n,i+1]));
        for(const el of all){const text=el.textContent?.trim()??"";const m=text.match(DAY_RE);if(m){const mapped=local.get(Number(m[1]))??Number(m[1]);const cleaned=text.replace(DAY_RE,`DIA ${mapped}`).replace(DATE_RE,"").replace(/[•·|—–-]\s*$/g,"").replace(/\s{2,}/g," ").trim();if(cleaned!==text)el.textContent=cleaned;el.classList.add("mt-day-title-v18");}if(WEEKDAY_RE.test(text)){el.style.display="none";el.dataset.mtWeekdayHidden="1";}if(DATE_TEST_RE.test(text)&&!/DIA\s*\d+/i.test(text)){const cleaned=text.replace(DATE_RE,"").replace(/^\s*[•·|—–-]\s*/,"").replace(/\s{2,}/g," ").trim();if(!cleaned)el.style.display="none";else if(cleaned!==text)el.textContent=cleaned;}}

        const mtPprnCleanScreen=/PPRN|POL[IÍ]CIA PENAL RN|Pol[Ií]cia Penal RN/i.test(mainText); // MT_PPRN_NO_STRETCHED_PREVIEWS_V14
        if(isLessonDetail||mtPprnCleanScreen){main.querySelectorAll<HTMLElement>(".mt-pdf-thumb-v17,.mt-pdf-thumb-v18").forEach(el=>el.remove());main.querySelectorAll<HTMLElement>(".mt-lesson-card-v17,.mt-lesson-card-v18").forEach(el=>{el.classList.remove("mt-lesson-card-v17","mt-lesson-card-v18");el.style.paddingLeft="";el.style.paddingTop="";});}
        else if(previewAllowed) for(const preview of previews){if(!preview.lesson_title)continue;const title=all.find(el=>el.textContent?.trim()===preview.lesson_title);if(!title)continue;const card=lessonCard(title,main);if(!card||card.dataset.mtPreviewCard==="1")continue;card.dataset.mtPreviewCard="1";card.classList.add("mt-lesson-card-v18");const thumb=document.createElement("div");thumb.className="mt-pdf-thumb-v18";if(preview.pdf_path){const iframe=document.createElement("iframe");iframe.title="Prévia do PDF";iframe.src=`${preview.pdf_path}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`;iframe.tabIndex=-1;iframe.setAttribute("aria-hidden","true");thumb.appendChild(iframe);}else thumb.innerHTML='<span class="mt-pdf-placeholder-v18">PDF</span>';card.prepend(thumb);}

        const trailLeaf=all.find(el=>/SUA TRILHA|TRILHA DA AULA|FLUXO COMPLETO DA AULA/i.test(el.textContent??""));if(trailLeaf){let trail:HTMLElement|null=trailLeaf;for(let d=0;trail&&trail!==main&&d<7;d++,trail=trail.parentElement){const text=trail.textContent??"";if(text.length>40&&text.length<2200){trail.classList.add("mt-sticky-trail-v18");break;}}}
        // V2.0: o botão manual de conclusão da lista volta a ficar visível/clicável.
        // A conclusão automática após responder a lista continua funcionando pelo backend.
      }

      if(pathname.startsWith("/desempenho")&&!main.querySelector("[data-mt-performance-v19]")){
        const heading=all.find(el=>/Onde você está forte e onde precisa reagir\.?/i.test(el.textContent??""));if(heading&&!main.querySelector("[data-mt-performance-toggle]")){let anchor:HTMLElement=heading;for(let d=0;anchor.parentElement&&d<5;d++){if(anchor.nextElementSibling)break;anchor=anchor.parentElement;}const parent=anchor.parentElement;if(parent){const body:Array<HTMLElement>=[];let sib=anchor.nextElementSibling as HTMLElement|null;while(sib){body.push(sib);sib=sib.nextElementSibling as HTMLElement|null;}body.forEach(el=>{el.dataset.mtPerformanceBody="1";el.style.display="none";});const button=document.createElement("button");button.type="button";button.dataset.mtPerformanceToggle="1";button.className="mt-performance-toggle-v18";button.textContent="VER MATÉRIAS";let open=false;button.onclick=()=>{open=!open;body.forEach(el=>el.style.display=open?"":"none");button.textContent=open?"OCULTAR MATÉRIAS":"VER MATÉRIAS";};anchor.insertAdjacentElement("afterend",button);}}
      }

      if(pathname.startsWith("/revisoes/")){
        const leveling=all.find(el=>/ETAPA\s*0?2\s*[·•-]\s*NIVELAMENTO/i.test(el.textContent??""));const section=closestSection(leveling??null);if(section)section.style.display="none";
      }
    });}

    void loadPreviews().finally(()=>alive&&apply());apply();const main=document.querySelector("main");if(main){observer=new MutationObserver(apply);observer.observe(main,{childList:true,subtree:true,characterData:true});}return()=>{alive=false;observer?.disconnect();cancelAnimationFrame(frame);};
  },[pathname]);

  return <style>{`
    .mt-day-title-v18{font-size:clamp(1.7rem,3.2vw,2.55rem)!important;line-height:1!important;font-weight:950!important;letter-spacing:-.04em!important;color:#a78bfa!important;text-transform:uppercase!important;margin-bottom:.5rem!important}
    .mt-lesson-card-v18{position:relative!important;min-height:132px!important;padding-left:205px!important;border-color:rgba(139,92,246,.22)!important;background:linear-gradient(120deg,rgba(139,92,246,.055),rgba(255,255,255,.012) 42%,transparent)!important;overflow:hidden!important}
    .mt-pdf-thumb-v18{position:absolute!important;left:20px!important;top:18px!important;width:160px!important;height:96px!important;overflow:hidden!important;border-radius:16px!important;border:1px solid rgba(139,92,246,.25)!important;background:linear-gradient(145deg,#181228,#0b0b0f)!important;pointer-events:none!important}
    .mt-pdf-thumb-v18 iframe{width:190%!important;height:190%!important;transform:scale(.53)!important;transform-origin:top left!important;border:0!important;background:white!important;pointer-events:none!important}.mt-pdf-placeholder-v18{display:grid!important;height:100%!important;place-items:center!important;color:#a78bfa!important;font-size:11px!important;font-weight:900!important}
    .mt-sticky-trail-v18{position:sticky!important;top:104px!important;max-height:none!important;overflow:visible!important;border:1px solid rgba(139,92,246,.27)!important;border-radius:24px!important;background:linear-gradient(180deg,rgba(18,13,31,.97),rgba(8,8,12,.98))!important;box-shadow:0 20px 55px rgba(0,0,0,.26)!important;padding:16px!important;scrollbar-width:none!important}.mt-sticky-trail-v18::-webkit-scrollbar{display:none!important}.mt-sticky-trail-v18::before,.mt-sticky-trail-v18::after{display:none!important}
    .mt-performance-toggle-v18{margin-top:14px;min-height:42px;border-radius:12px;border:1px solid rgba(139,92,246,.28);background:rgba(139,92,246,.08);padding:0 16px;color:#a78bfa;font-size:10px;font-weight:900;letter-spacing:.1em;cursor:pointer}.mt-performance-toggle-v18:hover{background:rgba(139,92,246,.13)}
    @media(max-width:760px){.mt-lesson-card-v18{padding-left:inherit!important;padding-top:132px!important}.mt-pdf-thumb-v18{left:18px!important;right:18px!important;top:16px!important;width:auto!important;height:98px!important}.mt-sticky-trail-v18{position:relative!important;top:auto!important}}
  `}</style>;
}
