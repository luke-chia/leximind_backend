-- ==============================================
-- File: GrantsLexi.sql
-- Description: Grants and RLS Policies for LexiMind (Supabase + Postgres)
-- ==============================================

-- ==============================================
-- Enable RLS on all metadata tables
-- ==============================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- READ POLICIES (SELECT): Any authenticated user can read everything
-- ==============================================
CREATE POLICY "Allow authenticated to read documents"
ON documents
FOR SELECT
TO authenticated
USING ( true );

CREATE POLICY "Allow authenticated to read areas"
ON areas
FOR SELECT
TO authenticated
USING ( true );

CREATE POLICY "Allow authenticated to read categories"
ON categories
FOR SELECT
TO authenticated
USING ( true );

CREATE POLICY "Allow authenticated to read sources"
ON sources
FOR SELECT
TO authenticated
USING ( true );

CREATE POLICY "Allow authenticated to read tags"
ON tags
FOR SELECT
TO authenticated
USING ( true );

CREATE POLICY "Allow authenticated to read document_areas"
ON document_areas
FOR SELECT
TO authenticated
USING ( true );

CREATE POLICY "Allow authenticated to read document_categories"
ON document_categories
FOR SELECT
TO authenticated
USING ( true );

CREATE POLICY "Allow authenticated to read document_sources"
ON document_sources
FOR SELECT
TO authenticated
USING ( true );

CREATE POLICY "Allow authenticated to read document_tags"
ON document_tags
FOR SELECT
TO authenticated
USING ( true );

-- ==============================================
-- WRITE POLICIES FOR DOCUMENTS
-- ==============================================

-- INSERT: user_id must match auth.uid()
CREATE POLICY "Users can insert their own documents"
ON documents
FOR INSERT
TO authenticated
WITH CHECK ( user_id = auth.uid() );

-- UPDATE: only owner can update
CREATE POLICY "Users can update their own documents"
ON documents
FOR UPDATE
TO authenticated
USING ( user_id = auth.uid() )
WITH CHECK ( user_id = auth.uid() );

-- DELETE: only owner can delete
CREATE POLICY "Users can delete their own documents"
ON documents
FOR DELETE
TO authenticated
USING ( user_id = auth.uid() );

-- ==============================================
-- WRITE POLICIES FOR RELATION TABLES
-- ==============================================

-- document_areas
CREATE POLICY "Users can insert their own document_areas"
ON document_areas
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_areas.document_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own document_areas"
ON document_areas
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_areas.document_id
    AND d.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_areas.document_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own document_areas"
ON document_areas
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_areas.document_id
    AND d.user_id = auth.uid()
  )
);

-- document_categories
CREATE POLICY "Users can insert their own document_categories"
ON document_categories
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_categories.document_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own document_categories"
ON document_categories
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_categories.document_id
    AND d.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_categories.document_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own document_categories"
ON document_categories
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_categories.document_id
    AND d.user_id = auth.uid()
  )
);

-- document_sources
CREATE POLICY "Users can insert their own document_sources"
ON document_sources
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_sources.document_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own document_sources"
ON document_sources
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_sources.document_id
    AND d.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_sources.document_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own document_sources"
ON document_sources
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_sources.document_id
    AND d.user_id = auth.uid()
  )
);

-- document_tags
CREATE POLICY "Users can insert their own document_tags"
ON document_tags
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_tags.document_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own document_tags"
ON document_tags
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_tags.document_id
    AND d.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_tags.document_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own document_tags"
ON document_tags
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_tags.document_id
    AND d.user_id = auth.uid()
  )
);
