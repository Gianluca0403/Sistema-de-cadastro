import React, { useState, useMemo } from 'react';

import { createPortal } from 'react-dom';

import { CashRegister, CashMovement } from '../types';

import { dbService } from '../supabaseClient';



interface HeaderProps {

  currentView: string;

  userEmail: string;

  onLogout: () => void;

  onQuickSale: () => void;



  // Caixa

  activeCashRegister: CashRegister | null;

  onOpenRegister: (balance: number) => Promise<void>;

  onCloseRegister: (closingBalance: number) => Promise<void>;

  onGetCashMovements: (sessionId: string) => Promise<CashMovement[]>;
  onAddCashMovement: (movement: Omit<CashMovement, 'id' | 'created_at'>) => Promise<void>;

}



const formatCurrency = (val: number) =>

  new Intl.NumberFormat('pt-BR', {

    style: 'currency',

    currency: 'BRL',

  }).format(val);



export const Header: React.FC<HeaderProps> = ({

  currentView,

  userEmail,

  onLogout,

  onQuickSale,

  activeCashRegister,

  onOpenRegister,

  onCloseRegister,

  onGetCashMovements,

  onAddCashMovement,

}) => {

  const getTitles = (view: string) => {

    const titles: Record<string, { t: string; s: string }> = {

      dashboard: {

        t: 'Dashboard',

        s: 'Visão geral do seu negócio hoje',

      },

      pdv: {

        t: 'Ponto de Venda (PDV)',

        s: 'Registre vendas de forma simples e rápida',

      },

      estoque: {

        t: 'Controle de Estoque',

        s: 'Gerencie seu catálogo de produtos e estoque',

      },

      clientes: {

        t: 'Meus Clientes',

        s: 'Cadastro e histórico de compras dos clientes',

      },

      movimentacoes: {

        t: 'Movimentações de Estoque',

        s: 'Histórico completo de entradas e saídas',

      },

      recebiveis: {

        t: 'Contas a Receber',

        s: 'Boletos e parcelas pendentes de recebimento',

      },

      trocas: {

        t: 'Troca de Produtos',

        s: 'Registre trocas e devoluções de clientes',

      },

      configuracoes: {

        t: 'Ajustes & Backup',

        s: 'Configurações do sistema e segurança',

      },

    };



    return titles[view] || {

      t: 'MMC Imports',

      s: 'Painel de Controle',

    };

  };



  const { t: title, s: subtitle } = getTitles(currentView);

  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : 'A';



  // Estados do modal do caixa

  const [isCashModalOpen, setIsCashModalOpen] = useState(false);

  const [movements, setMovements] = useState<CashMovement[]>([]);

  const [loadingMovements, setLoadingMovements] = useState(false);

  const [cashErrorMsg, setCashErrorMsg] = useState('');

  const [cashLoading, setCashLoading] = useState(false);

  // Dedução de dinheiro durante o expediente
  const [deductionAmount, setDeductionAmount] = useState('');
  const [deductionDescription, setDeductionDescription] = useState('');



  // Abertura

  const [openingBalanceInput, setOpeningBalanceInput] = useState<number>(0);

  const [loadingSuggestedBalance, setLoadingSuggestedBalance] = useState(false);

  const [suggestedBalanceMsg, setSuggestedBalanceMsg] = useState('');



  // Fechamento

  const [isClosing, setIsClosing] = useState(false);

  const [closingBalanceInput, setClosingBalanceInput] = useState<number>(0);



  // Histórico de fechamentos

  const [isViewingHistory, setIsViewingHistory] = useState(false);

  const [historyList, setHistoryList] = useState<CashRegister[]>([]);

  const [loadingHistory, setLoadingHistory] = useState(false);

  const [historyErrorMsg, setHistoryErrorMsg] = useState('');



  // Saldo atual = soma das movimentações (a abertura já entra como

  // o primeiro movimento de "entrada", então NÃO deve ser somada de novo aqui).

  const currentBalance = useMemo(() => {

    return movements.reduce((sum, movement) => {

      const amount = Number(movement.amount) || 0;



      return movement.type === 'entrada'

        ? sum + amount

        : sum - amount;

    }, 0);

  }, [movements]);



  // Abre o modal e carrega o extrato (ou sugere o saldo de abertura)

  const openModal = async () => {

    setCashErrorMsg('');

    setIsClosing(false);

    setOpeningBalanceInput(0);

    setSuggestedBalanceMsg('');

    setMovements([]);

    setIsCashModalOpen(true);



    if (!activeCashRegister) {

      // Não há caixa aberto agora: busca o último fechamento

      // para sugerir o valor de abertura (o dinheiro que ficou em caixa).

      setLoadingSuggestedBalance(true);



      try {

        const lastSession = await dbService.cash.getLastClosedSession();



        if (lastSession && lastSession.closing_balance !== null) {

          const suggested = Number(lastSession.closing_balance) || 0;

          setOpeningBalanceInput(suggested);

          setSuggestedBalanceMsg(

            `Sugerido com base no fechamento anterior (${formatCurrency(suggested)}). Ajuste se necessário.`

          );

        }

      } catch (err) {

        console.error('Erro ao buscar último fechamento de caixa:', err);

      } finally {

        setLoadingSuggestedBalance(false);

      }



      return;

    }



    setLoadingMovements(true);



    try {

      const list = await onGetCashMovements(activeCashRegister.id);

      setMovements(list);

    } catch (err) {

      console.error('Erro ao carregar movimentações do caixa:', err);

      setCashErrorMsg('Erro ao carregar as movimentações do caixa.');

    } finally {

      setLoadingMovements(false);

    }

  };



  // Fecha o modal

  const closeModal = () => {

    if (cashLoading) return;



    setIsCashModalOpen(false);

    setIsClosing(false);

    setIsViewingHistory(false);

    setCashErrorMsg('');

  };



  // Abre a tela de histórico de fechamentos

  const openHistory = async () => {

    setHistoryErrorMsg('');

    setIsViewingHistory(true);

    setLoadingHistory(true);



    try {

      const list = await dbService.cash.getClosedSessions();

      setHistoryList(list);

    } catch (err) {

      console.error('Erro ao buscar histórico de fechamentos:', err);

      setHistoryErrorMsg('Erro ao carregar o histórico de fechamentos.');

    } finally {

      setLoadingHistory(false);

    }

  };



  // Volta da tela de histórico para a tela anterior do modal

  const closeHistory = () => {

    setIsViewingHistory(false);

    setHistoryErrorMsg('');

  };



  // Confirma a abertura

  const handleOpenSubmit = async (

    e: React.FormEvent<HTMLFormElement>

  ) => {

    e.preventDefault();



    if (

      !Number.isFinite(openingBalanceInput) ||

      openingBalanceInput < 0

    ) {

      setCashErrorMsg(

        'O saldo inicial deve ser um valor válido e não negativo.'

      );

      return;

    }



    try {

      setCashLoading(true);

      setCashErrorMsg('');



      await onOpenRegister(openingBalanceInput);



      setIsCashModalOpen(false);

      setMovements([]);

    } catch (err) {

      console.error('Erro ao abrir caixa:', err);



      const message =

        err instanceof Error

          ? err.message

          : 'Erro ao abrir o caixa.';



      setCashErrorMsg(message);

    } finally {

      setCashLoading(false);

    }

  };



  // Inicia o fechamento

  // Registra uma retirada/dedução sem fechar o caixa.
  const handleAddDeduction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = Number(deductionAmount.replace(',', '.'));
    const description = deductionDescription.trim();

    if (!activeCashRegister) {
      setCashErrorMsg('Abra o caixa antes de registrar uma dedução.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setCashErrorMsg('Informe um valor de dedução maior que zero.');
      return;
    }
    if (!description) {
      setCashErrorMsg('Descreva o motivo da dedução.');
      return;
    }
    if (amount > currentBalance) {
      setCashErrorMsg('A dedução não pode ser maior que o saldo atual do caixa.');
      return;
    }

    try {
      setCashLoading(true);
      setCashErrorMsg('');
      await onAddCashMovement({
        cash_register_id: activeCashRegister.id,
        type: 'saida',
        amount,
        description,
        payment_method: 'Dinheiro',
      });
      const updatedMovements = await onGetCashMovements(activeCashRegister.id);
      setMovements(updatedMovements);
      setDeductionAmount('');
      setDeductionDescription('');
    } catch (err) {
      console.error('Erro ao registrar dedução:', err);
      setCashErrorMsg(err instanceof Error ? err.message : 'Não foi possível registrar a dedução.');
    } finally {
      setCashLoading(false);
    }
  };

  const startClosing = () => {

    setClosingBalanceInput(currentBalance);

    setCashErrorMsg('');

    setIsClosing(true);

  };



  // Confirma o fechamento

  const handleCloseSubmit = async (

    e: React.FormEvent<HTMLFormElement>

  ) => {

    e.preventDefault();



    if (

      !Number.isFinite(closingBalanceInput) ||

      closingBalanceInput < 0

    ) {

      setCashErrorMsg(

        'O saldo final deve ser um valor válido e não negativo.'

      );

      return;

    }



    const confirmed = window.confirm(

      'Tem certeza que deseja fechar o caixa? Essa ação não pode ser desfeita.'

    );



    if (!confirmed) return;



    try {

      setCashLoading(true);

      setCashErrorMsg('');



      await onCloseRegister(closingBalanceInput);



      setIsCashModalOpen(false);

      setIsClosing(false);

      setMovements([]);

    } catch (err) {

      console.error('Erro ao fechar caixa:', err);



      const message =

        err instanceof Error

          ? err.message

          : 'Erro ao fechar o caixa.';



      setCashErrorMsg(message);

    } finally {

      setCashLoading(false);

    }

  };



  // Conteúdo do modal renderizado fora do Header

  const cashModal = isCashModalOpen

    ? createPortal(

        <div

          role="presentation"

          onMouseDown={(e) => {

            if (e.target === e.currentTarget) {

              closeModal();

            }

          }}

          style={{

            position: 'fixed',

            inset: 0,

            background: 'rgba(0, 0, 0, 0.7)',

            zIndex: 999999,

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'center',

            padding: '16px',

            overflowY: 'auto',

            boxSizing: 'border-box',

          }}

        >

          <div

            className="card"

            role="dialog"

            aria-modal="true"

            aria-labelledby="cash-modal-title"

            style={{

              maxWidth: '460px',

              width: '100%',

              maxHeight: '85vh',

              overflowY: 'auto',

              display: 'flex',

              flexDirection: 'column',

              padding: '24px',

              position: 'relative',

              margin: 'auto',

              boxSizing: 'border-box',

              flexShrink: 0,

            }}

          >

            {/* Cabeçalho do modal */}

            <div

              style={{

                display: 'flex',

                justifyContent: 'space-between',

                alignItems: 'center',

                marginBottom: '16px',

                flexShrink: 0,

              }}

            >

              <h3

                id="cash-modal-title"

                style={{

                  fontSize: '16px',

                  display: 'flex',

                  alignItems: 'center',

                  gap: '8px',

                  margin: 0,

                }}

              >

                <i

                  className="fa-solid fa-cash-register"

                  style={{ color: 'var(--primary)' }}

                />



                {isViewingHistory

                  ? 'Histórico de Fechamentos'

                  : activeCashRegister

                    ? 'Caixa do Dia'

                    : 'Abrir Caixa'}

              </h3>



              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                {!isViewingHistory && (

                  <button

                    type="button"

                    onClick={openHistory}

                    disabled={cashLoading}

                    title="Ver histórico de fechamentos"

                    style={{

                      background: 'none',

                      border: 'none',

                      color: 'var(--text-secondary)',

                      fontSize: '13px',

                      cursor: cashLoading ? 'not-allowed' : 'pointer',

                      display: 'flex',

                      alignItems: 'center',

                      gap: '6px',

                    }}

                  >

                    <i className="fa-solid fa-clock-rotate-left" />

                    Histórico

                  </button>

                )}



                {isViewingHistory && (

                  <button

                    type="button"

                    onClick={closeHistory}

                    title="Voltar"

                    style={{

                      background: 'none',

                      border: 'none',

                      color: 'var(--text-secondary)',

                      fontSize: '13px',

                      cursor: 'pointer',

                      display: 'flex',

                      alignItems: 'center',

                      gap: '6px',

                    }}

                  >

                    <i className="fa-solid fa-arrow-left" />

                    Voltar

                  </button>

                )}



                <button

                  type="button"

                  onClick={closeModal}

                  disabled={cashLoading}

                  aria-label="Fechar modal"

                  style={{

                    background: 'none',

                    border: 'none',

                    color: 'var(--text-secondary)',

                    fontSize: '22px',

                    cursor: cashLoading ? 'not-allowed' : 'pointer',

                    lineHeight: 1,

                  }}

                >

                  &times;

                </button>

              </div>

            </div>



            {/* Mensagem de erro */}

            {cashErrorMsg && (

              <div

                className="alert-banner"

                role="alert"

                style={{

                  background: 'var(--danger-bg)',

                  color: 'var(--danger)',

                  marginBottom: '15px',

                  display: 'flex',

                  flexShrink: 0,

                }}

              >

                <i

                  className="fa-solid fa-circle-exclamation"

                  style={{ marginRight: '8px' }}

                />



                <span>{cashErrorMsg}</span>

              </div>

            )}



            {/* Histórico de fechamentos */}

            {isViewingHistory ? (

              <div>

                {historyErrorMsg && (

                  <div

                    className="alert-banner"

                    role="alert"

                    style={{

                      background: 'var(--danger-bg)',

                      color: 'var(--danger)',

                      marginBottom: '15px',

                    }}

                  >

                    <i

                      className="fa-solid fa-circle-exclamation"

                      style={{ marginRight: '8px' }}

                    />

                    <span>{historyErrorMsg}</span>

                  </div>

                )}



                {loadingHistory ? (

                  <p

                    style={{

                      fontSize: '12px',

                      color: 'var(--text-muted)',

                      padding: '12px 0',

                    }}

                  >

                    Carregando histórico...

                  </p>

                ) : historyList.length === 0 ? (

                  <p

                    style={{

                      fontSize: '12px',

                      color: 'var(--text-muted)',

                      padding: '12px 0',

                    }}

                  >

                    Nenhum fechamento de caixa registrado ainda.

                  </p>

                ) : (

                  <div

                    style={{

                      maxHeight: '420px',

                      overflowY: 'auto',

                    }}

                  >

                    {historyList.map((session) => {

                      const opening = Number(session.opening_balance) || 0;

                      const closing = Number(session.closing_balance) || 0;

                      const diff = closing - opening;



                      return (

                        <div

                          key={session.id}

                          style={{

                            background: 'rgba(255,255,255,0.03)',

                            border: '1px solid var(--border-color)',

                            borderRadius: '8px',

                            padding: '12px',

                            marginBottom: '10px',

                          }}

                        >

                          <div

                            style={{

                              display: 'flex',

                              justifyContent: 'space-between',

                              alignItems: 'center',

                              marginBottom: '8px',

                              gap: '8px',

                            }}

                          >

                            <span

                              style={{

                                fontSize: '13px',

                                fontWeight: 600,

                              }}

                            >

                              {session.closed_at

                                ? new Date(session.closed_at).toLocaleDateString('pt-BR', {

                                    weekday: 'short',

                                    day: '2-digit',

                                    month: '2-digit',

                                    year: 'numeric',

                                  })

                                : '--'}

                            </span>



                            <span

                              style={{

                                fontSize: '10px',

                                color: 'var(--text-muted)',

                              }}

                            >

                              {session.closed_at

                                ? new Date(session.closed_at).toLocaleTimeString('pt-BR', {

                                    hour: '2-digit',

                                    minute: '2-digit',

                                  })

                                : ''}

                            </span>

                          </div>



                          <div

                            style={{

                              display: 'flex',

                              justifyContent: 'space-between',

                              fontSize: '12px',

                              marginBottom: '4px',

                            }}

                          >

                            <span style={{ color: 'var(--text-muted)' }}>

                              Abriu com:

                            </span>

                            <span>{formatCurrency(opening)}</span>

                          </div>



                          <div

                            style={{

                              display: 'flex',

                              justifyContent: 'space-between',

                              fontSize: '12px',

                              marginBottom: '4px',

                            }}

                          >

                            <span style={{ color: 'var(--text-muted)' }}>

                              Fechou com:

                            </span>

                            <span style={{ fontWeight: 600 }}>

                              {formatCurrency(closing)}

                            </span>

                          </div>



                          <div

                            style={{

                              display: 'flex',

                              justifyContent: 'space-between',

                              fontSize: '12px',

                              borderTop: '1px solid var(--border-color)',

                              paddingTop: '6px',

                              marginTop: '6px',

                            }}

                          >

                            <span style={{ color: 'var(--text-muted)' }}>

                              Movimentado no dia:

                            </span>

                            <span

                              style={{

                                fontWeight: 600,

                                color: diff >= 0 ? 'var(--success)' : 'var(--danger)',

                              }}

                            >

                              {diff >= 0 ? '+' : ''}

                              {formatCurrency(diff)}

                            </span>

                          </div>



                          {(session.opened_by || session.closed_by) && (

                            <div

                              style={{

                                fontSize: '10px',

                                color: 'var(--text-muted)',

                                marginTop: '8px',

                              }}

                            >

                              {session.opened_by && <>Aberto por: {session.opened_by}</>}

                              {session.opened_by && session.closed_by && ' • '}

                              {session.closed_by && <>Fechado por: {session.closed_by}</>}

                            </div>

                          )}

                        </div>

                      );

                    })}

                  </div>

                )}

              </div>

            ) : !activeCashRegister ? (

              <form onSubmit={handleOpenSubmit}>

                <p

                  style={{

                    fontSize: '12px',

                    color: 'var(--text-muted)',

                    marginBottom: '14px',

                  }}

                >

                  Informe o valor em dinheiro que está no caixa agora,

                  para começar o controle do dia.

                </p>



                {loadingSuggestedBalance && (

                  <p

                    style={{

                      fontSize: '11px',

                      color: 'var(--text-muted)',

                      marginBottom: '10px',

                    }}

                  >

                    Buscando saldo do fechamento anterior...

                  </p>

                )}



                {!loadingSuggestedBalance && suggestedBalanceMsg && (

                  <div

                    style={{

                      fontSize: '11px',

                      color: 'var(--primary)',

                      background: 'rgba(99, 102, 241, 0.08)',

                      border: '1px solid rgba(99, 102, 241, 0.2)',

                      borderRadius: '8px',

                      padding: '8px 10px',

                      marginBottom: '14px',

                    }}

                  >

                    <i

                      className="fa-solid fa-circle-info"

                      style={{ marginRight: '6px' }}

                    />

                    {suggestedBalanceMsg}

                  </div>

                )}



                <div style={{ marginBottom: '20px' }}>

                  <label

                    htmlFor="opening-balance"

                    className="form-label"

                  >

                    Saldo Inicial (R$) *

                  </label>



                  <input

                    id="opening-balance"

                    type="number"

                    className="form-control"

                    step="0.01"

                    min="0"

                    required

                    value={

                      openingBalanceInput === 0

                        ? ''

                        : openingBalanceInput

                    }

                    onChange={(e) => {

                      setOpeningBalanceInput(

                        e.target.value === ''

                          ? 0

                          : Number(e.target.value)

                      );

                    }}

                    placeholder="Ex: 150.00"

                    autoFocus

                    disabled={cashLoading || loadingSuggestedBalance}

                  />

                </div>



                <button

                  type="submit"

                  className="btn btn-primary w-100"

                  disabled={cashLoading || loadingSuggestedBalance}

                  style={{

                    padding: '12px',

                    fontWeight: 'bold',

                    width: '100%',

                  }}

                >

                  {cashLoading ? 'Abrindo...' : 'Abrir Caixa'}

                </button>

              </form>

            ) : isClosing ? (


              <form onSubmit={handleCloseSubmit}>

                <div

                  style={{

                    background: 'rgba(255,255,255,0.03)',

                    padding: '12px',

                    borderRadius: '8px',

                    marginBottom: '16px',

                    border: '1px solid var(--border-color)',

                  }}

                >

                  <div

                    style={{

                      display: 'flex',

                      justifyContent: 'space-between',

                      fontSize: '13px',

                      marginBottom: '4px',

                    }}

                  >

                    <span>Saldo de abertura:</span>



                    <span>

                      {formatCurrency(

                        Number(activeCashRegister.opening_balance) || 0

                      )}

                    </span>

                  </div>



                  <div

                    style={{

                      display: 'flex',

                      justifyContent: 'space-between',

                      fontSize: '15px',

                      fontWeight: 'bold',

                      borderTop: '1px solid var(--border-color)',

                      paddingTop: '6px',

                      marginTop: '6px',

                      gap: '8px',

                    }}

                  >

                    <span>Saldo calculado pelo sistema:</span>



                    <span style={{ color: 'var(--primary)' }}>

                      {formatCurrency(currentBalance)}

                    </span>

                  </div>

                </div>



                <div style={{ marginBottom: '20px' }}>

                  <label

                    htmlFor="closing-balance"

                    className="form-label"

                  >

                    Saldo Final Conferido (R$) *

                  </label>



                  <input

                    id="closing-balance"

                    type="number"

                    className="form-control"

                    step="0.01"

                    min="0"

                    required

                    value={closingBalanceInput}

                    onChange={(e) => {

                      setClosingBalanceInput(

                        e.target.value === ''

                          ? 0

                          : Number(e.target.value)

                      );

                    }}

                    autoFocus

                    disabled={cashLoading}

                  />



                  <span

                    style={{

                      fontSize: '10px',

                      color: 'var(--text-muted)',

                    }}

                  >

                    Já preenchido com o valor calculado. Ajuste se o

                    dinheiro contado for diferente.

                  </span>

                </div>



                <div style={{ display: 'flex', gap: '10px' }}>

                  <button

                    type="button"

                    className="btn btn-secondary"

                    style={{ flex: 1 }}

                    onClick={() => setIsClosing(false)}

                    disabled={cashLoading}

                  >

                    Voltar

                  </button>



                  <button

                    type="submit"

                    className="btn btn-primary"

                    style={{

                      flex: 1,

                      fontWeight: 'bold',

                    }}

                    disabled={cashLoading}

                  >

                    {cashLoading

                      ? 'Fechando...'

                      : 'Confirmar Fechamento'}

                  </button>

                </div>

              </form>

            ) : (


              <>

                <div

                  style={{

                    background: 'rgba(255,255,255,0.03)',

                    padding: '12px',

                    borderRadius: '8px',

                    marginBottom: '14px',

                    border: '1px solid var(--border-color)',

                  }}

                >

                  <div

                    style={{

                      display: 'flex',

                      justifyContent: 'space-between',

                      fontSize: '12px',

                      color: 'var(--text-muted)',

                      marginBottom: '4px',

                      gap: '8px',

                    }}

                  >

                    <span>Aberto em:</span>



                    <span>

                      {new Date(

                        activeCashRegister.opened_at

                      ).toLocaleString('pt-BR')}

                    </span>

                  </div>



                  <div

                    style={{

                      display: 'flex',

                      justifyContent: 'space-between',

                      fontSize: '13px',

                      marginBottom: '4px',

                    }}

                  >

                    <span>Saldo de abertura:</span>



                    <span>

                      {formatCurrency(

                        Number(activeCashRegister.opening_balance) || 0

                      )}

                    </span>

                  </div>



                  <div

                    style={{

                      display: 'flex',

                      justifyContent: 'space-between',

                      fontSize: '17px',

                      fontWeight: 'bold',

                      borderTop: '1px solid var(--border-color)',

                      paddingTop: '8px',

                      marginTop: '8px',

                      gap: '8px',

                    }}

                  >

                    <span>Saldo Atual:</span>



                    <span style={{ color: 'var(--primary)' }}>

                      {formatCurrency(currentBalance)}

                    </span>

                  </div>

                </div>



                <form
                  onSubmit={handleAddDeduction}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '12px',
                    marginBottom: '16px',
                    background: 'rgba(239, 68, 68, 0.04)',
                  }}
                >
                  <h4 style={{ margin: '0 0 10px', fontSize: '13px' }}>
                    <i className="fa-solid fa-minus-circle" style={{ color: 'var(--danger)', marginRight: '7px' }} />
                    Registrar dedução
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '9px' }}>
                    <div>
                      <label htmlFor="deduction-amount" className="form-label">Valor retirado (R$)</label>
                      <input
                        id="deduction-amount"
                        type="number"
                        className="form-control"
                        min="0.01"
                        step="0.01"
                        required
                        value={deductionAmount}
                        onChange={(e) => setDeductionAmount(e.target.value)}
                        placeholder="Ex.: 35.00"
                        disabled={cashLoading}
                      />
                    </div>
                    <div>
                      <label htmlFor="deduction-description" className="form-label">Motivo da retirada</label>
                      <input
                        id="deduction-description"
                        type="text"
                        className="form-control"
                        maxLength={160}
                        required
                        value={deductionDescription}
                        onChange={(e) => setDeductionDescription(e.target.value)}
                        placeholder="Ex.: pagamento de fornecedor"
                        disabled={cashLoading}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn"
                    disabled={cashLoading || loadingMovements}
                    style={{
                      width: '100%',
                      marginTop: '10px',
                      padding: '10px',
                      fontWeight: 700,
                      color: 'var(--danger)',
                      background: 'var(--danger-bg)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <i className="fa-solid fa-minus" style={{ marginRight: '7px' }} />
                    {cashLoading ? 'Registrando...' : 'Registrar dedução'}
                  </button>
                </form>

                <h4

                  style={{

                    fontSize: '12px',

                    color: 'var(--text-muted)',

                    marginBottom: '8px',

                  }}

                >

                  Movimentações de hoje

                </h4>



                <div

                  style={{

                    flex: 1,

                    overflowY: 'auto',

                    marginBottom: '16px',

                    maxHeight: '260px',

                    minHeight: 0,

                  }}

                >

                  {loadingMovements ? (

                    <p

                      style={{

                        fontSize: '12px',

                        color: 'var(--text-muted)',

                        padding: '12px 0',

                      }}

                    >

                      Carregando...

                    </p>

                  ) : movements.length === 0 ? (

                    <p

                      style={{

                        fontSize: '12px',

                        color: 'var(--text-muted)',

                        padding: '12px 0',

                      }}

                    >

                      Nenhuma movimentação ainda.

                    </p>

                  ) : (

                    movements.map((movement) => (

                      <div

                        key={movement.id}

                        style={{

                          display: 'flex',

                          justifyContent: 'space-between',

                          alignItems: 'center',

                          padding: '8px 0',

                          borderBottom:

                            '1px solid var(--border-color)',

                          fontSize: '12px',

                          gap: '8px',

                        }}

                      >

                        <div

                          style={{

                            flex: 1,

                            paddingRight: '8px',

                            minWidth: 0,

                          }}

                        >

                          <span

                            style={{

                              display: 'block',

                              fontWeight: 600,

                              overflowWrap: 'anywhere',

                            }}

                          >

                            {movement.description}

                          </span>



                          <span

                            style={{

                              color: 'var(--text-muted)',

                              fontSize: '10px',

                            }}

                          >

                            {movement.payment_method} •{' '}

                            {movement.created_at

                              ? new Date(

                                  movement.created_at

                                ).toLocaleTimeString('pt-BR', {

                                  hour: '2-digit',

                                  minute: '2-digit',

                                })

                              : '--:--'}

                          </span>

                        </div>



                        <span

                          style={{

                            fontWeight: 600,

                            color:

                              movement.type === 'entrada'

                                ? 'var(--success)'

                                : 'var(--danger)',

                            whiteSpace: 'nowrap',

                          }}

                        >

                          {movement.type === 'entrada' ? '+' : '-'}

                          {formatCurrency(

                            Number(movement.amount) || 0

                          )}

                        </span>

                      </div>

                    ))

                  )}

                </div>



                <button

                  type="button"

                  className="btn"

                  style={{

                    width: '100%',

                    padding: '10px',

                    fontWeight: 'bold',

                    background: 'var(--danger-bg)',

                    color: 'var(--danger)',

                    border:

                      '1px solid rgba(239, 68, 68, 0.2)',

                    flexShrink: 0,

                  }}

                  onClick={startClosing}

                  disabled={loadingMovements || cashLoading}

                >

                  <i

                    className="fa-solid fa-lock"

                    style={{ marginRight: '8px' }}

                  />



                  Fechar Caixa

                </button>

              </>

            )}

          </div>

        </div>,

        document.body

      )

    : null;



  return (

    <>

      <header id="header">

        <div className="page-title-container">

          <h1 className="page-title" id="page-title-text">

            {title}

          </h1>



          <span className="page-subtitle" id="page-subtitle-text">

            {subtitle}

          </span>

        </div>



        <div className="header-actions">

          {/* Indicador de caixa */}

          <button

            type="button"

            onClick={openModal}

            title={

              activeCashRegister

                ? 'Ver detalhes do caixa'

                : 'Abrir o caixa do dia'

            }

            style={{

              display: 'flex',

              alignItems: 'center',

              gap: '8px',

              padding: '6px 14px',

              borderRadius: 'var(--radius-lg)',

              border: '1px solid var(--border-color)',

              background: activeCashRegister

                ? 'rgba(16, 185, 129, 0.08)'

                : 'rgba(239, 68, 68, 0.08)',

              cursor: 'pointer',

              fontSize: '12px',

              fontWeight: 600,

              color: 'var(--text-primary)',

            }}

          >

            <span

              style={{

                width: '8px',

                height: '8px',

                borderRadius: '50%',

                background: activeCashRegister

                  ? 'var(--success)'

                  : 'var(--danger)',

                flexShrink: 0,

              }}

            />



            <i

              className="fa-solid fa-cash-register"

              style={{

                color: activeCashRegister

                  ? 'var(--success)'

                  : 'var(--danger)',

              }}

            />



            {activeCashRegister ? 'Caixa Aberto' : 'Caixa Fechado'}

          </button>



          {currentView !== 'pdv' && (

            <button

              className="quick-btn"

              onClick={onQuickSale}

              id="btn-quick-pdv"

              type="button"

            >

              <i className="fa-solid fa-cart-plus" /> Nova Venda

            </button>

          )}



          <div

            className="user-badge"

            title={`Logado como: ${userEmail}`}

          >

            <div className="user-avatar">{initial}</div>



            <span className="user-name">

              {userEmail.split('@')[0]}

            </span>



            <button

              onClick={onLogout}

              className="logout-btn"

              title="Sair do Sistema"

              type="button"

              style={{

                background: 'none',

                border: 'none',

                color: 'var(--text-muted)',

                cursor: 'pointer',

                marginLeft: '10px',

                fontSize: '14px',

                transition: 'var(--transition)',

              }}

              onMouseEnter={(e) => {

                e.currentTarget.style.color = 'var(--danger)';

              }}

              onMouseLeave={(e) => {

                e.currentTarget.style.color = 'var(--text-muted)';

              }}

            >

              <i className="fa-solid fa-right-from-bracket" />

            </button>

          </div>

        </div>

      </header>



      {cashModal}

    </>

  );

};