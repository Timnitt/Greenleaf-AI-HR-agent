import 'dotenv/config';
import { readFileSync } from 'fs';
import { embed } from 'ai';
import { embeddingModel } from '../src/agent/provider.js';
import { db, testConnection } from '../src/db/client.js';
import { handbookChunks } from '../src/db/schema.js';
import { sql } from 'drizzle-orm';

const CHUNK_SIZE = 400;    // words (approximation of tokens)
const CHUNK_OVERLAP = 50;

interface RawChunk {
  content: string;
  sectionNum: string;
  sectionTitle: string;
}

function chunkText(text: string): RawChunk[] {
  // Stage 1: split the handbook into sections by "# N. TITLE" headers
  const sections: Array<{ num: string; title: string; body: string[] }> = [];
  let current: { num: string; title: string; body: string[] } | null = null;

  for (const line of text.split('\n')) {
    const header = line.match(/^#\s*(\d+)\.\s*(.+)$/);
    if (header) {
      if (current) sections.push(current);
      current = { num: header[1] ?? '', title: (header[2] ?? '').trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);

  // Stage 2: chunk each section by word count, with overlap between chunks
  const chunks: RawChunk[] = [];
  const step = CHUNK_SIZE - CHUNK_OVERLAP;

  for (const section of sections) {
    const words = section.body.join(' ').split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    for (let start = 0; start < words.length; start += step) {
      const piece = words.slice(start, start + CHUNK_SIZE).join(' ');
      chunks.push({
        content: `Section ${section.num}: ${section.title} — ${piece}`,
        sectionNum: section.num,
        sectionTitle: section.title
      });
      if (start + CHUNK_SIZE >= words.length) break;  // last chunk reached
    }
  }
  return chunks;
}

async function main(): Promise<void> {
  await testConnection();

  const handbook = readFileSync(
    process.env.HANDBOOK_PATH ?? './data/handbook_clean.txt',
    'utf-8'
  );

  const chunks = chunkText(handbook);
  console.log(`📚 ${chunks.length} chunks to embed...`);

  // Clear existing so re-ingestion never duplicates
  await db.execute(sql`TRUNCATE handbook_chunks RESTART IDENTITY`);

  for (const [i, chunk] of chunks.entries()) {
    const { embedding } = await embed({
      model: embeddingModel,
      value: chunk.content
    });

    await db.insert(handbookChunks).values({
      content: chunk.content,
      sectionNum: chunk.sectionNum,
      sectionTitle: chunk.sectionTitle,
      embedding
    });

    process.stdout.write(`\r  ${i + 1}/${chunks.length} embedded`);
  }

  console.log('\n✅ Handbook ingested into pgvector');
  process.exit(0);
}

main().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
