import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY ?? ''
});

const EMBEDDING_MODEL_ID = process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-001';

// Gemini produces DIFFERENT vectors for the same text depending on whether it's
// being indexed or searched with — taskType is what makes retrieval rank the
// correct section first instead of a topically-unrelated one. Output dimension
// must match the handbook_chunks table definition in src/db/schema.ts.
export const documentEmbeddingModel = google.textEmbeddingModel(EMBEDDING_MODEL_ID, {
  outputDimensionality: 768,
  taskType: 'RETRIEVAL_DOCUMENT'
});

export const queryEmbeddingModel = google.textEmbeddingModel(EMBEDDING_MODEL_ID, {
  outputDimensionality: 768,
  taskType: 'RETRIEVAL_QUERY'
});
