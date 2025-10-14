import OpenAI from 'openai'
import { envs } from '../../config/envs.js'

export class OpenAIService {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: envs.OPENAI_API_KEY,
    })
  }

  /**
   * Genera embeddings para un texto usando el modelo configurado
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      console.log(`🤖 DIAGNÓSTICO - Generando embedding para texto de ${text.length} caracteres...`)
      console.log(`📝 DIAGNÓSTICO - Texto a procesar: "${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"`)
      console.log(`🔧 DIAGNÓSTICO - Modelo usado: ${envs.OPENAI_EMBEDDING_MODEL}`)
      
      const startTime = Date.now()
      const response = await this.client.embeddings.create({
        model: envs.OPENAI_EMBEDDING_MODEL,
        input: text,
      })
      const embeddingTime = Date.now() - startTime

      console.log(`⏱️  DIAGNÓSTICO - Tiempo de embedding: ${embeddingTime}ms`)
      console.log(`📊 DIAGNÓSTICO - Respuesta OpenAI:`)
      console.log(`   - Data length: ${response.data?.length || 0}`)
      console.log(`   - Usage tokens: ${response.usage?.total_tokens || 'N/A'}`)

      if (!response.data || response.data.length === 0) {
        console.error(`❌ DIAGNÓSTICO - Respuesta vacía de OpenAI`)
        throw new Error('No se pudo generar el embedding')
      }

      const embedding = response.data[0].embedding
      console.log(`✅ DIAGNÓSTICO - Embedding generado:`)
      console.log(`   - Dimensión: ${embedding.length}`)
      console.log(`   - Primeros 5 valores: [${embedding.slice(0, 5).map(v => v.toFixed(6)).join(', ')}...]`)
      console.log(`   - Rango de valores: ${Math.min(...embedding).toFixed(6)} a ${Math.max(...embedding).toFixed(6)}`)

      return embedding
    } catch (error) {
      console.error('❌ DIAGNÓSTICO - Error al generar embedding:', error)
      if (error instanceof Error) {
        console.error(`   - Error type: ${error.constructor.name}`)
        console.error(`   - Error message: ${error.message}`)
      }
      throw new Error(`Error al generar embedding: ${error}`)
    }
  }

  /**
   * Genera una respuesta simple usando el modelo de chat (para resúmenes, etc.)
   */
  async generateSimpleCompletion(prompt: string): Promise<string> {
    try {
      console.log(`🤖 OpenAIService.generateSimpleCompletion --> Generando respuesta simple...`)

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        max_tokens: 20,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      const content = response.choices[0]?.message?.content
      
      if (!content) {
        throw new Error('No se pudo generar una respuesta')
      }

      return content.trim()
    } catch (error) {
      console.error('❌ Error al generar respuesta simple:', error)
      throw new Error(`Error al generar respuesta simple: ${error}`)
    }
  }

  /**
   * Genera una respuesta usando el modelo de chat con contexto
   */
  async generateChatCompletion(
    userQuestion: string,
    context: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      console.log(`🧠 OpenAIService.generateChatCompletion --> Generando respuesta con IA para pregunta de ${userQuestion.length} caracteres...`)

      const response = await this.client.chat.completions.create({
        model: envs.OPENAI_MODEL,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: systemPrompt || this.getDefaultSystemPrompt()
          },
          {
            role: 'system',
            content: `CONTEXT:\n${context}`
          },
          {
            role: 'user',
            content: userQuestion
          }
        ]
      })

      const content = response.choices[0]?.message?.content
      
      if (!content) {
        throw new Error('No se pudo generar una respuesta')
      }

      return content.trim()
    } catch (error) {
      console.error('❌ Error al generar respuesta:', error)
      throw new Error(`Error al generar respuesta: ${error}`)
    }
  }

  /**
   * Verifica que la conexión con OpenAI funcione
   */
  async ping(): Promise<boolean> {
    try {
      await this.client.models.list()
      return true
    } catch (error) {
      console.error('❌ Error al conectar con OpenAI:', error)
      return false
    }
  }

  /**
   * Retorna el prompt del sistema por defecto para respuestas con contexto
   */
  private getDefaultSystemPrompt(): string {
    return `
Basándote en la siguiente información de documentos, responde la pregunta del usuario de manera clara y precisa.

INSTRUCCIONES:
- Usa solo la información proporcionada en el contexto
- Si la información no es suficiente, indícalo claramente
- Sé conciso pero completo en tu respuesta
- Si hay múltiples fuentes, puedes mencionarlas con sus páginas correspondientes
- Mantén un tono profesional y útil
    `.trim()
  }
  
}
