import { db } from '../db/client.js';
import { sessions, messages } from '../db/schema.js';
import { eq, desc, lt } from 'drizzle-orm';
import type { ChatMessage } from '../types.js';

export async function ensureSession(sessionId: string): Promise<void> {
  await db.insert(sessions)
    .values({ id: sessionId })
    .onConflictDoNothing();
}

export async function getSessionHistory(
  sessionId: string,
  limit: number = 10
): Promise<ChatMessage[]> {
  await ensureSession(sessionId);

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  return rows
    .reverse()
    .map(r => ({ role: r.role as 'user' | 'assistant', content: r.content }));
}

export async function saveMessages(
  sessionId: string,
  msgs: ChatMessage[]
): Promise<void> {
  await ensureSession(sessionId);
  await db.insert(messages).values(
    msgs.map(m => ({
      sessionId,
      role: m.role,
      content: m.content,
      intent: null
    }))
  );
}

export async function cleanupOldSessions(maxAgeHours: number = 24): Promise<void> {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  await db.delete(sessions).where(lt(sessions.updatedAt, cutoff));
  console.log(`Sessions older than ${maxAgeHours}h cleaned up`);
}
