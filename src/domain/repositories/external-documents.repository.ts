import { ExternalDocument } from '../../infrastructure/services/supabase.service.js'

/**
 * Repositorio abstracto para manejo de documentos externos
 */
export abstract class ExternalDocumentsRepository {
  /**
   * Obtiene todos los documentos externos
   */
  abstract fetchAll(): Promise<ExternalDocument[]>

  /**
   * Obtiene un documento específico por ID
   */
  abstract fetchById(id: string): Promise<ExternalDocument | null>

  /**
   * Busca documentos por criterios específicos
   */
  abstract search(query: string): Promise<ExternalDocument[]>

  /**
   * Verifica la conectividad con el servicio externo
   */
  abstract ping(): Promise<boolean>
}
