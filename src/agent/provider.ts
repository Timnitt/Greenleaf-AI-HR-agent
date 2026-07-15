import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY ?? ''
});

// Embedding Model and output dimensionality should match handbook_chunks table definition in src/db/schema.ts
export const embeddingModel = google.textEmbeddingModel(
  process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-001',
  { outputDimensionality: 768 }
);
