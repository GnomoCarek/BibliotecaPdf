/**
 * cloud.js - Sincronização em Nuvem via Supabase
 * Permite que a biblioteca seja acessada e sincronizada em qualquer lugar do mundo (celular, tablet, PC).
 */

class CloudSync {
  constructor() {
    this.storageKey = 'biblio_cloud_settings';
    this.client = null;
    this.config = this.loadConfig();
    if (this.isConfigured()) {
      this.initClient();
    }
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : { url: '', anonKey: '', enabled: false };
    } catch (e) {
      return { url: '', anonKey: '', enabled: false };
    }
  }

  saveConfig(url, anonKey, enabled = true) {
    this.config = {
      url: (url || '').trim(),
      anonKey: (anonKey || '').trim(),
      enabled: Boolean(enabled)
    };
    localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    if (this.isConfigured()) {
      this.initClient();
    } else {
      this.client = null;
    }
  }

  disconnect() {
    this.config = { url: '', anonKey: '', enabled: false };
    localStorage.removeItem(this.storageKey);
    this.client = null;
  }

  isConfigured() {
    return Boolean(this.config.enabled && this.config.url && this.config.anonKey);
  }

  initClient() {
    if (window.supabase && this.config.url && this.config.anonKey) {
      try {
        this.client = window.supabase.createClient(this.config.url, this.config.anonKey);
        return true;
      } catch (err) {
        console.error('Erro ao inicializar Supabase:', err);
        this.client = null;
        return false;
      }
    }
    return false;
  }

  /**
   * Testa a conexão com o Supabase
   */
  async testConnection(url, anonKey) {
    if (!window.supabase) {
      throw new Error('Biblioteca Supabase JS não carregada no navegador.');
    }
    const testUrl = (url || this.config.url).trim();
    const testKey = (anonKey || this.config.anonKey).trim();

    if (!testUrl || !testKey) {
      throw new Error('Informe a URL e a Chave Pública (Anon Key) do Supabase.');
    }

    const tempClient = window.supabase.createClient(testUrl, testKey);
    // Testa consulta à tabela books
    const { data, error } = await tempClient.from('books').select('id').limit(1);
    if (error) {
      throw new Error(`Erro na conexão: ${error.message}. Verifique as permissões ou se executou o script SQL.`);
    }

    // Testa acesso ao bucket de storage
    const { data: buckets, error: bError } = await tempClient.storage.getBucket('books');
    if (bError && bError.message && !bError.message.includes('not found')) {
      console.warn('Aviso de storage:', bError.message);
    }

    return true;
  }

  /**
   * Faz upload de um livro e seu arquivo PDF para a nuvem
   */
  async uploadBook(book, fileBlob) {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Nuvem não configurada.');
    }

    const bookId = book.id || 'book_' + Date.now();
    let storagePath = null;

    // Se temos o arquivo PDF, faz upload para o Storage Supabase
    if (fileBlob) {
      const sanitizedName = (book.fileName || 'livro.pdf').replace(/[^a-zA-Z0-9.\-_]/g, '_');
      storagePath = `${bookId}/${sanitizedName}`;

      const { data: uploadData, error: uploadError } = await this.client.storage
        .from('books')
        .upload(storagePath, fileBlob, {
          contentType: book.fileType || 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error('Erro no upload do arquivo PDF:', uploadError);
        throw new Error('Erro ao enviar PDF para a nuvem: ' + uploadError.message);
      }
    }

    // Prepara payload para a tabela 'books'
    const payload = {
      id: bookId,
      title: book.title || 'Sem título',
      author: book.author || 'Autor desconhecido',
      category: book.category || 'Geral',
      description: book.description || '',
      total_pages: Number(book.totalPages) || 0,
      current_page: Number(book.currentPage) || 0,
      rating: Number(book.rating) || 0,
      status: book.status || 'unread',
      is_favorite: Boolean(book.isFavorite),
      file_name: book.fileName || 'livro.pdf',
      file_size: Number(book.fileSize) || (fileBlob ? fileBlob.size : 0),
      storage_path: storagePath || book.storagePath || null,
      cover_data: book.coverData || null,
      created_at: book.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await this.client
      .from('books')
      .upsert(payload)
      .select();

    if (insertError) {
      console.error('Erro ao salvar registro no banco:', insertError);
      throw new Error('Erro ao salvar livro na nuvem: ' + insertError.message);
    }

    return {
      ...book,
      id: bookId,
      storagePath: storagePath
    };
  }

  /**
   * Busca todos os livros salvos na nuvem
   */
  async fetchCloudBooks() {
    if (!this.isConfigured() || !this.client) return [];

    const { data, error } = await this.client
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar livros da nuvem:', error);
      throw new Error('Falha ao sincronizar com a nuvem: ' + error.message);
    }

    // Mapeia do formato da tabela Supabase para o formato local
    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      author: row.author,
      category: row.category,
      description: row.description,
      totalPages: row.total_pages,
      currentPage: row.current_page,
      rating: row.rating,
      status: row.status,
      isFavorite: row.is_favorite,
      fileName: row.file_name,
      fileSize: row.file_size,
      storagePath: row.storage_path,
      coverData: row.cover_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isCloud: true
    }));
  }

  /**
   * Baixa o arquivo PDF da nuvem
   */
  async downloadBookBlob(storagePath) {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Nuvem não configurada.');
    }
    if (!storagePath) {
      throw new Error('Caminho do arquivo na nuvem não encontrado.');
    }

    const { data, error } = await this.client.storage
      .from('books')
      .download(storagePath);

    if (error) {
      console.error('Erro ao baixar PDF da nuvem:', error);
      throw new Error('Erro ao baixar arquivo da nuvem: ' + error.message);
    }

    return data; // Retorna Blob
  }

  /**
   * Obtém URL pública ou assinada do PDF na nuvem
   */
  getPublicUrl(storagePath) {
    if (!this.client || !storagePath) return null;
    const { data } = this.client.storage.from('books').getPublicUrl(storagePath);
    return data ? data.publicUrl : null;
  }

  /**
   * Atualiza metadados do livro na nuvem (progresso, favorito, rating, status)
   */
  async updateCloudBook(id, updates) {
    if (!this.isConfigured() || !this.client) return;

    const payload = {
      updated_at: new Date().toISOString()
    };
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.author !== undefined) payload.author = updates.author;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.totalPages !== undefined) payload.total_pages = Number(updates.totalPages);
    if (updates.currentPage !== undefined) payload.current_page = Number(updates.currentPage);
    if (updates.rating !== undefined) payload.rating = Number(updates.rating);
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.isFavorite !== undefined) payload.is_favorite = Boolean(updates.isFavorite);

    const { error } = await this.client
      .from('books')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.warn('Erro ao atualizar na nuvem:', error);
    }
  }

  /**
   * Exclui o livro do banco e do storage na nuvem
   */
  async deleteCloudBook(id, storagePath) {
    if (!this.isConfigured() || !this.client) return;

    if (storagePath) {
      try {
        await this.client.storage.from('books').remove([storagePath]);
      } catch (err) {
        console.warn('Erro ao remover arquivo do storage:', err);
      }
    }

    const { error } = await this.client.from('books').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir livro da nuvem:', error);
      throw error;
    }
  }
}

window.cloudSync = new CloudSync();
