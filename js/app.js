/**
 * app.js - Controlador Principal da Biblioteca Digital
 * Gerencia a interface, upload, leitura, downloads e sincronização.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Estado da Aplicação
  const state = {
    books: [],
    currentFilter: 'all',
    currentCategory: 'all',
    searchQuery: '',
    currentSort: 'recent',
    viewMode: 'grid', // 'grid' ou 'list'
    activeReaderBook: null,
    currentPendingFile: null,
    currentPendingCover: null,
    activeBlobUrl: null
  };

  // Elementos do DOM
  const elements = {
    // Estatísticas
    statTotalBooks: document.getElementById('statTotalBooks'),
    statReading: document.getElementById('statReading'),
    statCompleted: document.getElementById('statCompleted'),
    statStorage: document.getElementById('statStorage'),
    badgeAll: document.getElementById('badgeAll'),
    badgeReading: document.getElementById('badgeReading'),
    badgeCompleted: document.getElementById('badgeCompleted'),
    badgeFavorites: document.getElementById('badgeFavorites'),
    badgeUnread: document.getElementById('badgeUnread'),

    // Filtros e Navegação
    searchInput: document.getElementById('searchInput'),
    statusTabs: document.querySelectorAll('.tab-btn'),
    categoriesList: document.getElementById('categoriesList'),
    sortSelect: document.getElementById('sortSelect'),
    btnViewGrid: document.getElementById('btnViewGrid'),
    btnViewList: document.getElementById('btnViewList'),
    booksContainer: document.getElementById('booksContainer'),

    // Botões de Topo
    btnOpenCloud: document.getElementById('btnOpenCloud'),
    cloudStatusDot: document.getElementById('cloudStatusDot'),
    btnOpenStats: document.getElementById('btnOpenStats'),
    btnToggleTheme: document.getElementById('btnToggleTheme'),
    btnOpenAddModal: document.getElementById('btnOpenAddModal'),

    // Modal Adicionar
    modalAddBook: document.getElementById('modalAddBook'),
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('fileInput'),
    addBookForm: document.getElementById('addBookForm'),
    coverPreview: document.getElementById('coverPreview'),
    coverPlaceholder: document.getElementById('coverPlaceholder'),
    customCoverInput: document.getElementById('customCoverInput'),
    bookTitle: document.getElementById('bookTitle'),
    bookAuthor: document.getElementById('bookAuthor'),
    bookCategory: document.getElementById('bookCategory'),
    bookStatus: document.getElementById('bookStatus'),
    bookCurrentPage: document.getElementById('bookCurrentPage'),
    bookTotalPages: document.getElementById('bookTotalPages'),
    bookDescription: document.getElementById('bookDescription'),
    storageDestGroup: document.getElementById('storageDestGroup'),
    storageDestination: document.getElementById('storageDestination'),
    btnSaveBook: document.getElementById('btnSaveBook'),

    // Modal Leitor
    modalReader: document.getElementById('modalReader'),
    readerTitle: document.getElementById('readerTitle'),
    readerPageInput: document.getElementById('readerPageInput'),
    readerTotalPagesSpan: document.getElementById('readerTotalPagesSpan'),
    btnReaderDownload: document.getElementById('btnReaderDownload'),
    btnReaderFullscreen: document.getElementById('btnReaderFullscreen'),
    readerIframe: document.getElementById('readerIframe'),

    // Modal Nuvem
    modalCloud: document.getElementById('modalCloud'),
    cloudConfigForm: document.getElementById('cloudConfigForm'),
    supabaseUrl: document.getElementById('supabaseUrl'),
    supabaseAnonKey: document.getElementById('supabaseAnonKey'),
    btnCopySql: document.getElementById('btnCopySql'),
    cloudStatusMessage: document.getElementById('cloudStatusMessage'),
    btnDisconnectCloud: document.getElementById('btnDisconnectCloud'),
    btnSaveCloud: document.getElementById('btnSaveCloud'),

    // Modal Dados & Estatísticas
    modalStats: document.getElementById('modalStats'),
    storageEstimateText: document.getElementById('storageEstimateText'),
    btnExportBackup: document.getElementById('btnExportBackup'),
    btnTriggerImport: document.getElementById('btnTriggerImport'),
    importFileInput: document.getElementById('importFileInput'),
    btnClearAll: document.getElementById('btnClearAll'),

    // Toasts
    toastContainer: document.getElementById('toastContainer')
  };

  // =========================================================================
  // 1. Inicialização e Tema
  // =========================================================================
  async function init() {
    initTheme();
    setupEventListeners();

    // Inicializa Banco de Dados IndexedDB
    try {
      await window.bookDb.init();
    } catch (e) {
      showToast('Erro ao inicializar banco local: ' + e.message, 'error');
    }

    updateCloudIndicator();
    await loadBooks();
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('biblio_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('biblio_theme', next);
    showToast(`Tema ${next === 'dark' ? 'Escuro' : 'Claro'} ativado`, 'info');
  }

  // =========================================================================
  // 2. Carregamento de Livros (Local + Nuvem)
  // =========================================================================
  async function loadBooks() {
    try {
      const localBooks = await window.bookDb.getAllBooks();
      let combinedBooks = [...localBooks];

      // Se nuvem estiver ativa, sincroniza e busca livros remotos
      if (window.cloudSync && window.cloudSync.isConfigured()) {
        try {
          const cloudBooks = await window.cloudSync.fetchCloudBooks();
          // Mescla livros da nuvem que ainda não estão salvos localmente
          const localIds = new Set(localBooks.map((b) => b.id));
          for (const cBook of cloudBooks) {
            if (!localIds.has(cBook.id)) {
              combinedBooks.push(cBook);
            }
          }
        } catch (cloudErr) {
          console.warn('Erro ao carregar livros da nuvem:', cloudErr);
          showToast('Aviso: Não foi possível sincronizar com a nuvem no momento.', 'info');
        }
      }

      state.books = combinedBooks;
      updateCategoriesList();
      updateStats();
      renderBooks();
    } catch (err) {
      console.error('Erro ao carregar livros:', err);
      showToast('Erro ao carregar livros: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // 3. Atualização de Estatísticas e Categorias
  // =========================================================================
  async function updateStats() {
    const books = state.books;
    const total = books.length;
    const reading = books.filter((b) => b.status === 'reading').length;
    const completed = books.filter((b) => b.status === 'completed').length;
    const favorites = books.filter((b) => b.isFavorite).length;
    const unread = books.filter((b) => !b.status || b.status === 'unread').length;

    elements.statTotalBooks.textContent = total;
    elements.statReading.textContent = reading;
    elements.statCompleted.textContent = completed;

    elements.badgeAll.textContent = total;
    elements.badgeReading.textContent = reading;
    elements.badgeCompleted.textContent = completed;
    elements.badgeFavorites.textContent = favorites;
    elements.badgeUnread.textContent = unread;

    // Calcula uso de armazenamento
    const storage = await window.bookDb.getStorageUsage();
    elements.statStorage.textContent = storage.usageFormatted || '0 B';
    elements.storageEstimateText.textContent = `Utilizado: ${storage.usageFormatted} de ${storage.quotaFormatted} (${storage.percent}% do limite do navegador)`;
  }

  function updateCategoriesList() {
    const categories = new Set();
    state.books.forEach((b) => {
      if (b.category && b.category.trim()) {
        categories.add(b.category.trim());
      }
    });

    // Mantém o botão "Todas as Categorias"
    elements.categoriesList.innerHTML = `
      <button class="pill-btn ${state.currentCategory === 'all' ? 'active' : ''}" data-category="all">
        Todas as Categorias
      </button>
    `;

    categories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.className = `pill-btn ${state.currentCategory === cat ? 'active' : ''}`;
      btn.dataset.category = cat;
      btn.textContent = cat;
      elements.categoriesList.appendChild(btn);
    });
  }

  // =========================================================================
  // 4. Renderização dos Livros (Grade ou Lista)
  // =========================================================================
  function renderBooks() {
    let filtered = [...state.books];

    // Filtro de Status
    if (state.currentFilter === 'reading') {
      filtered = filtered.filter((b) => b.status === 'reading');
    } else if (state.currentFilter === 'completed') {
      filtered = filtered.filter((b) => b.status === 'completed');
    } else if (state.currentFilter === 'favorites') {
      filtered = filtered.filter((b) => b.isFavorite);
    } else if (state.currentFilter === 'unread') {
      filtered = filtered.filter((b) => !b.status || b.status === 'unread');
    }

    // Filtro de Categoria
    if (state.currentCategory !== 'all') {
      filtered = filtered.filter((b) => b.category === state.currentCategory);
    }

    // Busca textual
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      filtered = filtered.filter((b) =>
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (b.category && b.category.toLowerCase().includes(q)) ||
        (b.description && b.description.toLowerCase().includes(q))
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      if (state.currentSort === 'recent') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      } else if (state.currentSort === 'titleAsc') {
        return (a.title || '').localeCompare(b.title || '');
      } else if (state.currentSort === 'titleDesc') {
        return (b.title || '').localeCompare(a.title || '');
      } else if (state.currentSort === 'authorAsc') {
        return (a.author || '').localeCompare(b.author || '');
      } else if (state.currentSort === 'sizeDesc') {
        return (b.fileSize || 0) - (a.fileSize || 0);
      } else if (state.currentSort === 'pagesDesc') {
        return (b.totalPages || 0) - (a.totalPages || 0);
      }
      return 0;
    });

    elements.booksContainer.innerHTML = '';

    if (filtered.length === 0) {
      elements.booksContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📖</div>
          <h3>Nenhum livro encontrado</h3>
          <p>${state.searchQuery ? 'Tente buscar com outros termos.' : 'Sua biblioteca ainda está vazia. Adicione seu primeiro livro em PDF para começar!'}</p>
          <button class="btn btn-primary" onclick="document.getElementById('btnOpenAddModal').click()">
            ➕ Adicionar Livro Agora
          </button>
        </div>
      `;
      return;
    }

    elements.booksContainer.className = state.viewMode === 'grid' ? 'books-grid' : 'books-list';

    filtered.forEach((book) => {
      const card = createBookCard(book);
      elements.booksContainer.appendChild(card);
    });
  }

  function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.dataset.id = book.id;

    const totalPages = book.totalPages || 0;
    const currentPage = book.currentPage || 0;
    const percent = totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;
    const coverSrc = book.coverData || window.pdfHelper.generateFallbackCover(book.title);
    const isCloud = Boolean(book.isCloud || book.storagePath);

    card.innerHTML = `
      <div class="book-cover-container" title="Clique para ler">
        <img class="book-cover-img" src="${coverSrc}" alt="${escapeHtml(book.title)}" loading="lazy">
        <span class="badge-category">${escapeHtml(book.category || 'Geral')}</span>
        <button class="btn-favorite ${book.isFavorite ? 'active' : ''}" title="${book.isFavorite ? 'Remover dos favoritos' : 'Favoritar'}">
          ${book.isFavorite ? '❤️' : '🤍'}
        </button>
        ${isCloud ? '<span class="badge-cloud" title="Salvo na Nuvem">☁️ Nuvem</span>' : ''}
      </div>

      <div class="book-info">
        <div class="book-meta">
          <h3 class="book-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</h3>
          <div class="book-author" title="${escapeHtml(book.author || 'Autor desconhecido')}">
            ✍️ ${escapeHtml(book.author || 'Autor desconhecido')}
          </div>
        </div>

        <div class="progress-box">
          <div class="progress-header">
            <span>${currentPage} de ${totalPages} págs</span>
            <span>${percent}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percent}%;"></div>
          </div>
        </div>

        <div class="card-actions">
          <button class="card-btn card-btn-read" title="Abrir e ler este livro">
            📖 Ler
          </button>
          <button class="card-btn card-btn-download" title="Baixar arquivo PDF">
            ⬇️ Baixar
          </button>
          <button class="card-btn card-btn-more" title="Mais opções / Excluir">
            🗑️
          </button>
        </div>
      </div>
    `;

    // Eventos do Cartão
    const coverContainer = card.querySelector('.book-cover-container');
    const btnRead = card.querySelector('.card-btn-read');
    const btnDownload = card.querySelector('.card-btn-download');
    const btnFavorite = card.querySelector('.btn-favorite');
    const btnDelete = card.querySelector('.card-btn-more');

    coverContainer.addEventListener('click', (e) => {
      if (e.target.closest('.btn-favorite')) return;
      openReader(book);
    });

    btnRead.addEventListener('click', () => openReader(book));
    btnDownload.addEventListener('click', () => downloadBook(book));

    btnFavorite.addEventListener('click', async (e) => {
      e.stopPropagation();
      await toggleFavorite(book);
    });

    btnDelete.addEventListener('click', async (e) => {
      e.stopPropagation();
      await confirmDeleteBook(book);
    });

    return card;
  }

  // =========================================================================
  // 5. Adição de Novo Livro (Upload, Capa, Metadados)
  // =========================================================================
  function openAddModal() {
    resetAddForm();
    if (window.cloudSync && window.cloudSync.isConfigured()) {
      elements.storageDestGroup.style.display = 'block';
    } else {
      elements.storageDestGroup.style.display = 'none';
    }
    openModal(elements.modalAddBook);
  }

  function resetAddForm() {
    elements.addBookForm.reset();
    state.currentPendingFile = null;
    state.currentPendingCover = null;
    elements.coverPreview.src = '';
    elements.coverPreview.style.display = 'none';
    elements.coverPlaceholder.style.display = 'block';
    elements.coverPlaceholder.textContent = 'Capa gerada automaticamente';
    elements.btnSaveBook.disabled = false;
    elements.btnSaveBook.textContent = 'Salvar Livro';
  }

  async function handleFileSelected(file) {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Por favor, selecione um arquivo no formato PDF.', 'error');
      return;
    }

    state.currentPendingFile = file;
    elements.coverPlaceholder.textContent = 'Extraindo dados e capa do PDF...';

    try {
      // Extrai capa e metadados via pdfHelper
      const info = await window.pdfHelper.extractPdfInfo(file);

      // Preenche os campos do formulário automaticamente
      elements.bookTitle.value = info.title || window.pdfHelper.cleanFileName(file.name);
      if (info.author) elements.bookAuthor.value = info.author;
      if (info.totalPages) elements.bookTotalPages.value = info.totalPages;

      // Exibe a capa gerada
      if (info.coverData) {
        state.currentPendingCover = info.coverData;
        elements.coverPreview.src = info.coverData;
        elements.coverPreview.style.display = 'block';
        elements.coverPlaceholder.style.display = 'none';
      }

      showToast('PDF carregado com sucesso! Complete os detalhes se desejar.', 'success');
    } catch (err) {
      console.warn('Erro na extração do PDF:', err);
      elements.bookTitle.value = window.pdfHelper.cleanFileName(file.name);
      state.currentPendingCover = window.pdfHelper.generateFallbackCover(file.name);
      elements.coverPreview.src = state.currentPendingCover;
      elements.coverPreview.style.display = 'block';
      elements.coverPlaceholder.style.display = 'none';
    }
  }

  // Submissão do Formulário de Adicionar Livro
  elements.addBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!state.currentPendingFile) {
      showToast('Por favor, selecione ou arraste um arquivo PDF.', 'error');
      return;
    }

    const title = elements.bookTitle.value.trim();
    if (!title) {
      showToast('O título do livro é obrigatório.', 'error');
      return;
    }

    elements.btnSaveBook.disabled = true;
    elements.btnSaveBook.textContent = 'Processando...';

    try {
      const bookData = {
        id: 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        title: title,
        author: elements.bookAuthor.value.trim() || 'Autor desconhecido',
        category: elements.bookCategory.value.trim() || 'Geral',
        description: elements.bookDescription.value.trim(),
        totalPages: Number(elements.bookTotalPages.value) || 0,
        currentPage: Number(elements.bookCurrentPage.value) || 0,
        status: elements.bookStatus.value || 'unread',
        isFavorite: false,
        fileName: state.currentPendingFile.name,
        fileSize: state.currentPendingFile.size,
        fileType: state.currentPendingFile.type || 'application/pdf',
        fileBlob: state.currentPendingFile,
        coverData: state.currentPendingCover || window.pdfHelper.generateFallbackCover(title),
        createdAt: new Date().toISOString()
      };

      // Upload para Nuvem se configurado e selecionado
      const shouldUploadCloud = window.cloudSync && window.cloudSync.isConfigured() &&
        elements.storageDestination.value !== 'local';

      if (shouldUploadCloud) {
        elements.btnSaveBook.textContent = 'Enviando para a Nuvem...';
        try {
          const cloudResult = await window.cloudSync.uploadBook(bookData, state.currentPendingFile);
          bookData.cloudId = cloudResult.id;
          bookData.storagePath = cloudResult.storagePath;
          bookData.isCloud = true;
          showToast('Livro enviado com sucesso para a Nuvem Supabase!', 'success');
        } catch (cloudErr) {
          console.error('Falha no upload para nuvem:', cloudErr);
          showToast('Aviso: Falha no upload para a nuvem. Salvando localmente.', 'info');
        }
      }

      // Salva no IndexedDB local para acesso offline instantâneo
      elements.btnSaveBook.textContent = 'Salvando localmente...';
      await window.bookDb.addBook(bookData);

      showToast(`"${bookData.title}" adicionado à sua biblioteca!`, 'success');
      closeModal(elements.modalAddBook);
      await loadBooks();
    } catch (err) {
      console.error('Erro ao salvar livro:', err);
      showToast('Erro ao salvar: ' + err.message, 'error');
    } finally {
      elements.btnSaveBook.disabled = false;
      elements.btnSaveBook.textContent = 'Salvar Livro';
    }
  });

  // =========================================================================
  // 6. Leitor de PDF Integrado
  // =========================================================================
  async function openReader(book) {
    state.activeReaderBook = book;
    elements.readerTitle.textContent = '📖 ' + (book.title || 'Leitor');
    elements.readerPageInput.value = book.currentPage || 1;
    elements.readerTotalPagesSpan.textContent = '/ ' + (book.totalPages || '?');
    elements.readerIframe.src = 'about:blank';

    openModal(elements.modalReader);

    try {
      let fileBlob = book.fileBlob;

      // Se não temos o blob localmente mas o livro está na nuvem, baixa da nuvem
      if (!fileBlob && book.storagePath && window.cloudSync && window.cloudSync.isConfigured()) {
        showToast('Baixando PDF da nuvem para leitura...', 'info');
        fileBlob = await window.cloudSync.downloadBookBlob(book.storagePath);
        // Atualiza cópia local com o blob baixado para leituras futuras ficarem instantâneas
        await window.bookDb.updateBook(book.id, { fileBlob: fileBlob });
      }

      if (!fileBlob) {
        // Tenta obter do IndexedDB caso book seja uma versão simplificada
        const fullBook = await window.bookDb.getBook(book.id);
        if (fullBook && fullBook.fileBlob) {
          fileBlob = fullBook.fileBlob;
        }
      }

      if (fileBlob) {
        if (state.activeBlobUrl) {
          URL.revokeObjectURL(state.activeBlobUrl);
        }
        state.activeBlobUrl = URL.createObjectURL(fileBlob);
        const pageParam = book.currentPage ? `#page=${book.currentPage}` : '';
        elements.readerIframe.src = state.activeBlobUrl + pageParam;
      } else {
        throw new Error('Arquivo PDF não disponível localmente ou na nuvem.');
      }
    } catch (err) {
      console.error('Erro ao abrir leitor:', err);
      showToast('Não foi possível abrir o PDF: ' + err.message, 'error');
    }
  }

  // Atualização de Progresso de Leitura pelo Leitor
  elements.readerPageInput.addEventListener('change', async () => {
    if (!state.activeReaderBook) return;
    const newPage = parseInt(elements.readerPageInput.value, 10);
    if (isNaN(newPage) || newPage < 1) return;

    const book = state.activeReaderBook;
    const updates = { currentPage: newPage };

    if (book.totalPages && newPage >= book.totalPages) {
      updates.status = 'completed';
    } else if (newPage > 0) {
      updates.status = 'reading';
    }

    try {
      await window.bookDb.updateBook(book.id, updates);
      if (book.storagePath && window.cloudSync && window.cloudSync.isConfigured()) {
        await window.cloudSync.updateCloudBook(book.id, updates);
      }
      showToast(`Página ${newPage} salva no seu progresso!`, 'info');
      await loadBooks();
    } catch (err) {
      console.warn('Erro ao atualizar página:', err);
    }
  });

  // Baixar livro pelo leitor
  elements.btnReaderDownload.addEventListener('click', () => {
    if (state.activeReaderBook) {
      downloadBook(state.activeReaderBook);
    }
  });

  // Tela Cheia no leitor
  elements.btnReaderFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      elements.modalReader.querySelector('.modal-box').requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // =========================================================================
  // 7. Download de Livro (Onde você estiver!)
  // =========================================================================
  async function downloadBook(book) {
    showToast(`Preparando download de "${book.title}"...`, 'info');

    try {
      let blob = book.fileBlob;

      // Se não está em memória local, busca do IndexedDB
      if (!blob) {
        const full = await window.bookDb.getBook(book.id);
        if (full && full.fileBlob) {
          blob = full.fileBlob;
        }
      }

      // Se não está local, baixa da nuvem
      if (!blob && book.storagePath && window.cloudSync && window.cloudSync.isConfigured()) {
        blob = await window.cloudSync.downloadBookBlob(book.storagePath);
      }

      if (!blob) {
        throw new Error('Arquivo PDF não encontrado nem localmente nem na nuvem.');
      }

      // Dispara o download com o nome original do livro
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = book.fileName || `${book.title}.pdf`;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 2000);

      showToast(`Download de "${book.title}" concluído!`, 'success');
    } catch (err) {
      console.error('Erro ao baixar:', err);
      showToast('Falha ao baixar livro: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // 8. Favoritos e Exclusão
  // =========================================================================
  async function toggleFavorite(book) {
    const nextFavorite = !book.isFavorite;
    try {
      await window.bookDb.updateBook(book.id, { isFavorite: nextFavorite });
      if (book.storagePath && window.cloudSync && window.cloudSync.isConfigured()) {
        await window.cloudSync.updateCloudBook(book.id, { isFavorite: nextFavorite });
      }
      book.isFavorite = nextFavorite;
      showToast(nextFavorite ? 'Adicionado aos favoritos! ❤️' : 'Removido dos favoritos', 'info');
      await loadBooks();
    } catch (err) {
      showToast('Erro ao atualizar favorito: ' + err.message, 'error');
    }
  }

  async function confirmDeleteBook(book) {
    const ok = confirm(`Tem certeza que deseja excluir o livro "${book.title}"?`);
    if (!ok) return;

    try {
      // Exclui localmente
      await window.bookDb.deleteBook(book.id);

      // Exclui da nuvem se aplicável
      if (book.storagePath && window.cloudSync && window.cloudSync.isConfigured()) {
        try {
          await window.cloudSync.deleteCloudBook(book.id, book.storagePath);
        } catch (cloudErr) {
          console.warn('Erro ao remover da nuvem:', cloudErr);
        }
      }

      showToast(`"${book.title}" excluído com sucesso.`, 'info');
      await loadBooks();
    } catch (err) {
      showToast('Erro ao excluir livro: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // 9. Configurações da Nuvem (Supabase)
  // =========================================================================
  function openCloudModal() {
    const config = window.cloudSync.loadConfig();
    elements.supabaseUrl.value = config.url || '';
    elements.supabaseAnonKey.value = config.anonKey || '';

    if (window.cloudSync.isConfigured()) {
      elements.btnDisconnectCloud.style.display = 'inline-flex';
      setCloudStatus('Conectado ao Supabase.', 'success');
    } else {
      elements.btnDisconnectCloud.style.display = 'none';
      elements.cloudStatusMessage.style.display = 'none';
    }

    openModal(elements.modalCloud);
  }

  function setCloudStatus(msg, type = 'info') {
    elements.cloudStatusMessage.style.display = 'block';
    elements.cloudStatusMessage.textContent = msg;
    elements.cloudStatusMessage.style.backgroundColor =
      type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
    elements.cloudStatusMessage.style.color =
      type === 'success' ? 'var(--success)' : 'var(--danger)';
  }

  function updateCloudIndicator() {
    if (window.cloudSync && window.cloudSync.isConfigured()) {
      elements.cloudStatusDot.classList.add('connected');
      elements.cloudStatusDot.title = 'Conectado à nuvem (Supabase)';
    } else {
      elements.cloudStatusDot.classList.remove('connected');
      elements.cloudStatusDot.title = 'Nuvem desconectada (armazenamento apenas local)';
    }
  }

  elements.cloudConfigForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = elements.supabaseUrl.value.trim();
    const key = elements.supabaseAnonKey.value.trim();

    elements.btnSaveCloud.disabled = true;
    elements.btnSaveCloud.textContent = 'Testando Conexão...';

    try {
      await window.cloudSync.testConnection(url, key);
      window.cloudSync.saveConfig(url, key, true);
      updateCloudIndicator();
      setCloudStatus('Conexão realizada com sucesso! Seus livros sincronizarão automaticamente.', 'success');
      showToast('Nuvem conectada com sucesso!', 'success');
      setTimeout(async () => {
        closeModal(elements.modalCloud);
        await loadBooks();
      }, 1000);
    } catch (err) {
      setCloudStatus(err.message, 'error');
      showToast(err.message, 'error');
    } finally {
      elements.btnSaveCloud.disabled = false;
      elements.btnSaveCloud.textContent = 'Salvar e Conectar';
    }
  });

  elements.btnDisconnectCloud.addEventListener('click', () => {
    if (confirm('Deseja desconectar a nuvem? Seus livros locais continuarão salvos no navegador.')) {
      window.cloudSync.disconnect();
      updateCloudIndicator();
      elements.btnDisconnectCloud.style.display = 'none';
      setCloudStatus('Desconectado da nuvem.', 'info');
      showToast('Nuvem desconectada.', 'info');
    }
  });

  // Copiar SQL do Supabase
  elements.btnCopySql.addEventListener('click', async () => {
    try {
      const response = await fetch('supabase-setup.sql');
      const sql = await response.text();
      await navigator.clipboard.writeText(sql);
      showToast('Script SQL copiado para a área de transferência! Cole no SQL Editor do Supabase.', 'success');
    } catch (e) {
      showToast('Não foi possível copiar automaticamente. Abra o arquivo supabase-setup.sql.', 'info');
    }
  });

  // =========================================================================
  // 10. Dados, Estatísticas e Backup
  // =========================================================================
  elements.btnExportBackup.addEventListener('click', async () => {
    try {
      const books = await window.bookDb.getAllBooks();
      // Remove blobs do JSON para criar um arquivo leve com histórico e capas
      const exportData = books.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        category: b.category,
        description: b.description,
        totalPages: b.totalPages,
        currentPage: b.currentPage,
        rating: b.rating,
        status: b.status,
        isFavorite: b.isFavorite,
        fileName: b.fileName,
        fileSize: b.fileSize,
        storagePath: b.storagePath,
        coverData: b.coverData,
        createdAt: b.createdAt
      }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_biblioteca_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Backup exportado com sucesso!', 'success');
    } catch (e) {
      showToast('Erro ao exportar backup: ' + e.message, 'error');
    }
  });

  elements.btnTriggerImport.addEventListener('click', () => {
    elements.importFileInput.click();
  });

  elements.importFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const books = JSON.parse(text);
      if (!Array.isArray(books)) {
        throw new Error('Arquivo de backup inválido.');
      }

      for (const b of books) {
        await window.bookDb.addBook(b);
      }

      showToast(`${books.length} livros importados com sucesso!`, 'success');
      closeModal(elements.modalStats);
      await loadBooks();
    } catch (err) {
      showToast('Erro ao importar backup: ' + err.message, 'error');
    }
  });

  elements.btnClearAll.addEventListener('click', async () => {
    const answer = prompt('ATENÇÃO: Isso apagará todos os livros locais do navegador. Digite "LIMPAR" para confirmar:');
    if (answer === 'LIMPAR') {
      await window.bookDb.clearAll();
      showToast('Biblioteca local limpa com sucesso.', 'info');
      closeModal(elements.modalStats);
      await loadBooks();
    }
  });

  // =========================================================================
  // 11. Event Listeners Gerais e Drag-and-Drop
  // =========================================================================
  function setupEventListeners() {
    // Alternar Tema
    elements.btnToggleTheme.addEventListener('click', toggleTheme);

    // Modais
    elements.btnOpenAddModal.addEventListener('click', openAddModal);
    elements.btnOpenCloud.addEventListener('click', openCloudModal);
    elements.btnOpenStats.addEventListener('click', () => {
      updateStats();
      openModal(elements.modalStats);
    });

    document.querySelectorAll('.modal-close-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        closeAllModals();
      });
    });

    // Fechar ao clicar fora do modal
    document.querySelectorAll('.modal-overlay').forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeAllModals();
        }
      });
    });

    // Drag and Drop de PDFs na dropzone
    elements.dropzone.addEventListener('click', () => {
      elements.fileInput.click();
    });

    elements.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelected(e.target.files[0]);
      }
    });

    elements.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      elements.dropzone.classList.add('dragover');
    });

    elements.dropzone.addEventListener('dragleave', () => {
      elements.dropzone.classList.remove('dragover');
    });

    elements.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      elements.dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleFileSelected(e.dataTransfer.files[0]);
      }
    });

    // Upload de capa personalizada
    elements.customCoverInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          state.currentPendingCover = event.target.result;
          elements.coverPreview.src = event.target.result;
          elements.coverPreview.style.display = 'block';
          elements.coverPlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
      }
    });

    // Busca com debounce
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderBooks();
    });

    // Abas de Status
    elements.statusTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        elements.statusTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        state.currentFilter = tab.dataset.status;
        renderBooks();
      });
    });

    // Delegação de cliques para Categorias
    elements.categoriesList.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-btn');
      if (!btn) return;
      document.querySelectorAll('.pill-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentCategory = btn.dataset.category;
      renderBooks();
    });

    // Ordenação
    elements.sortSelect.addEventListener('change', (e) => {
      state.currentSort = e.target.value;
      renderBooks();
    });

    // Alternância de Visualização (Grade / Lista)
    elements.btnViewGrid.addEventListener('click', () => {
      elements.btnViewGrid.classList.add('active');
      elements.btnViewList.classList.remove('active');
      state.viewMode = 'grid';
      renderBooks();
    });

    elements.btnViewList.addEventListener('click', () => {
      elements.btnViewList.classList.add('active');
      elements.btnViewGrid.classList.remove('active');
      state.viewMode = 'list';
      renderBooks();
    });
  }

  // =========================================================================
  // 12. Funções Utilitárias de Modal e Toasts
  // =========================================================================
  function openModal(modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    if (modal === elements.modalReader && state.activeBlobUrl) {
      elements.readerIframe.src = 'about:blank';
    }
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach((m) => closeModal(m));
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
      success: '✅',
      error: '❌',
      info: 'ℹ️'
    };

    toast.innerHTML = `<span>${iconMap[type] || 'ℹ️'}</span> <span>${escapeHtml(message)}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Inicia a aplicação
  init();
});
