-- ==========================================================================
-- SUPABASE SCHEMA COMPLETO - SISTEMA DE GESTÃO JAJA COSMÉTICOS
-- Execute este script no SQL Editor do seu projeto Supabase.
-- ==========================================================================

-- 1. Tabela de Categorias (Categories)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir categorias padrão
INSERT INTO public.categories (name) VALUES 
('Perfumes'), 
('Hidratantes'), 
('Body Splash'), 
('Kits'), 
('Outros')
ON CONFLICT (name) DO NOTHING;

-- 2. Tabela de Produtos (Products)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    barcode TEXT UNIQUE,
    photo_url TEXT,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (cost_price >= 0),
    retail_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (retail_price >= 0),
    wholesale_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (wholesale_price >= 0),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Revendedores (Resellers)
CREATE TABLE IF NOT EXISTS public.resellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    city TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Clientes (Customers)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    birthdate DATE,
    debt NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (debt >= 0),
    notes TEXT,
    is_reseller BOOLEAN NOT NULL DEFAULT FALSE,
    reseller_id UUID REFERENCES public.resellers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Sessões de Caixa (Cash Register)
CREATE TABLE IF NOT EXISTS public.cash_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    opening_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (opening_balance >= 0),
    closing_balance NUMERIC(10, 2),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_by TEXT NOT NULL,
    closed_by TEXT
);

-- 6. Tabela de Movimentações de Caixa (Cash Movements)
CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_register_id UUID NOT NULL REFERENCES public.cash_register(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')), -- suprimento ou venda (entrada) / sangria (saida)
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('PIX', 'Cartão', 'Dinheiro')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela de Vendas (Sales)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_price >= 0),
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('PIX', 'Cartão', 'Dinheiro', 'Crediário')),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    cash_register_id UUID REFERENCES public.cash_register(id) ON DELETE SET NULL
);

-- 8. Tabela de Itens de Venda (Sale Items)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (cost_price >= 0)
);

-- 9. Tabela de Movimentações de Estoque (Stock Movements)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('Entrada', 'Saída manual', 'Ajuste', 'Venda', 'Estorno de Venda')),
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    user_email TEXT NOT NULL,
    observation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================================================
-- INDEXADORES DE DESEMPENHO (INDEXES)
-- ==========================================================================
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_movements_register ON public.cash_movements(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_customers_debt ON public.customers(debt);

-- ==========================================================================
-- ROW LEVEL SECURITY (RLS)
-- Permite que usuários autenticados gerenciem todas as tabelas.
-- ==========================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Total para Usuários Autenticados
CREATE POLICY "All authenticated categories" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "All authenticated products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "All authenticated resellers" ON public.resellers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "All authenticated customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "All authenticated cash_register" ON public.cash_register FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "All authenticated cash_movements" ON public.cash_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "All authenticated sales" ON public.sales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "All authenticated sale_items" ON public.sale_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "All authenticated stock_movements" ON public.stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permissões adicionais para leitura anônima/pública de categorias e produtos se necessário
-- (Útil caso queira disponibilizar alguma tela pública de consulta)
CREATE POLICY "Read categories public" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Read products public" ON public.products FOR SELECT USING (true);
