import React, { useState, useEffect, useCallback } from 'react';
import { dbService, isSupabaseConfigured } from './supabaseClient';
import { Product, Client, Sale, StockMovement, SaleItem } from './types';

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

const App: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isInitializing, setIsInitializing] = useState(true);

  // Core Data Lists
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  // Connectivity type
  const dbType = isSupabaseConfigured ? 'Supabase' : 'Mock LocalStorage';

  // --- REFRESH DATA FUNCTION ---
  const refreshAllData = useCallback(async () => {
  try {
    // Guarda defensiva: verifica se dbService existe e tem os métodos esperados
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

    const [prods, clis, transactions, logs] = await Promise.all([
      dbService.products.getAll(),
      dbService.customers.getAll(),
      dbService.sales.getAll(),
      dbService.movements.getAll(),
    ]);

    setProducts(prods);
    setCustomers(clis);
    setSales(transactions);
    setMovements(logs);
  } catch (error) {
    console.error('Error fetching system data:', error);
  }
}, []);

  // Monitor Auth Changes
  useEffect(() => {
    const unsubscribe = dbService.auth.onAuthStateChange(async (user) => {
      if (user && user.email) {
        setUserEmail(user.email);
        await refreshAllData();
      } else {
        setUserEmail(null);
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, [refreshAllData]);

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
  const handleCreateClient = async (clientData: Omit<Client, 'id' | 'created_at'>) => {
    await dbService.clients.create(clientData);
    await refreshAllData();
  };

  const handleUpdateClient = async (id: string, clientData: Partial<Client>) => {
    await dbService.clients.update(id, clientData);
    await refreshAllData();
  };

  const handleDeleteClient = async (id: string) => {
    await dbService.clients.delete(id);
    await refreshAllData();
  };

  // Paying outstanding client debt (Crediário)
  const handlePayDebt = async (client: Client, amount: number, paymentMethod: string, obs: string) => {
    // 1. Reduce outstanding debt
    await dbService.clients.adjustDebt(client.id, -amount);

    // 2. Register virtual sale representing inflow of cash settling crediário
    // This allows dashboard figures to correctly capture payment as income
    await dbService.sales.create({
      total_price: amount,
      discount: 0,
      payment_method: paymentMethod as any,
      client_id: client.id,
      user_email: userEmail || 'sistema@jaja.com'
    }, []); // Empty items list (since it's a debt payment, no inventory is removed)

    // 3. Log a custom stock movement with quantity 0 to record audit trail in stock movements
    // product_id could be dummy or first product if database requires, but in our SQL schema we can have movements
    // linked to products. To avoid SQL constraint failures since movements requires product_id,
    // we can record this payment as a pure sale transaction (which is already logged in sales logs).
    // Let's write the Audit text directly into sales notes.
    
    await refreshAllData();
  };

  // ==========================================================================
  // TRANSACTION / SALE CALLBACKS
  // ==========================================================================
  const handleSubmitSale = async (
    saleData: {
      total_price: number;
      discount: number;
      payment_method: 'PIX' | 'Cartão' | 'Dinheiro' | 'Crediário';
      client_id: string | null;
    },
    items: Array<{
      product_id: string;
      quantity: number;
      price: number;
      cost_price: number;
    }>
  ) => {
    await dbService.sales.create({
      ...saleData,
      user_email: userEmail || 'sistema@jaja.com'
    }, items);
    await refreshAllData();
  };

  const handleGetSaleItems = async (saleId: string): Promise<SaleItem[]> => {
    return await dbService.sales.getItems(saleId);
  };

  const handleDeleteSale = async (saleId: string) => {
    await dbService.sales.delete(saleId);
    await refreshAllData();
  };

  // ==========================================================================
  // DATA MANAGEMENT FUNCTIONS (LOCAL STORAGE BACKUPS)
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
      {/* Sidebar Navigation */}
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        dbType={dbType}
      />

      {/* Main Panel Content */}
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
