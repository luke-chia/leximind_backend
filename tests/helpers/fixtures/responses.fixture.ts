/**
 * Fixtures de respuestas RAG para tests
 * Datos de prueba reutilizables para tests relacionados con consultas y respuestas
 */

export const responseFixtures = {
  userQuery: {
    userId: 'user-456',
    message: '¿Cuáles son los requisitos de KYC para clientes nuevos?',
    area: ['Compliance', 'PLD'],
    category: ['Technical'],
    tags: ['KYC'],
  },

  ragResponse: {
    answer:
      'Los requisitos de KYC para clientes nuevos incluyen: 1) Verificación de identidad mediante documento oficial, 2) Comprobante de domicilio no mayor a 3 meses, 3) Cuestionario de conocimiento del cliente, 4) Análisis de perfil de riesgo en el sistema Efisys.',
    sources: [
      {
        source: 'Manual_PLD.pdf',
        page: '5',
        relevance: 0.95,
      },
      {
        source: 'Reglamento_Interno.pdf',
        page: '12',
        relevance: 0.88,
      },
      {
        source: 'Guia_Efisys.pdf',
        page: '3',
        relevance: 0.82,
      },
    ],
    contextoUsado: [
      {
        documentId: 'doc-123',
        source: 'Manual_PLD.pdf',
        page: '5',
        text: 'Artículo 5: Todo cliente debe someterse a un proceso de identificación y verificación conocido como KYC...',
        relevance: 0.95,
      },
      {
        documentId: 'doc-456',
        source: 'Reglamento_Interno.pdf',
        page: '12',
        text: 'Sección 3.2: Los controles de monitoreo transaccional deben realizarse...',
        relevance: 0.88,
      },
    ],
  },

  emptyResponse: {
    answer:
      'No se encontraron documentos relevantes para responder tu consulta. Por favor, intenta reformular tu pregunta o contacta a un especialista.',
    sources: [],
    contextoUsado: [],
  },

  conversationHistory: [
    {
      id: 'msg-1',
      role: 'user',
      content: '¿Qué es KYC?',
      timestamp: '2024-01-15T10:00:00Z',
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content:
        'KYC (Know Your Customer) es el proceso de identificación y verificación de clientes...',
      timestamp: '2024-01-15T10:00:05Z',
    },
    {
      id: 'msg-3',
      role: 'user',
      content: '¿Cuáles son los documentos requeridos?',
      timestamp: '2024-01-15T10:01:00Z',
    },
  ],
}

/**
 * Helper para crear queries de prueba personalizadas
 */
export const createTestQuery = (
  overrides?: Partial<(typeof responseFixtures)['userQuery']>
) => ({
  ...responseFixtures.userQuery,
  ...overrides,
})

/**
 * Helper para crear respuestas RAG de prueba
 */
export const createTestResponse = (
  overrides?: Partial<(typeof responseFixtures)['ragResponse']>
) => ({
  ...responseFixtures.ragResponse,
  ...overrides,
})

/**
 * Helper para crear sources de prueba
 */
export const createTestSources = (count: number = 3) => {
  return Array.from({ length: count }, (_, i) => ({
    source: `Document_${i + 1}.pdf`,
    page: `${i + 1}`,
    relevance: 0.9 - i * 0.1,
  }))
}
