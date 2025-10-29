import pdfjsLib from 'pdfjs-dist'
import { EmbeddingsService } from '../services/embeddings.service.js'
import { PineconeService } from '../services/pinecone.service.js'

type PdfJsTextItem = { str?: string }
import fs from 'fs'
import path from 'path'

// Configure pdfjs-dist worker for Node environment (prevents worker resolution issues)
pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(
  process.cwd(),
  'node_modules',
  'pdfjs-dist',
  'build',
  'pdf.worker.min.js'
)

export interface UploadMetadata {
  userId?: string
  area?: string[]
  category?: string[]
  source?: string[]
  tags?: string[]
}

export interface UploadResult {
  documentId: string
  chunksProcessed: number
  filename: string
  totalPages?: number
  processingTime: number
}

export interface UploadOptions {
  savepdf?: boolean
  documentId: string
}

/**
 * UploadAdapter
 *
 * Responsibilities:
 * - Orchestrate the PDF upload and processing flow
 * - Extract text from PDF documents
 * - Coordinate between EmbeddingsService and PineconeService
 * - Handle document metadata and chunking
 * - Provide clean interface for upload operations
 */
export class UploadAdapter {
  constructor(
    private readonly embeddingsService: EmbeddingsService,
    private readonly pineconeService: PineconeService
  ) {}

  /**
   * Process uploaded PDF file and store in vector database
   */
  async processUploadedDocument(
    buffer: Buffer,
    filename: string,
    metadata: UploadMetadata = {},
    options: UploadOptions
  ): Promise<UploadResult> {
    const startTime = Date.now()
    const documentId = options.documentId

    try {
      console.log(
        `📄 Processing PDF upload: ${filename} (${buffer.length} bytes)`
      )
      console.log(`🔑 Document ID: ${documentId}`)
      console.log(`📋 Metadata:`, metadata)
      console.log(`💾 savepdf: ${options.savepdf === true ? 'true' : 'false'}`)

      // Optional: save original PDF to disk
      if (options.savepdf === true) {
        const savedPath = await this.savePdfToDisk(buffer, filename, documentId)
        console.log(`💾 PDF saved to: ${savedPath}`)
      }

      // Step 1: Extract text from PDF
      console.log(`1️⃣ Extracting text from PDF...`)
      const { text, pages } = await this.extractTextFromPDF(buffer)

      if (!text || text.trim().length === 0) {
        throw new Error('No text content found in PDF')
      }

      console.log(
        `📖 Extracted ${text.length} characters from ${pages.length} pages`
      )

      // Step 2: Process document per page (chunk and generate embeddings with page metadata)
      console.log(
        `2️⃣ Processing document for embeddings (per-page chunking)...`
      )
      const vectors: {
        id: string
        values: number[]
        metadata: Record<string, any>
      }[] = []
      let globalChunkIndex = 0
      for (const page of pages as Array<{ pageNumber: number; text: string }>) {
        if (!page.text || page.text.trim().length === 0) continue
        const { chunks, embeddings } =
          await this.embeddingsService.processDocument(page.text, {
            maxChunkSize: 1000,
            overlapSize: 100,
          })
        if (chunks.length !== embeddings.length) {
          throw new Error(
            `Mismatch between chunks (${chunks.length}) and embeddings (${embeddings.length}) on page ${page.pageNumber}`
          )
        }
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]
          const embedding = embeddings[i]
          vectors.push({
            id: `${documentId}_chunk_${globalChunkIndex}`,
            values: embedding,
            metadata: {
              documentId,
              filename,
              chunkIndex: globalChunkIndex,
              totalChunks: undefined, // set after loop
              page: page.pageNumber,
              page_number: page.pageNumber,
              text: this.sanitizeTextForVectorDB(chunk),
              uploadDate: new Date().toISOString(),
              // Include user metadata
              ...(metadata.userId && {
                userId: this.sanitizeTextForVectorDB(metadata.userId),
              }),
              ...(metadata.area &&
                metadata.area.length > 0 && {
                  area: metadata.area.map((a) =>
                    this.sanitizeTextForVectorDB(a)
                  ),
                }),
              ...(metadata.category &&
                metadata.category.length > 0 && {
                  category: metadata.category.map((c) =>
                    this.sanitizeTextForVectorDB(c)
                  ),
                }),
              ...(metadata.source &&
                metadata.source.length > 0 && {
                  source: metadata.source.map((s) =>
                    this.sanitizeTextForVectorDB(s)
                  ),
                }),
              ...(metadata.tags &&
                metadata.tags.length > 0 && {
                  tags: metadata.tags.map((t) =>
                    this.sanitizeTextForVectorDB(t)
                  ),
                }),
            },
          })
          globalChunkIndex++
        }
      }

      // Update totalChunks in metadata for all vectors
      const totalChunks = vectors.length
      vectors.forEach((v) => {
        v.metadata.totalChunks = totalChunks
      })

      // Step 4: Store in Pinecone
      console.log(`4️⃣ Storing vectors in Pinecone...`)
      await this.pineconeService.upsertVectors(vectors)

      const processingTime = Date.now() - startTime
      console.log(`✅ Document processing completed in ${processingTime}ms`)

      return {
        documentId,
        chunksProcessed: vectors.length,
        filename,
        totalPages: pages.length,
        processingTime,
      }
    } catch (error) {
      const processingTime = Date.now() - startTime
      console.error(`❌ Error processing document ${filename}:`, error)
      console.error(`⏱️ Failed after ${processingTime}ms`)
      throw new Error(`Failed to process document: ${error}`)
    }
  }

  /**
   * Remove invalid Unicode code points (e.g., unpaired surrogates) and control chars.
   * Keeps newlines and spaces; normalizes to NFC for consistency.
   */
  private sanitizeTextForVectorDB(input: string): string {
    if (!input) return ''
    // Iterate by code points to avoid splitting surrogate pairs
    const filtered = Array.from(input)
      .map((ch) => {
        const cp = ch.codePointAt(0) as number
        // Remove surrogate range and non-characters U+FFFE/U+FFFF and their planes
        const isSurrogate = cp >= 0xd800 && cp <= 0xdfff
        const isNonChar = (cp & 0xffff) === 0xfffe || (cp & 0xffff) === 0xffff
        if (isSurrogate || isNonChar) return ''
        return ch
      })
      .join('')
      // Remove control chars except tab/newline/carriage return
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    return filtered.normalize('NFC').trim()
  }

  /**
   * Extract text content from PDF buffer
   */
  private async extractTextFromPDF(
    buffer: Buffer
  ): Promise<{ text: string; pages: any[] }> {
    try {
      console.log(
        `📖 Parsing PDF buffer (${buffer.length} bytes) with pdfjs-dist...`
      )

      // Validar que el buffer no esté vacío
      if (!buffer || buffer.length === 0) {
        throw new Error('PDF buffer is empty')
      }

      // Validar encabezado PDF (comienza con %PDF)
      const header = buffer.subarray(0, 4).toString()
      if (header !== '%PDF') {
        throw new Error('Invalid PDF file: missing PDF header')
      }

      // Cargar documento con pdfjs-dist (requires Uint8Array, not Buffer)
      const data = new Uint8Array(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength
      )
      const loadingTask = pdfjsLib.getDocument({ data })
      const pdf = await loadingTask.promise
      const numPages = pdf.numPages || 0

      if (numPages === 0) {
        throw new Error('PDF has 0 pages')
      }

      let fullText = ''
      const pages: any[] = []

      for (let p = 1; p <= numPages; p++) {
        const page = await pdf.getPage(p)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((i) => (i as PdfJsTextItem).str ?? '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()

        if (pageText.length > 0) {
          fullText += (p > 1 ? '\n\n' : '') + pageText
        }
        pages.push({ pageNumber: p, text: pageText })
      }

      if (fullText.trim().length === 0) {
        throw new Error('No text content found in PDF')
      }

      console.log(`✅ PDF parsed successfully with pdfjs-dist`)
      console.log(`   - Text length: ${fullText.length} characters`)
      console.log(`   - Pages: ${numPages}`)

      return { text: fullText, pages }
    } catch (error) {
      console.error('❌ Error extracting text from PDF (pdfjs-dist):', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`PDF text extraction failed: ${message}`)
    }
  }

  /**
   * Save original PDF to documentation/uploads creating the folder if needed
   */
  private async savePdfToDisk(
    buffer: Buffer,
    originalName: string,
    documentId: string
  ): Promise<string> {
    const uploadsDir = path.resolve(process.cwd(), 'documentation', 'uploads')
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
      }
      const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = path.join(
        uploadsDir,
        `${documentId}__${Date.now()}__${safeName}`
      )
      fs.writeFileSync(filePath, buffer)
      return filePath
    } catch (err) {
      console.error('❌ Error saving PDF to disk:', err)
      throw new Error('Failed to save PDF to disk')
    }
  }

  /**
   * Validate uploaded file
   */
  validateFile(file: Express.Multer.File): void {
    // Check if file exists
    if (!file) {
      throw new Error('No file provided')
    }

    // Check file type
    if (file.mimetype !== 'application/pdf') {
      throw new Error(
        `Invalid file type: ${file.mimetype}. Only PDF files are allowed.`
      )
    }

    // Check file size (10MB limit)
    const maxSizeBytes = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSizeBytes) {
      throw new Error(
        `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: 10MB`
      )
    }

    // Check filename
    if (
      !file.originalname ||
      !file.originalname.toLowerCase().endsWith('.pdf')
    ) {
      throw new Error('Invalid filename. File must have .pdf extension')
    }

    console.log(
      `✅ File validation passed: ${file.originalname} (${(file.size / 1024).toFixed(2)}KB)`
    )
  }

  /**
   * Health check for all dependencies
   */
  async healthCheck(): Promise<{
    embeddings: boolean
    pinecone: boolean
    overall: boolean
  }> {
    console.log('🔍 Running upload adapter health check...')

    const embeddingsStatus = await this.embeddingsService.ping()
    const pineconeStatus = await this.pineconeService.ping()
    const overall = embeddingsStatus && pineconeStatus

    console.log(`Health Check Results:`)
    console.log(`  - Embeddings Service: ${embeddingsStatus ? '✅' : '❌'}`)
    console.log(`  - Pinecone Service: ${pineconeStatus ? '✅' : '❌'}`)
    console.log(`  - Overall: ${overall ? '✅' : '❌'}`)

    return {
      embeddings: embeddingsStatus,
      pinecone: pineconeStatus,
      overall,
    }
  }
}
