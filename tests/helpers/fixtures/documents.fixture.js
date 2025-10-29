/**
 * Fixtures de documentos para tests
 * Datos de prueba reutilizables para tests relacionados con documentos
 */
export const documentFixtures = {
    basicDocument: {
        documentId: 'doc-123',
        userId: 'user-456',
        originalName: 'Manual_PLD.pdf',
        alias: 'Manual de Prevención de Lavado de Dinero',
        storagePath: 'documents/doc-123.pdf',
        signedUrl: 'https://storage.supabase.co/documents/doc-123.pdf?token=xyz',
    },
    documentWithMetadata: {
        documentId: 'doc-456',
        userId: 'user-456',
        originalName: 'Reglamento_Interno.pdf',
        alias: 'Reglamento Interno de la Empresa',
        areas: ['Legal', 'Compliance'],
        categories: ['Policy', 'Regulation'],
        sources: ['Internal_Manual'],
        tags: ['Corporativo', 'Normativa'],
    },
    pdfChunks: [
        {
            text: 'Capítulo 1: Introducción al sistema de prevención de lavado de dinero. El presente manual tiene como objetivo establecer las políticas y procedimientos...',
            page: 1,
        },
        {
            text: 'Artículo 5: Todo cliente debe someterse a un proceso de identificación y verificación conocido como KYC (Know Your Customer)...',
            page: 5,
        },
        {
            text: 'Sección 3.2: Los controles de monitoreo transaccional deben realizarse de manera continua utilizando el sistema Efisys...',
            page: 12,
        },
    ],
    uploadFormData: {
        documentId: 'doc-789',
        userId: 'user-456',
        area: ['Compliance', 'PLD'],
        category: ['Technical'],
        source: ['Internal_Manual'],
        tags: ['KYC', 'AML'],
        savepdf: true,
    },
    vectorMetadata: {
        documentId: 'doc-123',
        source: 'Manual_PLD.pdf',
        page: '5',
        text: 'Texto del chunk extraído del documento...',
        area: ['Compliance'],
        category: ['Technical'],
        tags: ['KYC', 'PLD'],
    },
};
/**
 * Helper para crear documentos de prueba personalizados
 */
export const createTestDocument = (overrides) => ({
    ...documentFixtures.basicDocument,
    ...overrides,
});
/**
 * Helper para crear chunks de texto de prueba
 */
export const createTestChunks = (count = 3) => {
    return Array.from({ length: count }, (_, i) => ({
        text: `Texto de prueba del chunk ${i + 1}. Este es un fragmento simulado de un documento.`,
        page: i + 1,
    }));
};
