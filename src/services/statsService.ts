import { SessionRecord } from '../domain/types';
import { addStatRecord, clearStore, getAllStats } from './db';

export async function recordSession(session: SessionRecord) {
  await addStatRecord<SessionRecord>(session);
}

export async function listSessions(): Promise<SessionRecord[]> {
  const list = await getAllStats<SessionRecord>();
  return list.sort((a, b) => b.finishedAt - a.finishedAt);
}

export async function sessionsByDate(date: string): Promise<SessionRecord[]> {
  const list = await listSessions();
  return list.filter((s) => s.date === date);
}

export async function clearStats() {
  await clearStore('stats');
}
