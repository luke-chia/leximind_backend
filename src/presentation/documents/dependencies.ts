import { DocumentsController } from './controller.js'
import { UploadAdapter } from '../../infrastructure/adapters/upload.adapter.js'
import { EmbeddingsService } from '../../infrastructure/services/embeddings.service.js'
import { PineconeService } from '../../infrastructure/services/pinecone.service.js'

/**
 * DocumentsDependencies
 * 
 * Responsibilities:
 * - Manage dependency injection for document-related features
 * - Provide singleton instances of services and adapters
 * - Follow Clean Architecture dependency rules
 * - Ensure proper service lifecycle management
 */
export class DocumentsDependencies {
  private static embeddingsService: EmbeddingsService
  private static pineconeService: PineconeService
  private static uploadAdapter: UploadAdapter
  private static controller: DocumentsController

  /**
   * Get EmbeddingsService singleton instance
   */
  static getEmbeddingsService(): EmbeddingsService {
    if (!DocumentsDependencies.embeddingsService) {
      DocumentsDependencies.embeddingsService = new EmbeddingsService()
    }
    return DocumentsDependencies.embeddingsService
  }

  /**
   * Get PineconeService singleton instance
   */
  static getPineconeService(): PineconeService {
    if (!DocumentsDependencies.pineconeService) {
      DocumentsDependencies.pineconeService = new PineconeService()
    }
    return DocumentsDependencies.pineconeService
  }

  /**
   * Get UploadAdapter singleton instance with injected dependencies
   */
  static getUploadAdapter(): UploadAdapter {
    if (!DocumentsDependencies.uploadAdapter) {
      const embeddingsService = DocumentsDependencies.getEmbeddingsService()
      const pineconeService = DocumentsDependencies.getPineconeService()
      
      DocumentsDependencies.uploadAdapter = new UploadAdapter(
        embeddingsService,
        pineconeService
      )
    }
    return DocumentsDependencies.uploadAdapter
  }

  /**
   * Get DocumentsController singleton instance with injected dependencies
   */
  static getController(): DocumentsController {
    if (!DocumentsDependencies.controller) {
      const uploadAdapter = DocumentsDependencies.getUploadAdapter()
      
      DocumentsDependencies.controller = new DocumentsController(uploadAdapter)
    }
    return DocumentsDependencies.controller
  }

  /**
   * Reset all dependencies (useful for testing)
   */
  static reset(): void {
    DocumentsDependencies.embeddingsService = undefined as any
    DocumentsDependencies.pineconeService = undefined as any
    DocumentsDependencies.uploadAdapter = undefined as any
    DocumentsDependencies.controller = undefined as any
  }

  /**
   * Verify all services are healthy
   */
  static async healthCheck(): Promise<{
    embeddings: boolean
    pinecone: boolean
    overall: boolean
  }> {
    const uploadAdapter = DocumentsDependencies.getUploadAdapter()
    return await uploadAdapter.healthCheck()
  }
}
