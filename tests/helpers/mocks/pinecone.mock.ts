import { vi } from 'vitest'

/**
 * Mock de Pinecone Service
 * Simula las respuestas de Pinecone sin hacer llamadas reales a la API
 */

export const mockPineconeVector = {
  id: 'doc-123-chunk-1',
  score: 0.95,
  values: Array(1536).fill(0.1),
  metadata: {
    documentId: 'doc-123',
    source: 'Manual_PLD.pdf',
    page: '42',
    text: 'Este es un fragmento de texto de prueba del documento.',
    area: ['Compliance'],
    category: ['Technical'],
    tags: ['KYC', 'PLD'],
  },
}

export const mockPineconeQueryResponse = {
  matches: [
    mockPineconeVector,
    {
      ...mockPineconeVector,
      id: 'doc-123-chunk-2',
      score: 0.92,
      metadata: {
        ...mockPineconeVector.metadata,
        page: '43',
        text: 'Este es otro fragmento de texto relacionado.',
      },
    },
    {
      ...mockPineconeVector,
      id: 'doc-456-chunk-1',
      score: 0.88,
      metadata: {
        ...mockPineconeVector.metadata,
        documentId: 'doc-456',
        source: 'Reglamento_Interno.pdf',
        page: '15',
      },
    },
  ],
  namespace: 'mimir',
}

export const mockPineconeUpsertResponse = {
  upsertedCount: 10,
}

export const mockPineconeIndexStats = {
  namespaces: {
    mimir: {
      vectorCount: 1500,
    },
  },
  dimension: 1536,
  indexFullness: 0.1,
  totalVectorCount: 1500,
}

/**
 * Factory para crear un mock del servicio Pinecone
 */
export const createMockPineconeService = () => ({
  searchSimilarDocuments: vi
    .fn()
    .mockResolvedValue(mockPineconeQueryResponse.matches),
  upsertVectors: vi.fn().mockResolvedValue(mockPineconeUpsertResponse),
  deleteVectors: vi.fn().mockResolvedValue({ success: true }),
  getIndexStats: vi.fn().mockResolvedValue(mockPineconeIndexStats),
  buildMetadataFilters: vi.fn().mockReturnValue({}),
})

/**
 * Mock de errores comunes de Pinecone
 */
export const mockPineconeErrors = {
  indexNotFoundError: new Error('Index not found'),
  namespaceNotFoundError: new Error('Namespace not found'),
  dimensionMismatchError: new Error('Dimension mismatch'),
  quotaExceededError: new Error('Quota exceeded'),
}

/**
 * Helper para crear vectores de prueba
 */
export const createMockVector = (
  overrides?: Partial<typeof mockPineconeVector>
) => ({
  ...mockPineconeVector,
  ...overrides,
  metadata: {
    ...mockPineconeVector.metadata,
    ...(overrides?.metadata || {}),
  },
})
