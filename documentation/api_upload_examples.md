# 📄 Document Upload API - Examples

## 🚀 API Endpoint

**Route:** `POST /api/v1/documents/upload`  
**Content-Type:** `multipart/form-data`

---

## 📋 Request Structure

### Required Fields
- `file`: PDF document (required)

### Optional Fields
- `userId`: string - for logging purposes
- `area`: array of strings - areas/namespaces for filtering
- `category`: array of strings - document categories
- `source`: array of strings - document sources
- `tags`: array of strings - document tags
- `savesavepdf`: true - enviroment entry, taken from .env
---

## 📚 Usage Examples

### 1. Basic Upload (Minimal)

```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -F "file=@document.pdf"
```

### 2. Upload with Metadata

```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -F "file=@manual_policies.pdf" \
  -F "userId=user123" \
  -F "area=[\"compliance\", \"legal\"]" \
  -F "category=[\"procedures\", \"guidelines\"]" \
  -F "source=[\"hr_department\"]" \
  -F "tags=[\"mandatory\", \"2024\"]"
```

### 3. JavaScript/Fetch Example

```javascript
const uploadDocument = async (file, metadata = {}) => {
  const formData = new FormData()
  
  // Add the PDF file
  formData.append('file', file)
  
  // Add optional metadata
  if (metadata.userId) {
    formData.append('userId', metadata.userId)
  }
  
  if (metadata.area && metadata.area.length > 0) {
    formData.append('area', JSON.stringify(metadata.area))
  }
  
  if (metadata.category && metadata.category.length > 0) {
    formData.append('category', JSON.stringify(metadata.category))
  }
  
  if (metadata.source && metadata.source.length > 0) {
    formData.append('source', JSON.stringify(metadata.source))
  }
  
  if (metadata.tags && metadata.tags.length > 0) {
    formData.append('tags', JSON.stringify(metadata.tags))
  }

  try {
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Upload successful:', result)
      return result
    } else {
      console.error('❌ Upload failed:', result)
      throw new Error(result.message)
    }
  } catch (error) {
    console.error('❌ Upload error:', error)
    throw error
  }
}

// Usage
const fileInput = document.getElementById('file-input')
const file = fileInput.files[0]

uploadDocument(file, {
  userId: 'user123',
  area: ['compliance', 'hr'],
  category: ['policies'],
  source: ['internal'],
  tags: ['important', '2024']
})
```

### 4. React Component Example

```jsx
import React, { useState } from 'react'

const DocumentUpload = () => {
  const [file, setFile] = useState(null)
  const [metadata, setMetadata] = useState({
    userId: '',
    area: [],
    category: [],
    source: [],
    tags: []
  })
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      // Add metadata
      Object.entries(metadata).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          formData.append(key, JSON.stringify(value))
        } else if (typeof value === 'string' && value.trim()) {
          formData.append(key, value)
        }
      })

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      })
      
      const uploadResult = await response.json()
      
      if (response.ok) {
        setResult(uploadResult)
        console.log('✅ Upload successful:', uploadResult)
      } else {
        throw new Error(uploadResult.message)
      }
    } catch (error) {
      console.error('❌ Upload failed:', error)
      alert('Upload failed: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleUpload}>
      <div>
        <label>PDF File:</label>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files[0])}
          required
        />
      </div>
      
      <div>
        <label>User ID:</label>
        <input
          type="text"
          value={metadata.userId}
          onChange={(e) => setMetadata({...metadata, userId: e.target.value})}
        />
      </div>
      
      <button type="submit" disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload Document'}
      </button>
      
      {result && (
        <div>
          <h3>✅ Upload Successful!</h3>
          <p>Document ID: {result.documentId}</p>
          <p>Chunks processed: {result.chunksProcessed}</p>
          <p>Processing time: {result.processingTimeMs}ms</p>
        </div>
      )}
    </form>
  )
}
```

---

## ✅ Success Response

```json
{
  "status": "success",
  "documentId": "123e4567-e89b-12d3-a456-426614174000",
  "chunksProcessed": 15,
  "filename": "manual_policies.pdf",
  "totalPages": 8,
  "processingTimeMs": 3450,
  "message": "Document processed successfully into 15 chunks"
}
```

---

## ❌ Error Responses

### File Validation Error
```json
{
  "status": "error",
  "error": "validation_error",
  "message": "Invalid file type: image/png. Only PDF files are allowed.",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### File Too Large
```json
{
  "status": "error",
  "error": "upload_error", 
  "message": "File too large. Maximum size allowed is 10MB",
  "code": "LIMIT_FILE_SIZE",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Processing Error
```json
{
  "status": "error",
  "error": "processing_error",
  "message": "PDF contains no readable text",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🔍 Health Check

**Route:** `GET /api/documents/health`

```bash
curl http://localhost:3000/api/documents/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "embeddings": {
      "status": "up",
      "description": "OpenAI Embeddings Service"
    },
    "vectorDatabase": {
      "status": "up", 
      "description": "Pinecone Vector Database"
    }
  },
  "overall": true
}
```

---

## 📊 Vector Storage in Pinecone

Each document chunk is stored as a vector with this metadata structure:

```json
{
  "documentId": "123e4567-e89b-12d3-a456-426614174000",
  "filename": "manual_policies.pdf",
  "chunkIndex": 0,
  "totalChunks": 15,
  "text": "Original text content of the chunk...",
  "uploadDate": "2024-01-15T10:30:00.000Z",
  "userId": "user123",
  "area": ["compliance", "hr"],
  "category": ["policies"],
  "source": ["internal"],
  "tags": ["important", "2024"]
}
```

This metadata enables precise filtering during RAG queries using the existing `/api/v1/chats/process-message` endpoint.
