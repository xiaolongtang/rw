import { MasteredMap, Question, QuizItem } from './types';

export function shuffleArray<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getTotalItems(questions: Question[]): number {
  return questions.reduce(
    (acc, q) => acc + (Array.isArray(q.keywords) ? q.keywords.filter(Boolean).length : 0),
    0
  );
}

export function buildInitialQueue(questions: Question[], masteredMap: MasteredMap = {}): QuizItem[] {
  const queue: QuizItem[] = [];
  questions.forEach((q, questionIndex) => {
    if (!Array.isArray(q.keywords) || q.keywords.length === 0) {
      return;
    }
    q.keywords.forEach((_, keywordIndex) => {
      const mastered = masteredMap[questionIndex] || [];
      if (!mastered.includes(keywordIndex)) {
        queue.push({ questionIndex, keywordIndex });
      }
    });
  });
  return shuffleArray(queue);
}

export function markMastered(masteredMap: MasteredMap, item: QuizItem): MasteredMap {
  const next: MasteredMap = { ...masteredMap };
  const current = new Set(next[item.questionIndex] || []);
  current.add(item.keywordIndex);
  next[item.questionIndex] = Array.from(current).sort((a, b) => a - b);
  return next;
}

export function isItemMastered(masteredMap: MasteredMap, item: QuizItem): boolean {
  return (masteredMap[item.questionIndex] || []).includes(item.keywordIndex);
}

export function requeueItem(queue: QuizItem[], item: QuizItem): QuizItem[] {
  const next = [...queue];
  const offset = Math.floor(Math.random() * 4) + 3; // 3~6 positions later
  const position = Math.min(offset, next.length);
  next.splice(position, 0, item);
  return next;
}

export function masteredCount(masteredMap: MasteredMap): number {
  return Object.values(masteredMap).reduce((acc, arr) => acc + arr.length, 0);
}

export function isUnitMastered(
  questions: Question[],
  masteredMap: MasteredMap = {}
): boolean {
  return masteredCount(masteredMap) >= getTotalItems(questions);
}
