export interface Category {
  id: string;
  name: string;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  photo_url: string | null;
  category_id: string;
  stock: number;
  min_stock: number;
  cost_price: number;
  retail_price: number;
  wholesale_price: number;
  description: string | null;
  created_at?: string;
  updated_at?: string;
  category_name?: string; // resolved locally or via join
}

export interface Reseller {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  city: string;
  notes: string;
  created_at?: string;
  total_bought?: number; // computed attribute
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  birthdate: string | null; // YYYY-MM-DD
  debt: number;
  credit_balance: number;
  notes: string;
  is_reseller: boolean;
  reseller_id: string | null;
  created_at?: string;
  total_spent?: number; // computed
  last_purchase_date?: string | null; // computed
}

export interface CashRegister {
  id: string;
  opened_at: string;
  closed_at: string | null;
  opening_balance: number;
  closing_balance: number | null;
  status: 'open' | 'closed';
  opened_by: string;
  closed_by: string | null;
}

export interface CashMovement {
  id: string;
  cash_register_id: string;
  type: 'entrada' | 'saida';
  amount: number;
  description: string;
  payment_method: 'PIX' | 'Cartão' | 'Dinheiro' | null;
  created_at?: string;
}

export interface Sale {
  id: string;
  created_at: string;
  total_price: number;
  discount: number;
  payment_method: 'PIX' | 'Cartão' | 'Dinheiro' | 'Boleto' | 'Crediário';
  installments?: number | null;
  customer_id: string | null;
  user_email: string;
  cash_register_id: string | null;
  customer_name?: string | null; // resolved locally
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  price: number;
  cost_price: number;
  product_name?: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  type: 'Entrada' | 'Saída manual' | 'Ajuste' | 'Venda' | 'Estorno de Venda';
  quantity: number;
  user_email: string;
  observation: string | null;
  created_at: string;
  product_name?: string;
}

// Parcela de uma venda no Boleto (Contas a Receber)
export interface SaleInstallment {
  id: string;
  sale_id: string;
  installment_number: number;
  amount: number;
  due_date: string; // YYYY-MM-DD
  status: 'pendente' | 'pago' | 'atrasado';
  paid_at: string | null;
  paid_amount: number | null;
  payment_method: 'PIX' | 'Cartão' | 'Dinheiro' | null;
  created_at?: string;
  customer_name?: string | null; // resolved locally
  customer_id?: string | null; // resolved locally
}

// Um item devolvido ou recebido dentro de uma troca
export interface ExchangeItem {
  id: string;
  exchange_id: string;
  direction: 'devolvido' | 'novo';
  product_id: string;
  quantity: number;
  price: number;
  product_name?: string; // resolved locally
}

// Registro de uma troca de produtos
export interface Exchange {
  id: string;
  original_sale_id: string | null;
  customer_id: string | null;
  total_returned: number;
  total_new: number;
  price_difference: number; // total_new - total_returned
  resolution: 'sem_diferenca' | 'pago_pelo_cliente' | 'devolvido_ao_cliente' | 'credito_cliente' | 'divida_cliente';
  payment_method: 'PIX' | 'Cartão' | 'Dinheiro' | null;
  user_email: string;
  cash_register_id: string | null;
  created_at: string;
  customer_name?: string | null; // resolved locally
  items?: ExchangeItem[];
}

// Uma conta a pagar (ex: fornecedor, aluguel, produto comprado a prazo)
export interface Payable {
  id: string;
  description: string;
  amount: number;
  due_date: string; // YYYY-MM-DD
  status: 'pendente' | 'pago';
  paid_at: string | null;
  payment_method: 'PIX' | 'Cartão' | 'Dinheiro' | null;
  cash_register_id: string | null;
  user_email: string;
  created_at?: string;
}