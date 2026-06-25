import React, { useState, useMemo } from 'react';
import { StockMovement, Sale, SaleItem } from '../types';

interface MovementsViewProps {
  movements: StockMovement[];
  sales: Sale[];
  onGetSaleItems: (saleId: string) => Promise<SaleItem[]>;
  onDeleteSale: (saleId: string) => Promise<void>;
}

export const MovementsView: React.FC<MovementsViewProps> = ({
  movements,
  sales,
  onGetSaleItems,
  onDeleteSale
}) => {
  const [activeTab, setActiveTab] = useState<'movements' | 'sales'>('sales');
  
  // Search and filters
  const [stockSearch, setStockSearch] = useState('');
  const [stockTypeFilter, setStockTypeFilter] = useState('');
  const [salesSearch, setSalesSearch] = useState('');

  // Sale detail Modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedSaleItems, setSelectedSaleItems] = useState<SaleItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Filtered Stock Movements
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const prodName = m.product_name || '';
      const matchesSearch = 
        prodName.toLowerCase().includes(stockSearch.toLowerCase()) ||
        (m.observation && m.observation.toLowerCase().includes(stockSearch.toLowerCase()));
      
      const matchesType = stockTypeFilter === '' || m.type === stockTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [movements, stockSearch, stockTypeFilter]);

  // Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const clientName = s.client_name || 'Consumidor Final';
      const matchesSearch = 
        clientName.toLowerCase().includes(salesSearch.toLowerCase()) ||
        s.payment_method.toLowerCase().includes(salesSearch.toLowerCase()) ||
        s.id.includes(salesSearch);
      
      return matchesSearch;
    });
  }, [sales, salesSearch]);

  // Open sale details
  const handleOpenSaleDetails = async (sale: Sale) => {
    setSelectedSale(sale);
    setSelectedSaleItems([]);
    setLoadingItems(true);
    try {
      const items = await onGetSaleItems(sale.id);
      setSelectedSaleItems(items);
    } catch (err) {
      console.error('Error fetching sale items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  // Settle/Delete Sale (Estorno de venda)
  const handleDeleteSaleClick = async (sale: Sale) => {
    if (window.confirm(`Tem certeza que deseja EXCLUIR e ESTORNAR a venda #${sale.id.substring(0, 8)}?\nIsso irá repor os produtos no estoque e estornar dívidas de crediário.`)) {
      try {
        await onDeleteSale(sale.id);
        if (selectedSale?.id === sale.id) {
          setSelectedSale(null);
        }
      } catch (err: any) {
        alert(err.message || 'Erro ao estornar venda.');
      }
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR');
  };

  const getMovementTypeBadge = (type: StockMovement['type']) => {
    const styles: Record<StockMovement['type'], { bg: string; text: string; icon: string }> = {
      Entrada: { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--success)', icon: 'fa-plus' },
      'Saída manual': { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--danger)', icon: 'fa-minus' },
      Ajuste: { bg: 'rgba(59, 130, 246, 0.1)', text: 'var(--info)', icon: 'fa-arrows-spin' },
      Venda: { bg: 'rgba(223, 168, 61, 0.1)', text: 'var(--primary)', icon: 'fa-cart-shopping' },
      'Estorno de Venda': { bg: 'rgba(139, 92, 246, 0.1)', text: 'var(--accent)', icon: 'fa-rotate-left' }
    };

    const s = styles[type] || { bg: 'rgba(255,255,255,0.05)', text: 'var(--text-primary)', icon: 'fa-question' };

    return (
      <span className="badge" style={{ background: s.bg, color: s.text, display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 8px', borderRadius: '4px', border: `1px solid ${s.text}20` }}>
        <i className={`fa-solid ${s.icon}`} style={{ fontSize: '10px' }}></i>
        {type}
      </span>
    );
  };

  return (
    <section id="view-vendas" className="app-view">
      
      {/* Tab Navigation header */}
      <div style={{ display: 'flex', gap: '15px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('sales')}
          className={`nav-tab ${activeTab === 'sales' ? 'active' : ''}`}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'sales' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'sales' ? '2px solid var(--primary)' : 'none',
            padding: '10px 15px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'var(--transition)'
          }}
        >
          <i className="fa-solid fa-basket-shopping" style={{ marginRight: '8px' }}></i> Histórico de Vendas
        </button>
        <button 
          onClick={() => setActiveTab('movements')}
          className={`nav-tab ${activeTab === 'movements' ? 'active' : ''}`}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'movements' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'movements' ? '2px solid var(--primary)' : 'none',
            padding: '10px 15px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'var(--transition)'
          }}
        >
          <i className="fa-solid fa-right-left" style={{ marginRight: '8px' }}></i> Movimentações do Estoque
        </button>
      </div>

      {/* VIEW PANEL 1: SALES TAB */}
      {activeTab === 'sales' && (
        <>
          {/* Filters Bar */}
          <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
            <div className="search-input-wrapper" style={{ margin: 0 }}>
              <i className="fa-solid fa-magnifying-glass"></i>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Buscar vendas por nome do cliente, forma de pagamento ou ID da venda..."
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Sales History List */}
          <div className="card">
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Data / Hora</th>
                    <th>ID da Venda</th>
                    <th>Cliente</th>
                    <th>Método Pagamento</th>
                    <th style={{ textAlign: 'right' }}>Desconto</th>
                    <th style={{ textAlign: 'right' }}>Valor Total</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 0' }}>
                        Nenhuma venda registrada ainda no sistema.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map(s => (
                      <tr key={s.id}>
                        <td>{formatDateTime(s.created_at)}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          #{s.id.substring(0, 8)}
                        </td>
                        <td>
                          {s.client_name || <span style={{ color: 'var(--text-muted)' }}>Consumidor Final</span>}
                        </td>
                        <td>
                          <span style={{ 
                            fontSize: '11px', 
                            padding: '3px 8px', 
                            background: s.payment_method === 'Crediário' ? 'var(--danger-bg)' : 'rgba(255,255,255,0.05)',
                            color: s.payment_method === 'Crediário' ? 'var(--warning)' : 'var(--text-secondary)',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            fontWeight: 500
                          }}>
                            {s.payment_method}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--danger)' }}>
                          {s.discount > 0 ? formatCurrency(s.discount) : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>
                          {formatCurrency(s.total_price)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button 
                              className="btn btn-secondary" 
                              onClick={() => handleOpenSaleDetails(s)}
                              style={{ padding: '6px 10px', fontSize: '12px' }}
                            >
                              <i className="fa-solid fa-eye"></i> Detalhes
                            </button>
                            <button 
                              className="btn" 
                              onClick={() => handleDeleteSaleClick(s)}
                              title="Estornar e Deletar Venda"
                              style={{ 
                                padding: '6px 8px', 
                                fontSize: '12px', 
                                background: 'var(--danger-bg)', 
                                color: 'var(--danger)', 
                                border: '1px solid rgba(239, 68, 68, 0.2)' 
                              }}
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* VIEW PANEL 2: RAW MOVEMENTS LOG TAB */}
      {activeTab === 'movements' && (
        <>
          {/* Filters Bar */}
          <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <div className="search-input-wrapper" style={{ flex: 1, minWidth: '260px', margin: 0 }}>
                <i className="fa-solid fa-magnifying-glass"></i>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Buscar logs por produto ou observação..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                />
              </div>

              <select 
                className="form-control"
                style={{ maxWidth: '180px' }}
                value={stockTypeFilter}
                onChange={(e) => setStockTypeFilter(e.target.value)}
              >
                <option value="">Todos os Tipos</option>
                <option value="Entrada">Entrada</option>
                <option value="Saída manual">Saída manual</option>
                <option value="Ajuste">Ajuste de estoque</option>
                <option value="Venda">Venda</option>
                <option value="Estorno de Venda">Estorno de Venda</option>
              </select>
            </div>
          </div>

          {/* Movements Logs table */}
          <div className="card">
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Data / Hora</th>
                    <th>Produto</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: 'center' }}>Quantidade</th>
                    <th>Operador</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 0' }}>
                        Nenhum registro de movimentação encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map(m => (
                      <tr key={m.id}>
                        <td>{formatDateTime(m.created_at)}</td>
                        <td style={{ fontWeight: 600 }}>{m.product_name}</td>
                        <td>{getMovementTypeBadge(m.type)}</td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                          {m.type === 'Saída manual' || m.type === 'Venda' ? '-' : '+'}{m.quantity} un
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{m.user_email.split('@')[0]}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '300px' }}>{m.observation || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* DETAIL MODAL: SALE TRANSACTIONS */}
      {selectedSale && (
        <div className="modal active">
          <div className="modal-content" style={{ maxWidth: '560px', width: '90%' }}>
            <div className="modal-header">
              <h3>Detalhes da Venda #{selectedSale.id.substring(0, 8)}</h3>
              <button className="modal-close-btn" onClick={() => setSelectedSale(null)}>&times;</button>
            </div>
            
            <div style={{ padding: '10px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Data / Hora:</span>
                  <span style={{ fontWeight: 600 }}>{formatDateTime(selectedSale.created_at)}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Vendedor:</span>
                  <span style={{ fontWeight: 600 }}>{selectedSale.user_email}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Cliente:</span>
                  <span style={{ fontWeight: 600 }}>{selectedSale.client_name || 'Consumidor Final'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Forma de Pagamento:</span>
                  <span style={{ fontWeight: 600, color: selectedSale.payment_method === 'Crediário' ? 'var(--warning)' : 'inherit' }}>
                    {selectedSale.payment_method}
                  </span>
                </div>
              </div>

              <h4 style={{ fontSize: '14px', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                Itens da Compra
              </h4>

              {loadingItems ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Carregando itens...
                </div>
              ) : (
                <table className="custom-table" style={{ fontSize: '13px', marginBottom: '15px' }}>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th style={{ textAlign: 'center' }}>Qtd</th>
                      <th style={{ textAlign: 'right' }}>Preço Unitário</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSaleItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.product_name}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity} un</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(item.price)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>Subtotal:</span>
                  <span>{formatCurrency(Number(selectedSale.total_price) + Number(selectedSale.discount))}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px', fontSize: '12px', color: 'var(--danger)', margin: '2px 0' }}>
                    <span>Desconto:</span>
                    <span>-{formatCurrency(selectedSale.discount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px', fontSize: '14px', fontWeight: 'bold', borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '4px' }}>
                  <span>Total Pago:</span>
                  <span style={{ color: 'var(--primary)' }}>{formatCurrency(selectedSale.total_price)}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button 
                type="button" 
                className="btn" 
                style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                onClick={() => handleDeleteSaleClick(selectedSale)}
              >
                <i className="fa-solid fa-trash-can" style={{ marginRight: '6px' }}></i> Excluir & Estornar
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedSale(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
