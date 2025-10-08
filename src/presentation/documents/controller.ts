import { Request, Response } from 'express'
import { UploadAdapter } from '../../infrastructure/adapters/upload.adapter.js'

/**
 * DocumentsController
 * 
 * Responsibilities:
 * - Handle HTTP requests for document operations
 * - Parse multipart/form-data uploads
 * - Validate request data and files
 * - Delegate business logic to UploadAdapter
 * - Return appropriate HTTP responses
 */
export class DocumentsController {
  constructor(private readonly uploadAdapter: UploadAdapter) {}

  /**
   * Handle PDF document upload
   * POST /api/documents/upload
   */
  uploadDocument = async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log(`📤 Document upload request received`)
      console.log(`   - Content-Type: ${req.headers['content-type']}`)
      console.log(`   - Body keys: ${Object.keys(req.body).join(', ')}`)

      // Validate file upload
      const file = req.file
      if (!file) {
        console.error(`❌ No file provided in upload request`)
        return res.status(400).json({
          status: 'error',
          error: 'No file provided',
          message: 'A PDF file is required'
        })
      }

      // Validate file through adapter
      try {
        this.uploadAdapter.validateFile(file)
      } catch (validationError) {
        console.error(`❌ File validation failed:`, validationError)
        return res.status(400).json({
          status: 'error',
          error: 'Invalid file',
          message: validationError instanceof Error ? validationError.message : 'File validation failed'
        })
      }

      // Extract and validate metadata from form fields
      const metadata = this.extractMetadata(req.body)
      console.log(`📋 Extracted metadata:`, metadata)

      // Parse required documentId (UUID v4)
      const documentIdRaw = req.body.documentId
      if (!documentIdRaw || typeof documentIdRaw !== 'string') {
        return res.status(400).json({
          status: 'error',
          error: 'invalid_document_id',
          message: 'documentId is required and must be a UUID string'
        })
      }

      const isUuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(documentIdRaw)
      if (!isUuidV4) {
        return res.status(400).json({
          status: 'error',
          error: 'invalid_document_id',
          message: 'documentId must be a valid UUID v4'
        })
      }

      // Parse optional savepdf flag
      const savePdfRaw = req.body.savepdf
      const savePdf = typeof savePdfRaw === 'string'
        ? ['true', '1', 'yes', 'on'].includes(savePdfRaw.toLowerCase())
        : Boolean(savePdfRaw)

      // Process the uploaded document
      console.log(`🚀 Starting document processing...`)
      const result = await this.uploadAdapter.processUploadedDocument(
        file.buffer,
        file.originalname,
        metadata,
        { savepdf: savePdf, documentId: documentIdRaw }
      )

      console.log(`✅ Document upload completed successfully:`, result)

      return res.status(200).json({
        status: 'success',
        documentId: result.documentId,
        chunksProcessed: result.chunksProcessed,
        filename: result.filename,
        totalPages: result.totalPages,
        processingTimeMs: result.processingTime,
        message: `Document processed successfully into ${result.chunksProcessed} chunks`
      })

    } catch (error) {
      console.error('❌ Error in document upload:', error)
      
      // Determine appropriate error status code
      const isClientError = error instanceof Error && (
        error.message.includes('validation') ||
        error.message.includes('Invalid') ||
        error.message.includes('No text content')
      )
      
      const statusCode = isClientError ? 400 : 500
      const errorType = isClientError ? 'validation_error' : 'processing_error'

      return res.status(statusCode).json({
        status: 'error',
        error: errorType,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * Health check endpoint for document upload services
   * GET /api/documents/health
   */
  healthCheck = async (req: Request, res: Response): Promise<Response> => {
    try {
      console.log('🔍 Document services health check requested')

      const healthStatus = await this.uploadAdapter.healthCheck()
      const statusCode = healthStatus.overall ? 200 : 503

      return res.status(statusCode).json({
        status: healthStatus.overall ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          embeddings: {
            status: healthStatus.embeddings ? 'up' : 'down',
            description: 'OpenAI Embeddings Service'
          },
          vectorDatabase: {
            status: healthStatus.pinecone ? 'up' : 'down',
            description: 'Pinecone Vector Database'
          }
        },
        overall: healthStatus.overall
      })

    } catch (error) {
      console.error('❌ Error in health check:', error)
      
      return res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Extract and validate metadata from request body
   */
  private extractMetadata(body: any): {
    userId?: string
    area?: string[]
    category?: string[]
    source?: string[]
    tags?: string[]
  } {
    const metadata: any = {}

    // Extract userId (optional string)
    if (body.userId && typeof body.userId === 'string') {
      metadata.userId = body.userId.trim()
    }

    // Extract array fields and ensure they are arrays of strings
    const arrayFields = ['area', 'category', 'source', 'tags'] as const

    arrayFields.forEach(field => {
      if (body[field]) {
        let fieldValue = body[field]

        // Handle JSON string arrays
        if (typeof fieldValue === 'string') {
          try {
            fieldValue = JSON.parse(fieldValue)
          } catch {
            // If not JSON, treat as comma-separated string
            fieldValue = fieldValue.split(',').map((item: string) => item.trim()).filter(Boolean)
          }
        }

        // Ensure it's an array
        if (!Array.isArray(fieldValue)) {
          fieldValue = [fieldValue]
        }

        // Filter to strings only and remove empty values
        const cleanArray = fieldValue
          .filter((item: any) => typeof item === 'string' && item.trim().length > 0)
          .map((item: string) => item.trim())

        if (cleanArray.length > 0) {
          metadata[field] = cleanArray
        }
      }
    })

    return metadata
  }

  /**
   * Handle errors consistently across controller methods
   */
  private handleError(error: unknown, res: Response, defaultStatus = 500): Response {
    console.error('❌ Controller error:', error)

    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    
    return res.status(defaultStatus).json({
      status: 'error',
      error: error instanceof Error ? error.constructor.name : 'UnknownError',
      message,
      timestamp: new Date().toISOString()
    })
  }
}
