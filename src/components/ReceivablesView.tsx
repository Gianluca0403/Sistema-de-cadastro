import React, { useMemo, useState } from 'react';
import { SaleInstallment, Customer } from '../types';

interface ReceivablesViewProps {
  installments: SaleInstallment[];
  clients: Customer[];
  hasOpenCashRegister: boolean;
  onMarkAsPaid: (
    installment: SaleInstallment,
    paidAmount: number,
    paymentMethod: 'PIX' | 'Cartão' | 'Dinheiro'
  ) => Promise<void>;
  onPayDebt: (
    client: Customer,
    amount: number,
    paymentMethod: string,
    obs: string
  ) => Promise<void>;
}

type StatusFilter = 'todos' | 'pendente' | 'atrasado' | 'pago';

export const ReceivablesView: React.FC<ReceivablesViewProps> = ({
  installments,
  clients,
  hasOpenCashRegister,
  onMarkAsPaid,
  onPayDebt
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'Cartão' | 'Dinheiro'>('PIX');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estado separado para o pagamento de dívidas diretas (não vinculadas a parcela de boleto)
  const [payingDebtClientId, setPayingDebtClientId] = useState<string | null>(null);
  const [debtPaymentMethod, setDebtPaymentMethod] = useState<'PIX' | 'Cartão' | 'Dinheiro'>('PIX');
  const [debtLoading, setDebtLoading] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (val: string) => {
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  };

  // Calcula o status real (marca como atrasado se venceu e ainda está pendente)
  const enrichedInstallments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return installments.map(inst => ({
      ...inst,
      displayStatus: inst.status === 'pendente' && inst.due_date < today ? 'atrasado' : inst.status
    }));
  }, [installments]);

  const filteredInstallments = useMemo(() => {
    if (statusFilter === 'todos') return enrichedInstallments;
    return enrichedInstallments.filter(inst => inst.displayStatus === statusFilter);
  }, [enrichedInstallments, statusFilter]);

  const summary = useMemo(() => {
    const pendente = enrichedInstallments.filter(i => i.displayStatus === 'pendente').reduce((sum, i) => sum + i.amount, 0);
    const atrasado = enrichedInstallments.filter(i => i.displayStatus === 'atrasado').reduce((sum, i) => sum + i.amount, 0);
    const pago = enrichedInstallments.filter(i => i.displayStatus === 'pago').reduce((sum, i) => sum + (i.paid_amount || i.amount), 0);
    return { pendente, atrasado, pago };
  }, [enrichedInstallments]);

  const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
    pendente: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', label: 'Pendente' },
    atrasado: { bg: 'var(--danger-bg)', color: 'var(--danger)', label: 'Atrasado' },
    pago: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'Pago' }
  };

  const handleConfirmPayment = async (installment: any) => {
    try {
      setLoading(true);
      setErrorMsg('');
      await onMarkAsPaid(installment, installment.amount, paymentMethod);
      setPayingId(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar recebimento.');
    } finally {
      setLoading(false);
    }
  };

  // Clientes com dívida "solta" (não vinculada a uma parcela de boleto específica).
  // Isso inclui, por exemplo, dívidas geradas em trocas de produtos.
  const clientsWithDebt = useMemo(() => {
    return clients.filter(c => (c.debt || 0) > 0).sort((a, b) => b.debt - a.debt);
  }, [clients]);

  const totalDirectDebt = useMemo(() => {
    return clientsWithDebt.reduce((sum, c) => sum + c.debt, 0);
  }, [clientsWithDebt]);

  const handleConfirmDebtPayment = async (client: Customer) => {
    try {
      setDebtLoading(true);
      setErrorMsg('');
      await onPayDebt(client, client.debt, debtPaymentMethod, 'Quitação de dívida — Contas a Receber');
      setPayingDebtClientId(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar recebimento da dívida.');
    } finally {
      setDebtLoading(false);
    }
  };

  return (
    <section id="view-receivables" className="app-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-file-invoice-dollar" style={{ color: 'var(--primary)' }}></i>
          Contas a Receber
        </h2>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>A Receber</span>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>{formatCurrency(summary.pendente)}</div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Atrasado</span>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--danger)' }}>{formatCurrency(summary.atrasado)}</div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Recebido</span>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#22c55e' }}>{formatCurrency(summary.pago)}</div>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', marginBottom: '12px', padding: '10px', fontSize: '12px', borderRadius: '6px' }}>
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>
          {errorMsg}
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

      {/* Installments Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {filteredInstallments.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.4 }}></i>
            <p>Nenhuma parcela encontrada.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px' }}>Cliente</th>
                <th style={{ padding: '10px 14px' }}>Parcela</th>
                <th style={{ padding: '10px 14px' }}>Vencimento</th>
                <th style={{ padding: '10px 14px' }}>Valor</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
                <th style={{ padding: '10px 14px' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredInstallments.map((inst: any) => {
                const style = statusStyle[inst.displayStatus];
                const isPaying = payingId === inst.id;

                return (
                  <tr key={inst.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 14px' }}>{inst.customer_name || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>{inst.installment_number}</td>
                    <td style={{ padding: '10px 14px' }}>{formatDate(inst.due_date)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{formatCurrency(inst.amount)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: style.bg, color: style.color, padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                        {style.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {inst.status === 'pago' ? (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Pago em {inst.paid_at ? formatDate(inst.paid_at.split('T')[0]) : '—'} ({inst.payment_method})
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
                            disabled={loading}
                            onClick={() => handleConfirmPayment(inst)}
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
                        <button
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                          onClick={() => setPayingId(inst.id)}
                        >
                          Registrar Recebimento
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* OUTRAS DÍVIDAS DE CLIENTES (ex: geradas em trocas de produtos) */}
      <div style={{ marginTop: '30px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-hand-holding-dollar" style={{ color: 'var(--warning)' }}></i>
          Outras Dívidas de Clientes
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Dívidas não vinculadas a parcelas de boleto — por exemplo, diferenças de troca de produtos.
        </p>
      </div>

      <div className="card" style={{ padding: '14px', marginBottom: '16px', maxWidth: '260px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total nessas dívidas</span>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--warning)' }}>{formatCurrency(totalDirectDebt)}</div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {clientsWithDebt.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.4 }}></i>
            <p style={{ fontSize: '13px' }}>Nenhum cliente com dívida pendente fora das parcelas de boleto.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px' }}>Cliente</th>
                <th style={{ padding: '10px 14px' }}>Valor devido</th>
                <th style={{ padding: '10px 14px' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {clientsWithDebt.map(client => {
                const isPaying = payingDebtClientId === client.id;
                return (
                  <tr key={client.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 14px' }}>{client.name}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--warning)' }}>{formatCurrency(client.debt)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {isPaying ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <select
                            className="form-control"
                            style={{ padding: '4px 6px', fontSize: '11px', width: '100px' }}
                            value={debtPaymentMethod}
                            onChange={(e) => setDebtPaymentMethod(e.target.value as any)}
                          >
                            <option value="PIX">PIX</option>
                            <option value="Cartão">Cartão</option>
                            <option value="Dinheiro">Dinheiro</option>
                          </select>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                            disabled={debtLoading}
                            onClick={() => handleConfirmDebtPayment(client)}
                          >
                            Confirmar
                          </button>
                          <button
                            className="btn"
                            style={{ padding: '4px 10px', fontSize: '11px', background: 'rgba(255,255,255,0.05)' }}
                            onClick={() => setPayingDebtClientId(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                          onClick={() => setPayingDebtClientId(client.id)}
                        >
                          Registrar Recebimento
                        </button>
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