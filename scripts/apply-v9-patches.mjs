import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] || process.cwd();

function patch(relative, transform) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) return;
  const before = fs.readFileSync(file, "utf8");
  const after = transform(before);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    console.log("Patch V9:", relative);
  }
}

patch("lib/prf-week-one.ts", (text) => {
  let next = text.replace('slug: "contabilidade" | "raciocinio-logico";', 'slug: string;');
  if (!next.includes("questionCount?: number;")) {
    next = next.replace("weekOne: boolean;", "weekOne: boolean;\n  questionCount?: number;");
  }
  // Repara eventual literal \\n deixado por um patch antigo.
  next = next.replace(/weekOne: boolean;\\n\s*questionCount\?: number;/g, "weekOne: boolean;\n  questionCount?: number;");
  return next;
});

patch("lib/revision-system.ts", (text) =>
  text.replace('subjectSlug: "contabilidade" | "raciocinio-logico";', 'subjectSlug: string;')
);

patch("lib/study-database.ts", (text) =>
  text
    .replace(/\n\s*\.eq\("week_number",\s*weekNumber\)/g, "")
    .replace(/\n\s*\.eq\("week_number",\s*1\)/g, "")
);

patch("components/app-topbar.tsx", (text) =>
  text
    .replaceAll('href: "/cronograma/semana-1"', 'href: "/cronograma"')
    .replaceAll('href="/cronograma/semana-1"', 'href="/cronograma"')
);

patch("lib/navigation.ts", (text) =>
  text
    .replaceAll('href: "/cronograma/semana-1"', 'href: "/cronograma"')
    .replaceAll('Cronograma — Semana 1', 'Cronograma')
);

patch("components/admin-content-manager.tsx", (text) => {
  let next = text;

  if (!next.includes("initialLessonId?: string | null;")) {
    next = next.replace(
      /export function AdminContentManager\(\{\s*lessons,\s*initialMaterials,\s*\}: \{\s*lessons: AdminLesson\[\];\s*initialMaterials: AdminMaterial\[\];\s*\}\) \{/m,
      `export function AdminContentManager({\n  lessons,\n  initialMaterials,\n  initialLessonId = null,\n}: {\n  lessons: AdminLesson[];\n  initialMaterials: AdminMaterial[];\n  initialLessonId?: string | null;\n}) {`
    );
  }

  // Repara eventual literal \\n de versão anterior.
  next = next.replace(/initialMaterials,\\n\s*initialLessonId = null,\\n/g, "initialMaterials,\n  initialLessonId = null,\n");

  if (!next.includes("const initialSelectedLesson =")) {
    next = next.replace(
      /\s*const \[selectedLessonId, setSelectedLessonId\] = useState\(lessons\[0\]\?\.lesson_id \?\? ""\);/,
      `\n  const initialSelectedLesson = lessons.find((lesson) => lesson.lesson_id === initialLessonId) ?? lessons[0] ?? null;\n  const [selectedLessonId, setSelectedLessonId] = useState(initialSelectedLesson?.lesson_id ?? "");`
    );
    next = next.replace(
      'const [title, setTitle] = useState(lessons[0]?.lesson_title ?? "");',
      'const [title, setTitle] = useState(initialSelectedLesson?.lesson_title ?? "");'
    );
  }

  next = next.replace(
    /PRF · S\{lesson\.week_number\}/g,
    '{lesson.plan_slug.toUpperCase()} · S{lesson.week_number}'
  );

  return next;
});

patch("components/prf-lesson-workflow.tsx", (text) => {
  let next = text;

  if (!next.includes("const questionCount = lesson.questionCount ?? 35;")) {
    next = next.replace(
      "const listAvailable = state.theoryCompleted;",
      "const questionCount = lesson.questionCount ?? 35;\n  const listAvailable = state.theoryCompleted;"
    );
  }
  next = next.replace(/const questionCount = lesson\.questionCount \?\? 35;\\n\s*const listAvailable/g, "const questionCount = lesson.questionCount ?? 35;\n  const listAvailable");

  next = next
    .replaceAll("Lista de 35 questões", "Lista de {questionCount} questões")
    .replaceAll("e 35 questões serão congeladas", "e {questionCount} questões serão congeladas")
    .replaceAll("pelo menos 35 questões cadastradas", "pelo menos {questionCount} questões cadastradas")
    .replaceAll("INICIAR LISTA — 35 QUESTÕES", "INICIAR LISTA — {questionCount} QUESTÕES")
    .replaceAll("INICIAR LISTA - 35 QUESTÕES", "INICIAR LISTA - {questionCount} QUESTÕES")
    .replaceAll("required_count: attempt.required_count ?? current?.required_count ?? 35", "required_count: attempt.required_count ?? current?.required_count ?? questionCount")
    .replaceAll("questionStatus?.required_count ?? 35", "questionStatus?.required_count ?? questionCount");

  // JSX que exibia o selo fixo de 35 questões.
  next = next.replace(/>35 QUESTÕES</g, ">{questionCount} QUESTÕES<");
  next = next.replace(/\{\"35 QUESTÕES\"\}/g, "{`${questionCount} QUESTÕES`}");

  return next;
});

patch("components/admin-question-manager.tsx", (text) => {
  let next = text;

  if (!next.includes("required_count: number;")) {
    next = next.replace(/(total_count:\s*number;)/, "$1\n  required_count: number;");
  }

  next = next
    .replace(/Number\(row\.active_count\)\s*>=\s*35/g, "Number(row.active_count) >= Number(row.required_count ?? 35)")
    .replaceAll("Meta mínima: 35 ativas.", "Cobertura conforme a lista configurada em cada aula.");

  if (!next.includes("COPIAR MODELO DAS QUESTÕES")) {
    const target = '<button type="button" onClick={() => setJsonInput(friendlyQuestionTemplate)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px] font-black tracking-[.1em] text-[var(--gold-bright)]">PREENCHER COM MODELO</button>';
    const replacement = '<div className="flex flex-wrap gap-2"><button type="button" onClick={() => void navigator.clipboard.writeText(friendlyQuestionTemplate)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px] font-black tracking-[.1em] text-[var(--gold-bright)]">COPIAR MODELO DAS QUESTÕES</button><button type="button" onClick={() => setJsonInput(friendlyQuestionTemplate)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px] font-black tracking-[.1em] text-[var(--gold-bright)]">PREENCHER COM MODELO</button></div>';
    next = next.replace(target, replacement);
  }

  return next;
});

console.log("Patches V9 concluidos.");
