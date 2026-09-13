import { enemEnglishReadings01 } from "@/lib/enem-english-data-01";
import { enemEnglishReadings02 } from "@/lib/enem-english-data-02";
import { enemEnglishReadings02b } from "@/lib/enem-english-data-02b";
import { enemEnglishReadings03 } from "@/lib/enem-english-data-03";
import { enemEnglishReadings04 } from "@/lib/enem-english-data-04";
import type { EnemEnglishReading } from "@/lib/enem-english-types";

export type { EnemEnglishOption, EnemEnglishReading, EnemEnglishVisual } from "@/lib/enem-english-types";

export const enemEnglishReadings: EnemEnglishReading[] = [
  ...enemEnglishReadings01,
  ...enemEnglishReadings02,
  ...enemEnglishReadings02b,
  ...enemEnglishReadings03,
  ...enemEnglishReadings04,
];

export const enemEnglishDays = Array.from({ length: 10 }, (_, index) => ({
  day: index + 1,
  readings: enemEnglishReadings.filter((reading) => reading.day === index + 1).sort((a,b)=>a.slot-b.slot),
}));

export function getEnemEnglishReading(id:string) {
  return enemEnglishReadings.find((reading)=>reading.id===id) ?? null;
}

export function getEnemEnglishDay(day:number) {
  return enemEnglishReadings.filter((reading)=>reading.day===day).sort((a,b)=>a.slot-b.slot);
}
