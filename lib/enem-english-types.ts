export type EnemEnglishOption = { key: "A" | "B" | "C" | "D" | "E"; text: string };

export type EnemEnglishVisual = {
  variant: "cups" | "delete" | "food" | "office" | "homeless" | "scene";
  lines: string[];
  description: string;
  note?: string;
};

export type EnemEnglishReading = {
  id: string;
  day: number;
  slot: 1 | 2;
  year: number;
  application: string;
  questionLabel: string;
  title: string;
  kind: "text" | "visual";
  paragraphs: string[];
  source: string;
  visual?: EnemEnglishVisual;
  questionExcerpt?: string[];
  question: string;
  options: EnemEnglishOption[];
  correct: EnemEnglishOption["key"];
  explanation: string;
  glossary?: Record<string, string>;
};

export function makeEnemOptions(a:string,b:string,c:string,d:string,e:string): EnemEnglishOption[] {
  return [
    { key:"A", text:a }, { key:"B", text:b }, { key:"C", text:c }, { key:"D", text:d }, { key:"E", text:e },
  ];
}
