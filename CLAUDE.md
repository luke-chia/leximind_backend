# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LexiMind Backend** is a Node.js/TypeScript REST API that powers an intelligent RAG (Retrieval-Augmented Generation) system for banking knowledge management. It enables employees to query corporate documents using natural language and receive AI-generated responses grounded in institutional knowledge.

### Core Technologies
- **Runtime**: Node.js with ES Modules (type: "module")
- **Language**: TypeScript 5.9+ with strict mode
- **Framework**: Express.js 5.x
- **AI Services**: OpenAI (GPT-3.5-turbo + text-embedding-3-small)
- **Vector Database**: Pinecone (serverless, cosine similarity, 1536 dimensions)
- **Relational Database**: Supabase PostgreSQL (metadata, conversations, user profiles)
- **Storage**: Supabase Storage (PDF documents)

## Development Commands

### Running the Application
```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build

# Production start (builds first, then runs)
npm start
```

### Important Notes
- The application uses **tsx** for development hot-reload
- No test suite is currently configured
- No linting scripts are defined (TypeScript strict mode provides type safety)

## Architecture

This project follows **Clean Architecture** (Hexagonal Architecture) with clear separation of concerns:

### Layer Structure

```
src/
├── config/           # Environment variables and validation
├── domain/           # Business logic (pure, framework-agnostic)
│   ├── datasources/  # Data source interfaces
│   ├── dtos/         # Data Transfer Objects
│   ├── entities/     # Business entities (Document, QueryResult, etc.)
│   ├── repositories/ # Repository interfaces
│   └── use-cases/    # Business use case interfaces
├── infrastructure/   # Implementation details
│   ├── adapters/     # RAG orchestration, document upload pipeline
│   ├── services/     # External service clients (OpenAI, Pinecone, Supabase)
│   ├── repositories/ # Repository implementations
│   ├── mappers/      # Entity-to-DTO mapping
│   └── use-cases/    # Use case implementations
├── presentation/     # API layer (Express routes & controllers)
│   ├── auth/         # Authentication endpoints
│   ├── chats/        # RAG query endpoints
│   ├── documents/    # Document upload endpoints
│   └── startup/      # Startup tasks (cache warming, etc.)
└── data/             # Database connections
    └── mongodb/      # MongoDB setup (currently commented out)
```

### Key Architectural Patterns

**1. RAG Pipeline (infrastructure/adapters/rag.adapter.ts)**
- Receives user question → generates embedding → searches Pinecone → retrieves relevant documents → augments LLM prompt with context → returns grounded response
- Supports metadata filtering (areas, categories, sources, tags)
- Implements semantic search with configurable topK
- Provides detailed logging with execution IDs for debugging

**2. Document Processing Pipeline (infrastructure/adapters/upload.adapter.ts)**
- Accepts PDF uploads → extracts text → chunks content → generates embeddings → upserts to Pinecone → stores metadata in Supabase
- Supports metadata tagging (areas, categories, sources, tags)
- Stores PDFs in Supabase Storage with signed URLs

**3. Dependency Injection**
- Each presentation layer module (auth, chats, documents) has a `dependencies.ts` file
- Dependencies are instantiated at module level and injected into controllers
- Enables loose coupling and easier testing

## Environment Configuration

**Critical**: All external services require valid API keys. The application validates environment variables at startup using `env-var` library.

### Required Variables
```bash
# OpenAI (mandatory)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo              # Default model for responses
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Must match Pinecone dimensions (1536)

# Pinecone (mandatory)
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=leximind            # Must exist before deployment
PINECONE_NAMESPACE=mimir                # Namespace within the index
PINECONE_ENVIRONMENT=us-east-1          # AWS region

# Supabase (mandatory)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGci...                # Service role key recommended

# Server
PORT=3000
HOST=localhost                          # Used for logging only

# MongoDB (optional - currently disabled)
MONGO_URL=mongodb://...
MONGO_DB_NAME=leximind
```

**Note**: `src/config/envs.ts` logs warnings for missing variables but doesn't crash. Ensure all mandatory variables are set to avoid runtime errors.

## API Endpoints

### Base URL: `/api/v1`

**Chat/RAG Endpoints** (`/api/v1/chats`)
- `POST /process-message` - Main RAG endpoint (with metadata filters)
- `GET /health` - Health check for OpenAI + Pinecone services
- `GET /diagnostics` - Detailed Pinecone diagnostics
- `POST /` - Legacy endpoint (maintained for compatibility)

**Document Endpoints** (`/api/v1/documents`)
- `POST /upload` - Upload PDF with metadata (multipart/form-data)
  - Required: `file` (PDF), `documentId` (UUID)
  - Optional: `userId`, `area[]`, `category[]`, `source[]`, `tags[]`, `savepdf` (boolean)

**Auth Endpoints** (`/api/auth`)
- Authentication routes (refer to `src/presentation/auth/routes.ts`)

### CORS Configuration
Allowed origins are hardcoded in `src/presentation/server.ts`:
- `http://localhost:8080` (Vite dev server)
- `http://localhost:3000` (Express server)
- `https://leximind.up.railway.app` (production frontend)

**Action required**: Update `allowedOrigins` array when deploying to new environments.

## Working with RAG

### Understanding the RAG Flow

1. **User submits question** → `ChatsController.processMessage`
2. **Generate embedding** → `OpenAIService.generateEmbedding` (text-embedding-3-small)
3. **Search vectors** → `PineconeService.searchSimilarDocuments` with filters
4. **Retrieve context** → Top-K documents with metadata (source, page, text)
5. **Augment prompt** → Inject context: "Documento/Source [name] (Página/Page [N]): [text]"
6. **Generate answer** → `OpenAIService.generateChatCompletion` (GPT-3.5-turbo)
7. **Return response** → JSON with `answer`, `sources[]`, `contextoUsado`

### Metadata Filtering

The system supports filtering by:
- **areas**: Banking functional areas (e.g., "Compliance", "PLD", "Legal")
- **categories**: Document types (e.g., "Technical", "Policy", "Regulation")
- **sources**: Origin documents (e.g., "Internal_Manual", "External_Law")
- **tags**: Free-form labels (e.g., "Efisys", "KYC", "AML")

Filters are combined with AND logic. Multiple values within the same filter use OR logic.

**Example Query**:
```json
{
  "userId": "uuid",
  "message": "¿Cuáles son los requisitos de PLD?",
  "area": ["Compliance", "PLD"],
  "category": ["Technical"],
  "source": ["Internal_Manual"],
  "tags": ["Efisys"]
}
```

### Adding New Metadata Categories

1. **Database**: Create new catalog table in Supabase (e.g., `document_types`)
2. **Domain**: Add interface to `src/domain/repositories/vector-database.repository.ts` (VectorSearchFilters)
3. **Infrastructure**: Update `PineconeService.buildMetadataFilters()` to include new filter
4. **Presentation**: Update controller DTOs to accept new filter parameters

## Working with Documents

### Document Upload Flow

1. **Frontend uploads PDF** → `POST /api/v1/documents/upload`
2. **Multer middleware** parses multipart/form-data
3. **UploadAdapter** orchestrates:
   - PDF parsing (pdfjs-dist)
   - Text chunking (default: 1000 chars with 200 char overlap)
   - Embedding generation per chunk
   - Pinecone upsert with metadata
   - Supabase Storage upload (if `savepdf=true`)
   - Metadata storage in PostgreSQL
4. **Response** includes `documentId`, `chunksProcessed`, `namespace`

### Modifying Chunking Strategy

Edit `infrastructure/adapters/upload.adapter.ts`:
- Current: Simple character-based splitting
- Considerations: Paragraph boundaries, semantic coherence, token limits

### Document Metadata Schema

**Supabase Tables**:
- `documents`: Core document records (id, original_name, alias, storage_path, signed_url, user_id)
- `document_areas`: Many-to-many join table
- `document_categories`: Many-to-many join table
- `document_sources`: Many-to-many join table
- `document_tags`: Many-to-many join table

**Pinecone Metadata** (stored per vector):
```json
{
  "documentId": "uuid",
  "source": "filename.pdf",
  "page": "42",
  "text": "original chunk text",
  "area": ["Compliance"],
  "category": ["Technical"],
  "tags": ["KYC"]
}
```

## Database Connections

### Supabase (Active)
- Client initialized in `infrastructure/services/supabase.service.ts`
- Used for metadata, conversations, messages, expert opinions
- Row Level Security (RLS) policies must be configured in Supabase dashboard
- Storage buckets: `documents` (private), `public-assets` (public)

### MongoDB (Inactive)
- Connection code exists in `src/data/mongodb/` but is commented out in `app.ts`
- Models defined but unused
- **Action if needed**: Uncomment lines 16-20 in `src/app.ts` and ensure `MONGO_URL` is set

## Logging and Debugging

- **Verbose logging**: All services include detailed console.log statements
- **Execution IDs**: RAG operations use timestamped IDs like `[14:32:45.123]` for tracing
- **Diagnostic endpoints**: `/api/v1/chats/diagnostics` provides Pinecone index stats
- **Health checks**: `/api/v1/chats/health` pings OpenAI and Pinecone

### Common Debugging Scenarios

**"No documents found" responses**:
1. Check Pinecone index stats (`/diagnostics`)
2. Verify namespace matches `PINECONE_NAMESPACE` env var
3. Test embedding generation directly
4. Review metadata filters (overly restrictive filters return no results)

**Slow responses (>10s)**:
1. Check OpenAI API latency (embedding + completion)
2. Reduce `topK` parameter (default: 10)
3. Optimize context size (fewer chunks = faster)

**CORS errors**:
1. Verify origin in `src/presentation/server.ts` allowedOrigins array
2. Check browser console for exact blocked origin
3. Ensure credentials flag is enabled for authenticated requests

## Deployment

### Current Deployment: Railway
- Backend is deployed to Railway (inferred from git commits)
- Environment variables must be set in Railway dashboard
- Build command: `npm run build`
- Start command: `npm start`

**Critical**: Ensure the following are configured:
1. All environment variables (OPENAI_API_KEY, PINECONE_API_KEY, SUPABASE_URL, SUPABASE_KEY)
2. Pinecone index `leximind` with namespace `mimir` must exist
3. Supabase project must have required tables and storage buckets
4. Update CORS origins in `server.ts` to include production frontend URL

### Startup Tasks
- Located in `src/presentation/startup/startup-tasks.ts`
- Automatically executed on server start
- Used for cache warming, Supabase connection validation, etc.

## Code Conventions

### TypeScript
- Use **ES Modules** syntax (`import/export`, `.js` extensions in imports)
- Enable all strict checks (`strict: true` in tsconfig.json)
- Prefer interfaces over types for contracts
- Use `async/await` over callbacks/promises chains

### File Naming
- Services: `*.service.ts` (e.g., `openai.service.ts`)
- Adapters: `*.adapter.ts` (e.g., `rag.adapter.ts`)
- Controllers: `controller.ts` within feature folders
- Routes: `routes.ts` within feature folders
- Dependencies: `dependencies.ts` (DI container pattern)

### Error Handling
- Services throw descriptive errors: `throw new Error('Detailed message')`
- Controllers catch errors and return appropriate HTTP status codes
- Domain layer defines custom errors in `src/domain/errors/`

### Dependency Flow
```
Presentation (controllers)
    ↓ depends on
Infrastructure (adapters, services)
    ↓ depends on
Domain (entities, interfaces)
```

**Critical Rule**: Domain layer NEVER imports from infrastructure or presentation layers.

## External Services

### OpenAI
- **Models used**:
  - `text-embedding-3-small` (1536 dimensions) - Must match Pinecone index
  - `gpt-3.5-turbo` (chat completions) - Can be upgraded to GPT-4 by changing env var
- **Rate limits**: Be aware of OpenAI rate limits (embeddings: 3000 RPM, completions: 10000 RPM for tier 1)
- **Costs**: Monitor token usage in responses (`response.usage.total_tokens`)

### Pinecone
- **Index configuration**:
  - Name: `leximind`
  - Metric: cosine
  - Dimensions: 1536 (must match embedding model)
  - Type: Dense
  - Mode: Serverless (AWS us-east-1)
- **Namespaces**: Use `mimir` for main documents, separate namespaces for expert opinions (future)
- **Metadata filtering**: Pinecone supports complex filters (AND, OR, $in, $eq)

### Supabase
- **PostgreSQL**: Stores structured metadata and relational data
- **Storage**: S3-compatible object storage for PDFs
- **Auth**: JWT-based authentication (not fully implemented in backend)
- **RLS**: Row Level Security policies control data access at database level

## Future Enhancements (In Progress)

### Expert Opinion System
- Table `expert_opinions` links expert feedback to LLM responses
- Users with role "expert" can annotate answers
- Future: RAG will query both document namespace and expert-opinions namespace

### Conversation History
- Tables `conversations` and `messages` store chat history
- Not yet integrated with main RAG flow
- Action: Connect `ChatsController.processMessage` to save queries/responses

## Common Tasks

### Adding a New RAG Endpoint
1. Create use case interface in `src/domain/use-cases/`
2. Implement in `src/infrastructure/use-cases/`
3. Add controller method in `src/presentation/chats/controller.ts`
4. Register route in `src/presentation/chats/routes.ts`
5. Update dependencies in `src/presentation/chats/dependencies.ts`

### Changing the LLM Model
1. Update `OPENAI_MODEL` environment variable
2. Test token limits (GPT-4 has different context windows)
3. Monitor cost increase (GPT-4 is ~20x more expensive than GPT-3.5-turbo)

### Integrating a New Vector Database
1. Create new service implementing `VectorDatabaseRepository` interface
2. Update `src/presentation/chats/dependencies.ts` to use new service
3. Migrate existing vectors from Pinecone (write migration script)

### Adding Document Format Support (Word, Excel)
1. Add parser library (e.g., `mammoth` for .docx, `xlsx` for .xlsx)
2. Update `UploadAdapter` to detect file type and route to appropriate parser
3. Update multer configuration to accept new MIME types
4. Test chunking strategy with new formats

## Troubleshooting

### "Cannot find module" errors
- Ensure `.js` extension is used in imports (ES Modules requirement)
- Check `tsconfig.json` has `"module": "nodenext"`

### Embedding dimension mismatch
- Verify `OPENAI_EMBEDDING_MODEL` is `text-embedding-3-small` (1536 dimensions)
- Check Pinecone index dimension matches (1536)

### Supabase connection errors
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Check network connectivity (Railway → Supabase)
- Ensure Supabase project is not paused (free tier)

### TypeScript compilation errors after npm install
- Delete `node_modules` and `dist` folders
- Run `npm install` again
- Run `npm run build` to verify
