import { Document } from './document.entity.js'

export class QueryResult {
  constructor(
    public readonly query: string,
    public readonly totalResults: number,
    public readonly documents: Document[],
    public readonly indexUsed: string,
    public readonly areasUsed: string[],
    public readonly filtersApplied: Record<string, any> = {}
  ) {}

  get bestResult(): Document | null {
    return this.documents.length > 0 ? this.documents[0] : null
  }

  get sources(): string[] {
    return [...new Set(this.documents.map(doc => doc.source))]
  }

  static create(
    query: string,
    documents: Document[],
    indexUsed: string,
    areasUsed: string[] = [],
    filtersApplied: Record<string, any> = {}
  ): QueryResult {
    return new QueryResult(
      query,
      documents.length,
      documents,
      indexUsed,
      areasUsed,
      filtersApplied
    )
  }
}
