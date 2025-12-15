import { MasteredMap, QuizItem, UnitProgress } from '../domain/types';
import { deleteProgress, getAllProgress, getProgress, putProgress } from './db';

function progressKey(language: string, unit: string) {
  return `${language}__${unit}`;
}

export async function getUnitProgress(language: string, unit: string): Promise<UnitProgress | undefined> {
  return getProgress<UnitProgress>(progressKey(language, unit));
}

export async function saveUnitProgress(
  language: string,
  unit: string,
  masteredMap: MasteredMap,
  queueState?: QuizItem[]
) {
  const payload: UnitProgress = {
    language,
    unit,
    masteredMap,
    queueState,
    updatedAt: Date.now()
  };
  await putProgress(progressKey(language, unit), payload);
}

export async function resetUnitProgress(language: string, unit: string) {
  await deleteProgress(progressKey(language, unit));
}

export async function listProgressByLanguage(language: string) {
  const all = await getAllProgress<UnitProgress>();
  return all.filter((p) => p.language === language);
}

export async function listAllProgress() {
  return getAllProgress<UnitProgress>();
}
