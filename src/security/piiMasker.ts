import { db } from '../db/client.js';
import { securityLog } from '../db/schema.js';
import type { SecurityCheckResult, SecurityViolation } from '../types.js';

// ── PII Patterns --─────────────────────────────────────────────────────────

const PII_PATTERNS: Array<[RegExp, string]> = [
  [/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,                                      '[NAME]'],
  [/\+41[\s\-]?\d{2}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g,          '[PHONE]'],
  [/\b0\d{2}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}\b/g,                  '[PHONE]'],
  [/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,            '[EMAIL]'],
  [/\bCH\d{2}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d\b/g,     '[IBAN]'],
  [/\b\d{4}\s[A-Z][a-z]+\b/g,                                            '[ADDRESS]'],
  [/\bAHV[\s\-]?\d{3}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{2}\b/g,        '[AHV]'],
];

export function maskPii(text: string): string {
  return PII_PATTERNS.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    text
  );
}

// ── Blocked Topics ────────────────────────────────────────────────────────────

const BLOCKED_KEYWORDS = [
  'wifi password', 'wi-fi password', 'wireless password',
  'greenleaf_2026', 'internal network', 'mac address',
  'sarah müller', 'sarah muller',
  'salary', 'wage', 'payslip', 'pay slip',
  'contract details', "my colleague's", 'other employee'
] as const;

export function containsBlockedTopic(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_KEYWORDS.some(kw => lower.includes(kw));
}

// ── Injection Detection ───────────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  'ignore previous instructions',
  'disregard your system prompt',
  'you are now',
  'forget everything',
  'act as',
  'jailbreak',
  'pretend you are',
  'override your instructions'
] as const;

export function detectInjection(text: string): boolean {
  const lower = text.toLowerCase();
  return INJECTION_PATTERNS.some(p => lower.includes(p));
}

// ── Combined Security Check ───────────────────────────────────────────────────

export async function checkSecurity(
  rawInput: string,
  sessionId?: string
): Promise<SecurityCheckResult> {
  const maskedText = maskPii(rawInput);

  let violation: SecurityViolation | null = null;

  if (detectInjection(maskedText)) {
    violation = 'injection';
  } else if (containsBlockedTopic(maskedText)) {
    violation = 'blocked_topic';
  }

  if (violation) {
    // Log to DB for audit
    await db.insert(securityLog).values({
      sessionId: sessionId ?? null,
      reason: violation,
      rawInput: maskedText   // log the already-masked version
    });
  }

  return {
    safe: violation === null,
    violation,
    maskedText
  };
}

// ── Hard-coded Constants — never LLM-generated ───────────────────────────────

export const OMBUDSMAN_EMAIL = 'ombudsman@greenleaf-safety.ch';
export const ESCALATION_CONTACT = 'Beat Müller';

export const RESPONSES = {
  blocked: `I can only answer GreenLeaf HR questions. For other matters, please contact ${ESCALATION_CONTACT} directly.`,
  injection: `I can only answer GreenLeaf HR questions. For other matters, please contact ${ESCALATION_CONTACT} directly.`,
  ombudsman: `For matters of harassment, bullying, or whistleblowing, GreenLeaf uses a confidential external ombudsman.\n\n🔒 Contact: ${OMBUDSMAN_EMAIL}`,
  unknown: `I don't have a confident answer for that in the GreenLeaf handbook.\n\n👤 Please contact Beat Müller directly.`,
  error: `Something went wrong on my end. Please try again or contact IT.`
} as const;
