import { SupabaseService } from '../../infrastructure/services/supabase.service.js'
import { ExternalDocumentsRepositoryImpl } from '../../infrastructure/repositories/external-documents.repository.impl.js'
import { CacheService } from '../../infrastructure/services/cache.service.js'

export async function runOnStartup(): Promise<void> {
  try {
    console.log('🚀 Startup: loading documents cache from Supabase...')

    const supabase = new SupabaseService()
    const repo = new ExternalDocumentsRepositoryImpl(supabase)
    const docs = await repo.fetchAll()

    CacheService.setDocuments(docs)
    console.log(`✅ Supabase documents cache loaded (${docs.length})`)

    // Mostrar información de los primeros 5 documentos
    docs.slice(0, 5).forEach((d, i) => {
      console.log(`   ${i + 1}. id=${d.id} | signed_url=${d.signedUrl}`)
    })

    // Mostrar estadísticas del caché
    const stats = CacheService.getStats()
    console.log(
      `📊 Cache stats: ${stats.totalDocuments} docs, ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB total`
    )
  } catch (err) {
    console.error(
      '❌ Startup: failed to load documents cache from Supabase',
      err
    )

    // En caso de error, inicializar caché vacío para que la aplicación pueda continuar
    CacheService.setDocuments([])
    console.log('⚠️ Initialized empty cache due to startup error')
  }
}
