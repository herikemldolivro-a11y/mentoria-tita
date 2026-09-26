create or replace function public.admin_import_questions(p_questions jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_item jsonb;
  v_index integer := 0;
  v_ids jsonb := '[]'::jsonb;
  v_id uuid;
  v_batch_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acesso restrito ao administrador';
  end if;

  if jsonb_typeof(p_questions) <> 'array'
     or jsonb_array_length(p_questions) = 0 then
    raise exception 'Envie um array JSON com pelo menos uma questão';
  end if;

  if jsonb_array_length(p_questions) > 2000 then
    raise exception 'Importe no máximo 2000 questões por lote';
  end if;

  insert into public.question_import_batches (created_by, question_count, backfilled)
  values (auth.uid(), jsonb_array_length(p_questions), false)
  returning id into v_batch_id;

  for v_item in
    select value from jsonb_array_elements(p_questions)
  loop
    v_index := v_index + 1;
    begin
      v_id := public.admin_upsert_question(v_item);
      update public.questions
      set import_batch_id = v_batch_id
      where id = v_id;
      v_ids := v_ids || jsonb_build_array(v_id);
    exception when others then
      raise exception 'Registro %: %', v_index, sqlerrm;
    end;
  end loop;

  return jsonb_build_object(
    'imported', v_index,
    'ids', v_ids,
    'batch_id', v_batch_id
  );
end;
$function$;
