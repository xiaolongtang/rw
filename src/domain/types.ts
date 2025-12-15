export interface Question {
  statement: string;
  translate: string;
  keywords: string[];
}

export interface LanguageNode {
  keyboard: string;
  Unit: Record<string, Question[]>[];
}

export interface UnitDefinition {
  name: string;
  questions: Question[];
}

export type Dataset = {
  language: string[];
  [languageCode: string]: LanguageNode | string[];
};

export interface DatasetMeta {
  lastSuccessAt?: number;
}

export interface QuizItem {
  questionIndex: number;
  keywordIndex: number;
}

export type MasteredMap = Record<number, number[]>;

export interface UnitProgress {
  language: string;
  unit: string;
  masteredMap: MasteredMap;
  queueState?: QuizItem[];
  updatedAt: number;
}

export interface SessionRecord {
  id?: number;
  date: string;
  languageCode: string;
  unitName: string;
  startedAt: number;
  finishedAt: number;
  durationSec: number;
  totalItems: number;
  wrongCount: number;
  retryCount?: number;
}
