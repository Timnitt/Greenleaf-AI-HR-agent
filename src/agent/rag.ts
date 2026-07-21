import { embed } from 'ai';
import { queryEmbeddingModel } from './provider.js';
import { db } from '../db/client.js';
import { sql } from 'drizzle-orm';
import type { RagResult, HandbookChunk } from '../types.js';

const CONFIDENCE_THRESHOLD = parseFloat(process.env.RAG_CONFIDENCE_THRESHOLD ?? '0.35');
const TOP_K = parseInt(process.env.RAG_TOP_K ?? '3');

export async function queryHandbook(
  question: string
): Promise<RagResult | { escalate: true; reason: string }> {

  // Embed the question with the query-optimized task type — must stay in the
  // SAME 768-dim space as documentEmbeddingModel, just tuned for searching
  const { embedding } = await embed({
    model: queryEmbeddingModel,
    value: question
  });

  // Vector similarity search via pgvector
  const vectorStr = `[${embedding.join(',')}]`;
  const result = await db.execute(sql`
    SELECT
      id,
      content,
      section_num   AS "sectionNum",
      section_title AS "sectionTitle",
      1 - (embedding <=> ${vectorStr}::vector) AS similarity
    FROM handbook_chunks
    ORDER BY embedding <=> ${vectorStr}::vector
    LIMIT ${TOP_K}
  `);

  const chunks = result.rows as unknown as Array<HandbookChunk & { similarity: number }>;

  console.log(
    `[RAG] "${question}" → ` +
    chunks.map(c => `Sec.${c.sectionNum}:${c.similarity.toFixed(3)}`).join(', ') +
    ` (threshold ${CONFIDENCE_THRESHOLD})`
  );

  // 3. Confidence gate — below threshold means "don't let the LLM guess"
  if (!chunks.length || (chunks[0]?.similarity ?? 0) < CONFIDENCE_THRESHOLD) {
    return {
      escalate: true,
      reason: 'No sufficiently relevant handbook section found.'
    };
  }

  return {
    chunks,
    confidence: chunks[0]?.similarity ?? 0,
    context: chunks
      .map(c => `[Section ${c.sectionNum} — ${c.sectionTitle}]\n${c.content}`)
      .join('\n\n---\n\n')
  };
}
