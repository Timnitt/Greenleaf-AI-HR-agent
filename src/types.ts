// ─── Intent ─────────────────────────────────────────────────────────────────

export type Intent =
  | 'EXPENSE'
  | 'HOLIDAY'
  | 'POLICY'
  | 'UNKNOWN';

// ─── Agent Response ──────────────────────────────────────────────────────────

export interface AgentResponse {
  text: string;
  intent: Intent;
  source: ResponseSource;
  escalated: boolean;
  approved?: boolean;           // expense decisions only
}

export interface ResponseSource {
  type: 'handbook' | 'api' | 'logic' | 'system';
  reference: string;
}

// ─── Expense ─────────────────────────────────────────────────────────────────

export interface ExpenseInput {
  amountChf: number;
  hasExternalClient: boolean;
  hasAlcohol: boolean;
  submissionMethod: string;
}

export interface ExpenseResult {
  approved: boolean;
  reason: string;
  handbookSection: string;
}

// ─── Holidays ────────────────────────────────────────────────────────────────

export interface Holiday {
  date: string;                 // ISO: YYYY-MM-DD
  name: string;
  type: 'National' | 'Cantonal';
  region: string;
  source: string;
}

export interface HolidayCheckResult {
  isHoliday: boolean;
  name: string | null;
  type: string | null;
  source: string | null;
}

// ─── RAG ─────────────────────────────────────────────────────────────────────

export interface HandbookChunk {
  id: number;
  content: string;
  sectionNum: string;
  sectionTitle: string;
  embedding?: number[];
}

export interface RagResult {
  chunks: HandbookChunk[];
  confidence: number;           // highest cosine similarity score
  context: string;              // concatenated chunk text for LLM
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SessionMessage {
  id?: number;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  intent: Intent | null;
  createdAt?: Date;
}

// ─── Security ────────────────────────────────────────────────────────────────

export type SecurityViolation =
  | 'blocked_topic'
  | 'injection';

export interface SecurityCheckResult {
  safe: boolean;
  violation: SecurityViolation | null;
  maskedText: string;
}
