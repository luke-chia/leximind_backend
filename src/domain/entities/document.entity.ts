export class Document {
  constructor(
    public readonly id: string,
    public readonly text: string,
    public readonly source: string,
    public readonly page: string,
    public readonly score: number,
    public readonly chunkId?: string,
    public readonly metadata?: Record<string, any>
  ) {}

  static create(
    id: string,
    text: string,
    source: string,
    page: string = 'N/A',
    score: number = 0,
    chunkId?: string,
    metadata?: Record<string, any>
  ): Document {
    return new Document(id, text, source, page, score, chunkId, metadata)
  }

  // Método para extraer información de página desde metadata o chunk_id
  static extractPageInfo(metadata: Record<string, any>): string {
    if (metadata.page !== undefined) return metadata.page.toString()
    if (metadata.page_number !== undefined) return metadata.page_number.toString()
    
    // Intentar extraer de chunk_id si existe
    if (metadata.chunk_id !== undefined) {
      try {
        const chunkNum = parseInt(metadata.chunk_id.toString())
        return `~${Math.floor(chunkNum / 2) + 1}` // Estimación: 2-3 chunks por página
      } catch {
        return 'N/A'
      }
    }
    
    return 'N/A'
  }
}
