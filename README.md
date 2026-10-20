# 📚 Minha Biblioteca Digital de PDFs

Uma biblioteca digital moderna, elegante e responsiva desenvolvida em **HTML5**, **CSS3** e **JavaScript**, permitindo que você **insira, organize, leia e baixe seus livros em PDF onde você estiver** — seja no computador, tablet ou celular.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![PWA Ready](https://img.shields.io/badge/PWA-Ready-success?style=for-the-badge)

---

## ✨ Recursos Principais

- 📥 **Inserção Fácil de Livros**:
  - Arraste e solte ou selecione arquivos PDF.
  - **Geração Automática de Capa**: Extrai a 1ª página do PDF como miniatura automaticamente.
  - Leitura automática do número total de páginas e metadados (título e autor).
  - Opção para enviar capa personalizada ou usar gradiente dinâmico.
- ⬇️ **Download em 1 Clique**:
  - Baixe seus livros em qualquer lugar para ler offline no seu leitor preferido.
- 📖 **Leitor de PDF Embutido**:
  - Abra e leia o livro diretamente no navegador sem precisar de outros programas.
  - Marcador de página atual e progresso de leitura em tempo real (%).
  - Modo tela cheia e atalho para download direto do leitor.
- ☁️ **Acesse Onde Estiver (Sincronização em Nuvem Gratuita)**:
  - Suporte nativo ao **Supabase** (plano gratuito com 1 GB de armazenamento para PDFs).
  - Envie um livro no computador e abra/baixe no seu celular instantaneamente.
- 💾 **Modo 100% Offline (IndexedDB)**:
  - Funciona imediatamente sem exigir cadastro, guardando seus livros no banco local do navegador.
- 🔍 **Busca e Organização**:
  - Busca instantânea por título, autor ou sinopse conforme você digita.
  - Abas de status: *Todos*, *Lendo*, *Concluídos*, *Favoritos*, *Não lidos*.
  - Filtro por categorias (*Ficção*, *Tecnologia*, *Estudos*, etc.).
  - Ordenação por recentes, ordem alfabética, tamanho ou número de páginas.
  - Alternância entre visualização em **Grade** e **Lista**.
- 🌓 **Tema Escuro e Claro**: Alternância suave com persistência da preferência.
- 📊 **Estatísticas e Backup**:
  - Monitore o total de livros, livros concluídos e espaço em disco usado.
  - Exportação e importação de backup em formato `.json`.
- 📱 **PWA (Progressive Web App)**:
  - Pode ser instalado no celular (Android / iOS) ou no computador como se fosse um app nativo.

---

## 🚀 Como Usar Rapidamente

### 1. Testar Localmente no Computador

Você não precisa instalar dependências nem usar comandos complexos. Basta:

1. Abrir o arquivo `index.html` em qualquer navegador moderno (Chrome, Edge, Firefox, Brave, Safari).
2. Ou rodar um servidor local leve (se preferir):
   ```bash
   # Com Python:
   python -m http.server 3000

   # Com Node.js:
   npx serve .
   ```
3. Acesse `http://localhost:3000` no seu navegador.

---

## 🌐 Como Acessar de Onde Estiver (Hospedagem Gratuita)

Para acessar sua biblioteca pelo celular ou de qualquer outro computador, o método mais fácil e gratuito é o **GitHub Pages**:

1. No repositório do GitHub (`https://github.com/GnomoCarek/BibliotecaPdf`):
2. Vá em **Settings** (Configurações do repositório) > **Pages** (no menu lateral esquerdo).
3. Na seção **Build and deployment** > **Branch**:
   - Selecione a branch `main` e a pasta `/ (root)`.
   - Clique em **Save**.
4. Em 1 ou 2 minutos, o GitHub gerará um link público para sua biblioteca (ex: `https://gnomocarek.github.io/BibliotecaPdf/`).
5. Abra esse link no seu celular ou no computador e sua biblioteca estará no ar!

---

## ☁️ Como Configurar a Nuvem Gratuita (Supabase)

Para que os livros enviados no seu PC apareçam automaticamente no seu celular:

1. Crie uma conta gratuita em [supabase.com](https://supabase.com).
2. Crie um novo projeto (leva cerca de 1 minuto).
3. No menu lateral do Supabase, clique em **SQL Editor** > **New Query**.
4. Copie todo o conteúdo do arquivo [`supabase-setup.sql`](supabase-setup.sql) deste repositório, cole no editor e clique em **Run**.
5. No Supabase, vá em **Project Settings** > **API**:
   - Copie o **Project URL**.
   - Copie a **Anon Public Key**.
6. Na sua biblioteca, clique no botão **☁️ Nuvem** no topo:
   - Cole a **URL** e a **Anon Key**.
   - Clique em **Salvar e Conectar**.
7. Pronto! A bolinha ao lado do botão da nuvem ficará verde e todos os seus livros agora estarão disponíveis em todos os seus aparelhos.

---

## 📁 Estrutura de Arquivos

```
BibliotecaPdf/
├── index.html            # Estrutura visual da aplicação
├── manifest.json         # Configurações do PWA (instalação em celulares e desktops)
├── sw.js                 # Service Worker para funcionamento offline e cache
├── supabase-setup.sql    # Script SQL para criação de banco e storage no Supabase
├── README.md             # Documentação e instruções de uso
├── css/
│   └── style.css         # Estilização completa, responsiva com temas escuro e claro
├── js/
│   ├── app.js            # Controlador principal da aplicação e interface
│   ├── db.js             # Gerenciador do banco local IndexedDB (armazenamento de PDFs)
│   ├── cloud.js          # Sincronização em nuvem via Supabase
│   └── pdf-helper.js     # Extração automática de capa e páginas via PDF.js
└── icons/
    ├── icon-192.svg      # Ícone do aplicativo para celular
    └── icon-512.svg      # Ícone de alta resolução do aplicativo
```

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 Semântico**: Estruturação acessível e otimizada.
- **CSS3 Puro**: Variáveis de tema (Dark/Light), Flexbox, CSS Grid e animações suaves.
- **JavaScript Moderno (ES6+)**: Código limpo, modular e sem necessidade de bundlers.
- **IndexedDB**: Armazenamento seguro de grandes arquivos PDF diretamente no dispositivo.
- **PDF.js (Mozilla)**: Renderização da primeira página dos PDFs para miniaturas de capa e contagem de páginas.
- **Supabase Client SDK**: Armazenamento em nuvem e banco de dados em tempo real.
- **Service Workers & Cache API**: Suporte a PWA e carregamento ultra-rápido.
