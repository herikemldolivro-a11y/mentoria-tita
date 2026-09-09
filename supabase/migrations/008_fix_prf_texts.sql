-- Mentoria Titã — correção dos textos do piloto PRF.
-- Idempotente. Pode ser executada novamente sem duplicar registros.

create or replace function public.mt_fix_text(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
begin
  if p_value is null then return null; end if;

  -- Só tenta reparar quando há sinais típicos de UTF-8 interpretado como Windows-1252.
  if strpos(p_value, chr(195)) = 0
     and strpos(p_value, chr(194)) = 0
     and strpos(p_value, chr(226)) = 0 then
    return p_value;
  end if;

  begin
    v := convert_from(convert_to(p_value, 'WIN1252'), 'UTF8');
    return v;
  exception when others then
    return p_value;
  end;
end;
$$;

update public.contests
set nome = public.mt_fix_text(nome),
    sigla = public.mt_fix_text(sigla);

update public.study_plans
set name = public.mt_fix_text(name);

update public.study_weeks
set title = public.mt_fix_text(title);

update public.study_subjects
set short_name = public.mt_fix_text(short_name),
    name = public.mt_fix_text(name),
    description = public.mt_fix_text(description);

update public.study_lessons
set title = public.mt_fix_text(title),
    priority = public.mt_fix_text(priority);

update public.study_lesson_topics
set topic = public.mt_fix_text(topic);

update public.questions
set statement = public.mt_fix_text(statement),
    banca = public.mt_fix_text(banca),
    exam_name = public.mt_fix_text(exam_name),
    source_code = public.mt_fix_text(source_code);

update public.question_keys
set explanation = public.mt_fix_text(explanation);

-- Força os nomes corretos do piloto PRF, inclusive se algum campo tiver sido salvo duplicado.
update public.contests
set nome = 'Polícia Rodoviária Federal',
    sigla = 'PRF'
where slug = 'prf';

update public.study_plans
set name = 'PRF — Foco 95+'
where slug = 'prf-foco95';

update public.study_weeks w
set title = 'Semana 1'
from public.study_plans p
where w.plan_id = p.id
  and p.slug = 'prf-foco95'
  and w.week_number = 1;

update public.study_subjects s
set short_name = case s.slug
      when 'contabilidade' then 'CONTABILIDADE'
      when 'raciocinio-logico' then 'RLM'
      else s.short_name
    end,
    name = case s.slug
      when 'contabilidade' then 'Contabilidade'
      when 'raciocinio-logico' then 'Raciocínio Lógico-Matemático'
      else s.name
    end,
    description = case s.slug
      when 'contabilidade' then 'Base patrimonial, fatos contábeis e estrutura fundamental da disciplina.'
      when 'raciocinio-logico' then 'Fundamentos matemáticos aplicados ao perfil de cobrança da PRF.'
      else s.description
    end
from public.study_plans p
where s.plan_id = p.id
  and p.slug = 'prf-foco95'
  and s.slug in ('contabilidade', 'raciocinio-logico');

update public.study_lessons l
set title = case l.slug
      when 'fundamentos-da-contabilidade' then 'Fundamentos da Contabilidade'
      when 'patrimonio-e-situacao-liquida' then 'Patrimônio e Situação Líquida'
      when 'atos-e-fatos-administrativos' then 'Atos e Fatos Administrativos'
      when 'razao-e-proporcao' then 'Razão e Proporção'
      when 'regra-de-tres' then 'Regra de Três'
      else l.title
    end,
    priority = case l.slug
      when 'fundamentos-da-contabilidade' then 'Média'
      when 'patrimonio-e-situacao-liquida' then 'Muito alta'
      when 'atos-e-fatos-administrativos' then 'Muito alta'
      when 'razao-e-proporcao' then 'Muito alta'
      when 'regra-de-tres' then 'Muito alta'
      else l.priority
    end
from public.study_subjects s
join public.study_plans p on p.id = s.plan_id
where l.subject_id = s.id
  and p.slug = 'prf-foco95'
  and l.slug in (
    'fundamentos-da-contabilidade',
    'patrimonio-e-situacao-liquida',
    'atos-e-fatos-administrativos',
    'razao-e-proporcao',
    'regra-de-tres'
  );

drop function if exists public.mt_fix_text(text);
