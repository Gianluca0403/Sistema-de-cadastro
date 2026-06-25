# Sistema de Gestão JAJA Cosméticos & Perfumaria

Este é um sistema web moderno e completo para gestão de estoque, vendas (PDV rápido) e clientes (controle de crediário/fiado) desenvolvido para a **JAJA Cosméticos**. 

O projeto foi construído sob a arquitetura **JAMstack**, sendo 100% serverless, sem backend tradicional, hospedável gratuitamente na **Netlify** e utilizando o **Supabase** como banco de dados em tempo real, autenticação e armazenamento de imagens.

---

## 🌟 Funcionalidades do Sistema

1. **Dashboard Inteligente**:
   - KPIs de Vendas Hoje, Vendas no Mês, Lucro Líquido e Recebíveis Pendentes (Crediário).
   - Banner de alerta em tempo real para produtos com estoque baixo/esgotado.
   - Gráfico de evolução de vendas diárias nos últimos 7 dias (desenhado com SVG nativo e glows responsivos).
   - Tabela dos Top 5 produtos mais vendidos.
   - Visão geral do custo do estoque vs. valor de venda estimado.

2. **Controle de Estoque Completo**:
   - Cadastro e Edição de produtos com campos para: Nome, Código de Barras, Foto do Produto, Categoria (Perfumes, Hidratantes, Body Splash, Kits, Outros), Quantidade, Estoque Mínimo, Preço de Custo, Preço de Venda Varejo, Preço de Venda Atacado e Descrição.
   - **Upload de fotos de produtos** integrado ao Supabase Storage.
   - **Lançamento de Movimentação de Estoque**: Lançamentos rápidos de Entrada de mercadorias, Saídas manuais e Ajustes de estoque que salvam logs detalhados automaticamente.
   - Indicadores visuais dinâmicos para produtos em estoque, com estoque baixo ou esgotados.

3. **Ponto de Venda (PDV) / Tela de Venda Rápida**:
   - **Integração com Leitor de Código de Barras**: Basta focar no campo de busca e bipar o produto para que ele entre diretamente no carrinho.
   - Adicione produtos no carrinho com um clique, ajuste quantidades e remova itens.
   - **Seleção de Tabela de Preço**: Escolha individualmente na linha do carrinho se a venda daquele item será no preço de **Varejo** ou de **Atacado**.
   - Campo para aplicação de descontos em valor (R$) na venda.
   - Métodos de pagamento: **PIX**, **Cartão**, **Dinheiro** e **Crediário**.
   - **Venda no Crediário**: Obriga a seleção de um cliente cadastrado e adiciona automaticamente o valor da venda ao saldo devedor da conta do cliente.

4. **Gestão de Clientes & Crediário**:
   - Cadastro completo de clientes com nome, telefone, e-mail e anotações.
   - Exibição de saldo devedor em tempo real.
   - **Módulo de Recebimento de Débito (Quitar Fiado)**: Permite registrar pagamentos parciais ou totais da dívida de um cliente, reduzindo seu saldo devedor e gerando um lançamento financeiro correspondente de entrada de caixa nas métricas de venda.

5. **Histórico Detalhado (Auditoria)**:
   - **Aba Vendas**: Lista de todas as transações, contendo data/hora, cliente, método de pagamento, desconto aplicado, valor final e botão de **Estorno**. O estorno de uma venda apaga a transação, devolve os itens ao estoque e deduz a dívida do crediário do cliente automaticamente.
   - **Aba Movimentações**: Registro auditável de todas as alterações físicas no estoque (Entradas, Saídas, Ajustes e Vendas) com data, hora, produto, quantidade, operador (usuário logado) e observações informadas.

6. **Painel de Ajustes & Modo de Demonstração**:
   - **Failover / Modo Offline Local**: Caso as credenciais do Supabase não estejam configuradas, o sistema ativa automaticamente o **Modo Demonstração**, utilizando LocalStorage com dados mockados. Isso permite testar o sistema inteiramente sem precisar configurar o banco de dados de imediato!
   - Exportação e importação de backups em formato JSON das tabelas locais.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, TypeScript, Vite.
- **Estilização**: CSS Vanilla (Design premium dark mode, glassmorphism e responsividade).
- **Backend / Database**: Supabase (PostgreSQL, Storage Buckets, Row Level Security e Supabase Auth).
- **Ícones**: FontAwesome 6 (via CDN).

---

## 📂 Estrutura do Projeto

```text
├── legacy/                  # Código original em Vanilla JS (preservado para referência)
├── src/
│   ├── components/          # Componentes visuais por telas/views
│   │   ├── ClientsView.tsx  # Gestão de clientes e amortização de crediário
│   │   ├── DashboardView.tsx# Indicadores visuais e gráficos
│   │   ├── Header.tsx       # Barra superior dinâmica
│   │   ├── LoginView.tsx    # Tela de login e registro
│   │   ├── MovementsView.tsx# Telas de histórico de auditoria
│   │   ├── PDVView.tsx      # Frente de caixa de venda rápida
│   │   ├── ProductsView.tsx # Cadastro de catálogo e movimentações rápidas
│   │   ├── SettingsView.tsx # Painel de backup e status da conexão
│   │   └── Sidebar.tsx      # Barra de navegação lateral
│   ├── App.tsx              # Coordenador de estado global e rotas
│   ├── index.css            # Folha de estilos vanilla customizada
│   ├── main.tsx             # Arquivo de entrada do React
│   ├── supabaseClient.ts    # Configuração do cliente Supabase e Banco Local fallback
│   └── types.ts             # Tipagem TypeScript
├── index.html               # Estrutura HTML principal
├── package.json             # Dependências e scripts npm
├── supabase_schema.sql      # Script de criação das tabelas no Supabase
├── tsconfig.json            # Configurações do TypeScript
└── vite.config.ts           # Configurações do Vite
```

---

## ⚙️ Configuração do Banco de Dados Supabase

Para ativar o modo de produção com banco na nuvem:

1. **Criar Conta**: Acesse [supabase.com](https://supabase.com) e crie um novo projeto.
2. **Executar Schema SQL**:
   - Copie todo o conteúdo do arquivo [supabase_schema.sql](file:///C:/Users/gianl/OneDrive/Documentos/Sistema%20de%20Cadastro%20-%20JAJA/supabase_schema.sql) localizado na raiz deste projeto.
   - Vá no painel do Supabase, clique em **SQL Editor**, abra uma nova query, cole o script e clique em **Run**. Isso criará as tabelas `products`, `clients`, `sales`, `sale_items` e `stock_movements`, além de configurar as políticas de acesso e segurança (RLS) para usuários logados.
3. **Configurar Storage (Fotos)**:
   - Clique em **Storage** no menu esquerdo do Supabase.
   - Crie um novo bucket chamado exatamente `cosmetics_photos`.
   - Certifique-se de marcar a opção **Public** (Público) ao criar o bucket, permitindo que as fotos dos produtos sejam acessíveis por URLs públicas.

---

## 🚀 Instalação e Execução Local

Siga o passo a passo para rodar o projeto em sua máquina:

1. Certifique-se de possuir o **Node.js** instalado.
2. Na raiz do projeto, instale as dependências executando:
   ```bash
   npm install
   ```
3. Para conectar o projeto localmente ao seu Supabase, crie um arquivo chamado `.env` na raiz do projeto contendo as suas chaves do painel do Supabase (Vá em Project Settings > API):
   ```env
   VITE_SUPABASE_URL=https://seu-projeto-id.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-key-aqui
   ```
   *(Caso não crie o arquivo `.env`, o sistema continuará funcionando no modo LocalStorage de demonstração)*
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
5. Abra o link fornecido no terminal (geralmente `http://localhost:5173`) no seu navegador.
6. **Dados de Acesso (Modo Demonstração)**:
   - **Login**: `admin@jaja.com`
   - **Senha**: `admin123`
   - *(Você também pode criar novos usuários clicando em "Criar conta" na parte inferior da tela de login).*

---

## ☁️ Deploy na Netlify (JAMstack)

Como o sistema é 100% estático (JAMstack), ele é hospedado perfeitamente na Netlify de forma rápida e gratuita:

### Método 1: Via Netlify CLI (Rápido)
1. Instale a CLI da Netlify: `npm install -g netlify-cli`
2. Gere a build do projeto:
   ```bash
   npm run build
   ```
3. Faça o deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```

### Método 2: Integração Contínua com GitHub (Recomendado)
1. Crie um repositório no seu GitHub e suba este projeto.
2. Acesse a [Netlify](https://www.netlify.com/), faça login e clique em **Add new site** > **Import an existing project**.
3. Conecte sua conta do GitHub e selecione o repositório do projeto.
4. Preencha as configurações de build:
   - **Build Command**: `npm run build`
   - **Publish directory**: `dist`
5. Adicione as variáveis de ambiente em **Site Settings** > **Environment variables**:
   - Nome: `VITE_SUPABASE_URL` | Valor: *URL do seu projeto no Supabase*
   - Nome: `VITE_SUPABASE_ANON_KEY` | Valor: *Sua chave anônima do Supabase*
6. Clique em **Deploy site**. O site estará no ar e será atualizado automaticamente a cada novo `git push` no repositório!
