import { Router } from 'express'
import multer from 'multer'
import { DocumentsDependencies } from './dependencies.js'

/**
 * DocumentsRoutes
 * 
 * Responsibilities:
 * - Define HTTP routes for document operations
 * - Configure multer for file upload handling
 * - Set up middleware for multipart/form-data parsing
 * - Route requests to appropriate controller methods
 */
export class DocumentsRoutes {
  
  /**
   * Configure multer for in-memory file storage
   * This approach avoids writing files to disk and handles them in memory
   */
  private static getMulterConfig() {
    return multer({
      storage: multer.memoryStorage(), // Store files in memory as buffers
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB file size limit
        files: 1, // Only allow 1 file per request
      },
      fileFilter: (req, file, cb) => {
        // Only allow PDF files
        if (file.mimetype === 'application/pdf') {
          cb(null, true)
        } else {
          cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF files are allowed.`))
        }
      }
    })
  }

  /**
   * Get configured router with all document routes
   */
  static get routes(): Router {
    const router = Router()
    const controller = DocumentsDependencies.getController()
    const upload = DocumentsRoutes.getMulterConfig()

    // Health check route
    router.get('/health', controller.healthCheck)

    // Document upload route with multer middleware
    // Expects: multipart/form-data with 'file' field + optional metadata fields
    router.post('/upload', 
      upload.single('file'), // Handle single file upload with field name 'file'
      controller.uploadDocument
    )

    // Error handling middleware for multer errors
    router.use((error: any, req: any, res: any, next: any) => {
      if (error instanceof multer.MulterError) {
        console.error('❌ Multer error:', error)
        
        let message = 'File upload error'
        let statusCode = 400

        switch (error.code) {
          case 'LIMIT_FILE_SIZE':
            message = 'File too large. Maximum size allowed is 10MB'
            break
          case 'LIMIT_FILE_COUNT':
            message = 'Too many files. Only 1 file allowed per request'
            break
          case 'LIMIT_UNEXPECTED_FILE':
            message = 'Unexpected field name. Use "file" as the field name'
            break
          default:
            message = `Upload error: ${error.message}`
        }

        return res.status(statusCode).json({
          status: 'error',
          error: 'upload_error',
          message,
          code: error.code,
          timestamp: new Date().toISOString()
        })
      }

      // Handle other file filter errors
      if (error.message && error.message.includes('Invalid file type')) {
        return res.status(400).json({
          status: 'error',
          error: 'invalid_file_type',
          message: error.message,
          timestamp: new Date().toISOString()
        })
      }

      // Pass other errors to default error handler
      next(error)
    })

    return router
  }
}
