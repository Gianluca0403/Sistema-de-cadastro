# Sistema de Gestão MMC Imports

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

