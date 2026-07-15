import {
  pgTable, serial, text, timestamp, index, vector
} from 'drizzle-orm/pg-core';

export const handbookChunks = pgTable('handbook_chunks', {
  id:           serial('id').primaryKey(),
  content:      text('content').notNull(),
  sectionNum:   text('section_num').notNull(),
  sectionTitle: text('section_title').notNull(),
  embedding:    vector('embedding', { dimensions: 768 }),
  createdAt:    timestamp('created_at').defaultNow()
}, (table) => ({
  embeddingIdx: index('handbook_chunks_embedding_idx').on(table.embedding)
}));

export const sessions = pgTable('sessions', {
  id:        text('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const messages = pgTable('messages', {
  id:        serial('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  role:      text('role').notNull(),
  content:   text('content').notNull(),
  intent:    text('intent'),
  createdAt: timestamp('created_at').defaultNow()
});

export const securityLog = pgTable('security_log', {
  id:        serial('id').primaryKey(),
  sessionId: text('session_id'),
  reason:    text('reason').notNull(),
  rawInput:  text('raw_input').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});
