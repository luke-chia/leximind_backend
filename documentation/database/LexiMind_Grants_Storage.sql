-- ==============================================
-- File: LexiMind_Grants_Storage.sql
-- Description: Grants and RLS Policies for Supabase Storage Buckets (LexiMind)
-- ==============================================

-- ==============================================
-- BUCKET: documents (private)
-- ==============================================

-- Ensure bucket exists (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;

-- POLICIES for documents bucket

-- Read: any authenticated user can read documents
CREATE POLICY "Authenticated users can read documents"
ON storage.objects
FOR SELECT
TO authenticated
USING ( bucket_id = 'documents' );

-- Insert: any authenticated user can upload documents
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'documents' );

-- Update: only owner can update their own documents
CREATE POLICY "Users can update own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING ( bucket_id = 'documents' AND owner = auth.uid() )
WITH CHECK ( bucket_id = 'documents' AND owner = auth.uid() );

-- Delete: only owner can delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING ( bucket_id = 'documents' AND owner = auth.uid() );

-- ==============================================
-- BUCKET: public-assets (public)
-- ==============================================

-- Ensure bucket exists (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public bucket does not require restrictive RLS policies, but can still use defaults
