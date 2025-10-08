import { QueryResult } from '../entities/query-result.entity.js'

export interface VectorSearchFilters {
  area?: string[]
  category?: string[]
  source?: string[]
  tags?: string[]
}

export abstract class VectorDatabaseRepository {
  abstract searchSimilarDocuments(
    queryEmbedding: number[],
    areas?: string[],
    topK?: number,
    filters?: VectorSearchFilters
  ): Promise<QueryResult>

  abstract ping(): Promise<boolean>
}
