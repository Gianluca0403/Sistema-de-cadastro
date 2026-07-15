import { createClient } from '@supabase/supabase-js';
import { Product, Category, Customer, Reseller, CashRegister, CashMovement, Sale, SaleItem, StockMovement, SaleInstallment, Exchange, ExchangeItem } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured =
  supabaseUrl &&
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  supabaseAnonKey &&
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const DEFAULT_CATEGORY_IMAGES = {
  Perfumes: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&q=80',
  Hidratantes: 'https://images.unsplash.com/photo-1608248597481-496100c80836?w=400&q=80',
  'Body Splash': 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400&q=80',
  Kits: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400&q=80',
  Outros: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80'
};

const MOCK_KEYS = {
  CATEGORIES: 'jaja_categories_mock',
  PRODUCTS: 'jaja_products_mock',
  CUSTOMERS: 'jaja_customers_mock',
  RESELLERS: 'jaja_resellers_mock',
  CASH_REGISTER: 'jaja_cash_register_mock',
  CASH_MOVEMENTS: 'jaja_cash_movements_mock',
  SALES: 'jaja_sales_mock',
  SALE_ITEMS: 'jaja_sale_items_mock',
  SALE_INSTALLMENTS: 'jaja_sale_installments_mock',
  STOCK_MOVEMENTS: 'jaja_stock_movements_mock',
  EXCHANGES: 'jaja_exchanges_mock',
  EXCHANGE_ITEMS: 'jaja_exchange_items_mock',
  USER: 'jaja_user_mock'
};

// Seed default mock categories
const getMockCategories = (): Category[] => {
  const cats = localStorage.getItem(MOCK_KEYS.CATEGORIES);
  if (cats) return JSON.parse(cats);

  const defaults: Category[] = [
    { id: 'cat-1', name: 'Perfumes' },
    { id: 'cat-2', name: 'Hidratantes' },
    { id: 'cat-3', name: 'Body Splash' },
    { id: 'cat-4', name: 'Kits' },
    { id: 'cat-5', name: 'Outros' }
  ];
  localStorage.setItem(MOCK_KEYS.CATEGORIES, JSON.stringify(defaults));
  return defaults;
};

// Initialize Mock database
const initMockDatabase = () => {

  if (!localStorage.getItem(MOCK_KEYS.PRODUCTS)) {
    const products: Product[] = [
      {
        id: 'prod-1',
        name: 'Bleu de Chanel Eau de Parfum 100ml',
        barcode: '3145891073607',
        photo_url: DEFAULT_CATEGORY_IMAGES.Perfumes,
        category_id: 'cat-1',
        stock: 8,
        min_stock: 2,
        cost_price: 650.00,
        retail_price: 980.00,
        wholesale_price: 890.00,
        description: 'Perfume amadeirado aromático para homens sofisticados.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'prod-2',
        name: 'Good Girl Eau de Parfum 80ml',
        barcode: '8411061819838',
        photo_url: DEFAULT_CATEGORY_IMAGES.Perfumes,
        category_id: 'cat-1',
        stock: 12,
        min_stock: 3,
        cost_price: 420.00,
        retail_price: 699.00,
        wholesale_price: 630.00,
        description: 'Fragrância ousada e altamente sofisticada Carolina Herrera.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'prod-3',
        name: 'Hidratante Cerave Corporal 473ml',
        barcode: '3337875597380',
        photo_url: DEFAULT_CATEGORY_IMAGES.Hidratantes,
        category_id: 'cat-2',
        stock: 1,
        min_stock: 3,
        cost_price: 65.00,
        retail_price: 115.00,
        wholesale_price: 99.00,
        description: 'Hidrata e ajuda a restaurar a barreira protetora da pele.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    localStorage.setItem(MOCK_KEYS.PRODUCTS, JSON.stringify(products));
  }

  if (!localStorage.getItem(MOCK_KEYS.RESELLERS)) {
    const resellers: Reseller[] = [
      {
        id: 'reseller-1',
        name: 'Renata Revendedora Cosméticos',
        phone: '11977778888',
        whatsapp: '11977778888',
        city: 'São Paulo',
        notes: 'Compra pacotes de kits fechados para revenda em condomínios.',
        created_at: new Date().toISOString()
      }
    ];
    localStorage.setItem(MOCK_KEYS.RESELLERS, JSON.stringify(resellers));
  }

  if (!localStorage.getItem(MOCK_KEYS.CUSTOMERS)) {
    const customers: Customer[] = [
      {
        id: 'cust-1',
        name: 'Maria Silva Oliveira',
        phone: '11988887777',
        whatsapp: '11988887777',
        birthdate: '1992-06-25', // June birthday (to test birthdays of current month!)
        debt: 120.00,
        notes: 'Gosta de fragrâncias florais doces.',
        is_reseller: false,
        reseller_id: null,
        created_at: new Date().toISOString()
      },
      {
        id: 'cust-2',
        name: 'Ana Julia Costa',
        phone: '11966665555',
        whatsapp: '11966665555',
        birthdate: '1998-08-03',
        debt: 0.00,
        notes: 'Cliente VIP. Prefere pagar via Pix.',
        is_reseller: true,
        reseller_id: 'reseller-1',
        created_at: new Date().toISOString()
      }
    ];
    localStorage.setItem(MOCK_KEYS.CUSTOMERS, JSON.stringify(customers));
  }

  if (!localStorage.getItem(MOCK_KEYS.CASH_REGISTER)) {
    const defaultRegister: CashRegister[] = [
      {
        id: 'cash-session-1',
        opened_at: new Date().toISOString(),
        closed_at: null,
        opening_balance: 150.00,
        closing_balance: null,
        status: 'open',
        opened_by: 'admin@jaja.com',
        closed_by: null
      }
    ];
    localStorage.setItem(MOCK_KEYS.CASH_REGISTER, JSON.stringify(defaultRegister));
  }

  if (!localStorage.getItem(MOCK_KEYS.CASH_MOVEMENTS)) {
    const cashMovements: CashMovement[] = [
      {
        id: 'c-mov-1',
        cash_register_id: 'cash-session-1',
        type: 'entrada',
        amount: 150.00,
        description: 'Saldo de Abertura de Caixa',
        payment_method: 'Dinheiro',
        created_at: new Date().toISOString()
      }
    ];
    localStorage.setItem(MOCK_KEYS.CASH_MOVEMENTS, JSON.stringify(cashMovements));
  }

  if (!localStorage.getItem(MOCK_KEYS.STOCK_MOVEMENTS)) {
    const movements: StockMovement[] = [
      {
        id: 'mov-1',
        product_id: 'prod-1',
        type: 'Entrada',
        quantity: 10,
        user_email: 'admin@jaja.com',
        observation: 'Abertura de estoque físico',
        created_at: new Date().toISOString()
      }
    ];
    localStorage.setItem(MOCK_KEYS.STOCK_MOVEMENTS, JSON.stringify(movements));
  }

  if (!localStorage.getItem(MOCK_KEYS.SALES)) {
    localStorage.setItem(MOCK_KEYS.SALES, JSON.stringify([]));
    localStorage.setItem(MOCK_KEYS.SALE_ITEMS, JSON.stringify([]));
  }

  if (!localStorage.getItem(MOCK_KEYS.SALE_INSTALLMENTS)) {
    localStorage.setItem(MOCK_KEYS.SALE_INSTALLMENTS, JSON.stringify([]));
  }

  if (!localStorage.getItem(MOCK_KEYS.EXCHANGES)) {
    localStorage.setItem(MOCK_KEYS.EXCHANGES, JSON.stringify([]));
    localStorage.setItem(MOCK_KEYS.EXCHANGE_ITEMS, JSON.stringify([]));
  }
};

// Gera as datas de vencimento e valores de cada parcela de um boleto.
// Se customDueDates for fornecido (uma data por parcela), usa essas datas.
// Caso contrário, usa o padrão: 1ª parcela 30 dias após a venda, demais a cada 30 dias.
const generateInstallmentPlan = (
  saleId: string,
  totalPrice: number,
  installmentsCount: number,
  saleDate: Date,
  customDueDates?: string[]
) => {
  const plan: Omit<SaleInstallment, 'id'>[] = [];
  const baseAmount = Math.floor((totalPrice / installmentsCount) * 100) / 100;
  let accumulated = 0;

  for (let i = 1; i <= installmentsCount; i++) {
    let dueDateStr: string;

    if (customDueDates && customDueDates[i - 1]) {
      dueDateStr = customDueDates[i - 1];
    } else {
      const dueDate = new Date(saleDate);
      dueDate.setDate(dueDate.getDate() + 30 * i);
      dueDateStr = dueDate.toISOString().split('T')[0];
    }

    // Ajusta a última parcela para cobrir eventuais centavos de arredondamento
    const amount = i === installmentsCount
      ? Math.round((totalPrice - accumulated) * 100) / 100
      : baseAmount;
    accumulated += amount;

    plan.push({
      sale_id: saleId,
      installment_number: i,
      amount,
      due_date: dueDateStr,
      status: 'pendente',
      paid_at: null,
      paid_amount: null,
      payment_method: null
    });
  }

  return plan;
};

initMockDatabase();

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Formas de pagamento que NÃO representam dinheiro imediato em caixa.
// Boleto e Crediário só geram entrada de caixa quando forem efetivamente pagos.
const DEFERRED_PAYMENT_METHODS = ['Crediário', 'Boleto'];

export const dbService = {
  // --- AUTHENTICATION ---
  auth: {
    async signUp(email: string, password: string) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        return data.user;
      } else {
        const mockUsers = JSON.parse(localStorage.getItem('jaja_mock_users') || '{}');
        if (mockUsers[email]) throw new Error('Usuário já cadastrado.');
        mockUsers[email] = password;
        localStorage.setItem('jaja_mock_users', JSON.stringify(mockUsers));
        const user = { id: 'mock-user-id', email };
        localStorage.setItem(MOCK_KEYS.USER, JSON.stringify(user));
        return user;
      }
    },

    async signIn(email: string, password: string) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data.user;
      } else {
        const mockUsers = JSON.parse(localStorage.getItem('jaja_mock_users') || '{}');
        if (Object.keys(mockUsers).length === 0) {
          mockUsers['admin@jaja.com'] = 'admin123';
          localStorage.setItem('jaja_mock_users', JSON.stringify(mockUsers));
        }
        if (mockUsers[email] && mockUsers[email] === password) {
          const user = { id: 'mock-user-' + email.split('@')[0], email };
          localStorage.setItem(MOCK_KEYS.USER, JSON.stringify(user));
          return user;
        } else {
          throw new Error('E-mail ou senha incorretos.');
        }
      }
    },

    async signOut() {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      } else {
        localStorage.removeItem(MOCK_KEYS.USER);
      }
    },

    async getCurrentUser() {
      if (isSupabaseConfigured && supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
      } else {
        const userStr = localStorage.getItem(MOCK_KEYS.USER);
        return userStr ? JSON.parse(userStr) : null;
      }
    },

    onAuthStateChange(callback: (user: any) => void) {
      if (isSupabaseConfigured && supabase) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (_event, session) => callback(session?.user || null)
        );
        return () => subscription.unsubscribe();
      } else {
        const checkUser = () => {
          const userStr = localStorage.getItem(MOCK_KEYS.USER);
          callback(userStr ? JSON.parse(userStr) : null);
        };
        checkUser();
        window.addEventListener('storage', checkUser);
        return () => window.removeEventListener('storage', checkUser);
      }
    }
  },

  // --- CATEGORIES ---
  categories: {
    async getAll(): Promise<Category[]> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('categories').select('*').order('name', { ascending: true });
        if (error) throw error;
        return data as Category[];
      } else {
        return getMockCategories();
      }
    },
    async create(name: string): Promise<Category> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('categories').insert([{ name }]).select().single();
        if (error) throw error;
        return data as Category;
      } else {
        const list = getMockCategories();
        const newCat = { id: 'cat-' + Math.random().toString(36).substring(2, 9), name };
        list.push(newCat);
        localStorage.setItem(MOCK_KEYS.CATEGORIES, JSON.stringify(list));
        return newCat;
      }
    }
  },

  // --- PRODUCTS ---
  products: {
    async getAll(): Promise<Product[]> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('products').select('*, categories(name)').order('name', { ascending: true });
        if (error){
          console.log("Erro ao consultar os produtos");
          throw error;
        }
        return (data || []).map((p: any) => ({
          ...p,
          category_name: p.categories?.name || 'Sem categoria'
        })) as Product[];
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.PRODUCTS) || '[]');
        const cats = getMockCategories();
        const catMap = new Map(cats.map(c => [c.id, c.name]));
        return list.map((p: any) => ({
          ...p,
          category_name: catMap.get(p.category_id) || 'Sem categoria'
        }));
      }
    },

    async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>, imageFile?: File): Promise<Product> {
      let photoUrl = product.photo_url;

      // Category name lookup for mock fallback defaults
      const cats = getMockCategories();
      const catObj = cats.find(c => c.id === product.category_id);
      const catName = catObj?.name || 'Outros';

      if (!photoUrl) {
        photoUrl = DEFAULT_CATEGORY_IMAGES[catName as keyof typeof DEFAULT_CATEGORY_IMAGES] || DEFAULT_CATEGORY_IMAGES.Outros;
      }

      if (imageFile) {
        if (isSupabaseConfigured && supabase) {
          const fileName = `${Date.now()}-${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          const { error: uploadError } = await supabase.storage.from('cosmetics_photos').upload(fileName, imageFile);
          if (uploadError) throw uploadError;
          const { data: publicUrlData } = supabase.storage.from('cosmetics_photos').getPublicUrl(fileName);
          photoUrl = publicUrlData.publicUrl;
        } else {
          try {
            photoUrl = await fileToBase64(imageFile);
          } catch (e) {
            console.error(e);
          }
        }
      }

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('products').insert([{ ...product, photo_url: photoUrl }]).select().single();
        if (error) throw error;
        return data as Product;
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.PRODUCTS) || '[]');
        const newProduct: Product = {
          ...product,
          id: 'prod-' + Math.random().toString(36).substring(2, 9),
          photo_url: photoUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        list.push(newProduct);
        localStorage.setItem(MOCK_KEYS.PRODUCTS, JSON.stringify(list));
        return newProduct;
      }
    },

    async update(id: string, product: Partial<Product>, imageFile?: File): Promise<Product> {
      let photoUrl = product.photo_url;

      if (imageFile) {
        if (isSupabaseConfigured && supabase) {
          const fileName = `${Date.now()}-${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          const { error: uploadError } = await supabase.storage.from('cosmetics_photos').upload(fileName, imageFile);
          if (uploadError) throw uploadError;
          const { data: publicUrlData } = supabase.storage.from('cosmetics_photos').getPublicUrl(fileName);
          photoUrl = publicUrlData.publicUrl;
        } else {
          try {
            photoUrl = await fileToBase64(imageFile);
          } catch (e) {
            console.error(e);
          }
        }
      }

      const updateData = {
        ...product,
        ...(photoUrl ? { photo_url: photoUrl } : {}),
        updated_at: new Date().toISOString()
      };

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('products').update(updateData).eq('id', id).select().single();
        if (error) throw error;
        return data as Product;
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.PRODUCTS) || '[]');
        const idx = list.findIndex((p: any) => p.id === id);
        if (idx === -1) throw new Error('Produto não encontrado');
        const updated = { ...list[idx], ...updateData } as Product;
        list[idx] = updated;
        localStorage.setItem(MOCK_KEYS.PRODUCTS, JSON.stringify(list));
        return updated;
      }
    },

    async delete(id: string): Promise<void> {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.PRODUCTS) || '[]');
        localStorage.setItem(MOCK_KEYS.PRODUCTS, JSON.stringify(list.filter((p: any) => p.id !== id)));
      }
    }
  },

  // --- RESELLERS ---
  resellers: {
    async getAll(): Promise<Reseller[]> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('resellers').select('*').order('name', { ascending: true });
        if (error) throw error;
        return data as Reseller[];
      } else {
        return JSON.parse(localStorage.getItem(MOCK_KEYS.RESELLERS) || '[]');
      }
    },
    async create(reseller: Omit<Reseller, 'id' | 'created_at'>): Promise<Reseller> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('resellers').insert([reseller]).select().single();
        if (error) throw error;
        return data as Reseller;
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.RESELLERS) || '[]');
        const newReseller: Reseller = {
          ...reseller,
          id: 'reseller-' + Math.random().toString(36).substring(2, 9),
          created_at: new Date().toISOString()
        };
        list.push(newReseller);
        localStorage.setItem(MOCK_KEYS.RESELLERS, JSON.stringify(list));
        return newReseller;
      }
    },
    async update(id: string, reseller: Partial<Reseller>): Promise<Reseller> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('resellers').update(reseller).eq('id', id).select().single();
        if (error) throw error;
        return data as Reseller;
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.RESELLERS) || '[]');
        const idx = list.findIndex((r: any) => r.id === id);
        if (idx === -1) throw new Error('Revendedor não encontrado');
        const updated = { ...list[idx], ...reseller } as Reseller;
        list[idx] = updated;
        localStorage.setItem(MOCK_KEYS.RESELLERS, JSON.stringify(list));
        return updated;
      }
    },
    async delete(id: string): Promise<void> {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('resellers').delete().eq('id', id);
        if (error) throw error;
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.RESELLERS) || '[]');
        localStorage.setItem(MOCK_KEYS.RESELLERS, JSON.stringify(list.filter((r: any) => r.id !== id)));

        // Remove reference in customers
        const customers = JSON.parse(localStorage.getItem(MOCK_KEYS.CUSTOMERS) || '[]');
        const updatedCusts = customers.map((c: any) => c.reseller_id === id ? { ...c, is_reseller: false, reseller_id: null } : c);
        localStorage.setItem(MOCK_KEYS.CUSTOMERS, JSON.stringify(updatedCusts));
      }
    }
  },

  // --- CUSTOMERS ---
  customers: {
    async getAll(): Promise<Customer[]> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('customers').select('*').order('name', { ascending: true });
        if (error){
          console.log("Erro ao consultar os clientes")
          throw error;
        } 
        return data as Customer[];
      } else {
        return JSON.parse(localStorage.getItem(MOCK_KEYS.CUSTOMERS) || '[]');
      }
    },
    async create(customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('customers').insert([customer]).select().single();
        if (error) throw error;
        return data as Customer;
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.CUSTOMERS) || '[]');
        const newCust: Customer = {
          ...customer,
          id: 'cust-' + Math.random().toString(36).substring(2, 9),
          created_at: new Date().toISOString()
        };
        list.push(newCust);
        localStorage.setItem(MOCK_KEYS.CUSTOMERS, JSON.stringify(list));
        return newCust;
      }
    },
    async update(id: string, customer: Partial<Customer>): Promise<Customer> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('customers').update(customer).eq('id', id).select().single();
        if (error) throw error;
        return data as Customer;
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.CUSTOMERS) || '[]');
        const idx = list.findIndex((c: any) => c.id === id);
        if (idx === -1) throw new Error('Cliente não encontrado');
        const updated = { ...list[idx], ...customer } as Customer;
        list[idx] = updated;
        localStorage.setItem(MOCK_KEYS.CUSTOMERS, JSON.stringify(list));
        return updated;
      }
    },
    async delete(id: string): Promise<void> {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.CUSTOMERS) || '[]');
        localStorage.setItem(MOCK_KEYS.CUSTOMERS, JSON.stringify(list.filter((c: any) => c.id !== id)));
      }
    },
    async adjustDebt(id: string, amount: number): Promise<void> {
      if (isSupabaseConfigured && supabase) {
        const { data: customer, error: fetchErr } = await supabase.from('customers').select('debt').eq('id', id).single();
        if (fetchErr) throw fetchErr;
        const newDebt = Math.max(0, (customer.debt || 0) + amount);
        const { error: updateErr } = await supabase.from('customers').update({ debt: newDebt }).eq('id', id);
        if (updateErr) throw updateErr;
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.CUSTOMERS) || '[]');
        const idx = list.findIndex((c: any) => c.id === id);
        if (idx !== -1) {
          list[idx].debt = Math.max(0, (list[idx].debt || 0) + amount);
          localStorage.setItem(MOCK_KEYS.CUSTOMERS, JSON.stringify(list));
        }
      }
    },

    // Ajusta o saldo de crédito do cliente (usado em trocas onde a loja fica devendo o cliente).
    // Diferente da dívida, o crédito é consumido manualmente por quem atender o cliente numa próxima compra.
    async adjustCredit(id: string, amount: number): Promise<void> {
      if (isSupabaseConfigured && supabase) {
        const { data: customer, error: fetchErr } = await supabase.from('customers').select('credit_balance').eq('id', id).single();
        if (fetchErr) throw fetchErr;
        const newCredit = Math.max(0, (customer.credit_balance || 0) + amount);
        const { error: updateErr } = await supabase.from('customers').update({ credit_balance: newCredit }).eq('id', id);
        if (updateErr) throw updateErr;
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.CUSTOMERS) || '[]');
        const idx = list.findIndex((c: any) => c.id === id);
        if (idx !== -1) {
          list[idx].credit_balance = Math.max(0, (list[idx].credit_balance || 0) + amount);
          localStorage.setItem(MOCK_KEYS.CUSTOMERS, JSON.stringify(list));
        }
      }
    }
  },

  // --- CASH REGISTER ---
  cash: {
    async getActiveSession(): Promise<CashRegister | null> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('cash_register').select('*').eq('status', 'open').maybeSingle();
        if (error) throw error;
        return data as CashRegister;
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.CASH_REGISTER) || '[]');
        return list.find((c: any) => c.status === 'open') || null;
      }
    },

    async openRegister(openedBy: string, balance: number): Promise<CashRegister> {
      const timestamp = new Date().toISOString();
      const payload = {
        opened_at: timestamp,
        opening_balance: balance,
        status: 'open',
        opened_by: openedBy
      };

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('cash_register').insert([payload]).select().single();
        if (error) throw error;

        // Create opening cash movement
        await supabase.from('cash_movements').insert([{
          cash_register_id: data.id,
          type: 'entrada',
          amount: balance,
          description: 'Abertura de Caixa',
          payment_method: 'Dinheiro',
          created_at: timestamp
        }]);

        return data as CashRegister;
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.CASH_REGISTER) || '[]');
        const newSession: CashRegister = {
          id: 'cash-session-' + Math.random().toString(36).substring(2, 9),
          opened_at: timestamp,
          closed_at: null,
          opening_balance: balance,
          closing_balance: null,
          status: 'open',
          opened_by: openedBy,
          closed_by: null
        };
        list.push(newSession);
        localStorage.setItem(MOCK_KEYS.CASH_REGISTER, JSON.stringify(list));

        // Create movement
        const movs = JSON.parse(localStorage.getItem(MOCK_KEYS.CASH_MOVEMENTS) || '[]');
        movs.push({
          id: 'c-mov-' + Math.random().toString(36).substring(2, 9),
          cash_register_id: newSession.id,
          type: 'entrada',
          amount: balance,
          description: 'Abertura de Caixa',
          payment_method: 'Dinheiro',
          created_at: timestamp
        });
        localStorage.setItem(MOCK_KEYS.CASH_MOVEMENTS, JSON.stringify(movs));

        return newSession;
      }
    },

    async closeRegister(sessionId: string, closedBy: string, closingBalance: number): Promise<void> {
      const timestamp = new Date().toISOString();
      const updateData = {
        closed_at: timestamp,
        closing_balance: closingBalance,
        status: 'closed',
        closed_by: closedBy
      };

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('cash_register').update(updateData).eq('id', sessionId);
        if (error) throw error;
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.CASH_REGISTER) || '[]');
        const idx = list.findIndex((c: any) => c.id === sessionId);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...updateData };
          localStorage.setItem(MOCK_KEYS.CASH_REGISTER, JSON.stringify(list));
        }
      }
    },

    async addMovement(movement: Omit<CashMovement, 'id' | 'created_at'>): Promise<CashMovement> {
      const timestamp = new Date().toISOString();
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('cash_movements').insert([{ ...movement, created_at: timestamp }]).select().single();
        if (error) throw error;
        return data as CashMovement;
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.CASH_MOVEMENTS) || '[]');
        const newMov: CashMovement = {
          ...movement,
          id: 'c-mov-' + Math.random().toString(36).substring(2, 9),
          created_at: timestamp
        };
        list.push(newMov);
        localStorage.setItem(MOCK_KEYS.CASH_MOVEMENTS, JSON.stringify(list));
        return newMov;
      }
    },

    async getMovements(sessionId: string): Promise<CashMovement[]> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('cash_movements').select('*').eq('cash_register_id', sessionId).order('created_at', { ascending: true });
        if (error) throw error;
        return data as CashMovement[];
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.CASH_MOVEMENTS) || '[]');
        return list.filter((m: any) => m.cash_register_id === sessionId);
      }
    }
  },

  // --- STOCK MOVEMENTS ---
  movements: {
    async getAll(): Promise<StockMovement[]> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('stock_movements').select('*, products(name)').order('created_at', { ascending: false });
         if (error){
          console.log("Erro ao consultar os movimentos")
          throw error;
        } 
        return (data || []).map((m: any) => ({ ...m, product_name: m.products?.name || 'Produto Removido' })) as StockMovement[];
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.STOCK_MOVEMENTS) || '[]');
        const products = JSON.parse(localStorage.getItem(MOCK_KEYS.PRODUCTS) || '[]');
        const pMap = new Map(products.map((p: any) => [p.id, p.name]));
        return list.map((m: any) => ({ ...m, product_name: pMap.get(m.product_id) || 'Produto Removido' })).sort((a: any, b: any) => b.created_at.localeCompare(a.created_at));
      }
    },

    async create(movement: Omit<StockMovement, 'id' | 'created_at'>): Promise<StockMovement> {
      const timestamp = new Date().toISOString();
      if (isSupabaseConfigured && supabase) {
        const { data: newMovement, error: mErr } = await supabase.from('stock_movements').insert([{ ...movement, created_at: timestamp }]).select().single();
        if (mErr) throw mErr;
        const { data: prod, error: pErr } = await supabase.from('products').select('stock').eq('id', movement.product_id).single();
        if (pErr) throw pErr;

        let newStock = prod.stock;
        if (movement.type === 'Entrada' || movement.type === 'Estorno de Venda') newStock += movement.quantity;
        else if (movement.type === 'Saída manual' || movement.type === 'Venda') newStock = Math.max(0, newStock - movement.quantity);
        else if (movement.type === 'Ajuste') newStock = movement.quantity;

        await supabase.from('products').update({ stock: newStock, updated_at: timestamp }).eq('id', movement.product_id);
        return newMovement as StockMovement;
      } else {
        const movementsList = JSON.parse(localStorage.getItem(MOCK_KEYS.STOCK_MOVEMENTS) || '[]');
        const products = JSON.parse(localStorage.getItem(MOCK_KEYS.PRODUCTS) || '[]');
        const idx = products.findIndex((p: any) => p.id === movement.product_id);
        if (idx === -1) throw new Error('Produto não cadastrado');

        let newStock = products[idx].stock;
        if (movement.type === 'Entrada' || movement.type === 'Estorno de Venda') newStock += movement.quantity;
        else if (movement.type === 'Saída manual' || movement.type === 'Venda') newStock = Math.max(0, newStock - movement.quantity);
        else if (movement.type === 'Ajuste') newStock = movement.quantity;

        products[idx].stock = newStock;
        products[idx].updated_at = timestamp;
        localStorage.setItem(MOCK_KEYS.PRODUCTS, JSON.stringify(products));

        const newMov: StockMovement = {
          ...movement,
          id: 'mov-' + Math.random().toString(36).substring(2, 9),
          created_at: timestamp,
          product_name: products[idx].name
        };
        movementsList.unshift(newMov);
        localStorage.setItem(MOCK_KEYS.STOCK_MOVEMENTS, JSON.stringify(movementsList.map(({ product_name, ...m }: any) => m)));
        return newMov;
      }
    }
  },

  // --- SALES ---
  sales: {
    async getAll(): Promise<Sale[]> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('sales').select('*, customers(name)').order('created_at', { ascending: false });
         if (error){
          console.log("Erro ao consultar os vendas")
          throw error;
        } 
        return (data || []).map((s: any) => ({ ...s, customer_name: s.customers?.name || null })) as Sale[];
      } else {
        const sales = JSON.parse(localStorage.getItem(MOCK_KEYS.SALES) || '[]');
        const customers = JSON.parse(localStorage.getItem(MOCK_KEYS.CUSTOMERS) || '[]');
        const cMap = new Map(customers.map((c: any) => [c.id, c.name]));
        return sales.map((s: any) => ({ ...s, customer_name: cMap.get(s.customer_id) || null })).sort((a: any, b: any) => b.created_at.localeCompare(a.created_at));
      }
    },

    async getItems(saleId: string): Promise<SaleItem[]> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('sale_items').select('*, products(name)').eq('sale_id', saleId);
        if (error) throw error;
        return (data || []).map((item: any) => ({ ...item, product_name: item.products?.name || 'Produto Removido' })) as SaleItem[];
      } else {
        const items = JSON.parse(localStorage.getItem(MOCK_KEYS.SALE_ITEMS) || '[]');
        const products = JSON.parse(localStorage.getItem(MOCK_KEYS.PRODUCTS) || '[]');
        const pMap = new Map(products.map((p: any) => [p.id, p.name]));
        return items.filter((item: any) => item.sale_id === saleId).map((item: any) => ({ ...item, product_name: pMap.get(item.product_id) || 'Produto Removido' }));
      }
    },

    async create(
      saleData: Omit<Sale, 'id' | 'created_at'>,
      items: Array<Omit<SaleItem, 'id' | 'sale_id'>>,
      installmentDueDates?: string[]
    ): Promise<Sale> {
      const timestamp = new Date().toISOString();
      const currentUserEmail = saleData.user_email;
      // Garante que installments sempre tem um valor válido (default 1 para pagamentos à vista)
      const preparedSaleData = { ...saleData, installments: saleData.installments ?? 1 };

      if (isSupabaseConfigured && supabase) {
        const { data: newSale, error: saleErr } = await supabase.from('sales').insert([{ ...preparedSaleData, created_at: timestamp }]).select().single();
        if (saleErr) throw saleErr;

        const saleId = newSale.id;
        const preparedItems = items.map(item => ({ ...item, sale_id: saleId }));
        const { error: itemsErr } = await supabase.from('sale_items').insert(preparedItems);
        if (itemsErr) throw itemsErr;

        // Log Stock movements
        for (const item of items) {
          await dbService.movements.create({
            product_id: item.product_id,
            type: 'Venda',
            quantity: item.quantity,
            user_email: currentUserEmail,
            observation: `Venda registrada #${saleId.substring(0, 8)}`
          });
        }

        // Gera as parcelas (contas a receber) ANTES de mexer na dívida do cliente.
        // Se o insert de parcelas falhar, a dívida não é alterada — evita inconsistência.
        if (preparedSaleData.payment_method === 'Boleto') {
          const plan = generateInstallmentPlan(saleId, preparedSaleData.total_price, preparedSaleData.installments || 1, new Date(timestamp), installmentDueDates);
          const { error: instErr } = await supabase.from('sale_installments').insert(plan);
          if (instErr) throw instErr;
        }

        // Adjust customer debt if Crediário ou Boleto (dinheiro não entra na hora)
        if (DEFERRED_PAYMENT_METHODS.includes(preparedSaleData.payment_method) && preparedSaleData.customer_id) {
          await dbService.customers.adjustDebt(preparedSaleData.customer_id, preparedSaleData.total_price);
        }

        // Adjust Cash movements apenas se for pagamento imediato (não Crediário nem Boleto)
        if (!DEFERRED_PAYMENT_METHODS.includes(preparedSaleData.payment_method) && preparedSaleData.cash_register_id) {
          await dbService.cash.addMovement({
            cash_register_id: preparedSaleData.cash_register_id,
            type: 'entrada',
            amount: preparedSaleData.total_price,
            description: `Venda #${saleId.substring(0, 8)}`,
            payment_method: preparedSaleData.payment_method as any
          });
        }

        return newSale as Sale;
      } else {
        const salesList = JSON.parse(localStorage.getItem(MOCK_KEYS.SALES) || '[]');
        const saleItemsList = JSON.parse(localStorage.getItem(MOCK_KEYS.SALE_ITEMS) || '[]');
        const newSaleId = 'sale-' + Math.random().toString(36).substring(2, 9);

        let cName: string | null = null;
        if (preparedSaleData.customer_id) {
          const custs = JSON.parse(localStorage.getItem(MOCK_KEYS.CUSTOMERS) || '[]');
          cName = custs.find((c: any) => c.id === preparedSaleData.customer_id)?.name || null;
        }

        const newSale: Sale = {
          ...preparedSaleData,
          id: newSaleId,
          customer_name: cName,
          created_at: timestamp
        };

        const newItems = items.map(item => {
          const newItem = { ...item, id: 'item-' + Math.random().toString(36).substring(2, 9), sale_id: newSaleId };
          saleItemsList.push(newItem);
          return newItem;
        });

        salesList.unshift(newSale);
        localStorage.setItem(MOCK_KEYS.SALES, JSON.stringify(salesList));
        localStorage.setItem(MOCK_KEYS.SALE_ITEMS, JSON.stringify(saleItemsList));

        // Log Stock movements
        for (const item of items) {
          await dbService.movements.create({
            product_id: item.product_id,
            type: 'Venda',
            quantity: item.quantity,
            user_email: currentUserEmail,
            observation: `Venda registrada #${newSaleId.substring(0, 8)}`
          });
        }

        // Gera as parcelas (contas a receber) ANTES de mexer na dívida do cliente.
        // Se algo falhar aqui, a dívida não é alterada — evita inconsistência.
        if (preparedSaleData.payment_method === 'Boleto') {
          const plan = generateInstallmentPlan(newSaleId, preparedSaleData.total_price, preparedSaleData.installments || 1, new Date(timestamp), installmentDueDates);
          const instList = JSON.parse(localStorage.getItem(MOCK_KEYS.SALE_INSTALLMENTS) || '[]');
          const newInstallments = plan.map(inst => ({ ...inst, id: 'inst-' + Math.random().toString(36).substring(2, 9) }));
          instList.push(...newInstallments);
          localStorage.setItem(MOCK_KEYS.SALE_INSTALLMENTS, JSON.stringify(instList));
        }

        // Adjust Debt (Crediário ou Boleto)
        if (DEFERRED_PAYMENT_METHODS.includes(preparedSaleData.payment_method) && preparedSaleData.customer_id) {
          await dbService.customers.adjustDebt(preparedSaleData.customer_id, preparedSaleData.total_price);
        }

        // Adjust Cash movements (apenas pagamento imediato)
        if (!DEFERRED_PAYMENT_METHODS.includes(preparedSaleData.payment_method) && preparedSaleData.cash_register_id) {
          await dbService.cash.addMovement({
            cash_register_id: preparedSaleData.cash_register_id,
            type: 'entrada',
            amount: preparedSaleData.total_price,
            description: `Venda #${newSaleId.substring(0, 8)}`,
            payment_method: preparedSaleData.payment_method as any
          });
        }

        newSale.items = newItems;
        return newSale;
      }
    },

    async delete(id: string): Promise<void> {
      const currentUserEmail = 'admin@jaja.com';

      if (isSupabaseConfigured && supabase) {
        const { data: sale, error: sErr } = await supabase.from('sales').select('*').eq('id', id).single();
        if (sErr) throw sErr;
        const { data: items, error: iErr } = await supabase.from('sale_items').select('*').eq('sale_id', id);
        if (iErr) throw iErr;

        // Restore stock
        for (const item of items) {
          await dbService.movements.create({
            product_id: item.product_id,
            type: 'Estorno de Venda',
            quantity: item.quantity,
            user_email: currentUserEmail,
            observation: `Estorno de venda #${id.substring(0, 8)}`
          });
        }

        // Debt adjustment (Crediário ou Boleto)
        if (DEFERRED_PAYMENT_METHODS.includes(sale.payment_method) && sale.customer_id) {
          await dbService.customers.adjustDebt(sale.customer_id, -sale.total_price);
        }

        // Cash flow removal (apenas pagamento imediato)
        if (!DEFERRED_PAYMENT_METHODS.includes(sale.payment_method) && sale.cash_register_id) {
          await dbService.cash.addMovement({
            cash_register_id: sale.cash_register_id,
            type: 'saida',
            amount: sale.total_price,
            description: `Estorno de Venda #${id.substring(0, 8)}`,
            payment_method: sale.payment_method as any
          });
        }

        await supabase.from('sale_items').delete().eq('sale_id', id);
        await supabase.from('sales').delete().eq('id', id);
      } else {
        const salesList = JSON.parse(localStorage.getItem(MOCK_KEYS.SALES) || '[]');
        const idx = salesList.findIndex((s: any) => s.id === id);
        if (idx === -1) throw new Error('Venda não encontrada');
        const sale = salesList[idx];
        const items = await this.getItems(id);

        // Restore stock
        for (const item of items) {
          await dbService.movements.create({
            product_id: item.product_id,
            type: 'Estorno de Venda',
            quantity: item.quantity,
            user_email: currentUserEmail,
            observation: `Estorno de venda #${id.substring(0, 8)}`
          });
        }

        // Debt adjustment (Crediário ou Boleto)
        if (DEFERRED_PAYMENT_METHODS.includes(sale.payment_method) && sale.customer_id) {
          await dbService.customers.adjustDebt(sale.customer_id, -sale.total_price);
        }

        // Cash flow removal (apenas pagamento imediato)
        if (!DEFERRED_PAYMENT_METHODS.includes(sale.payment_method) && sale.cash_register_id) {
          await dbService.cash.addMovement({
            cash_register_id: sale.cash_register_id,
            type: 'saida',
            amount: sale.total_price,
            description: `Estorno de Venda #${id.substring(0, 8)}`,
            payment_method: sale.payment_method as any
          });
        }

        localStorage.setItem(MOCK_KEYS.SALES, JSON.stringify(salesList.filter((s: any) => s.id !== id)));

        const itemsList = JSON.parse(localStorage.getItem(MOCK_KEYS.SALE_ITEMS) || '[]');
        localStorage.setItem(MOCK_KEYS.SALE_ITEMS, JSON.stringify(itemsList.filter((item: any) => item.sale_id !== id)));

        const instList = JSON.parse(localStorage.getItem(MOCK_KEYS.SALE_INSTALLMENTS) || '[]');
        localStorage.setItem(MOCK_KEYS.SALE_INSTALLMENTS, JSON.stringify(instList.filter((inst: any) => inst.sale_id !== id)));
      }
    }
  },

  // --- SALE INSTALLMENTS (CONTAS A RECEBER) ---
  installments: {
    async getAll(): Promise<SaleInstallment[]> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('sale_installments')
          .select('*, sales(customer_id, customers(name))')
          .order('due_date', { ascending: true });
         if (error){
          console.log("Erro ao consultar os installments")
          throw error;
        } 
        return (data || []).map((inst: any) => ({
          ...inst,
          customer_id: inst.sales?.customer_id || null,
          customer_name: inst.sales?.customers?.name || null
        })) as SaleInstallment[];
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.SALE_INSTALLMENTS) || '[]');
        const sales = JSON.parse(localStorage.getItem(MOCK_KEYS.SALES) || '[]');
        const customers = JSON.parse(localStorage.getItem(MOCK_KEYS.CUSTOMERS) || '[]');
        const saleMap = new Map(sales.map((s: any) => [s.id, s]));
        const custMap = new Map(customers.map((c: any) => [c.id, c.name]));

        return list
          .map((inst: any) => {
            const sale = saleMap.get(inst.sale_id) as any;
            return {
              ...inst,
              customer_id: sale?.customer_id || null,
              customer_name: sale?.customer_id ? custMap.get(sale.customer_id) || null : null
            };
          })
          .sort((a: any, b: any) => a.due_date.localeCompare(b.due_date));
      }
    },

    async markAsPaid(
      installment: SaleInstallment,
      paidAmount: number,
      paymentMethod: 'PIX' | 'Cartão' | 'Dinheiro',
      cashRegisterId: string | null
    ): Promise<void> {
      const timestamp = new Date().toISOString();
      const updateData = {
        status: 'pago' as const,
        paid_at: timestamp,
        paid_amount: paidAmount,
        payment_method: paymentMethod
      };

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('sale_installments').update(updateData).eq('id', installment.id);
        if (error) throw error;
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.SALE_INSTALLMENTS) || '[]');
        const idx = list.findIndex((i: any) => i.id === installment.id);
        if (idx === -1) throw new Error('Parcela não encontrada');
        list[idx] = { ...list[idx], ...updateData };
        localStorage.setItem(MOCK_KEYS.SALE_INSTALLMENTS, JSON.stringify(list));
      }

      // Baixa a dívida do cliente referente a essa parcela
      if (installment.customer_id) {
        await dbService.customers.adjustDebt(installment.customer_id, -paidAmount);
      }

      // Registra a entrada real de dinheiro no caixa (se houver sessão aberta)
      if (cashRegisterId) {
        await dbService.cash.addMovement({
          cash_register_id: cashRegisterId,
          type: 'entrada',
          amount: paidAmount,
          description: `Parcela ${installment.installment_number} - Venda #${installment.sale_id.substring(0, 8)}`,
          payment_method: paymentMethod
        });
      }
    }
  },

  // --- EXCHANGES (TROCA DE PRODUTOS) ---
  exchanges: {
    async getAll(): Promise<Exchange[]> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('exchanges')
          .select('*, customers(name)')
          .order('created_at', { ascending: false });
        if (error) {
          console.log("Erro ao consultar as trocas");
          throw error;
        }
        return (data || []).map((ex: any) => ({
          ...ex,
          customer_name: ex.customers?.name || null
        })) as Exchange[];
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.EXCHANGES) || '[]');
        const customers = JSON.parse(localStorage.getItem(MOCK_KEYS.CUSTOMERS) || '[]');
        const custMap = new Map(customers.map((c: any) => [c.id, c.name]));
        return list
          .map((ex: any) => ({ ...ex, customer_name: ex.customer_id ? custMap.get(ex.customer_id) || null : null }))
          .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at));
      }
    },

    /**
     * Cria uma troca de produtos.
     * - returnedItems: produtos que o cliente está devolvendo (voltam pro estoque)
     * - newItems: produtos que o cliente está levando no lugar (saem do estoque)
     * - resolution: como a diferença de valor (se houver) é resolvida
     */
    async create(params: {
      original_sale_id: string | null;
      customer_id: string | null;
      returnedItems: Array<{ product_id: string; quantity: number; price: number }>;
      newItems: Array<{ product_id: string; quantity: number; price: number }>;
      resolution: 'sem_diferenca' | 'pago_pelo_cliente' | 'devolvido_ao_cliente' | 'credito_cliente' | 'divida_cliente';
      payment_method: 'PIX' | 'Cartão' | 'Dinheiro' | null;
      user_email: string;
      cash_register_id: string | null;
    }): Promise<Exchange> {
      const timestamp = new Date().toISOString();

      const totalReturned = params.returnedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const totalNew = params.newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const priceDifference = Math.round((totalNew - totalReturned) * 100) / 100;

      const exchangePayload = {
        original_sale_id: params.original_sale_id,
        customer_id: params.customer_id,
        total_returned: totalReturned,
        total_new: totalNew,
        price_difference: priceDifference,
        resolution: params.resolution,
        payment_method: params.payment_method,
        user_email: params.user_email,
        cash_register_id: params.cash_register_id
      };

      let newExchange: Exchange;

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('exchanges').insert([{ ...exchangePayload, created_at: timestamp }]).select().single();
        if (error) throw error;
        newExchange = data as Exchange;

        const itemRows = [
          ...params.returnedItems.map(i => ({ exchange_id: newExchange.id, direction: 'devolvido', ...i })),
          ...params.newItems.map(i => ({ exchange_id: newExchange.id, direction: 'novo', ...i }))
        ];
        const { error: itemsErr } = await supabase.from('exchange_items').insert(itemRows);
        if (itemsErr) throw itemsErr;
      } else {
        const list = JSON.parse(localStorage.getItem(MOCK_KEYS.EXCHANGES) || '[]');
        const newId = 'exchange-' + Math.random().toString(36).substring(2, 9);
        newExchange = { ...exchangePayload, id: newId, created_at: timestamp } as Exchange;
        list.unshift(newExchange);
        localStorage.setItem(MOCK_KEYS.EXCHANGES, JSON.stringify(list));

        const itemsList = JSON.parse(localStorage.getItem(MOCK_KEYS.EXCHANGE_ITEMS) || '[]');
        const itemRows = [
          ...params.returnedItems.map(i => ({ id: 'exitem-' + Math.random().toString(36).substring(2, 9), exchange_id: newId, direction: 'devolvido', ...i })),
          ...params.newItems.map(i => ({ id: 'exitem-' + Math.random().toString(36).substring(2, 9), exchange_id: newId, direction: 'novo', ...i }))
        ];
        itemsList.push(...itemRows);
        localStorage.setItem(MOCK_KEYS.EXCHANGE_ITEMS, JSON.stringify(itemsList));
      }

      // Devolve ao estoque os produtos que o cliente trouxe de volta
      for (const item of params.returnedItems) {
        await dbService.movements.create({
          product_id: item.product_id,
          type: 'Estorno de Venda',
          quantity: item.quantity,
          user_email: params.user_email,
          observation: `Troca #${newExchange.id.substring(0, 8)} - produto devolvido`
        });
      }

      // Retira do estoque os novos produtos entregues ao cliente
      for (const item of params.newItems) {
        await dbService.movements.create({
          product_id: item.product_id,
          type: 'Venda',
          quantity: item.quantity,
          user_email: params.user_email,
          observation: `Troca #${newExchange.id.substring(0, 8)} - novo produto entregue`
        });
      }

      // Resolve a diferença de valor, conforme escolhido
      const diffAbs = Math.abs(priceDifference);

      if (params.resolution === 'pago_pelo_cliente' && params.payment_method) {
        // Cliente pagou a diferença na hora: registra como uma VENDA de verdade
        // (não só uma entrada de caixa avulsa), pra que apareça em "Vendas Hoje",
        // "Vendas no Mês" e no gráfico do dashboard. A própria dbService.sales.create
        // já cuida de lançar a entrada de caixa correspondente automaticamente.
        await dbService.sales.create({
          total_price: diffAbs,
          discount: 0,
          payment_method: params.payment_method,
          installments: 1,
          customer_id: params.customer_id,
          user_email: params.user_email,
          cash_register_id: params.cash_register_id
        }, []);
      } else if (params.resolution === 'devolvido_ao_cliente' && params.cash_register_id && params.payment_method) {
        // Loja devolveu a diferença na hora: dinheiro sai do caixa
        await dbService.cash.addMovement({
          cash_register_id: params.cash_register_id,
          type: 'saida',
          amount: diffAbs,
          description: `Troca #${newExchange.id.substring(0, 8)} - diferença devolvida ao cliente`,
          payment_method: params.payment_method
        });
      } else if (params.resolution === 'divida_cliente' && params.customer_id) {
        // Diferença vira dívida do cliente
        await dbService.customers.adjustDebt(params.customer_id, diffAbs);
      } else if (params.resolution === 'credito_cliente' && params.customer_id) {
        // Diferença vira crédito do cliente para uso futuro
        await dbService.customers.adjustCredit(params.customer_id, diffAbs);
      }

      return newExchange;
    }
  },

  // --- IMPORT & EXPORTS ---
  exportDatabase() {
    const dbState = {
      categories: JSON.parse(localStorage.getItem(MOCK_KEYS.CATEGORIES) || '[]'),
      products: JSON.parse(localStorage.getItem(MOCK_KEYS.PRODUCTS) || '[]'),
      customers: JSON.parse(localStorage.getItem(MOCK_KEYS.CUSTOMERS) || '[]'),
      resellers: JSON.parse(localStorage.getItem(MOCK_KEYS.RESELLERS) || '[]'),
      cash_register: JSON.parse(localStorage.getItem(MOCK_KEYS.CASH_REGISTER) || '[]'),
      cash_movements: JSON.parse(localStorage.getItem(MOCK_KEYS.CASH_MOVEMENTS) || '[]'),
      sales: JSON.parse(localStorage.getItem(MOCK_KEYS.SALES) || '[]'),
      sale_items: JSON.parse(localStorage.getItem(MOCK_KEYS.SALE_ITEMS) || '[]'),
      sale_installments: JSON.parse(localStorage.getItem(MOCK_KEYS.SALE_INSTALLMENTS) || '[]'),
      stock_movements: JSON.parse(localStorage.getItem(MOCK_KEYS.STOCK_MOVEMENTS) || '[]'),
      exportedAt: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dbState));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_jaja_cosmeticos_v2_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  importDatabase(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.products && data.customers && data.sales) {
        if (data.categories) localStorage.setItem(MOCK_KEYS.CATEGORIES, JSON.stringify(data.categories));
        localStorage.setItem(MOCK_KEYS.PRODUCTS, JSON.stringify(data.products));
        localStorage.setItem(MOCK_KEYS.CUSTOMERS, JSON.stringify(data.customers));
        if (data.resellers) localStorage.setItem(MOCK_KEYS.RESELLERS, JSON.stringify(data.resellers));
        if (data.cash_register) localStorage.setItem(MOCK_KEYS.CASH_REGISTER, JSON.stringify(data.cash_register));
        if (data.cash_movements) localStorage.setItem(MOCK_KEYS.CASH_MOVEMENTS, JSON.stringify(data.cash_movements));
        localStorage.setItem(MOCK_KEYS.SALES, JSON.stringify(data.sales));
        if (data.sale_items) localStorage.setItem(MOCK_KEYS.SALE_ITEMS, JSON.stringify(data.sale_items));
        if (data.sale_installments) localStorage.setItem(MOCK_KEYS.SALE_INSTALLMENTS, JSON.stringify(data.sale_installments));
        if (data.stock_movements) localStorage.setItem(MOCK_KEYS.STOCK_MOVEMENTS, JSON.stringify(data.stock_movements));
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  clearAllData() {
    Object.values(MOCK_KEYS).forEach(k => localStorage.removeItem(k));
  }
};