import { Document } from '../../domain/entities/document.entity.js'
import { Source } from '../../domain/entities/source.entity.js'
import { CacheService } from '../services/cache.service.js'

export class DocumentMapper {
  /**
   * Convierte un Document del sistema RAG a Source para la respuesta
   */
  static toSource(document: Document, signedUrl: string = ''): Source {
    return new Source(
      document.page.toString(),
      document.text,
      document.source,
      document.metadata?.documentId,
      document.score.toString(),
      signedUrl // Nuevo campo - por defecto vacío, se puede pasar como parámetro
    )
  }

  /**
   * Convierte un array de Documents a Sources
   * Consulta el CacheService para obtener las URLs firmadas
   */
  static toSources(documents: Document[]): Source[] {
    return documents.map((doc) => {
      const documentId = doc.metadata?.documentId || doc.id

      // Consultar el documento en el cache
      const cachedDoc = CacheService.getDocumentById(documentId)

      // Obtener signedUrl del documento cacheado (fallback a vacío)
      const signedUrl = cachedDoc?.signedUrl || ''

      return this.toSource(doc, signedUrl)
    })
  }
}
