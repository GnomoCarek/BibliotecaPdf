/**
 * pdf-helper.js - Utilitários para manipulação de PDF via PDF.js
 * Extrai capas automaticamente da primeira página, conta páginas e metadados.
 */

class PdfHelper {
  constructor() {
    this.pdfjsInitialized = false;
  }

  /**
   * Garante que o worker do PDF.js esteja configurado
   */
  initWorker() {
    if (this.pdfjsInitialized) return;
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      this.pdfjsInitialized = true;
    }
  }

  /**
   * Extrai capa (página 1), total de páginas e metadados a partir de um File ou Blob
   * @param {File|Blob} file 
   * @returns {Promise<{coverData: string, totalPages: number, title?: string, author?: string}>}
   */
  async extractPdfInfo(file) {
    this.initWorker();

    if (!window.pdfjsLib) {
      console.warn('PDF.js não disponível. Usando capa padrão.');
      return {
        coverData: this.generateFallbackCover(file.name || 'Livro'),
        totalPages: 0,
        title: this.cleanFileName(file.name)
      };
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      const totalPages = pdf.numPages || 1;
      let extractedTitle = '';
      let extractedAuthor = '';

      try {
        const metadata = await pdf.getMetadata();
        if (metadata && metadata.info) {
          extractedTitle = metadata.info.Title || '';
          extractedAuthor = metadata.info.Author || '';
        }
      } catch (e) {
        console.warn('Metadados PDF indisponíveis:', e);
      }

      // Renderiza página 1 como thumbnail para capa
      let coverData = null;
      try {
        const page = await pdf.getPage(1);
        const desiredWidth = 320;
        const viewport = page.getViewport({ scale: 1.0 });
        const scale = desiredWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale: scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(scaledViewport.width);
        canvas.height = Math.floor(scaledViewport.height);
        const context = canvas.getContext('2d');

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport
        };

        await page.render(renderContext).promise;
        coverData = canvas.toDataURL('image/jpeg', 0.85);
      } catch (err) {
        console.warn('Falha ao renderizar capa da pág 1 do PDF:', err);
        coverData = this.generateFallbackCover(extractedTitle || file.name);
      }

      return {
        coverData: coverData || this.generateFallbackCover(extractedTitle || file.name),
        totalPages: totalPages,
        title: (extractedTitle && extractedTitle.trim()) ? extractedTitle.trim() : this.cleanFileName(file.name),
        author: (extractedAuthor && extractedAuthor.trim()) ? extractedAuthor.trim() : ''
      };
    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      return {
        coverData: this.generateFallbackCover(file.name || 'Livro'),
        totalPages: 0,
        title: this.cleanFileName(file.name)
      };
    }
  }

  /**
   * Limpa o nome do arquivo para sugerir título
   */
  cleanFileName(fileName) {
    if (!fileName) return 'Novo Livro';
    return fileName
      .replace(/\.pdf$/i, '')
      .replace(/[\-_]/g, ' ')
      .trim();
  }

  /**
   * Gera uma capa com gradiente elegante caso não haja imagem de capa
   */
  generateFallbackCover(title = 'Livro') {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');

    // Gradientes elegantes
    const gradients = [
      ['#3b82f6', '#1d4ed8'],
      ['#8b5cf6', '#6d28d9'],
      ['#ec4899', '#be185d'],
      ['#10b981', '#047857'],
      ['#f59e0b', '#b45309'],
      ['#6366f1', '#4338ca']
    ];

    // Escolhe gradiente baseado no hash do título
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorPair = gradients[Math.abs(hash) % gradients.length];

    const grad = ctx.createLinearGradient(0, 0, 300, 420);
    grad.addColorStop(0, colorPair[0]);
    grad.addColorStop(1, colorPair[1]);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 300, 420);

    // Efeito de relevo / lombada de livro
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, 18, 420);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(18, 0, 4, 420);

    // Borda interna suave
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, 240, 360);

    // Ícone de livro decorativo
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('📖', 150, 160);

    // Título do livro
    ctx.font = 'bold 20px sans-serif';
    const words = title.split(' ');
    let line = '';
    let y = 220;
    const maxWidth = 220;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, 150, y);
        line = words[n] + ' ';
        y += 26;
        if (y > 330) {
          line += '...';
          break;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 150, y);

    return canvas.toDataURL('image/jpeg', 0.9);
  }
}

window.pdfHelper = new PdfHelper();
