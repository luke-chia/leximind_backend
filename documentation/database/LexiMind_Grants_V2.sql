-- ==============================================
-- File: LexiMind_Grants_V2.sql
-- Description: Grants and RLS Policies for LexiMind (Supabase + Postgres)
-- ==============================================

-- ==============================================
-- Enable RLS on all tables
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
-- GRANTS
-- ==============================================

-- Catalog tables (read + insert only)
GRANT SELECT, INSERT ON areas TO authenticated;
GRANT SELECT, INSERT ON categories TO authenticated;
GRANT SELECT, INSERT ON sources TO authenticated;
GRANT SELECT, INSERT ON tags TO authenticated;

-- Metadata tables (full privileges, filtered by RLS policies)
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_areas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_tags TO authenticated;

-- ==============================================
-- POLICIES FOR CATALOGS
-- ==============================================

-- areas
CREATE POLICY "Allow authenticated to read areas"
ON areas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated to insert areas"
ON areas FOR INSERT TO authenticated WITH CHECK (true);

-- categories
CREATE POLICY "Allow authenticated to read categories"
ON categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated to insert categories"
ON categories FOR INSERT TO authenticated WITH CHECK (true);

-- sources
CREATE POLICY "Allow authenticated to read sources"
ON sources FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated to insert sources"
ON sources FOR INSERT TO authenticated WITH CHECK (true);

-- tags
CREATE POLICY "Allow authenticated to read tags"
ON tags FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated to insert tags"
ON tags FOR INSERT TO authenticated WITH CHECK (true);

-- ==============================================
-- POLICIES FOR DOCUMENTS
-- ==============================================

-- SELECT: any authenticated user can read all
CREATE POLICY "Allow authenticated to read documents"
ON documents FOR SELECT TO authenticated USING (true);

-- INSERT: must insert with their own user_id
CREATE POLICY "Users can insert their own documents"
ON documents FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: only owner can update
CREATE POLICY "Users can update their own documents"
ON documents FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: only owner can delete
CREATE POLICY "Users can delete their own documents"
ON documents FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ==============================================
-- POLICIES FOR RELATION TABLES
-- ==============================================

-- document_areas
CREATE POLICY "Allow authenticated to read document_areas"
ON document_areas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own document_areas"
ON document_areas FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_areas.document_id AND d.user_id = auth.uid())
);

CREATE POLICY "Users can update their own document_areas"
ON document_areas FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_areas.document_id AND d.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_areas.document_id AND d.user_id = auth.uid())
);

CREATE POLICY "Users can delete their own document_areas"
ON document_areas FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_areas.document_id AND d.user_id = auth.uid())
);

-- document_categories
CREATE POLICY "Allow authenticated to read document_categories"
ON document_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own document_categories"
ON document_categories FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_categories.document_id AND d.user_id = auth.uid())
);

CREATE POLICY "Users can update their own document_categories"
ON document_categories FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_categories.document_id AND d.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_categories.document_id AND d.user_id = auth.uid())
);

CREATE POLICY "Users can delete their own document_categories"
ON document_categories FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_categories.document_id AND d.user_id = auth.uid())
);

-- document_sources
CREATE POLICY "Allow authenticated to read document_sources"
ON document_sources FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own document_sources"
ON document_sources FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_sources.document_id AND d.user_id = auth.uid())
);

CREATE POLICY "Users can update their own document_sources"
ON document_sources FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_sources.document_id AND d.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_sources.document_id AND d.user_id = auth.uid())
);

CREATE POLICY "Users can delete their own document_sources"
ON document_sources FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_sources.document_id AND d.user_id = auth.uid())
);

-- document_tags
CREATE POLICY "Allow authenticated to read document_tags"
ON document_tags FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own document_tags"
ON document_tags FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_tags.document_id AND d.user_id = auth.uid())
);

CREATE POLICY "Users can update their own document_tags"
ON document_tags FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_tags.document_id AND d.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_tags.document_id AND d.user_id = auth.uid())
);

CREATE POLICY "Users can delete their own document_tags"
ON document_tags FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_tags.document_id AND d.user_id = auth.uid())
);
