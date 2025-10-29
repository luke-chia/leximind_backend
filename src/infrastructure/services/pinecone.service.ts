import { Pinecone } from '@pinecone-database/pinecone'
import { envs } from '../../config/envs.js'
import {
  VectorDatabaseRepository,
  VectorSearchFilters,
} from '../../domain/repositories/vector-database.repository.js'
import { QueryResult } from '../../domain/entities/query-result.entity.js'
import { Document } from '../../domain/entities/document.entity.js'

export class PineconeService implements VectorDatabaseRepository {
  private client: Pinecone
  private indexName: string
  private namespace: string

  constructor() {
    this.client = new Pinecone({
      apiKey: envs.PINECONE_API_KEY,
    })
    this.indexName = envs.PINECONE_INDEX_NAME
    this.namespace = envs.PINECONE_NAMESPACE
  }

  /**
   * Busca documentos similares en Pinecone usando filtros
   */
  async searchSimilarDocuments(
    queryEmbedding: number[],
    areas?: string[],
    topK: number = 5,
    filters?: VectorSearchFilters
  ): Promise<QueryResult> {
    try {
      console.log(
        `🎯 Buscando ${topK} documentos similares en namespace: ${this.namespace}`
      )

      const index = this.client.Index(this.indexName)

      // Construir filtros de metadata incluyendo areas
      const metadata_filters = this.buildMetadataFilters(filters, areas)

      console.log(`🔍 Filtros aplicados:`, metadata_filters)
      console.log(`🔢 Embedding length:`, queryEmbedding.length)
      console.log(`🎯 TopK solicitado:`, topK)

      // Construir query request
      const queryRequest: any = {
        vector: queryEmbedding,
        topK: topK,
        includeValues: false,
        includeMetadata: true,
      }

      // Agregar filtros solo si existen
      if (Object.keys(metadata_filters).length > 0) {
        queryRequest.filter = metadata_filters
      }

      console.log(`📊 Query configurado:`, {
        vectorLength: queryRequest.vector.length,
        topK: queryRequest.topK,
        namespace: this.namespace,
        hasFilters: Object.keys(metadata_filters).length > 0,
      })

      console.log(`🚀 Ejecutando consulta...`)
      const startTime = Date.now()

      // Usar el namespace fijo configurado
      const namespacedIndex = index.namespace(this.namespace)
      const results = await namespacedIndex.query(queryRequest)
      const queryTime = Date.now() - startTime

      console.log(`⏱️ Consulta completada en: ${queryTime}ms`)
      console.log(`📤 Matches encontrados: ${results.matches?.length || 0}`)

      // Procesar resultados
      const allResults: Document[] = []

      if (results.matches && results.matches.length > 0) {
        console.log(
          `✅ Primer resultado - ID: ${results.matches[0].id}, Score: ${results.matches[0].score}`
        )
        console.log(`Meatadata: ${JSON.stringify(results.matches[0].metadata)}`)

        const documents = results.matches.map((match) => {
          const page = Document.extractPageInfo(match.metadata || {})

          return Document.create(
            match.id,
            match.metadata?.text
              ? match.metadata.text.toString()
              : 'No disponible',
            match.metadata?.filename
              ? match.metadata.filename.toString()
              : 'Desconocida',
            page,
            match.score || 0,
            match.metadata?.chunk_id
              ? match.metadata.chunk_id.toString()
              : undefined,
            match.metadata
          )
        })

        allResults.push(...documents)
      } else {
        console.log(
          `ℹ️ Sin resultados - posibles causas: filtros restrictivos, embedding sin similitud, o namespace vacío`
        )
      }

      // Ordenar resultados por score
      const sortedResults = allResults
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)

      console.log(`✅ Procesados ${sortedResults.length} documentos finales`)

      return QueryResult.create(
        'search_query',
        sortedResults,
        this.indexName,
        [this.namespace], // Usar el namespace fijo
        metadata_filters
      )
    } catch (error) {
      console.error('❌ Error en búsqueda vectorial:', error)
      throw new Error(`Error en búsqueda vectorial: ${error}`)
    }
  }

  /**
   * Construye los filtros de metadata para Pinecone
   */
  private buildMetadataFilters(
    filters?: VectorSearchFilters,
    areas?: string[]
  ): Record<string, any> {
    const metadata_filters: Record<string, any> = {}

    // Filtro por área (ahora es metadata, no namespace)
    if (areas && areas.length > 0) {
      metadata_filters.area = { $in: areas }
    }

    if (!filters) return metadata_filters

    // Filtro por categoría
    if (filters.category && filters.category.length > 0) {
      metadata_filters.category = { $in: filters.category }
    }

    // Filtro por fuente
    if (filters.source && filters.source.length > 0) {
      metadata_filters.source = { $in: filters.source }
    }

    // Filtro por tags
    if (filters.tags && filters.tags.length > 0) {
      metadata_filters.tags = { $in: filters.tags }
    }

    return metadata_filters
  }

  /**
   * Verifica que la conexión con Pinecone funcione
   */
  async ping(): Promise<boolean> {
    try {
      const indexes = await this.client.listIndexes()
      const indexExists = indexes.indexes?.some(
        (idx) => idx.name === this.indexName
      )

      if (!indexExists) {
        console.warn(`⚠️ Índice '${this.indexName}' no encontrado en Pinecone`)
        return false
      }

      console.log(
        `✅ Conexión exitosa con Pinecone - Índice: ${this.indexName}`
      )
      return true
    } catch (error) {
      console.error('❌ Error al conectar con Pinecone:', error)
      return false
    }
  }

  /**
   * Diagnóstico completo del índice de Pinecone
   */
  async runDiagnostics(): Promise<void> {
    console.log(`🔍 ===== DIAGNÓSTICO PINECONE COMPLETO =====`)

    try {
      // 1. Verificar lista de índices
      console.log(`1. 📋 Listando índices disponibles...`)
      const indexes = await this.client.listIndexes()
      console.log(
        `   Índices encontrados: ${indexes.indexes?.map((i) => i.name).join(', ') || 'Ninguno'}`
      )

      const targetIndex = indexes.indexes?.find(
        (idx) => idx.name === this.indexName
      )
      if (!targetIndex) {
        console.error(`❌ Índice '${this.indexName}' NO ENCONTRADO`)
        return
      }

      console.log(`✅ Índice '${this.indexName}' encontrado`)
      console.log(`   - Host: ${targetIndex.host}`)
      console.log(`   - Status: ${targetIndex.status?.state}`)

      // 2. Conectar al índice y obtener estadísticas
      console.log(`2. 📊 Obteniendo estadísticas del índice...`)
      const index = this.client.Index(this.indexName)
      const stats = await index.describeIndexStats()

      console.log(`   - Total vectores: ${stats.totalRecordCount || 0}`)
      console.log(`   - Dimensión: ${stats.dimension}`)
      console.log(
        `   - Namespaces: ${stats.namespaces ? Object.keys(stats.namespaces).length : 0}`
      )

      if (stats.namespaces) {
        for (const [namespace, nsStats] of Object.entries(stats.namespaces)) {
          console.log(
            `     • ${namespace}: ${nsStats.recordCount || 0} vectores`
          )
        }
      }

      // 3. Test de consulta simple en el namespace configurado
      console.log(`3. 🧪 Test de consulta simple...`)
      const dummyVector = new Array(stats.dimension).fill(0.1)
      console.log(`   - Probando en namespace configurado: ${this.namespace}`)

      const testNamespacedIndex = index.namespace(this.namespace)
      const testQuery = await testNamespacedIndex.query({
        vector: dummyVector,
        topK: 1,
        includeMetadata: true,
      })

      console.log(
        `   - Query exitosa: ${testQuery.matches?.length || 0} resultados`
      )
      if (testQuery.matches && testQuery.matches.length > 0) {
        const match = testQuery.matches[0]
        console.log(`   - Primer resultado ID: ${match.id}`)
        console.log(`   - Score: ${match.score}`)
        console.log(
          `   - Metadata keys: ${match.metadata ? Object.keys(match.metadata).join(', ') : 'Sin metadata'}`
        )
      }

      console.log(`✅ ===== DIAGNÓSTICO COMPLETADO =====`)
    } catch (error) {
      console.error(`❌ Error en diagnóstico:`, error)
    }
  }

  /**
   * Upsert vectors into Pinecone with metadata
   */
  async upsertVectors(
    vectors: {
      id: string
      values: number[]
      metadata: Record<string, any>
    }[]
  ): Promise<void> {
    try {
      if (!vectors || vectors.length === 0) {
        throw new Error('Vectors array cannot be empty')
      }

      console.log(
        `📤 Upserting ${vectors.length} vectors to namespace: ${this.namespace}`
      )

      const index = this.client.Index(this.indexName)
      const namespacedIndex = index.namespace(this.namespace)

      // Upsert vectors in batches to handle large uploads
      const batchSize = 100
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize)

        console.log(
          `📦 Upserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)} (${batch.length} vectors)`
        )

        await namespacedIndex.upsert(batch)

        // Small delay between batches to avoid rate limits
        if (i + batchSize < vectors.length) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      console.log(`✅ Successfully upserted ${vectors.length} vectors`)
    } catch (error) {
      console.error('❌ Error upserting vectors:', error)
      throw new Error(`Failed to upsert vectors: ${error}`)
    }
  }
}
