import React, {
  useState,
  useEffect,
  useCallback
} from 'react';
import {
  dbService,
  isSupabaseConfigured
} from './supabaseClient';
import {
  Product,
  Customer,
  Sale,
  StockMovement,
  SaleItem,
  SaleInstallment,
  Payable,
  CashRegister,
  CashMovement
} from './types';
// ============================================================
// COMPONENTS
// ============================================================
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
import { PayablesView } from './components/Payablesview';
const App: React.FC = () => {
  // ==========================================================
  // AUTH
  // ==========================================================
  const [userEmail, setUserEmail] = useState<string | null>(null);
  // ==========================================================
  // NAVEGAÇÃO
  // ==========================================================
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isInitializing, setIsInitializing] = useState(true);
  // ==========================================================
  // DADOS
  // ==========================================================
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [installments, setInstallments] = useState<SaleInstallment[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  // ==========================================================
  // CAIXA
  // ==========================================================
  const [activeCashRegisterId, setActiveCashRegisterId] = useState<string | null>(null);
  const [activeCashRegister, setActiveCashRegister] = useState<CashRegister | null>(null);
  // ==========================================================
  // VENDA SELECIONADA PARA TROCA
  // ==========================================================
  const [selectedExchangeSale, setSelectedExchangeSale] = useState<Sale | null>(null);
  // ==========================================================
  // TIPO DO BANCO
  // ==========================================================
  const dbType = isSupabaseConfigured
    ? 'Supabase'
    : 'Mock LocalStorage';
  // ==========================================================
  // REFRESH DOS DADOS
  // ==========================================================
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
      const [
        prods,
        clis,
        transactions,
        logs
      ] = await Promise.all([
        dbService.products.getAll(),
        dbService.customers.getAll(),
        dbService.sales.getAll(),
        dbService.movements.getAll()
      ]);
      setProducts(prods);
      setClients(clis);
      setSales(transactions);
      setMovements(logs);
      // ======================================================
      // PARCELAS
      // ======================================================
      try {
        const installmentsList = await dbService.installments.getAll();
        setInstallments(installmentsList);
      } catch (error) {
        console.error(
          'Erro ao buscar parcelas (contas a receber):',
          error
        );
      }
      // ======================================================
      // CONTAS A PAGAR
      // ======================================================
      try {
        const payablesList = await dbService.payables.getAll();
        setPayables(payablesList);
      } catch (error) {
        console.error(
          'Erro ao buscar contas a pagar:',
          error
        );
      }
      // ======================================================
      // CAIXA
      // ======================================================
      try {
        const activeSession = await dbService.cash.getActiveSession();
        setActiveCashRegister(activeSession);
        setActiveCashRegisterId(activeSession?.id || null);
      } catch (error) {
        console.error(
          'Erro ao buscar sessão de caixa ativa:',
          error
        );
      }
    } catch (error) {
      console.error(
        'Error fetching system data:',
        error
      );
    }
  }, []);
  // ============================================================
  // CAIXA — ABERTURA
  // ============================================================
  const handleOpenRegister = async (balance: number): Promise<void> => {
    if (!userEmail) {
      throw new Error('Não foi possível identificar o usuário.');
    }
    if (!Number.isFinite(balance) || balance < 0) {
      throw new Error('O saldo inicial informado é inválido.');
    }
    const session = await dbService.cash.openRegister(
      userEmail,
      balance
    );
    setActiveCashRegister(session);
    setActiveCashRegisterId(session.id);
    await refreshAllData();
  };
  // ============================================================
  // CAIXA — FECHAMENTO
  // ============================================================
  const handleCloseRegister = async (
    closingBalance: number
  ): Promise<void> => {
    if (!activeCashRegister) {
      throw new Error('Não existe um caixa aberto.');
    }
    if (!userEmail) {
      throw new Error('Não foi possível identificar o usuário.');
    }
    if (!Number.isFinite(closingBalance) || closingBalance < 0) {
      throw new Error('O saldo final informado é inválido.');
    }
    await dbService.cash.closeRegister(
      activeCashRegister.id,
      userEmail,
      closingBalance
    );
    setActiveCashRegister(null);
    setActiveCashRegisterId(null);
    await refreshAllData();
  };
  // ============================================================
  // CAIXA — CONSULTAR MOVIMENTAÇÕES
  // ============================================================
  const handleGetCashMovements = async (
    sessionId: string
  ): Promise<CashMovement[]> => {
    return await dbService.cash.getMovements(sessionId);
  };
  // ============================================================
  // CAIXA — REGISTRAR DEDUÇÃO/SAÍDA DURANTE O DIA
  // ============================================================
  const handleAddCashMovement = async (
    movement: Omit<CashMovement, 'id' | 'created_at'>
  ): Promise<void> => {
    if (!activeCashRegister || movement.cash_register_id !== activeCashRegister.id) {
      throw new Error('Não existe um caixa aberto para registrar esta dedução.');
    }
    if (movement.type !== 'saida') {
      throw new Error('Esta operação permite apenas deduções/saídas do caixa.');
    }
    if (!Number.isFinite(Number(movement.amount)) || Number(movement.amount) <= 0) {
      throw new Error('O valor da dedução precisa ser maior que zero.');
    }
    if (!movement.description?.trim()) {
      throw new Error('Informe o motivo da dedução.');
    }
    await dbService.cash.addMovement({
      ...movement,
      description: movement.description.trim(),
    });
    await refreshAllData();
  };
  // ============================================================
  // AUTH LISTENER
  // ============================================================
  useEffect(() => {
    const unsubscribe = dbService.auth.onAuthStateChange(
      async (user) => {
        if (user && user.email) {
          setUserEmail(user.email);
        } else {
          setUserEmail(null);
          setActiveCashRegister(null);
          setActiveCashRegisterId(null);
        }
        setIsInitializing(false);
      }
    );
    return () => unsubscribe?.();
  }, []);
  // ============================================================
  // CARREGAR DADOS APÓS LOGIN
  // ============================================================
  useEffect(() => {
    if (!userEmail) return;
    refreshAllData();
  }, [userEmail, refreshAllData]);
  // ============================================================
  // LOGIN
  // ============================================================
  const handleLoginSuccess = (email: string) => {
    setUserEmail(email);
    refreshAllData();
  };
  // ============================================================
  // LOGOUT
  // ============================================================
  const handleLogout = async () => {
    if (
      window.confirm(
        'Tem certeza que deseja sair do sistema?'
      )
    ) {
      await dbService.auth.signOut();
      setUserEmail(null);
      setActiveCashRegister(null);
      setActiveCashRegisterId(null);
      setCurrentView('dashboard');
      setSelectedExchangeSale(null);
    }
  };
  // ============================================================
  // PRODUCTS
  // ============================================================
  const handleCreateProduct = async (
    productData: Omit<
      Product,
      'id' | 'created_at' | 'updated_at'
    >,
    file?: File
  ) => {
    await dbService.products.create(
      productData,
      file
    );
    await refreshAllData();
  };
  const handleUpdateProduct = async (
    id: string,
    productData: Partial<Product>,
    file?: File
  ) => {
    await dbService.products.update(
      id,
      productData,
      file
    );
    await refreshAllData();
  };
  const handleDeleteProduct = async (id: string) => {
    await dbService.products.delete(id);
    await refreshAllData();
  };
  const handleAddStockMovement = async (
    product_id: string,
    type: 'Entrada' | 'Saída manual' | 'Ajuste',
    quantity: number,
    obs: string
  ) => {
    await dbService.movements.create({
      product_id,
      type,
      quantity,
      user_email: userEmail || 'sistema@jaja.com',
      observation: obs
    });
    await refreshAllData();
  };
  // ============================================================
  // CLIENTS
  // ============================================================
  const handleCreateClient = async (
    clientData: Omit<Customer, 'id' | 'created_at'>
  ): Promise<Customer> => {
    const newClient = await dbService.customers.create(
      clientData
    );
    await refreshAllData();
    return newClient;
  };
  const handleUpdateClient = async (
    id: string,
    clientData: Partial<Customer>
  ) => {
    await dbService.customers.update(
      id,
      clientData
    );
    await refreshAllData();
  };
  const handleDeleteClient = async (id: string) => {
    await dbService.customers.delete(id);
    await refreshAllData();
  };
  const handlePayDebt = async (
    client: Customer,
    amount: number,
    paymentMethod: string,
    obs: string
  ) => {
    await dbService.customers.adjustDebt(
      client.id,
      -amount
    );
    await dbService.sales.create(
      {
        total_price: amount,
        discount: 0,
        payment_method: paymentMethod as any,
        installments: 1,
        customer_id: client.id,
        user_email: userEmail || 'sistema@jaja.com',
        cash_register_id: activeCashRegisterId
      },
      []
    );
    await refreshAllData();
  };
  // ============================================================
  // VENDAS
  // ============================================================
  const handleSubmitSale = async (
    saleData: {
      total_price: number;
      discount: number;
      payment_method:
        | 'PIX'
        | 'Cartão'
        | 'Dinheiro'
        | 'Crediário'
        | 'Boleto'
        | 'Misto';
      installments?: number | null;
      due_dates?: string[] | null;
      customer_id: string | null;
      // Quando a venda é dividida em 2 formas de pagamento (ex: PIX + Cartão),
      // cada parte vem aqui com seu valor. A soma precisa bater com total_price.
      payments?: Array<{
        method: 'PIX' | 'Cartão' | 'Dinheiro' | 'Boleto';
        amount: number;
      }>;
    },
    items: Array<{
      product_id: string;
      quantity: number;
      price: number;
      cost_price: number;
    }>
  ) => {
    const {
      due_dates,
      payments,
      ...restSaleData
    } = saleData;
    await dbService.sales.create(
      {
        ...(restSaleData as any),
        installments: restSaleData.installments ?? 1,
        user_email: userEmail || 'sistema@jaja.com',
        // Necessário para a venda lançar a entrada no caixa aberto
        cash_register_id: activeCashRegisterId
      },
      items,
      due_dates || undefined,
      payments
    );
    await refreshAllData();
  };
  // ============================================================
  // BUSCAR ITENS DA VENDA
  // ============================================================
  const handleGetSaleItems = async (
    saleId: string
  ): Promise<SaleItem[]> => {
    return await dbService.sales.getItems(saleId);
  };
  // ============================================================
  // PARCELAS
  // ============================================================
  const handleMarkInstallmentAsPaid = async (
    installment: SaleInstallment,
    paidAmount: number,
    paymentMethod: 'PIX' | 'Cartão' | 'Dinheiro'
  ) => {
    await dbService.installments.markAsPaid(
      installment,
      paidAmount,
      paymentMethod,
      activeCashRegisterId
    );
    await refreshAllData();
  };
  // ============================================================
  // CONTAS A PAGAR
  // ============================================================
  const handleCreatePayable = async (data: {
    description: string;
    amount: number;
    due_date: string;
  }) => {
    await dbService.payables.create({
      ...data,
      user_email: userEmail || 'sistema@jaja.com'
    });
    await refreshAllData();
  };
  const handleMarkPayableAsPaid = async (
    payable: Payable,
    paymentMethod: 'PIX' | 'Cartão' | 'Dinheiro'
  ) => {
    await dbService.payables.markAsPaid(
      payable,
      paymentMethod,
      activeCashRegisterId
    );
    await refreshAllData();
  };
  const handleDeletePayable = async (id: string) => {
    await dbService.payables.delete(id);
    await refreshAllData();
  };
  // ============================================================
  // TROCA
  // ============================================================
  const handleCreateExchange = async (params: {
    original_sale_id: string | null;
    customer_id: string | null;
    returnedItems: Array<{
      product_id: string;
      quantity: number;
      price: number;
    }>;
    newItems: Array<{
      product_id: string;
      quantity: number;
      price: number;
    }>;
    resolution:
      | 'sem_diferenca'
      | 'pago_pelo_cliente'
      | 'devolvido_ao_cliente'
      | 'credito_cliente'
      | 'divida_cliente';
    payment_method: 'PIX' | 'Cartão' | 'Dinheiro' | null;
  }) => {
    await dbService.exchanges.create({
      ...params,
      user_email: userEmail || 'sistema@jaja.com',
      cash_register_id: activeCashRegisterId
    });
    await refreshAllData();
  };
  // ============================================================
  // NAVEGAR PARA TROCA
  // ============================================================
  const handleNavigateToExchange = (sale?: Sale) => {
    setSelectedExchangeSale(sale || null);
    setCurrentView('trocas');
  };
  // ============================================================
  // LIMPAR VENDA SELECIONADA DA TROCA
  // ============================================================
  const handleClearExchangeSale = () => {
    setSelectedExchangeSale(null);
  };
  // ============================================================
  // CONFIGURAÇÕES
  // ============================================================
  const handleClearAllData = () => {
    dbService.clearAllData();
  };
  const handleImportBackup = (
    jsonString: string
  ): boolean => {
    return dbService.importDatabase(jsonString);
  };
  const handleExportBackup = () => {
    dbService.exportDatabase();
  };
  // ============================================================
  // NAVEGAÇÃO RÁPIDA
  // ============================================================
  const handleQuickSaleTrigger = () => {
    setCurrentView('pdv');
  };
  const handleNavigateToStock = () => {
    setCurrentView('estoque');
  };
  const handleNavigateToClients = () => {
    setCurrentView('clientes');
  };
  // ============================================================
  // LOADING
  // ============================================================
  if (isInitializing) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0b0914 0%, #151124 100%)',
          color: 'var(--text-primary)'
        }}
      >
        <i
          className="fa-solid fa-wand-magic-sparkles fa-spin"
          style={{
            fontSize: '32px',
            color: 'var(--primary)',
            marginBottom: '15px'
          }}
        />
        <span>
          Iniciando o Sistema JAJA...
        </span>
      </div>
    );
  }
  // ============================================================
  // LOGIN
  // ============================================================
  if (!userEmail) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }
  // ============================================================
  // APP
  // ============================================================
  return (
    <div id="app-layout">
      <Sidebar
        currentView={currentView}
        onViewChange={(view) => {
          // Se sair da tela de troca,
          // limpa a venda pré-selecionada.
          if (view !== 'trocas') {
            handleClearExchangeSale();
          }
          setCurrentView(view);
        }}
        dbType={dbType}
      />
      <main id="main-content">
        <Header
          currentView={currentView}
          userEmail={userEmail}
          onLogout={handleLogout}
          onQuickSale={handleQuickSaleTrigger}
          activeCashRegister={activeCashRegister}
          onOpenRegister={handleOpenRegister}
          onCloseRegister={handleCloseRegister}
          onGetCashMovements={handleGetCashMovements}
          onAddCashMovement={handleAddCashMovement}
        />
        <div
          className="content-body"
          id="view-container"
        >
          {/* ==================================================
              DASHBOARD
          ================================================== */}
          {currentView === 'dashboard' && (
            <DashboardView
              products={products}
              sales={sales}
              clients={clients}
              onNavigateToStock={handleNavigateToStock}
              onNavigateToPDV={handleQuickSaleTrigger}
            />
          )}
          {/* ==================================================
              ESTOQUE
          ================================================== */}
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
          {/* ==================================================
              PDV
          ================================================== */}
          <div
            style={{
              display: currentView === 'pdv' ? 'block' : 'none'
            }}
          >
            <PDVView
              products={products}
              clients={clients}
              onSubmitSale={handleSubmitSale}
              onNavigateToClients={handleNavigateToClients}
              onCreateClient={handleCreateClient}
              isActive={currentView === 'pdv'}
            />
          </div>
          {/* ==================================================
              CLIENTES
          ================================================== */}
          {currentView === 'clientes' && (
            <ClientsView
              clients={clients}
              onCreateClient={handleCreateClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
              onPayDebt={handlePayDebt}
            />
          )}
          {/* ==================================================
              HISTÓRICO / MOVIMENTAÇÕES
          ================================================== */}
          {currentView === 'movimentacoes' && (
            <MovementsView
              movements={movements}
              sales={sales}
              onGetSaleItems={handleGetSaleItems}
              onNavigateToExchange={handleNavigateToExchange}
            />
          )}
          {/* ==================================================
              CONTAS A RECEBER
          ================================================== */}
          {currentView === 'recebiveis' && (
            <ReceivablesView
              installments={installments}
              clients={clients}
              hasOpenCashRegister={!!activeCashRegisterId}
              onMarkAsPaid={handleMarkInstallmentAsPaid}
              onPayDebt={handlePayDebt}
            />
          )}
          {/* ==================================================
              TROCAS
          ================================================== */}
          {currentView === 'trocas' && (
            <ExchangeView
              sales={sales}
              products={products}
              clients={clients}
              hasOpenCashRegister={!!activeCashRegisterId}
              activeCashRegisterId={activeCashRegisterId}
              userEmail={userEmail}
              initialSale={selectedExchangeSale}
              onGetSaleItems={handleGetSaleItems}
              onCreateExchange={handleCreateExchange}
            />
          )}
          {/* ==================================================
              CONTAS A PAGAR
          ================================================== */}
          {currentView === 'pagar' && (
            <PayablesView
              payables={payables}
              hasOpenCashRegister={!!activeCashRegisterId}
              onCreatePayable={handleCreatePayable}
              onMarkAsPaid={handleMarkPayableAsPaid}
              onDeletePayable={handleDeletePayable}
            />
          )}
          {/* ==================================================
              CONFIGURAÇÕES
          ================================================== */}
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