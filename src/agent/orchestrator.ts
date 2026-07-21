import { generateText } from 'ai';
import { readFileSync } from 'fs';
import { google } from './provider.js';
import { expenseTool } from './tools/expenseTool.js';
import { holidayTool } from './tools/holidayTool.js';
import { handbookTool } from './tools/handbookTool.js';
import { getSessionHistory, saveMessages } from './session.js';
import { checkSecurity, RESPONSES } from '../security/piiMasker.js';
import type { AgentResponse, ExpenseResult, Intent, ResponseSource } from '../types.js';

const SYSTEM_PROMPT = readFileSync('./logic/system_prompt.txt', 'utf-8');

const OMBUDSMAN_TOPICS = /\b(harass|bully|bullying|mobbing|whistleblow)/i;

// The model has no built-in notion of "today" — without this, it guesses a
// year when resolving dates like "May 1st", which breaks holiday lookups.
function buildSystemPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `${SYSTEM_PROMPT}\n\nToday's date is ${today} (YYYY-MM-DD). Resolve relative or partial dates (e.g. "May 1st", "today", "next Monday") against this date before calling a tool.`;
}

export async function handleMessage(
  rawInput: string,
  sessionId: string
): Promise<AgentResponse> {
  try {
    // Security gate 
    const security = await checkSecurity(rawInput, sessionId);
    if (!security.safe) {
      return {
        text: security.violation === 'injection' ? RESPONSES.injection : RESPONSES.blocked,
        intent: 'UNKNOWN',
        source: { type: 'system', reference: 'GreenLeaf security policy' },
        escalated: true
      };
    }

    // for Sensitive-conduct matters
    if (OMBUDSMAN_TOPICS.test(security.maskedText)) {
      return {
        text: RESPONSES.ombudsman,
        intent: 'POLICY',
        source: { type: 'system', reference: 'GreenLeaf Handbook, Section 9' },
        escalated: true
      };
    }

    // Load conversation history
    const history = await getSessionHistory(sessionId, 10);

    // LLM with tools
    const { text, steps } = await generateText({
      model: google(process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'),
      system: buildSystemPrompt(),
      messages: [
        ...history,
        { role: 'user', content: security.maskedText }
      ],
      tools: {
        validateExpense: expenseTool,
        lookupHoliday: holidayTool,
        queryHandbook: handbookTool
      },
      maxSteps: 3   // to prevent infinite tool loops
    });

    // Collect what happened across ALL steps
    const toolNames = steps.flatMap(s => s.toolCalls.map(c => c.toolName));
    const toolResults = steps.flatMap(s => s.toolResults);

    const intent = inferIntent(toolNames);

    
    const expenseResult = toolResults.find(r => r.toolName === 'validateExpense');
    const approved = expenseResult
      ? (expenseResult.result as ExpenseResult).approved
      : undefined;

    const escalated = toolResults.some(
      r => r.toolName === 'queryHandbook' &&
           typeof r.result === 'object' && r.result !== null &&
           'escalate' in r.result
    );

    //masked user message + assistant reply
    await saveMessages(sessionId, [
      { role: 'user', content: security.maskedText },
      { role: 'assistant', content: text }
    ]);

    return {
      text: escalated ? RESPONSES.unknown : text,
      intent,
      source: inferSource(intent),
      escalated,
      ...(approved !== undefined ? { approved } : {})
    };
  } catch (err) {
    console.error('Orchestrator error:', err);
    return {
      text: RESPONSES.error,
      intent: 'UNKNOWN',
      source: { type: 'system', reference: 'error handler' },
      escalated: true
    };
  }
}

function inferIntent(toolNames: string[]): Intent {
  if (toolNames.includes('validateExpense')) return 'EXPENSE';
  if (toolNames.includes('lookupHoliday')) return 'HOLIDAY';
  if (toolNames.includes('queryHandbook')) return 'POLICY';
  return 'UNKNOWN';
}

function inferSource(intent: Intent): ResponseSource {
  switch (intent) {
    case 'EXPENSE':
      return { type: 'logic', reference: 'GreenLeaf Handbook, Section 7 — Expenses & Travel' };
    case 'HOLIDAY':
      return { type: 'api', reference: 'OpenHolidays API · Basel-Stadt (CH-BS)' };
    case 'POLICY':
      return { type: 'handbook', reference: 'GreenLeaf Handbook' };
    case 'UNKNOWN':
      return { type: 'system', reference: 'no tool used' };
  }
}
