import React, { useState, useEffect, useCallback } from 'react';
import { dbService, isSupabaseConfigured } from './supabaseClient';
import { Product, Customer, Sale, StockMovement, SaleItem, SaleInstallment } from './types';

// Import Components
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ProductsView } from './components/ProductsView';
import { PDVView } from './components/PDVView';
import { ClientsView } from './components/ClientsView';
import { MovementsView } from './components/MovementsView';
import { SettingsView } from './components/SettingsView';
import { LoginView } from './components/LoginView';
import { ReceivablesView } from './components/ReceivablesView';
import { ExchangeView } from './components/Exchangeview';

const App: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isInitializing, setIsInitializing] = useState(true);

  // Core Data Lists
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [installments, setInstallments] = useState<SaleInstallment[]>([]);
  const [activeCashRegisterId, setActiveCashRegisterId] = useState<string | null>(null);

  // Connectivity type
  const dbType = isSupabaseConfigured ? 'Supabase' : 'Mock LocalStorage';

  // --- REFRESH DATA FUNCTION ---
  const refreshAllData = useCallback(async () => {
    try {
      if (
        !dbService ||
        typeof dbService.products?.getAll !== 'function' ||
        typeof dbService.customers?.getAll !== 'function' ||
        typeof dbService.sales?.getAll !== 'function' ||
        typeof dbService.movements?.getAll !== 'function'
      ) {
        console.error('dbService não está pronto ainda.');
        return;
      }

      // Dados essenciais primeiro (produtos, clientes, vendas, movimentos).
      // Se qualquer um desses falhar, é importante que o erro apareça — por isso ainda usamos Promise.all aqui.
      const [prods, clis, transactions, logs] = await Promise.all([
        dbService.products.getAll(),
        dbService.customers.getAll(),
        dbService.sales.getAll(),
        dbService.movements.getAll(),
      ]);

      setProducts(prods);
      setClients(clis);
      setSales(transactions);
      setMovements(logs);

      // Dados de parcelas/caixa são carregados separadamente e de forma tolerante a falhas:
      // se a tabela de parcelas ou a sessão de caixa derem erro, isso NÃO deve
      // impedir a exibição de produtos, clientes e vendas.
      try {
        const installmentsList = await dbService.installments.getAll();
        setInstallments(installmentsList);
      } catch (error) {
        console.error('Erro ao buscar parcelas (contas a receber):', error);
      }

      try {
        const activeSession = await dbService.cash.getActiveSession();
        setActiveCashRegisterId(activeSession?.id || null);
      } catch (error) {
        console.error('Erro ao buscar sessão de caixa ativa:', error);
      }
    } catch (error) {
      console.error('Error fetching system data:', error);
    }
  }, []);

  // 1. Monitor Auth Changes
  useEffect(() => {
    const unsubscribe = dbService.auth.onAuthStateChange(async (user) => {
      if (user && user.email) {
        setUserEmail(user.email);
      } else {
        setUserEmail(null);
      }
      setIsInitializing(false);
    });

    return () => unsubscribe?.();
  }, []);

  // 2. Carrega dados quando usuário estiver pronto
  useEffect(() => {
    if (!userEmail) return;
    refreshAllData();
  }, [userEmail, refreshAllData]);

  // Handle Login Event
  const handleLoginSuccess = (email: string) => {
    setUserEmail(email);
    refreshAllData();
  };

  // Handle Logout
  const handleLogout = async () => {
    if (window.confirm('Tem certeza que deseja sair do sistema?')) {
      await dbService.auth.signOut();
      setUserEmail(null);
      setCurrentView('dashboard');
    }
  };

  // ==========================================================================
  // PRODUCT CALLBACKS
  // ==========================================================================
  const handleCreateProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>, file?: File) => {
    await dbService.products.create(productData, file);
    await refreshAllData();
  };

  const handleUpdateProduct = async (id: string, productData: Partial<Product>, file?: File) => {
    await dbService.products.update(id, productData, file);
    await refreshAllData();
  };

  const handleDeleteProduct = async (id: string) => {
    await dbService.products.delete(id);
    await refreshAllData();
  };

  const handleAddStockMovement = async (product_id: string, type: 'Entrada' | 'Saída manual' | 'Ajuste', quantity: number, obs: string) => {
    await dbService.movements.create({
      product_id,
      type,
      quantity,
      user_email: userEmail || 'sistema@jaja.com',
      observation: obs
    });
    await refreshAllData();
  };

  // ==========================================================================
  // CLIENT CALLBACKS
  // ==========================================================================
  const handleCreateClient = async (clientData: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> => {
    const newClient = await dbService.customers.create(clientData);
    await refreshAllData();
    return newClient;
  };

  const handleUpdateClient = async (id: string, clientData: Partial<Customer>) => {
    await dbService.customers.update(id, clientData);
    await refreshAllData();
  };

  const handleDeleteClient = async (id: string) => {
    await dbService.customers.delete(id);
    await refreshAllData();
  };

  const handlePayDebt = async (client: Customer, amount: number, paymentMethod: string, obs: string) => {
    await dbService.customers.adjustDebt(client.id, -amount);

    await dbService.sales.create({
      total_price: amount,
      discount: 0,
      payment_method: paymentMethod as any,
      installments: 1,
      customer_id: client.id,
      user_email: userEmail || 'sistema@jaja.com',
      cash_register_id: activeCashRegisterId
    }, []);

    await refreshAllData();
  };

  // ==========================================================================
  // TRANSACTION / SALE CALLBACKS
  // ==========================================================================
  const handleSubmitSale = async (
    saleData: {
      total_price: number;
      discount: number;
      payment_method: 'PIX' | 'Cartão' | 'Dinheiro' | 'Crediário' | 'Boleto';
      installments?: number | null;
      due_dates?: string[] | null;
      customer_id: string | null;
    },
    items: Array<{
      product_id: string;
      quantity: number;
      price: number;
      cost_price: number;
    }>
  ) => {
    const { due_dates, ...restSaleData } = saleData;
    await dbService.sales.create({
      ...restSaleData,
      installments: restSaleData.installments ?? 1,
      user_email: userEmail || 'sistema@jaja.com'
    }, items, due_dates || undefined);
    await refreshAllData();
  };

  const handleGetSaleItems = async (saleId: string): Promise<SaleItem[]> => {
    return await dbService.sales.getItems(saleId);
  };

  const handleMarkInstallmentAsPaid = async (
    installment: SaleInstallment,
    paidAmount: number,
    paymentMethod: 'PIX' | 'Cartão' | 'Dinheiro'
  ) => {
    await dbService.installments.markAsPaid(installment, paidAmount, paymentMethod, activeCashRegisterId);
    await refreshAllData();
  };

  const handleCreateExchange = async (params: {
    original_sale_id: string | null;
    customer_id: string | null;
    returnedItems: Array<{ product_id: string; quantity: number; price: number }>;
    newItems: Array<{ product_id: string; quantity: number; price: number }>;
    resolution: 'sem_diferenca' | 'pago_pelo_cliente' | 'devolvido_ao_cliente' | 'credito_cliente' | 'divida_cliente';
    payment_method: 'PIX' | 'Cartão' | 'Dinheiro' | null;
  }) => {
    await dbService.exchanges.create({
      ...params,
      user_email: userEmail || 'sistema@jaja.com',
      cash_register_id: activeCashRegisterId
    });
    await refreshAllData();
  };

  const handleDeleteSale = async (saleId: string) => {
    await dbService.sales.delete(saleId);
    await refreshAllData();
  };

  // ==========================================================================
  // DATA MANAGEMENT FUNCTIONS
  // ==========================================================================
  const handleClearAllData = () => {
    dbService.clearAllData();
  };

  const handleImportBackup = (jsonString: string): boolean => {
    return dbService.importDatabase(jsonString);
  };

  const handleExportBackup = () => {
    dbService.exportDatabase();
  };

  // --- NAVIGATION QUICK TRIGGERS ---
  const handleQuickSaleTrigger = () => {
    setCurrentView('pdv');
  };

  const handleNavigateToStock = () => {
    setCurrentView('estoque');
  };

  const handleNavigateToClients = () => {
    setCurrentView('clientes');
  };

  // Show Loading indicator on initialization
  if (isInitializing) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0b0914 0%, #151124 100%)',
        color: 'var(--text-primary)'
      }}>
        <i className="fa-solid fa-wand-magic-sparkles fa-spin" style={{ fontSize: '32px', color: 'var(--primary)', marginBottom: '15px' }}></i>
        <span>Iniciando o Sistema JAJA...</span>
      </div>
    );
  }

  // Enforce Authenticated session
  if (!userEmail) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="app-layout">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        dbType={dbType}
      />

      <main id="main-content">
        <Header
          currentView={currentView}
          userEmail={userEmail}
          onLogout={handleLogout}
          onQuickSale={handleQuickSaleTrigger}
        />

        <div className="content-body" id="view-container">
          {currentView === 'dashboard' && (
            <DashboardView
              products={products}
              sales={sales}
              clients={clients}
              onNavigateToStock={handleNavigateToStock}
              onNavigateToPDV={handleQuickSaleTrigger}
            />
          )}

          {currentView === 'estoque' && (
            <ProductsView
              products={products}
              onCreateProduct={handleCreateProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onAddStockMovement={handleAddStockMovement}
              userEmail={userEmail}
            />
          )}

          {currentView === 'pdv' && (
            <PDVView
              products={products}
              clients={clients}
              onSubmitSale={handleSubmitSale}
              onNavigateToClients={handleNavigateToClients}
              onCreateClient={handleCreateClient}
            />
          )}

          {currentView === 'clientes' && (
            <ClientsView
              clients={clients}
              onCreateClient={handleCreateClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
              onPayDebt={handlePayDebt}
            />
          )}

          {currentView === 'movimentacoes' && (
            <MovementsView
              movements={movements}
              sales={sales}
              onGetSaleItems={handleGetSaleItems}
              onDeleteSale={handleDeleteSale}
            />
          )}

          {currentView === 'recebiveis' && (
            <ReceivablesView
              installments={installments}
              clients={clients}
              hasOpenCashRegister={!!activeCashRegisterId}
              onMarkAsPaid={handleMarkInstallmentAsPaid}
              onPayDebt={handlePayDebt}
            />
          )}

          {currentView === 'trocas' && (
            <ExchangeView
              sales={sales}
              products={products}
              clients={clients}
              hasOpenCashRegister={!!activeCashRegisterId}
              activeCashRegisterId={activeCashRegisterId}
              userEmail={userEmail}
              onGetSaleItems={handleGetSaleItems}
              onCreateExchange={handleCreateExchange}
            />
          )}

          {currentView === 'configuracoes' && (
            <SettingsView
              dbType={dbType}
              onClearAllData={handleClearAllData}
              onImportBackup={handleImportBackup}
              onExportBackup={handleExportBackup}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;