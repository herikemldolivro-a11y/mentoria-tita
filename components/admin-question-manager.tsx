"use client";

import { Check, ClipboardPaste, FileJson, LoaderCircle, Pencil, Plus, Power, RefreshCw, Save, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { QuestionChoiceMap, QuestionType } from "@/lib/question-bank";
import { friendlyQuestionTemplate, parseFriendlyQuestionImport, multiLessonQuestionTemplate, parseMultiLessonQuestionImport } from "@/lib/question-import";

export type AdminQuestionCatalogRow = {
  plan_id: string;
  plan_slug: string;
  plan_name: string;
  subject_id: string;
  subject_name: string;
  subject_slug: string;
  lesson_id: string;
  lesson_title: string;
  lesson_slug: string;
  lesson_position: number;
};

type AdminQuestion = {
  id: string;
  plan_id: string;
  subject_id: string;
  lesson_id: string;
  statement: string;
  question_type: QuestionType;
  choices: QuestionChoiceMap | null;
  level: number;
  banca: string | null;
  ano: number | null;
  exam_name: string | null;
  source_code: string | null;
  active: boolean;
  question_keys: { correct_answer: string; explanation: string | null } | Array<{ correct_answer: string; explanation: string | null }> | null;
};

type OverviewRow = {
  plan_id: string;
  plan_name: string;
  subject_id: string;
  subject_name: string;
  lesson_id: string;
  lesson_title: string;
  active_count: number;
  total_count: number;
  required_count: number;
};

type FormState = {
  id: string;
  plan_id: string;
  subject_id: string;
  lesson_id: string;
  statement: string;
  question_type: QuestionType;
  choices: QuestionChoiceMap;
  level: string;
  banca: string;
  ano: string;
  exam_name: string;
  source_code: string;
  correct_answer: string;
  explanation: string;
  active: boolean;
};

const blankChoices = { A: "", B: "", C: "", D: "", E: "" };

function createBlankForm(catalog: AdminQuestionCatalogRow[]): FormState {
  const first = catalog[0];
  return {
    id: "",
    plan_id: first?.plan_id ?? "",
    subject_id: first?.subject_id ?? "",
    lesson_id: first?.lesson_id ?? "",
    statement: "",
    question_type: "true_false",
    choices: { ...blankChoices },
    level: "1",
    banca: "",
    ano: "",
    exam_name: "",
    source_code: "",
    correct_answer: "TRUE",
    explanation: "",
    active: true,
  };
}

export function AdminQuestionManager({ catalog }: { catalog: AdminQuestionCatalogRow[] }) {
  const [tab, setTab] = useState<"form" | "import" | "manage" | "multi" | "coverage">("form");
  const [form, setForm] = useState<FormState>(() => createBlankForm(catalog));
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [overview, setOverview] = useState<OverviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState("");

  // TITAN_MULTI_LESSON_IMPORT_V1
  const [multiInput, setMultiInput] = useState("");
  const [multiPlanId, setMultiPlanId] = useState(catalog[0]?.plan_id ?? "");
  const [coverageMode, setCoverageMode] = useState<"all" | "empty">("empty");
  const [importFormat, setImportFormat] = useState<"friendly" | "json">("friendly");
  const [importContext, setImportContext] = useState(() => ({
    plan_id: catalog[0]?.plan_id ?? "",
    subject_id: catalog[0]?.subject_id ?? "",
    lesson_id: catalog[0]?.lesson_id ?? "",
  }));
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ subject: "", lesson: "", level: "", banca: "", ano: "", status: "all" });

  const plans = useMemo(() => unique(catalog.map((row) => ({ id: row.plan_id, name: row.plan_name }))), [catalog]);
  const subjects = useMemo(() => unique(catalog.filter((row) => !form.plan_id || row.plan_id === form.plan_id).map((row) => ({ id: row.subject_id, name: row.subject_name }))), [catalog, form.plan_id]);
  const lessons = useMemo(() => unique(catalog.filter((row) => row.subject_id === form.subject_id).map((row) => ({ id: row.lesson_id, name: row.lesson_title }))), [catalog, form.subject_id]);
  const filterLessons = useMemo(() => unique(catalog.filter((row) => !filters.subject || row.subject_id === filters.subject).map((row) => ({ id: row.lesson_id, name: row.lesson_title }))), [catalog, filters.subject]);
  const importSubjects = useMemo(() => unique(catalog.filter((row) => row.plan_id === importContext.plan_id).map((row) => ({ id: row.subject_id, name: row.subject_name }))), [catalog, importContext.plan_id]);
  const importLessons = useMemo(() => unique(catalog.filter((row) => row.subject_id === importContext.subject_id).map((row) => ({ id: row.lesson_id, name: row.lesson_title }))), [catalog, importContext.subject_id]);
  const friendlyPreview = useMemo(() => importFormat === "friendly" && jsonInput.trim()
    ? parseFriendlyQuestionImport(jsonInput, importContext)
    : null, [importContext, importFormat, jsonInput]);


  // TITAN_MULTI_LESSON_IMPORT_V1
  const multiPreview = useMemo(
    () => multiInput.trim() ? parseMultiLessonQuestionImport(multiInput, catalog, multiPlanId) : null,
    [catalog, multiInput, multiPlanId],
  );
  const emptyOverview = useMemo(
    () => overview.filter((row) => Number(row.active_count) === 0),
    [overview],
  );
  const coverageRows = useMemo(
    () => coverageMode === "empty" ? emptyOverview : overview,
    [coverageMode, emptyOverview, overview],
  );

  const refreshOverview = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("admin_question_overview");
    if (error) throw error;
    setOverview((data ?? []) as OverviewRow[]);
  }, []);

  const refreshQuestions = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("questions")
      .select("id,plan_id,subject_id,lesson_id,statement,question_type,choices,level,banca,ano,exam_name,source_code,active,question_keys(correct_answer,explanation)", { count: "exact" })
      .order("created_at", { ascending: false });
    if (filters.subject) query = query.eq("subject_id", filters.subject);
    if (filters.lesson) query = query.eq("lesson_id", filters.lesson);
    if (filters.level) query = query.eq("level", Number(filters.level));
    if (filters.banca.trim()) query = query.ilike("banca", `%${filters.banca.trim()}%`);
    if (filters.ano) query = query.eq("ano", Number(filters.ano));
    if (filters.status !== "all") query = query.eq("active", filters.status === "active");
    const from = (page - 1) * 20;
    const { data, error, count } = await query.range(from, from + 19);
    if (error) throw error;
    setQuestions((data ?? []) as AdminQuestion[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [filters.ano, filters.banca, filters.lesson, filters.level, filters.status, filters.subject, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      Promise.all([refreshOverview(), refreshQuestions()]).catch((error) => {
        setLoading(false);
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar o banco.");
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshOverview, refreshQuestions]);

  function changePlan(planId: string) {
    const subject = catalog.find((row) => row.plan_id === planId);
    setForm((current) => ({ ...current, plan_id: planId, subject_id: subject?.subject_id ?? "", lesson_id: subject?.lesson_id ?? "" }));
  }

  function changeSubject(subjectId: string) {
    const lesson = catalog.find((row) => row.subject_id === subjectId);
    setForm((current) => ({ ...current, subject_id: subjectId, lesson_id: lesson?.lesson_id ?? "" }));
  }

  function changeImportPlan(planId: string) {
    const subject = catalog.find((row) => row.plan_id === planId);
    setImportContext({ plan_id: planId, subject_id: subject?.subject_id ?? "", lesson_id: subject?.lesson_id ?? "" });
  }

  function changeImportSubject(subjectId: string) {
    const lesson = catalog.find((row) => row.subject_id === subjectId);
    setImportContext((current) => ({ ...current, subject_id: subjectId, lesson_id: lesson?.lesson_id ?? "" }));
  }

  async function saveQuestion(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    const stableScrollY = window.scrollY;
    setLoading(true);
    setMessage(null);
    setErrorMessage(null);
    const choices = Object.fromEntries(Object.entries(form.choices).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()]));
    const payload = {
      ...form,
      level: Number(form.level),
      ano: form.ano ? Number(form.ano) : null,
      choices: form.question_type === "multiple_choice" ? choices : null,
      correct_answer: form.correct_answer,
    };
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("admin_upsert_question", { p_payload: payload });
      if (error) throw error;
      setMessage(form.id ? "Questão atualizada." : "Questão adicionada ao banco.");
      setForm(createBlankForm(catalog));
      await Promise.all([refreshOverview(), refreshQuestions()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar a questão.");
    } finally {
      setLoading(false);
      const restoreStableScroll = () => window.scrollTo({ top: stableScrollY, left: 0, behavior: "auto" });
      window.requestAnimationFrame(restoreStableScroll);
      window.setTimeout(restoreStableScroll, 80);
      window.setTimeout(restoreStableScroll, 250);
    }
  }

  function editQuestion(question: AdminQuestion) {
    const key = Array.isArray(question.question_keys) ? question.question_keys[0] : question.question_keys;
    setForm({
      id: question.id,
      plan_id: question.plan_id,
      subject_id: question.subject_id,
      lesson_id: question.lesson_id,
      statement: question.statement,
      question_type: question.question_type,
      choices: { ...blankChoices, ...(question.choices ?? {}) },
      level: String(question.level),
      banca: question.banca ?? "",
      ano: question.ano ? String(question.ano) : "",
      exam_name: question.exam_name ?? "",
      source_code: question.source_code ?? "",
      correct_answer: key?.correct_answer ?? (question.question_type === "true_false" ? "TRUE" : "A"),
      explanation: key?.explanation ?? "",
      active: question.active,
    });
    setTab("form");
    setMessage(null);
    setErrorMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleActive(question: AdminQuestion) {
    setLoading(true);
    setErrorMessage(null);
    const supabase = createClient();
    const { error } = await supabase.from("questions").update({ active: !question.active }).eq("id", question.id);
    if (error) setErrorMessage(error.message);
    else setMessage(question.active ? "Questão desativada sem apagar o histórico." : "Questão reativada.");
    await Promise.all([refreshOverview(), refreshQuestions()]);
    setLoading(false);
  }

  async function importQuestions() {
    const stableScrollY = window.scrollY;
    setMessage(null);
    setErrorMessage(null);

    if (!importContext.plan_id || !importContext.subject_id || !importContext.lesson_id) {
      setErrorMessage("Selecione concurso, matéria e aula antes de importar.");
      return;
    }

    let parsed: unknown;

    if (importFormat === "friendly") {
      const result = parseFriendlyQuestionImport(jsonInput, importContext);
      if (result.errors.length) {
        setErrorMessage(result.errors.join(" "));
        return;
      }
      parsed = result.questions;
    } else {
      try {
        const raw = JSON.parse(jsonInput);

        const source =
          Array.isArray(raw)
            ? raw
            : raw &&
                typeof raw === "object" &&
                Array.isArray((raw as { questions?: unknown[] }).questions)
              ? (raw as { questions: unknown[] }).questions
              : null;

        if (!source) {
          setErrorMessage('O JSON deve ser um array [...] ou um objeto com a chave "questions".');
          return;
        }

        parsed = source.map((rawItem, index) => {
          if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
            throw new Error(`Questão ${index + 1}: cada item precisa ser um objeto.`);
          }

          const item = rawItem as Record<string, unknown>;

          const pick = (...keys: string[]) => {
            for (const key of keys) {
              const value = item[key];
              if (value !== undefined && value !== null && String(value).trim() !== "") return value;
            }
            return null;
          };

          const statement = String(
            pick("statement", "enunciado", "questao", "questão") ?? "",
          ).trim();

          if (!statement) {
            throw new Error(`Questão ${index + 1}: enunciado/statement está vazio.`);
          }

          const level = Number(pick("level", "nivel", "nível"));
          if (![1, 2, 3, 4].includes(level)) {
            throw new Error(`Questão ${index + 1}: nível deve ser 1, 2, 3 ou 4.`);
          }

          const choices: Record<string, string> = {};
          const rawChoices = pick("choices", "alternativas");

          if (rawChoices && typeof rawChoices === "object" && !Array.isArray(rawChoices)) {
            for (const [key, value] of Object.entries(rawChoices as Record<string, unknown>)) {
              const letter = key.trim().toUpperCase();
              const content = String(value ?? "").trim();
              if (/^[A-E]$/.test(letter) && content) choices[letter] = content;
            }
          }

          for (const letter of ["A", "B", "C", "D", "E"]) {
            const value = pick(letter, letter.toLowerCase());
            if (value !== null && String(value).trim()) choices[letter] = String(value).trim();
          }

          const rawType = String(pick("question_type", "tipo") ?? "")
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .replace(/[_-]+/g, " ");

          let questionType: QuestionType;

          if (!rawType) {
            questionType = Object.keys(choices).length ? "multiple_choice" : "true_false";
          } else if (
            ["TRUE FALSE", "TRUE/FALSE", "CERTO ERRADO", "CERTO/ERRADO", "C/E", "CE"].includes(rawType)
          ) {
            questionType = "true_false";
          } else if (
            ["MULTIPLE CHOICE", "MULTIPLA ESCOLHA", "ALTERNATIVAS"].includes(rawType)
          ) {
            questionType = "multiple_choice";
          } else {
            throw new Error(`Questão ${index + 1}: tipo não reconhecido (${rawType}).`);
          }

          if (questionType === "multiple_choice" && Object.keys(choices).length < 2) {
            throw new Error(`Questão ${index + 1}: múltipla escolha precisa de pelo menos 2 alternativas.`);
          }

          const rawAnswer = String(
            pick("correct_answer", "gabarito", "resposta") ?? "",
          )
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase();

          let correctAnswer = rawAnswer;

          if (questionType === "true_false") {
            if (["CERTO", "C", "TRUE", "VERDADEIRO"].includes(rawAnswer)) correctAnswer = "TRUE";
            else if (["ERRADO", "E", "FALSE", "FALSO"].includes(rawAnswer)) correctAnswer = "FALSE";
            else throw new Error(`Questão ${index + 1}: gabarito deve ser CERTO ou ERRADO.`);
          } else {
            if (!/^[A-E]$/.test(correctAnswer)) {
              throw new Error(`Questão ${index + 1}: gabarito deve ser uma letra de A até E.`);
            }
            if (!choices[correctAnswer]) {
              throw new Error(`Questão ${index + 1}: alternativa ${correctAnswer} do gabarito não foi preenchida.`);
            }
          }

          const yearValue = pick("ano", "year");
          const year = yearValue === null ? null : Number(yearValue);

          if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2200)) {
            throw new Error(`Questão ${index + 1}: ano inválido.`);
          }

          const activeValue = pick("active", "ativa", "ativo");
          const active =
            activeValue === null
              ? true
              : typeof activeValue === "boolean"
                ? activeValue
                : !["false", "0", "nao", "não", "inativo"].includes(
                    String(activeValue).trim().toLowerCase(),
                  );

          return {
            plan_id: String(pick("plan_id") ?? importContext.plan_id),
            subject_id: String(pick("subject_id") ?? importContext.subject_id),
            lesson_id: String(pick("lesson_id") ?? importContext.lesson_id),
            statement,
            question_type: questionType,
            choices: questionType === "multiple_choice" ? choices : null,
            level,
            banca: String(pick("banca") ?? "").trim() || null,
            ano: year,
            exam_name:
              String(pick("exam_name", "prova", "cargo", "cargo_prova") ?? "").trim() || null,
            source_code:
              String(pick("source_code", "fonte", "codigo", "código") ?? "").trim() || null,
            correct_answer: correctAnswer,
            explanation:
              String(
                pick(
                  "explanation",
                  "comentario",
                  "comentário",
                  "explicacao",
                  "explicação",
                ) ?? "",
              ).trim() || null,
            active,
          };
        });
      } catch (error) {
        setErrorMessage(
          error instanceof SyntaxError
            ? "JSON inválido. Verifique vírgulas, aspas e colchetes."
            : error instanceof Error
              ? error.message
              : "Não foi possível interpretar o JSON.",
        );
        return;
      }
    }

    if (!Array.isArray(parsed) || !parsed.length) {
      setErrorMessage("O lote não contém questões para importar.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("admin_import_questions", {
        p_questions: parsed,
      });

      if (error) {
        const details = [error.message, error.details, error.hint]
          .filter((value) => typeof value === "string" && value.trim())
          .join(" · ");

        setErrorMessage(details || "Não foi possível importar o lote.");
        return;
      }

      setMessage(
        `${Number((data as { imported?: number })?.imported ?? parsed.length)} questões importadas com sucesso.`,
      );
      setJsonInput("");
      await Promise.all([refreshOverview(), refreshQuestions()]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível importar o lote.",
      );
    } finally {
      setLoading(false);
      const restoreStableScroll = () => window.scrollTo({ top: stableScrollY, left: 0, behavior: "auto" });
      window.requestAnimationFrame(restoreStableScroll);
      window.setTimeout(restoreStableScroll, 80);
      window.setTimeout(restoreStableScroll, 250);
    }
  }


  // TITAN_MULTI_LESSON_IMPORT_V1
  async function copyMultiTemplate() {
    setErrorMessage(null);
    try {
      await navigator.clipboard.writeText(multiLessonQuestionTemplate);
      setMessage("Modelo multiaulas copiado. Cole onde você prepara as questões e depois traga tudo de volta de uma vez.");
    } catch {
      setMultiInput(multiLessonQuestionTemplate);
      setMessage("Não consegui acessar a área de transferência; deixei o modelo preenchido no campo.");
    }
  }

  async function importMultiQuestions() {
    setMessage(null);
    setErrorMessage(null);

    const result = parseMultiLessonQuestionImport(multiInput, catalog, multiPlanId);
    if (result.errors.length) {
      setErrorMessage(result.errors.join(" "));
      return;
    }
    if (!result.questions.length) {
      setErrorMessage("Nenhuma questão válida foi encontrada.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("admin_import_questions", {
        p_questions: result.questions,
      });
      if (error) throw error;

      const imported = Number((data as { imported?: number })?.imported ?? result.questions.length);
      const aulas = new Set(result.questions.map((question) => question.lesson_id)).size;
      setMessage(
        imported +
          " questões importadas e distribuídas automaticamente em " +
          aulas +
          " aula(s).",
      );
      setMultiInput("");
      await Promise.all([refreshOverview(), refreshQuestions()]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível importar o lote multiaulas.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === "form"} onClick={() => setTab("form")} icon={Plus}>ADICIONAR QUESTÃO</TabButton>
        <TabButton active={tab === "import"} onClick={() => setTab("import")} icon={FileJson}>IMPORTAR EM LOTE</TabButton>

        <TabButton active={tab === "multi"} onClick={() => setTab("multi")} icon={ClipboardPaste}>IMPORTAR VÁRIAS AULAS</TabButton>
        <TabButton active={tab === "coverage"} onClick={() => setTab("coverage")} icon={RefreshCw}>AULAS SEM QUESTÕES</TabButton>
        <TabButton active={tab === "manage"} onClick={() => setTab("manage")} icon={RefreshCw}>GERENCIAR BANCO</TabButton>
      </div>

      {message ? <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/[.07] p-4 text-xs text-emerald-400"><Check size={16} /> {message}</div> : null}
      {errorMessage ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">{errorMessage}</div> : null}

      {tab === "form" ? (
        <form onSubmit={saveQuestion} className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3"><div><span className="text-[9px] font-black tracking-[.16em] text-[var(--gold-bright)]">{form.id ? "EDIÇÃO" : "NOVA QUESTÃO"}</span><h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">{form.id ? "Editar questão." : "Adicionar ao banco."}</h2></div>{form.id ? <button type="button" onClick={() => setForm(createBlankForm(catalog))} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)]"><X size={16} /></button> : null}</div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <FieldSelect label="CONCURSO / PLANO" value={form.plan_id} onChange={changePlan} options={plans} />
            <FieldSelect label="MATÉRIA" value={form.subject_id} onChange={changeSubject} options={subjects} />
            <FieldSelect label="ASSUNTO / AULA" value={form.lesson_id} onChange={(value) => setForm((current) => ({ ...current, lesson_id: value }))} options={lessons} />
            <FieldSelect label="NÍVEL" value={form.level} onChange={(value) => setForm((current) => ({ ...current, level: value }))} options={[1,2,3,4].map((value) => ({ id: String(value), name: `Nível ${value}` }))} />
            <FieldSelect label="TIPO" value={form.question_type} onChange={(value) => setForm((current) => ({ ...current, question_type: value as QuestionType, correct_answer: value === "true_false" ? "TRUE" : "A" }))} options={[{ id: "true_false", name: "Certo / Errado" }, { id: "multiple_choice", name: "Múltipla escolha" }]} />
            <TextField label="BANCA" value={form.banca} onChange={(value) => setForm((current) => ({ ...current, banca: value }))} placeholder="Ex.: Cebraspe" />
            <TextField label="ANO" value={form.ano} onChange={(value) => setForm((current) => ({ ...current, ano: value }))} type="number" placeholder="2026" />
            <TextField label="CARGO / PROVA" value={form.exam_name} onChange={(value) => setForm((current) => ({ ...current, exam_name: value }))} placeholder="Policial Rodoviário Federal" />
            <TextField label="CÓDIGO / FONTE" value={form.source_code} onChange={(value) => setForm((current) => ({ ...current, source_code: value }))} placeholder="Opcional" />
          </div>
          <label className="mt-4 block text-[9px] font-black tracking-[.13em] text-[var(--muted)]">ENUNCIADO<textarea required rows={6} value={form.statement} onChange={(event) => setForm((current) => ({ ...current, statement: event.target.value }))} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm font-normal leading-7 tracking-normal text-[var(--ink)] outline-none focus:border-[var(--border-strong)]" /></label>

          {form.question_type === "multiple_choice" ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{Object.keys(blankChoices).map((key) => <TextField key={key} label={`ALTERNATIVA ${key}`} value={form.choices[key]} onChange={(value) => setForm((current) => ({ ...current, choices: { ...current.choices, [key]: value } }))} placeholder={key === "E" ? "Opcional" : "Texto da alternativa"} />)}</div> : null}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FieldSelect label="GABARITO" value={form.correct_answer} onChange={(value) => setForm((current) => ({ ...current, correct_answer: value }))} options={form.question_type === "true_false" ? [{ id: "TRUE", name: "Certo" }, { id: "FALSE", name: "Errado" }] : Object.keys(blankChoices).filter((key) => form.choices[key].trim()).map((key) => ({ id: key, name: key }))} />
            <label className="flex items-center gap-3 self-end rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-xs font-bold text-[var(--ink)]"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} className="accent-[var(--gold)]" /> QUESTÃO ATIVA</label>
          </div>
          <label className="mt-4 block text-[9px] font-black tracking-[.13em] text-[var(--muted)]">COMENTÁRIO / EXPLICAÇÃO<textarea rows={4} value={form.explanation} onChange={(event) => setForm((current) => ({ ...current, explanation: event.target.value }))} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm font-normal leading-6 tracking-normal text-[var(--ink)] outline-none focus:border-[var(--border-strong)]" /></label>
          <button disabled={loading} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--gold)] px-6 text-[10px] font-black tracking-[.12em] text-[#111] disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />} {form.id ? "SALVAR ALTERAÇÕES" : "ADICIONAR QUESTÃO"}</button>
        </form>
      ) : null}

      {tab === "import" ? (
        <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
          <span className="text-[9px] font-black tracking-[.16em] text-[var(--gold-bright)]">IMPORTAÇÃO INTELIGENTE</span><h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">Cole, confira e importe.</h2><p className="mt-2 text-xs leading-6 text-[var(--muted)]">Escolha concurso, matéria e aula. No JSON você não precisa informar UUIDs: a plataforma usa automaticamente o destino selecionado e valida o lote antes de inserir.</p>
          <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => { setImportFormat("friendly"); setJsonInput(""); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-[9px] font-black" style={{ borderColor: importFormat === "friendly" ? "rgba(210,166,78,.5)" : "var(--border)", color: importFormat === "friendly" ? "var(--gold-bright)" : "var(--muted)" }}><ClipboardPaste size={14} /> FORMULÁRIO DE TEXTO</button><button type="button" onClick={() => { setImportFormat("json"); setJsonInput(""); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-[9px] font-black" style={{ borderColor: importFormat === "json" ? "rgba(210,166,78,.5)" : "var(--border)", color: importFormat === "json" ? "var(--gold-bright)" : "var(--muted)" }}><FileJson size={14} /> JSON AVANÇADO</button></div>
          <div className="mt-5 grid gap-3 md:grid-cols-3"><FieldSelect label="CONCURSO / PLANO DO LOTE" value={importContext.plan_id} onChange={changeImportPlan} options={plans} /><FieldSelect label="MATÉRIA DO LOTE" value={importContext.subject_id} onChange={changeImportSubject} options={importSubjects} /><FieldSelect label="ASSUNTO / AULA DO LOTE" value={importContext.lesson_id} onChange={(value) => setImportContext((current) => ({ ...current, lesson_id: value }))} options={importLessons} /></div>
          <div className="mt-5 flex items-center justify-between gap-3"><span className="text-[9px] font-black tracking-[.12em] text-[var(--muted)]">{importFormat === "friendly" ? "QUESTÕES PREENCHIDAS" : "JSON ESTRUTURADO"}</span>{importFormat === "friendly" ? <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void navigator.clipboard.writeText(friendlyQuestionTemplate)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px] font-black tracking-[.1em] text-[var(--gold-bright)]">COPIAR MODELO DAS QUESTÕES</button><button type="button" onClick={() => setJsonInput(friendlyQuestionTemplate)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px] font-black tracking-[.1em] text-[var(--gold-bright)]">PREENCHER COM MODELO</button></div> : null}</div>
          <textarea value={jsonInput} onChange={(event) => setJsonInput(event.target.value)} rows={18} spellCheck={false} placeholder={importFormat === "friendly" ? friendlyQuestionTemplate : jsonExample(catalog[0])} className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-[#090a0c] p-4 font-mono text-xs leading-6 text-white/85 outline-none focus:border-[var(--border-strong)]" />
          {friendlyPreview ? <div className={`mt-4 rounded-2xl border p-4 ${friendlyPreview.errors.length ? "border-red-500/30 bg-red-500/[.06]" : "border-emerald-500/30 bg-emerald-500/[.06]"}`}><strong className={`text-xs ${friendlyPreview.errors.length ? "text-red-400" : "text-emerald-400"}`}>{friendlyPreview.errors.length ? `${friendlyPreview.errors.length} problema(s) encontrado(s)` : `${friendlyPreview.questions.length} questão(ões) organizada(s) e pronta(s)`}</strong>{friendlyPreview.errors.length ? <div className="mt-2 space-y-1 text-[10px] leading-5 text-red-300">{friendlyPreview.errors.map((error) => <p key={error}>{error}</p>)}</div> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{friendlyPreview.questions.slice(0, 4).map((question, index) => <div key={`${question.source_code}-${index}`} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"><span className="text-[8px] font-black text-[var(--gold-bright)]">QUESTÃO {index + 1} · NÍVEL {question.level}</span><p className="mt-1 line-clamp-2 text-[10px] leading-5 text-[var(--muted)]">{question.statement}</p></div>)}</div>}</div> : null}
          <button type="button" onClick={importQuestions} disabled={!jsonInput.trim() || loading || Boolean(friendlyPreview?.errors.length)} className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--gold)] px-6 text-[10px] font-black tracking-[.12em] text-[#111] disabled:opacity-50">{loading ? <LoaderCircle className="animate-spin" size={16} /> : <FileJson size={16} />} VALIDAR E IMPORTAR {friendlyPreview && !friendlyPreview.errors.length ? `${friendlyPreview.questions.length} QUESTÕES` : ""}</button>
        </section>
      ) : null}

      
      {tab === "multi" ? (
        <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
          <span className="text-[9px] font-black tracking-[.16em] text-[var(--gold-bright)]">IMPORTAÇÃO MULTIAULAS</span>
          <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">Cole tudo de uma vez.</h2>
          <p className="mt-2 max-w-4xl text-xs leading-6 text-[var(--muted)]">
            Cada questão informa MATÉRIA e AULA. A plataforma localiza a aula correta no catálogo e distribui automaticamente o lote inteiro.
            Você pode misturar Direito, Filosofia, Sociologia, Português e qualquer outra matéria do mesmo plano no mesmo campo.
          </p>

          <div className="mt-5 max-w-xl">
            <FieldSelect label="CONCURSO / PLANO" value={multiPlanId} onChange={setMultiPlanId} options={plans} />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[9px] font-black tracking-[.12em] text-[var(--muted)]">MODELO PADRÃO MULTIAULAS</span>
              <p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">
                Repita MATÉRIA e AULA em cada questão. AULA aceita número, título ou “13 - Controle administrativo”.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyMultiTemplate}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px] font-black tracking-[.1em] text-[var(--gold-bright)]"
              >
                COPIAR MODELO
              </button>
              <button
                type="button"
                onClick={() => setMultiInput(multiLessonQuestionTemplate)}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px] font-black tracking-[.1em] text-[var(--muted)]"
              >
                PREENCHER COM MODELO
              </button>
            </div>
          </div>

          <textarea
            value={multiInput}
            onChange={(event) => setMultiInput(event.target.value)}
            rows={22}
            spellCheck={false}
            placeholder={multiLessonQuestionTemplate}
            className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-[#090a0c] p-4 font-mono text-xs leading-6 text-white/85 outline-none focus:border-[var(--border-strong)]"
          />

          {multiPreview ? (
            <div className={`mt-4 rounded-2xl border p-4 ${multiPreview.errors.length ? "border-red-500/30 bg-red-500/[.06]" : "border-emerald-500/30 bg-emerald-500/[.06]"}`}>
              <strong className={`text-xs ${multiPreview.errors.length ? "text-red-400" : "text-emerald-400"}`}>
                {multiPreview.errors.length
                  ? `${multiPreview.errors.length} problema(s) encontrado(s)`
                  : `${multiPreview.questions.length} questão(ões) pronta(s) para ${new Set(multiPreview.questions.map((question) => question.lesson_id)).size} aula(s)`}
              </strong>
              {multiPreview.errors.length ? (
                <div className="mt-2 space-y-1 text-[10px] leading-5 text-red-300">
                  {multiPreview.errors.slice(0, 20).map((error, index) => <p key={`${error}-${index}`}>{error}</p>)}
                  {multiPreview.errors.length > 20 ? <p>... e mais {multiPreview.errors.length - 20} problema(s).</p> : null}
                </div>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {Array.from(
                    new Map(
                      multiPreview.questions.map((question) => {
                        const row = catalog.find((item) => item.lesson_id === question.lesson_id);
                        return [question.lesson_id, row];
                      }),
                    ).values(),
                  ).filter(Boolean).slice(0, 8).map((row) => (
                    <div key={row!.lesson_id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                      <span className="text-[8px] font-black text-[var(--gold-bright)]">{row!.subject_name}</span>
                      <p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">Aula {row!.lesson_position} · {row!.lesson_title}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <button
            type="button"
            onClick={importMultiQuestions}
            disabled={!multiInput.trim() || loading || Boolean(multiPreview?.errors.length)}
            className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--gold)] px-6 text-[10px] font-black tracking-[.12em] text-[#111] disabled:opacity-50"
          >
            {loading ? <LoaderCircle className="animate-spin" size={16} /> : <ClipboardPaste size={16} />}
            VALIDAR E DISTRIBUIR {multiPreview && !multiPreview.errors.length ? `${multiPreview.questions.length} QUESTÕES` : ""}
          </button>
        </section>
      ) : null}

      {tab === "coverage" ? (
        <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-[9px] font-black tracking-[.16em] text-[var(--gold-bright)]">COBERTURA DO BANCO</span>
              <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">{emptyOverview.length} aula(s) sem nenhuma questão ativa.</h2>
              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                Veja rapidamente o que está zerado e, nas aulas que já têm questões, a quantidade aparece à direita.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCoverageMode("empty")}
                className="rounded-xl border px-4 py-2 text-[9px] font-black tracking-[.08em]"
                style={{ borderColor: coverageMode === "empty" ? "rgba(239,68,68,.5)" : "var(--border)", color: coverageMode === "empty" ? "#f87171" : "var(--muted)" }}
              >
                SEM QUESTÕES ({emptyOverview.length})
              </button>
              <button
                type="button"
                onClick={() => setCoverageMode("all")}
                className="rounded-xl border px-4 py-2 text-[9px] font-black tracking-[.08em]"
                style={{ borderColor: coverageMode === "all" ? "rgba(210,166,78,.5)" : "var(--border)", color: coverageMode === "all" ? "var(--gold-bright)" : "var(--muted)" }}
              >
                TODAS ({overview.length})
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-2">
            {coverageRows.map((row) => {
              const active = Number(row.active_count);
              const totalCount = Number(row.total_count);
              const required = Number(row.required_count ?? 35);
              return (
                <div key={row.lesson_id} className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-xs text-[var(--ink)]">{row.lesson_title}</strong>
                    <span className="text-[9px] text-[var(--muted)]">{row.subject_name} · meta {required}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <strong className={`block text-[11px] font-black ${active === 0 ? "text-red-400" : active >= required ? "text-emerald-400" : "text-[var(--gold-bright)]"}`}>
                      {active} QUESTÕES
                    </strong>
                    {totalCount !== active ? <span className="text-[8px] text-[var(--muted)]">{totalCount} no total</span> : null}
                  </div>
                </div>
              );
            })}
          </div>

          {!coverageRows.length ? (
            <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/[.06] p-4 text-xs text-emerald-400">
              Nenhuma aula zerada neste filtro.
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "manage" ? (
        <div className="space-y-5">
          <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-center justify-between gap-3"><div><span className="text-[9px] font-black tracking-[.16em] text-[var(--gold-bright)]">COBERTURA POR AULA</span><h2 className="mt-2 font-serif text-2xl text-[var(--ink)]">Cobertura conforme a lista configurada em cada aula.</h2></div><span className="text-[10px] font-black text-[var(--muted)]">{overview.filter((row) => Number(row.active_count) >= Number(row.required_count ?? 35)).length} / {overview.length} LIBERADAS</span></div><div className="mt-4 grid gap-2 md:grid-cols-2">{overview.map((row) => <div key={row.lesson_id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"><div className="min-w-0"><strong className="block truncate text-xs text-[var(--ink)]">{row.lesson_title}</strong><span className="text-[9px] text-[var(--muted)]">{row.subject_name}</span></div><span className={`shrink-0 text-[10px] font-black ${Number(row.active_count) >= Number(row.required_count ?? 35) ? "text-emerald-400" : "text-[var(--gold-bright)]"}`}>{row.active_count} / 35</span></div>)}</div></section>
          <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><FilterSelect label="MATÉRIA" value={filters.subject} onChange={(value) => { setFilters((current) => ({ ...current, subject: value, lesson: "" })); setPage(1); }} options={unique(catalog.map((row) => ({ id: row.subject_id, name: row.subject_name })))} /><FilterSelect label="ASSUNTO" value={filters.lesson} onChange={(value) => { setFilters((current) => ({ ...current, lesson: value })); setPage(1); }} options={filterLessons} /><FilterSelect label="NÍVEL" value={filters.level} onChange={(value) => { setFilters((current) => ({ ...current, level: value })); setPage(1); }} options={[1,2,3,4].map((value) => ({ id: String(value), name: `N${value}` }))} /><TextField label="BANCA" value={filters.banca} onChange={(value) => { setFilters((current) => ({ ...current, banca: value })); setPage(1); }} /><TextField label="ANO" value={filters.ano} onChange={(value) => { setFilters((current) => ({ ...current, ano: value })); setPage(1); }} type="number" /><FilterSelect label="STATUS" value={filters.status} onChange={(value) => { setFilters((current) => ({ ...current, status: value })); setPage(1); }} options={[{ id: "active", name: "Ativas" }, { id: "inactive", name: "Inativas" }]} allLabel="Todos" /></div>
          </section>
          <div className="space-y-3">{questions.map((question) => { const meta = catalog.find((row) => row.lesson_id === question.lesson_id); return <article key={question.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2 text-[9px] font-black tracking-[.1em] text-[var(--muted)]"><span className="text-[var(--gold-bright)]">NÍVEL {question.level}</span><span>{meta?.subject_name}</span><span>→ {meta?.lesson_title}</span>{question.banca ? <span>· {question.banca}</span> : null}{question.ano ? <span>· {question.ano}</span> : null}</div><p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--ink)]">{question.statement}</p></div><div className="flex shrink-0 gap-2"><button onClick={() => editQuestion(question)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-[9px] font-black text-[var(--muted)]"><Pencil size={14} /> EDITAR</button><button onClick={() => toggleActive(question)} className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-[9px] font-black ${question.active ? "border-red-500/25 text-red-400" : "border-emerald-500/25 text-emerald-400"}`}><Power size={14} /> {question.active ? "DESATIVAR" : "REATIVAR"}</button></div></div></article>; })}</div>
          {total > 20 ? <div className="flex items-center justify-center gap-3"><button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border border-[var(--border)] px-4 py-3 text-[9px] font-black text-[var(--muted)] disabled:opacity-40">ANTERIOR</button><span className="text-[10px] font-black text-[var(--gold-bright)]">{page} / {Math.ceil(total / 20)}</span><button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((value) => value + 1)} className="rounded-xl border border-[var(--border)] px-4 py-3 text-[9px] font-black text-[var(--muted)] disabled:opacity-40">PRÓXIMA</button></div> : null}
        </div>
      ) : null}
    </div>
  );
}

function unique(items: Array<{ id: string; name: string }>) { return Array.from(new Map(items.map((item) => [item.id, item])).values()); }
function TabButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof Plus; children: React.ReactNode }) { return <button type="button" onClick={onClick} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-[9px] font-black tracking-[.1em]" style={{ borderColor: active ? "rgba(210,166,78,.5)" : "var(--border)", background: active ? "rgba(210,166,78,.1)" : "var(--surface)", color: active ? "var(--gold-bright)" : "var(--muted)" }}><Icon size={15} />{children}</button>; }
function TextField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) { return <label className="block text-[9px] font-black tracking-[.13em] text-[var(--muted)]">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-normal tracking-normal text-[var(--ink)] outline-none focus:border-[var(--border-strong)]" /></label>; }
function FieldSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ id: string; name: string }> }) { return <label className="block text-[9px] font-black tracking-[.13em] text-[var(--muted)]">{label}<select required value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold tracking-normal text-[var(--ink)] outline-none focus:border-[var(--border-strong)]">{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>; }
function FilterSelect({ label, value, onChange, options, allLabel = "Todos" }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ id: string; name: string }>; allLabel?: string }) { return <label className="block text-[8px] font-black tracking-[.12em] text-[var(--muted)]">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-2 text-xs tracking-normal text-[var(--ink)]"><option value="">{allLabel}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>; }
function jsonExample(first?: AdminQuestionCatalogRow) { return JSON.stringify([{ plan_id: first?.plan_id ?? "UUID_DO_PLANO", subject_id: first?.subject_id ?? "UUID_DA_MATERIA", lesson_id: first?.lesson_id ?? "UUID_DA_AULA", statement: "Texto do enunciado", question_type: "multiple_choice", choices: { A: "Alternativa A", B: "Alternativa B", C: "Alternativa C", D: "Alternativa D" }, level: 2, banca: "Cebraspe", ano: 2025, exam_name: "PRF", source_code: "PRF-2025-001", correct_answer: "B", explanation: "Comentário da correção.", active: true }], null, 2); }
