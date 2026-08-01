import React, { useMemo, useState } from 'react';
import { Payable } from '../types';

interface PayablesViewProps {
  payables: Payable[];
  hasOpenCashRegister: boolean;
  onCreatePayable: (data: { description: string; amount: number; due_date: string }) => Promise<void>;
  onMarkAsPaid: (payable: Payable, paymentMethod: 'PIX' | 'Cartão' | 'Dinheiro') => Promise<void>;
  onDeletePayable: (id: string) => Promise<void>;
}

type StatusFilter = 'todos' | 'pendente' | 'atrasado' | 'pago';

export const PayablesView: React.FC<PayablesViewProps> = ({
  payables,
  hasOpenCashRegister,
  onCreatePayable,
  onMarkAsPaid,
  onDeletePayable
}) => {
  // Formulário de nova conta
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Filtro e pagamento
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'Cartão' | 'Dinheiro'>('PIX');
  const [payLoading, setPayLoading] = useState(false);
  const [listError, setListError] = useState('');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (val: string) => {
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!description.trim()) {
      setFormError('Informe o produto ou descrição da conta.');
      return;
    }
    if (amount <= 0) {
      setFormError('Informe um valor maior que zero.');
      return;
    }
    if (!dueDate) {
      setFormError('Informe a data de pagamento.');
      return;
    }

    try {
      setFormLoading(true);
      await onCreatePayable({ description: description.trim(), amount, due_date: dueDate });
      setDescription('');
      setAmount(0);
      setDueDate('');
    } catch (err: any) {
      setFormError(err.message || 'Erro ao cadastrar conta a pagar.');
    } finally {
      setFormLoading(false);
    }
  };

  // Calcula o status real (marca como atrasado se venceu e ainda está pendente)
  const enrichedPayables = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return payables.map(p => ({
      ...p,
      displayStatus: p.status === 'pendente' && p.due_date < today ? 'atrasado' : p.status
    }));
  }, [payables]);

  const filteredPayables = useMemo(() => {
    if (statusFilter === 'todos') return enrichedPayables;
    return enrichedPayables.filter(p => p.displayStatus === statusFilter);
  }, [enrichedPayables, statusFilter]);

  const summary = useMemo(() => {
    const pendente = enrichedPayables.filter(p => p.displayStatus === 'pendente').reduce((sum, p) => sum + p.amount, 0);
    const atrasado = enrichedPayables.filter(p => p.displayStatus === 'atrasado').reduce((sum, p) => sum + p.amount, 0);
    const pago = enrichedPayables.filter(p => p.displayStatus === 'pago').reduce((sum, p) => sum + p.amount, 0);
    return { pendente, atrasado, pago };
  }, [enrichedPayables]);

  const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
    pendente: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', label: 'Pendente' },
    atrasado: { bg: 'var(--danger-bg)', color: 'var(--danger)', label: 'Atrasado' },
    pago: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'Pago' }
  };

  const handleConfirmPayment = async (payable: any) => {
    try {
      setPayLoading(true);
      setListError('');
      await onMarkAsPaid(payable, paymentMethod);
      setPayingId(null);
    } catch (err: any) {
      setListError(err.message || 'Erro ao registrar pagamento.');
    } finally {
      setPayLoading(false);
    }
  };

  const handleDelete = async (payable: Payable) => {
    if (window.confirm(`Excluir a conta "${payable.description}"?`)) {
      try {
        await onDeletePayable(payable.id);
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir conta.');
      }
    }
  };

  return (
    <section id="view-payables" className="app-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-money-check-dollar" style={{ color: 'var(--primary)' }}></i>
          Contas a Pagar
        </h2>
      </div>

      {/* Formulário de nova conta */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Nova Conta a Pagar</h3>

        {formError && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', marginBottom: '12px', padding: '10px', fontSize: '12px', borderRadius: '6px' }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Produto / Descrição</label>
              <input
                type="text"
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Fornecedor de perfumes, aluguel, luz..."
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Valor (R$)</label>
              <input
                type="number"
                className="form-control"
                min="0"
                step="0.01"
                value={amount === 0 ? '' : amount}
                onChange={(e) => setAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Data de Pagamento</label>
              <input
                type="date"
                className="form-control"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={formLoading}
            style={{ padding: '10px 20px', fontWeight: 'bold' }}
          >
            {formLoading ? 'Salvando...' : 'Cadastrar Conta'}
          </button>
        </form>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>A Pagar</span>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>{formatCurrency(summary.pendente)}</div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Atrasado</span>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--danger)' }}>{formatCurrency(summary.atrasado)}</div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pago</span>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#22c55e' }}>{formatCurrency(summary.pago)}</div>
        </div>
      </div>

      {listError && (
        <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', marginBottom: '12px', padding: '10px', fontSize: '12px', borderRadius: '6px' }}>
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>
          {listError}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['todos', 'pendente', 'atrasado', 'pago'] as StatusFilter[]).map(status => (
          <button
            key={status}
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              background: statusFilter === status ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              textTransform: 'capitalize'
            }}
            onClick={() => setStatusFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Payables Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {filteredPayables.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.4 }}></i>
            <p>Nenhuma conta encontrada.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px' }}>Produto / Descrição</th>
                <th style={{ padding: '10px 14px' }}>Data de Pagamento</th>
                <th style={{ padding: '10px 14px' }}>Valor</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
                <th style={{ padding: '10px 14px' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayables.map((payable: any) => {
                const style = statusStyle[payable.displayStatus];
                const isPaying = payingId === payable.id;

                return (
                  <tr key={payable.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 14px' }}>{payable.description}</td>
                    <td style={{ padding: '10px 14px' }}>{formatDate(payable.due_date)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{formatCurrency(payable.amount)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: style.bg, color: style.color, padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                        {style.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {payable.status === 'pago' ? (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Pago em {payable.paid_at ? formatDate(payable.paid_at.split('T')[0]) : '—'} ({payable.payment_method})
                        </span>
                      ) : isPaying ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <select
                            className="form-control"
                            style={{ padding: '4px 6px', fontSize: '11px', width: '100px' }}
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as any)}
                          >
                            <option value="PIX">PIX</option>
                            <option value="Cartão">Cartão</option>
                            <option value="Dinheiro">Dinheiro</option>
                          </select>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                            disabled={payLoading}
                            onClick={() => handleConfirmPayment(payable)}
                          >
                            Confirmar
                          </button>
                          <button
                            className="btn"
                            style={{ padding: '4px 10px', fontSize: '11px', background: 'rgba(255,255,255,0.05)' }}
                            onClick={() => setPayingId(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                            onClick={() => setPayingId(payable.id)}
                          >
                            Registrar Pagamento
                          </button>
                          <button
                            className="btn"
                            style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--danger-bg)', color: 'var(--danger)' }}
                            onClick={() => handleDelete(payable)}
                            title="Excluir conta"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};