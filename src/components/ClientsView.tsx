import React, { useState, useMemo } from 'react';
import { Client } from '../types';

interface ClientsViewProps {
  clients: Client[];
  onCreateClient: (client: Omit<Client, 'id' | 'created_at'>) => Promise<void>;
  onUpdateClient: (id: string, client: Partial<Client>) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  onPayDebt: (client: Client, amount: number, paymentMethod: string, obs: string) => Promise<void>;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  onCreateClient,
  onUpdateClient,
  onDeleteClient,
  onPayDebt
}) => {
  // Search
  const [search, setSearch] = useState('');

  // Modals state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payingClient, setPayingClient] = useState<Client | null>(null);
  
  // Pay form state
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'PIX' | 'Cartão' | 'Dinheiro'>('PIX');
  const [payObs, setPayObs] = useState('');

  // Client form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Operational states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
    );
  }, [clients, search]);

  // Open modal for creation
  const handleOpenCreateModal = () => {
    setEditingClient(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormNotes('');
    setErrorMsg('');
    setIsClientModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (client: Client) => {
    setEditingClient(client);
    setFormName(client.name);
    setFormPhone(client.phone || '');
    setFormEmail(client.email || '');
    setFormNotes(client.notes || '');
    setErrorMsg('');
    setIsClientModalOpen(true);
  };

  // Handle Client Form Submit
  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg('O nome do cliente é obrigatório.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const clientPayload = {
        name: formName,
        phone: formPhone || '',
        email: formEmail || '',
        notes: formNotes || '',
        debt: editingClient ? editingClient.debt : 0 // Preserve debt if editing
      };

      if (editingClient) {
        await onUpdateClient(editingClient.id, clientPayload);
      } else {
        await onCreateClient(clientPayload);
      }

      setIsClientModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao salvar cliente.');
    } finally {
      setLoading(false);
    }
  };

  // Open Settle Debt Modal
  const handleOpenPayModal = (client: Client) => {
    setPayingClient(client);
    setPayAmount(client.debt);
    setPayMethod('PIX');
    setPayObs('');
    setErrorMsg('');
    setIsPayModalOpen(true);
  };

  // Handle Pay Debt Submit
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingClient) return;
    if (payAmount <= 0) {
      setErrorMsg('O valor pago deve ser maior que zero.');
      return;
    }
    if (payAmount > payingClient.debt) {
      setErrorMsg(`O valor de pagamento não pode ser maior que o saldo devedor (${formatCurrency(payingClient.debt)}).`);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const obs = payObs || `Recebimento de Crediário de ${payingClient.name}`;
      await onPayDebt(payingClient, payAmount, payMethod, obs);

      setIsPayModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao registrar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete client
  const handleDeleteClick = async (client: Client) => {
    if (client.debt > 0) {
      alert(`Não é possível excluir o cliente "${client.name}" porque ele possui uma dívida pendente de ${formatCurrency(client.debt)}.`);
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir o cliente "${client.name}"?`)) {
      try {
        await onDeleteClient(client.id);
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir cliente.');
      }
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <section id="view-clientes" className="app-view">
      {/* Search and Action Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Search box */}
          <div className="search-input-wrapper" style={{ flex: 1, minWidth: '260px', margin: 0 }}>
            <i className="fa-solid fa-magnifying-glass"></i>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Buscar cliente por nome, telefone ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <i className="fa-solid fa-user-plus" style={{ marginRight: '8px' }}></i> Novo Cliente
          </button>
        </div>
      </div>

      {/* Clients list Table */}
      <div className="card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Nome / Registro</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th style={{ textAlign: 'right' }}>Saldo Devedor (Crediário)</th>
                <th>Observações</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 0' }}>
                    Nenhum cliente cadastrado.
                  </td>
                </tr>
              ) : (
                filteredClients.map(c => (
                  <tr key={c.id}>
                    <td>
                      <span style={{ fontWeight: 600, display: 'block' }}>{c.name}</span>
                      {c.created_at && (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Cadastrado em: {new Date(c.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </td>
                    <td>{c.phone || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                    <td>{c.email || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: c.debt > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {formatCurrency(c.debt)}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.notes}>
                      {c.notes || <span style={{ color: 'var(--text-muted)' }}>Sem observações</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {/* Pay debt button */}
                        {c.debt > 0 && (
                          <button 
                            className="btn btn-primary" 
                            onClick={() => handleOpenPayModal(c)}
                            title="Receber Pagamento do Crediário"
                            style={{ padding: '6px 10px', fontSize: '12px', background: 'var(--success)', border: 'none' }}
                          >
                            <i className="fa-solid fa-hand-holding-dollar"></i> Receber
                          </button>
                        )}
                        
                        {/* Edit button */}
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => handleOpenEditModal(c)}
                          title="Editar Cadastro"
                          style={{ padding: '6px 8px', fontSize: '12px' }}
                        >
                          <i className="fa-solid fa-user-pen"></i>
                        </button>
                        
                        {/* Delete button */}
                        <button 
                          className="btn" 
                          onClick={() => handleDeleteClick(c)}
                          title="Excluir Cliente"
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

      {/* MODAL 1: CLIENT REGISTER & EDIT */}
      {isClientModalOpen && (
        <div className="modal active">
          <div className="modal-content" style={{ maxWidth: '520px', width: '90%' }}>
            <div className="modal-header">
              <h3>{editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}</h3>
              <button className="modal-close-btn" onClick={() => setIsClientModalOpen(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleClientSubmit}>
              {errorMsg && (
                <div className="alert-banner" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', marginBottom: '15px', display: 'flex' }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '8px' }}></i>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={{ marginBottom: '15px' }}>
                <label className="form-label">Nome Completo *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Maria das Graças Silva"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                <div>
                  <label className="form-label">Telefone</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Ex: (11) 99999-9999"
                  />
                </div>
                
                <div>
                  <label className="form-label">E-mail</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="Ex: maria@email.com"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Observações / Notas</label>
                <textarea 
                  className="form-control" 
                  style={{ height: '80px', resize: 'vertical' }}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Gostos do cliente, limites de fiado, prazos..."
                ></textarea>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsClientModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PAY OUTSTANDING DEBT */}
      {isPayModalOpen && payingClient && (
        <div className="modal active">
          <div className="modal-content" style={{ maxWidth: '440px', width: '90%' }}>
            <div className="modal-header">
              <h3>Receber Pagamento (Crediário)</h3>
              <button className="modal-close-btn" onClick={() => setIsPayModalOpen(false)}>&times;</button>
            </div>
            
            <form onSubmit={handlePaySubmit}>
              {errorMsg && (
                <div className="alert-banner" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', marginBottom: '15px', display: 'flex' }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '8px' }}></i>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={{ marginBottom: '15px', background: 'rgba(16, 185, 129, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Cliente:</span>
                <span style={{ fontWeight: 600, fontSize: '15px', display: 'block', margin: '2px 0 6px 0' }}>{payingClient.name}</span>
                <span style={{ fontSize: '12px', display: 'block' }}>
                  Saldo Devedor Atual: <strong style={{ color: 'var(--danger)' }}>{formatCurrency(payingClient.debt)}</strong>
                </span>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label className="form-label">Valor do Pagamento (R$) *</label>
                <input 
                  type="number" 
                  className="form-control" 
                  min="0.01"
                  step="0.01"
                  required
                  value={payAmount === 0 ? '' : payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  placeholder="Ex: 50.00"
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label className="form-label">Forma de Recebimento *</label>
                <select 
                  className="form-control" 
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                >
                  <option value="PIX">PIX</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão">Cartão de Crédito/Débito</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Observação</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={payObs}
                  onChange={(e) => setPayObs(e.target.value)}
                  placeholder="Ex: Abatimento de dívida pago em dinheiro"
                />
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPayModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--success)' }} disabled={loading}>
                  {loading ? 'Processando...' : 'Confirmar Recebimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
