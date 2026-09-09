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
    console.log("Patch:", relative);
  }
}

patch("lib/prf-week-one.ts", (text) => {
  let next = text.replace('slug: "contabilidade" | "raciocinio-logico";', 'slug: string;');
  if (!next.includes("questionCount?: number;")) {
    next = next.replace("weekOne: boolean;", "weekOne: boolean;\\n  questionCount?: number;");
  }
  return next;
});

patch("lib/revision-system.ts", (text) =>
  text.replace('subjectSlug: "contabilidade" | "raciocinio-logico";', 'subjectSlug: string;')
);

patch("lib/study-database.ts", (text) => {
  return text
    .replace(/\n\s*\.eq\("week_number", weekNumber\)/g, "")
    .replace(/\n\s*\.eq\("week_number", 1\)/g, "");
});

patch("components/app-topbar.tsx", (text) =>
  text.replaceAll('href: "/cronograma/semana-1"', 'href: "/cronograma"')
      .replaceAll('href="/cronograma/semana-1"', 'href="/cronograma"')
);

patch("lib/navigation.ts", (text) =>
  text.replaceAll('href: "/cronograma/semana-1"', 'href: "/cronograma"')
      .replaceAll('Cronograma — Semana 1', 'Cronograma')
);

patch("components/admin-content-manager.tsx", (text) => {
  let next = text;
  if (!next.includes("initialLessonId")) {
    next = next.replace(
      "initialMaterials,\\n}: {\\n  lessons: AdminLesson[];\\n  initialMaterials: AdminMaterial[];\\n}) {",
      "initialMaterials,\\n  initialLessonId = null,\\n}: {\\n  lessons: AdminLesson[];\\n  initialMaterials: AdminMaterial[];\\n  initialLessonId?: string | null;\\n}) {"
    );
    next = next.replace(
      'const [selectedLessonId, setSelectedLessonId] = useState(lessons[0]?.lesson_id ?? "");',
      'const initialSelectedLesson = lessons.find((lesson) => lesson.lesson_id === initialLessonId) ?? lessons[0] ?? null;\\n  const [selectedLessonId, setSelectedLessonId] = useState(initialSelectedLesson?.lesson_id ?? "");'
    );
    next = next.replace(
      'const [title, setTitle] = useState(lessons[0]?.lesson_title ?? "");',
      'const [title, setTitle] = useState(initialSelectedLesson?.lesson_title ?? "");'
    );
  }
  return next;
});

patch("components/prf-lesson-workflow.tsx", (text) => {
  let next = text;
  if (!next.includes("const questionCount = lesson.questionCount ?? 35;")) {
    next = next.replace(
      "const listAvailable = state.theoryCompleted;",
      "const questionCount = lesson.questionCount ?? 35;\\n  const listAvailable = state.theoryCompleted;"
    );
  }
  next = next.replace("Lista de 35 questões", "Lista de {questionCount} questões");
  next = next.replace("e 35 questões serão congeladas", "e {questionCount} questões serão congeladas");
  next = next.replace('"35 QUESTÕES"', "`${questionCount} QUESTÕES`");
  next = next.replace("pelo menos 35 questões cadastradas", "pelo menos {questionCount} questões cadastradas");
  next = next.replace("INICIAR LISTA — 35 QUESTÕES", "INICIAR LISTA — {questionCount} QUESTÕES");
  return next;
});

patch("components/admin-question-manager.tsx", (text) => {
  let next = text;
  if (!next.includes("required_count: number;")) {
    next = next.replace("total_count: number;\\n};", "total_count: number;\\n  required_count: number;\\n};");
  }

  next = next.replace(
    'overview.filter((row) => Number(row.active_count) >= 35).length',
    'overview.filter((row) => Number(row.active_count) >= Number(row.required_count ?? 35)).length'
  );
  next = next.replace("Meta mínima: 35 ativas.", "Cobertura conforme a lista configurada em cada aula.");

  if (!next.includes("COPIAR MODELO DAS QUESTÕES")) {
    const target = '<button type="button" onClick={() => setJsonInput(friendlyQuestionTemplate)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px] font-black tracking-[.1em] text-[var(--gold-bright)]">PREENCHER COM MODELO</button>';
    const replacement = '<div className="flex flex-wrap gap-2"><button type="button" onClick={() => void navigator.clipboard.writeText(friendlyQuestionTemplate)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px] font-black tracking-[.1em] text-[var(--gold-bright)]">COPIAR MODELO DAS QUESTÕES</button><button type="button" onClick={() => setJsonInput(friendlyQuestionTemplate)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px] font-black tracking-[.1em] text-[var(--gold-bright)]">PREENCHER COM MODELO</button></div>';
    next = next.replace(target, replacement);
  }
  return next;
});

console.log("Patches V8 concluidos.");
