import OpenAI from 'openai'
import { envs } from '../../config/envs.js'

/**
 * EmbeddingsService
 *
 * Responsibilities:
 * - Generate embeddings using OpenAI API
 * - Handle text chunking for large documents
 * - Provide reusable embedding functionality across adapters
 * - Manage OpenAI API interaction and error handling
 */
export class EmbeddingsService {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: envs.OPENAI_API_KEY,
    })
  }

  /**
   * Generate embeddings for a single text chunk
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty')
      }

      console.log(
        `🤖 Generating embedding for text chunk of ${text.length} characters...`
      )

      const response = await this.client.embeddings.create({
        model: envs.OPENAI_EMBEDDING_MODEL,
        input: text.trim(),
      })

      if (!response.data || response.data.length === 0) {
        throw new Error('Failed to generate embedding')
      }

      const embedding = response.data[0].embedding
      console.log(
        `✅ Embedding generated successfully - Dimension: ${embedding.length}`
      )

      return embedding
    } catch (error) {
      console.error('❌ Error generating embedding:', error)
      throw new Error(`Failed to generate embedding: ${error}`)
    }
  }

  /**
   * Generate embeddings for multiple text chunks
   */
  async generateBatchEmbeddings(textChunks: string[]): Promise<number[][]> {
    try {
      if (!textChunks || textChunks.length === 0) {
        throw new Error('Text chunks array cannot be empty')
      }

      console.log(
        `🤖 Generating embeddings for ${textChunks.length} text chunks...`
      )

      const embeddings: number[][] = []

      // Process chunks sequentially to avoid rate limits
      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i]
        console.log(
          `📝 Processing chunk ${i + 1}/${textChunks.length} (${chunk.length} chars)`
        )

        const embedding = await this.generateEmbedding(chunk)
        embeddings.push(embedding)

        // Add small delay to respect rate limits
        if (i < textChunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      console.log(
        `✅ Batch embeddings completed - ${embeddings.length} embeddings generated`
      )
      return embeddings
    } catch (error) {
      console.error('❌ Error generating batch embeddings:', error)
      throw new Error(`Failed to generate batch embeddings: ${error}`)
    }
  }

  /**
   * Split text into chunks suitable for embeddings
   *
   * @param text - Full text to be chunked
   * @param maxChunkSize - Maximum characters per chunk (default: 1000)
   * @param overlapSize - Characters to overlap between chunks (default: 100)
   */
  chunkText(
    text: string,
    maxChunkSize: number = 1000,
    overlapSize: number = 100
  ): string[] {
    if (!text || text.trim().length === 0) {
      return []
    }

    const cleanText = text.trim()
    if (cleanText.length <= maxChunkSize) {
      return [cleanText]
    }

    console.log(
      `📄 Chunking text of ${cleanText.length} characters into chunks of max ${maxChunkSize} chars (overlap: ${overlapSize})`
    )

    const chunks: string[] = []
    let startIndex = 0

    while (startIndex < cleanText.length) {
      let endIndex = Math.min(startIndex + maxChunkSize, cleanText.length)

      if (endIndex < cleanText.length) {
        // 🔎 Search for sentence or word boundary near the end
        const WINDOW = 200
        const winStart = Math.max(startIndex, endIndex - WINDOW)

        // Look for sentence boundaries (. ! ?)
        let boundary = Math.max(
          cleanText.lastIndexOf('.', endIndex),
          cleanText.lastIndexOf('!', endIndex),
          cleanText.lastIndexOf('?', endIndex)
        )

        // If boundary is outside the window, ignore it
        if (boundary < winStart) boundary = -1

        if (boundary !== -1) {
          endIndex = boundary + 1
        } else {
          // Look for paragraph break or word boundary within the window
          const paraBreak = cleanText.lastIndexOf('\n\n', endIndex)
          if (paraBreak >= winStart) {
            endIndex = paraBreak + 2
          } else {
            const wordBreak = cleanText.lastIndexOf(' ', endIndex)
            if (wordBreak >= winStart) {
              endIndex = wordBreak
            }
            // else: keep hard cut at maxChunkSize
          }
        }
      }

      // Extract the chunk
      const chunk = cleanText.slice(startIndex, endIndex).trim()
      if (chunk.length > 0) {
        chunks.push(chunk)
      }

      const advance = endIndex - startIndex

      // Compute tentative next start with overlap
      const tentativeStart =
        advance <= overlapSize
          ? endIndex // move forward without overlap if too small
          : endIndex - overlapSize // normal overlap

      // Align start to a clean boundary (sentence/whitespace/word) within a small lookback
      const minNext = Math.max(tentativeStart, startIndex + 1)
      const alignedStart = this.alignChunkStart(cleanText, minNext, 60)

      // Ensure forward progress even if alignment points backwards
      startIndex = alignedStart <= startIndex ? minNext : alignedStart
    }

    console.log(`✂️ Text split into ${chunks.length} chunks`)
    return chunks
  }

  /**
   * Align a proposed start index to a nearby clean boundary within a small lookback window.
   * Prefers sentence punctuation, then whitespace/word boundary. Falls back to proposedStart.
   */
  private alignChunkStart(
    text: string,
    proposedStart: number,
    lookback: number = 50
  ): number {
    if (proposedStart <= 0) return 0
    const from = Math.max(0, proposedStart - lookback)
    const slice = text.slice(from, proposedStart)

    // Prefer sentence boundaries first
    const candidates = [
      slice.lastIndexOf('.'),
      slice.lastIndexOf('!'),
      slice.lastIndexOf('?'),
      slice.lastIndexOf(';'),
      slice.lastIndexOf(':'),
      slice.lastIndexOf('\n'),
      slice.lastIndexOf(' '),
    ]
    const punct = Math.max(...candidates)
    if (punct >= 0) {
      const aligned = from + punct + 1
      if (aligned < proposedStart + 1) return aligned
    }

    // Fallback: coarse word boundary using regex
    const match = /.*\b/.exec(slice)
    if (match && match[0].length > 0) {
      const aligned = from + match[0].length
      if (aligned < proposedStart + 1) return aligned
    }

    return proposedStart
  }

  /**
   * Process a document: chunk text and generate embeddings
   */
  async processDocument(
    text: string,
    options?: {
      maxChunkSize?: number
      overlapSize?: number
    }
  ): Promise<{ chunks: string[]; embeddings: number[][] }> {
    try {
      console.log(`📚 Processing document of ${text.length} characters...`)

      const chunks = this.chunkText(
        text,
        options?.maxChunkSize || 1000,
        options?.overlapSize || 100
      )

      if (chunks.length === 0) {
        throw new Error('No valid chunks created from document')
      }

      const embeddings = await this.generateBatchEmbeddings(chunks)

      console.log(
        `✅ Document processing completed - ${chunks.length} chunks, ${embeddings.length} embeddings`
      )

      return {
        chunks,
        embeddings,
      }
    } catch (error) {
      console.error('❌ Error processing document:', error)
      throw new Error(`Failed to process document: ${error}`)
    }
  }

  /**
   * Verify OpenAI connection
   */
  async ping(): Promise<boolean> {
    try {
      await this.client.models.list()
      return true
    } catch (error) {
      console.error('❌ Error connecting to OpenAI:', error)
      return false
    }
  }
}
