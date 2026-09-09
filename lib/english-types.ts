export type EnglishSentence = { en: string; pt: string };

export type EnglishWeekOverview = {
  week_number: number;
  level_label: string;
  target_texts: number;
  reading_texts: number;
  exam_texts: number;
  available_texts: number;
  completed_texts: number;
};

export type EnglishWeekText = {
  id: string;
  day_number: number;
  level: number;
  mode: "read" | "exam";
  slug: string;
  title: string;
  position: number;
  source_title: string | null;
  status: "not_started" | "in_progress" | "completed";
  vocab_count: number;
  question_count: number;
  correct_answers: number;
};

export type EnglishWeekData = {
  goal: {
    week_number: number;
    level_label: string;
    target_texts: number;
    reading_texts: number;
    exam_texts: number;
  };
  texts: EnglishWeekText[];
};

export type EnglishReaderQuestion = {
  id: string;
  position: number;
  statement: string;
  correct_answer: boolean;
  explanation: string;
  answer: boolean | null;
  is_correct: boolean | null;
};

export type EnglishVocabularyWord = {
  id: string;
  word: string;
  word_key?: string;
  translation: string;
  context: string | null;
  starred: boolean;
  saved_at: string;
  review_count: number;
  last_reviewed_at?: string | null;
  text_title?: string;
  week_number?: number;
  day_number?: number;
};

export type EnglishReaderData = {
  text: {
    id: string;
    week_number: number;
    day_number: number;
    level: number;
    mode: "read" | "exam";
    slug: string;
    title: string;
    source_title: string | null;
    source_url: string | null;
    source_note: string;
    sentences: EnglishSentence[];
    word_map: Record<string, string>;
  };
  questions: EnglishReaderQuestion[];
  vocabulary: EnglishVocabularyWord[];
  status: "not_started" | "in_progress" | "completed";
};
