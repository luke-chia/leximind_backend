import { ExternalDocument } from './supabase.service.js'

/**
 * Servicio de caché en memoria para documentos externos
 * Almacena documentos de Supabase para acceso rápido
 */
export class CacheService {
  private static documents: ExternalDocument[] = []
  private static lastUpdated: Date | null = null
  private static readonly CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutos

  /**
   * Establece los documentos en el caché con gestión automática de URLs firmadas
   * Los documentos ya vienen procesados con URLs firmadas válidas desde SupabaseService
   */
  static setDocuments(documents: ExternalDocument[]): void {
    this.documents = documents
    this.lastUpdated = new Date()
    
    // Contar documentos con URLs firmadas válidas
    const documentsWithUrls = documents.filter(doc => doc.signedUrl && doc.signedUrl.length > 0)
    
    console.log(`📦 Cache updated with ${documents.length} documents`)
    console.log(`🔗 ${documentsWithUrls.length} documents have valid signed URLs`)
    
    if (documentsWithUrls.length !== documents.length) {
      console.log(`⚠️ ${documents.length - documentsWithUrls.length} documents have no signed URL`)
    }
  }

  /**
   * Obtiene todos los documentos del caché
   */
  static getDocuments(): ExternalDocument[] {
    return [...this.documents] // Retorna una copia para evitar mutaciones
  }

  /**
   * Obtiene un documento específico por ID del caché
   */
  static getDocumentById(id: string): ExternalDocument | null {
    return this.documents.find(doc => doc.id === id) || null
  }

  /**
   * Busca documentos por nombre de archivo
   */
  static searchDocumentsByName(query: string): ExternalDocument[] {
    const normalizedQuery = query.toLowerCase()
    return this.documents.filter(doc => 
      doc.fileName?.toLowerCase().includes(normalizedQuery)
    )
  }

  /**
   * Verifica si el caché está expirado
   */
  static isCacheExpired(): boolean {
    if (!this.lastUpdated) {
      return true
    }
    
    const now = new Date()
    const timeDiff = now.getTime() - this.lastUpdated.getTime()
    return timeDiff > this.CACHE_DURATION_MS
  }

  /**
   * Obtiene información del estado del caché
   */
  static getCacheInfo(): {
    documentCount: number
    lastUpdated: Date | null
    isExpired: boolean
  } {
    return {
      documentCount: this.documents.length,
      lastUpdated: this.lastUpdated,
      isExpired: this.isCacheExpired()
    }
  }

  /**
   * Limpia el caché
   */
  static clearCache(): void {
    this.documents = []
    this.lastUpdated = null
    console.log('🗑️ Cache cleared')
  }

  /**
   * Agrega un documento al caché
   */
  static addDocument(document: ExternalDocument): void {
    const existingIndex = this.documents.findIndex(doc => doc.id === document.id)
    
    if (existingIndex >= 0) {
      // Actualizar documento existente
      this.documents[existingIndex] = document
      console.log(`📝 Document updated in cache: ${document.id}`)
    } else {
      // Agregar nuevo documento
      this.documents.push(document)
      console.log(`➕ Document added to cache: ${document.id}`)
    }
  }

  /**
   * Remueve un documento del caché
   */
  static removeDocument(id: string): boolean {
    const initialLength = this.documents.length
    this.documents = this.documents.filter(doc => doc.id !== id)
    
    const wasRemoved = this.documents.length < initialLength
    if (wasRemoved) {
      console.log(`➖ Document removed from cache: ${id}`)
    }
    
    return wasRemoved
  }

  /**
   * Obtiene estadísticas del caché incluyendo información de URLs firmadas
   */
  static getStats(): {
    totalDocuments: number
    totalSize: number
    averageSize: number
    lastUpdated: Date | null
    cacheAge: number // en milisegundos
    documentsWithSignedUrls: number
    documentsWithoutSignedUrls: number
  } {
    const totalSize = this.documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0)
    const averageSize = this.documents.length > 0 ? totalSize / this.documents.length : 0
    const cacheAge = this.lastUpdated ? Date.now() - this.lastUpdated.getTime() : 0
    
    const documentsWithSignedUrls = this.documents.filter(doc => doc.signedUrl && doc.signedUrl.length > 0).length
    const documentsWithoutSignedUrls = this.documents.length - documentsWithSignedUrls

    return {
      totalDocuments: this.documents.length,
      totalSize,
      averageSize,
      lastUpdated: this.lastUpdated,
      cacheAge,
      documentsWithSignedUrls,
      documentsWithoutSignedUrls
    }
  }
  
  /**
   * Obtiene documentos que tienen URLs firmadas válidas
   */
  static getDocumentsWithSignedUrls(): ExternalDocument[] {
    return this.documents.filter(doc => doc.signedUrl && doc.signedUrl.length > 0)
  }
  
  /**
   * Obtiene documentos que no tienen URLs firmadas
   */
  static getDocumentsWithoutSignedUrls(): ExternalDocument[] {
    return this.documents.filter(doc => !doc.signedUrl || doc.signedUrl.length === 0)
  }
}
