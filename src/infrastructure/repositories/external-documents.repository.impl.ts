import { ExternalDocumentsRepository } from '../../domain/repositories/external-documents.repository.js'
import { SupabaseService, ExternalDocument } from '../services/supabase.service.js'

/**
 * Implementación del repositorio de documentos externos usando Supabase
 */
export class ExternalDocumentsRepositoryImpl extends ExternalDocumentsRepository {
  private supabaseService: SupabaseService

  constructor(supabaseService: SupabaseService) {
    super()
    this.supabaseService = supabaseService
  }

  /**
   * Obtiene todos los documentos externos desde Supabase
   */
  async fetchAll(): Promise<ExternalDocument[]> {
    try {
      console.log('📄 ExternalDocumentsRepositoryImpl.fetchAll --> Fetching all external documents from Supabase...')
      const documents = await this.supabaseService.getAllDocuments()
      console.log(`✅ ExternalDocumentsRepositoryImpl.fetchAll --> Retrieved ${documents.length} documents from Supabase`)
      return documents
    } catch (error) {
      console.error('❌ Error fetching all documents:', error)
      throw new Error(`Failed to fetch documents: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Obtiene un documento específico por ID
   */
  async fetchById(id: string): Promise<ExternalDocument | null> {
    try {
      console.log(`📄 Fetching document with ID: ${id}`)
      const document = await this.supabaseService.getDocumentById(id)
      
      if (document) {
        console.log(`✅ Document found: ${document.fileName || 'unnamed'}`)
      } else {
        console.log(`⚠️ Document not found with ID: ${id}`)
      }
      
      return document
    } catch (error) {
      console.error(`❌ Error fetching document ${id}:`, error)
      throw new Error(`Failed to fetch document ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Busca documentos por nombre de archivo (implementación básica)
   * En una implementación más avanzada, esto podría usar búsqueda full-text de Supabase
   */
  async search(query: string): Promise<ExternalDocument[]> {
    try {
      console.log(`🔍 Searching documents with query: "${query}"`)
      
      // Por ahora, obtenemos todos los documentos y filtramos en memoria
      // En producción, esto debería usar búsqueda de base de datos
      const allDocuments = await this.supabaseService.getAllDocuments()
      
      const normalizedQuery = query.toLowerCase()
      const filteredDocuments = allDocuments.filter(doc => 
        doc.fileName?.toLowerCase().includes(normalizedQuery) ||
        doc.id.toLowerCase().includes(normalizedQuery)
      )
      
      console.log(`✅ Found ${filteredDocuments.length} documents matching "${query}"`)
      return filteredDocuments
    } catch (error) {
      console.error(`❌ Error searching documents with query "${query}":`, error)
      throw new Error(`Failed to search documents: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Verifica la conectividad con Supabase
   */
  async ping(): Promise<boolean> {
    try {
      console.log('🏓 Pinging Supabase service...')
      
      // Intentamos hacer una consulta simple para verificar conectividad
      await this.supabaseService.getAllDocuments()
      
      console.log('✅ Supabase service is reachable')
      return true
    } catch (error) {
      console.error('❌ Supabase service is not reachable:', error)
      return false
    }
  }

  /**
   * Método adicional para obtener estadísticas de documentos
   */
  async getDocumentStats(): Promise<{
    totalCount: number
    totalSize: number
    averageSize: number
    fileTypes: Record<string, number>
  }> {
    try {
      const documents = await this.fetchAll()
      
      const totalCount = documents.length
      const totalSize = documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0)
      const averageSize = totalCount > 0 ? totalSize / totalCount : 0
      
      const fileTypes: Record<string, number> = {}
      documents.forEach(doc => {
        if (doc.contentType) {
          fileTypes[doc.contentType] = (fileTypes[doc.contentType] || 0) + 1
        }
      })

      return {
        totalCount,
        totalSize,
        averageSize,
        fileTypes
      }
    } catch (error) {
      console.error('❌ Error getting document stats:', error)
      throw error
    }
  }
}
