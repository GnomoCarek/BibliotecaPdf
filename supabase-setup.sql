-- ==============================================================================
-- Script de Configuração da Biblioteca no Supabase
-- Copie e cole este código no "SQL Editor" do seu painel Supabase e clique em RUN.
-- ==============================================================================

-- 1. Criação da tabela de Livros (books)
CREATE TABLE IF NOT EXISTS public.books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT DEFAULT 'Autor desconhecido',
    category TEXT DEFAULT 'Geral',
    description TEXT DEFAULT '',
    total_pages INTEGER DEFAULT 0,
    current_page INTEGER DEFAULT 0,
    rating INTEGER DEFAULT 0,
    status TEXT DEFAULT 'unread', -- 'unread', 'reading', 'completed'
    is_favorite BOOLEAN DEFAULT FALSE,
    file_name TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    storage_path TEXT,
    cover_data TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar segurança em nível de linha (RLS)
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir leitura, inserção, atualização e exclusão públicas (anônimas)
DROP POLICY IF EXISTS "Permitir leitura pública de livros" ON public.books;
CREATE POLICY "Permitir leitura pública de livros"
ON public.books FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir inserção de livros" ON public.books;
CREATE POLICY "Permitir inserção de livros"
ON public.books FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização de livros" ON public.books;
CREATE POLICY "Permitir atualização de livros"
ON public.books FOR UPDATE
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir exclusão de livros" ON public.books;
CREATE POLICY "Permitir exclusão de livros"
ON public.books FOR DELETE
TO anon, authenticated
USING (true);

-- 3. Criação do Bucket de Armazenamento para os arquivos PDF
INSERT INTO storage.buckets (id, name, public)
VALUES ('books', 'books', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao Bucket 'books' do Storage
DROP POLICY IF EXISTS "Acesso público aos PDFs" ON storage.objects;
CREATE POLICY "Acesso público aos PDFs"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'books');

DROP POLICY IF EXISTS "Upload público de PDFs" ON storage.objects;
CREATE POLICY "Upload público de PDFs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'books');

DROP POLICY IF EXISTS "Atualização pública de PDFs" ON storage.objects;
CREATE POLICY "Atualização pública de PDFs"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'books');

DROP POLICY IF EXISTS "Exclusão pública de PDFs" ON storage.objects;
CREATE POLICY "Exclusão pública de PDFs"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'books');

-- Pronto! Sua nuvem está pronta para receber livros e PDFs.
