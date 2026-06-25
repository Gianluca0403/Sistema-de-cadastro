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
  payment_method: 'PIX' | 'Cartão' | 'Dinheiro' | 'Crediário';
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
