/**
 * db.js - Gerenciador de Armazenamento Local IndexedDB para a Biblioteca
 * Permite armazenar livros, metadados e arquivos PDF completos no navegador.
 */

class BookDatabase {
  constructor() {
    this.dbName = 'BibliotecaPdfDB';
    this.dbVersion = 1;
    this.db = null;
  }

  /**
   * Inicializa o banco de dados IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('books')) {
          const store = db.createObjectStore('books', { keyPath: 'id' });
          store.createIndex('title', 'title', { unique: false });
          store.createIndex('author', 'author', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('isFavorite', 'isFavorite', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('Erro ao abrir IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Obtém todos os livros armazenados localmente
   */
  async getAllBooks() {
    await this._ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['books'], 'readonly');
      const store = transaction.objectStore('books');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Obtém um livro por ID
   */
  async getBook(id) {
    await this._ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['books'], 'readonly');
      const store = transaction.objectStore('books');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Adiciona um novo livro ao IndexedDB
   */
  async addBook(book) {
    await this._ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['books'], 'readwrite');
      const store = transaction.objectStore('books');

      const bookToSave = {
        id: book.id || 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        title: book.title || 'Sem título',
        author: book.author || 'Autor desconhecido',
        category: book.category || 'Geral',
        description: book.description || '',
        totalPages: Number(book.totalPages) || 0,
        currentPage: Number(book.currentPage) || 0,
        rating: Number(book.rating) || 0,
        status: book.status || 'unread', // 'unread', 'reading', 'completed'
        isFavorite: Boolean(book.isFavorite),
        fileName: book.fileName || 'livro.pdf',
        fileSize: book.fileSize || 0,
        fileType: book.fileType || 'application/pdf',
        fileBlob: book.fileBlob || null, // Blob do PDF
        coverData: book.coverData || null, // Base64 da capa
        cloudId: book.cloudId || null,
        cloudUrl: book.cloudUrl || null,
        createdAt: book.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const request = store.put(bookToSave);

      request.onsuccess = () => resolve(bookToSave);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Atualiza os dados de um livro existente
   */
  async updateBook(id, updates) {
    await this._ensureDb();
    const existing = await this.getBook(id);
    if (!existing) {
      throw new Error('Livro não encontrado: ' + id);
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['books'], 'readwrite');
      const store = transaction.objectStore('books');
      const request = store.put(updated);

      request.onsuccess = () => resolve(updated);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Exclui um livro pelo ID
   */
  async deleteBook(id) {
    await this._ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['books'], 'readwrite');
      const store = transaction.objectStore('books');
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Remove todos os livros (Limpar biblioteca)
   */
  async clearAll() {
    await this._ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['books'], 'readwrite');
      const store = transaction.objectStore('books');
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Calcula o espaço em disco utilizado pelo navegador
   */
  async getStorageUsage() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        usageFormatted: this.formatBytes(estimate.usage || 0),
        quotaFormatted: this.formatBytes(estimate.quota || 0),
        percent: estimate.quota ? Math.round(((estimate.usage || 0) / estimate.quota) * 100) : 0
      };
    }
    return { usage: 0, quota: 0, usageFormatted: 'N/A', quotaFormatted: 'N/A', percent: 0 };
  }

  /**
   * Utilitário para formatar bytes em KB, MB, GB
   */
  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async _ensureDb() {
    if (!this.db) {
      await this.init();
    }
  }
}

// Exporta instância única
window.bookDb = new BookDatabase();
