import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { envs } from '../../config/envs.js'

export interface ExternalDocument {
  id: string
  signedUrl: string
  fileName?: string
  fileSize?: number
  contentType?: string
  createdAt?: string
  updatedAt?: string
  storagePath?: string           // Path del archivo en Supabase Storage
  signedUrlExpiresAt?: string    // Fecha de expiración de la URL firmada
}

export class SupabaseService {
  private client: SupabaseClient

  constructor() {
    this.client = createClient(envs.SUPABASE_URL, envs.SUPABASE_KEY)
  }

  /**
   * Obtiene todos los documentos externos desde Supabase con gestión de URLs firmadas
   */
  async getAllDocuments(): Promise<ExternalDocument[]> {
    try {
      console.log('📄 Fetching documents from Supabase with signed URL management...')
      
      // Consultar documentos de la base de datos
      const { data, error } = await this.client
        .from('documents')
        .select('id, storage_path, signed_url, signed_url_expires_at, original_name, file_size, content_type, created_at, updated_at')

      if (error) {
        console.warn('⚠️ Database table not available:', error.message)
        console.log('📦 Returning empty documents array')
        return []
      }

      const documents: ExternalDocument[] = []
      
      // Procesar cada documento para verificar/generar signed URLs
      for (const doc of data || []) {
        try {
          const processedDoc = await this.ensureValidSignedUrl(doc)
          documents.push(processedDoc)
        } catch (docError) {
          console.warn(`⚠️ Could not process document ${doc.id}:`, docError)
          // Incluir documento sin URL según especificación
          documents.push({
            id: doc.id,
            signedUrl: '', // URL vacía si falla
            fileName: doc.original_name,
            fileSize: doc.file_size,
            contentType: doc.content_type,
            createdAt: doc.created_at,
            updatedAt: doc.updated_at,
            storagePath: doc.storage_path,
            signedUrlExpiresAt: doc.signed_url_expires_at
          })
        }
      }
      
      console.log(`✅ SupabaseService.getAllDocuments --> Retrieved ${documents.length} documents from Supabase`)
      return documents
      
    } catch (error) {
      console.error('❌ Error fetching documents from Supabase:', error)
      console.log('📦 Returning empty documents array due to error')
      return []
    }
  }

  /**
   * Obtiene un documento específico por ID con gestión de URL firmada
   */
  async getDocumentById(id: string): Promise<ExternalDocument | null> {
    try {
      console.log(`📄 Fetching document with ID: ${id}`)
      
      const { data, error } = await this.client
        .from('documents')
        .select('id, storage_path, signed_url, signed_url_expires_at, original_name, file_size, content_type, created_at, updated_at')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`⚠️ Document not found with ID: ${id}`)
          return null
        }
        throw new Error(`Supabase error: ${error.message}`)
      }

      const processedDoc = await this.ensureValidSignedUrl(data)
      console.log(`✅ Document found: ${processedDoc.fileName || 'unnamed'}`)
      return processedDoc
      
    } catch (error) {
      console.error(`❌ Error fetching document ${id}:`, error)
      return null
    }
  }

  /**
   * Obtiene la URL firmada de un archivo desde Storage
   * Por defecto son 7 días la vida de la URL
   */
  async getSignedUrl(bucket: string, path: string, expiresIn: number = 604800): Promise<string> {
    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn)

      if (error) {
        throw new Error(`Supabase Storage error: ${error.message}`)
      }

      return data.signedUrl
    } catch (error) {
      console.error(`Error creating signed URL for ${bucket}/${path}:`, error)
      throw error
    }
  }

  /**
   * Lista archivos en un bucket de Storage
   */
  async listFiles(bucket: string, folder?: string): Promise<any[]> {
    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .list(folder)

      if (error) {
        throw new Error(`Supabase Storage error: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error(`Error listing files in ${bucket}:`, error)
      throw error
    }
  }

  /**
   * Asegura que un documento tenga una URL firmada válida
   * Regenera la URL si está expirada o falta menos de 1 día
   */
  private async ensureValidSignedUrl(doc: any): Promise<ExternalDocument> {
    const now = new Date()
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000) // +1 día
    
    let needsNewUrl = false
    let currentSignedUrl = doc.signed_url || ''
    
    // Verificar si necesita nueva URL
    if (!doc.signed_url || !doc.signed_url_expires_at) {
      needsNewUrl = true
      console.log(`🔄 Document ${doc.id}: No signed URL or expiration date`)
    } else {
      const expiresAt = new Date(doc.signed_url_expires_at)
      if (expiresAt <= oneDayFromNow) {
        needsNewUrl = true
        console.log(`🔄 Document ${doc.id}: URL expires soon (${expiresAt.toISOString()})`)
      }
    }
    
    // Generar nueva URL si es necesario
    if (needsNewUrl && doc.storage_path) {
      try {
        const newUrlData = await this.generateAndStoreSignedUrl(doc.id, doc.storage_path)
        currentSignedUrl = newUrlData.signedUrl
        console.log(`✅ Generated new signed URL for document ${doc.id}`)
      } catch (urlError) {
        console.error(`❌ Failed to generate signed URL for document ${doc.id}:`, urlError)
        // Mantener URL actual o vacía según especificación
      }
    }
    
    return {
      id: doc.id,
      signedUrl: currentSignedUrl,
      fileName: doc.original_name,
      fileSize: doc.file_size,
      contentType: doc.content_type,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      storagePath: doc.storage_path,
      signedUrlExpiresAt: doc.signed_url_expires_at
    }
  }
  
  /**
   * Genera una nueva URL firmada y la almacena en la base de datos
   */
  private async generateAndStoreSignedUrl(documentId: string, storagePath: string): Promise<{ signedUrl: string, expiresAt: Date }> {
    const sevenDaysInSeconds = 7 * 24 * 60 * 60 // 7 días en segundos
    const expiresAt = new Date(Date.now() + sevenDaysInSeconds * 1000)
    
    // Generar URL firmada en Storage usando el método auxiliar
    const signedUrl = await this.getSignedUrl('documents', storagePath, sevenDaysInSeconds)
    
    // Actualizar base de datos con nueva URL
    const { error: updateError } = await this.client
      .from('documents')
      .update({
        signed_url: signedUrl,
        signed_url_expires_at: expiresAt.toISOString()
      })
      .eq('id', documentId)
    
    if (updateError) {
      console.warn(`⚠️ Failed to update signed URL in database for ${documentId}:`, updateError.message)
      // No lanzar error, la URL sigue siendo válida aunque no se actualice en BD
    }
    
    return {
      signedUrl: signedUrl,
      expiresAt
    }
  }
}
