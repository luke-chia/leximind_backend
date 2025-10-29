import { vi } from 'vitest'

/**
 * Mock de Supabase Service
 * Simula las respuestas de Supabase sin hacer llamadas reales a la API
 */

export const mockSupabaseDocument = {
  id: 'doc-123',
  original_name: 'Manual_PLD.pdf',
  alias: 'Manual de Prevención de Lavado de Dinero',
  storage_path: 'documents/doc-123.pdf',
  signed_url: 'https://storage.supabase.co/documents/doc-123.pdf?token=xyz',
  user_id: 'user-456',
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:30:00Z',
}

export const mockSupabaseDocumentWithMetadata = {
  ...mockSupabaseDocument,
  areas: ['Compliance', 'PLD'],
  categories: ['Technical', 'Policy'],
  sources: ['Internal_Manual'],
  tags: ['KYC', 'AML', 'Efisys'],
}

export const mockSupabaseUser = {
  id: 'user-456',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  created_at: '2024-01-01T00:00:00Z',
}

export const mockSupabaseConversation = {
  id: 'conv-789',
  user_id: 'user-456',
  title: 'Consulta sobre PLD',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:30:00Z',
}

export const mockSupabaseMessage = {
  id: 'msg-101',
  conversation_id: 'conv-789',
  role: 'user',
  content: '¿Cuáles son los requisitos de PLD?',
  created_at: '2024-01-15T10:00:00Z',
}

/**
 * Factory para crear un mock del cliente Supabase
 */
export const createMockSupabaseClient = () => {
  const mockFrom = (table: string) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: mockSupabaseDocument,
      error: null,
    }),
    then: vi.fn((resolve) =>
      resolve({ data: [mockSupabaseDocument], error: null })
    ),
  })

  return {
    from: mockFrom,
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'documents/doc-123.pdf' },
          error: null,
        }),
        download: vi.fn().mockResolvedValue({
          data: new Blob(['test content']),
          error: null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: mockSupabaseDocument.signed_url },
        }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: mockSupabaseDocument.signed_url },
          error: null,
        }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: mockSupabaseUser, session: {} },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: mockSupabaseUser, session: {} },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      }),
    },
  }
}

/**
 * Mock de errores comunes de Supabase
 */
export const mockSupabaseErrors = {
  notFoundError: { message: 'Record not found', code: '404' },
  duplicateError: { message: 'Duplicate key violation', code: '23505' },
  authError: { message: 'Invalid credentials', code: 'invalid_credentials' },
  storageError: { message: 'Storage error', code: 'storage_error' },
}

/**
 * Helper para crear documentos de prueba
 */
export const createMockDocument = (
  overrides?: Partial<typeof mockSupabaseDocument>
) => ({
  ...mockSupabaseDocument,
  ...overrides,
})
