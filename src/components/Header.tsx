import React from 'react';

interface HeaderProps {
  currentView: string;
  userEmail: string;
  onLogout: () => void;
  onQuickSale: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, userEmail, onLogout, onQuickSale }) => {
  const getTitles = (view: string) => {
    const titles: Record<string, { t: string; s: string }> = {
      dashboard: { t: 'Dashboard', s: 'Visão geral do seu negócio hoje' },
      pdv: { t: 'Ponto de Venda (PDV)', s: 'Registre vendas de forma simples e rápida' },
      estoque: { t: 'Controle de Estoque', s: 'Gerencie seu catálogo de produtos e estoque' },
      clientes: { t: 'Meus Clientes', s: 'Cadastro e histórico de compras dos clientes' },
      movimentacoes: { t: 'Movimentações de Estoque', s: 'Histórico completo de entradas e saídas' },
      configuracoes: { t: 'Ajustes & Backup', s: 'Configurações do sistema e segurança' }
    };
    return titles[view] || { t: 'Sistema JAJA', s: 'Painel de Controle' };
  };

  const { t: title, s: subtitle } = getTitles(currentView);
  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : 'A';

  return (
    <header id="header">
      <div className="page-title-container">
        <h1 className="page-title" id="page-title-text">{title}</h1>
        <span className="page-subtitle" id="page-subtitle-text">{subtitle}</span>
      </div>
      
      <div className="header-actions">
        {currentView !== 'pdv' && (
          <button className="quick-btn" onClick={onQuickSale} id="btn-quick-pdv">
            <i className="fa-solid fa-cart-plus"></i> Nova Venda
          </button>
        )}
        
        <div className="user-badge" title={`Logado como: ${userEmail}`}>
          <div className="user-avatar">{initial}</div>
          <span className="user-name">{userEmail.split('@')[0]}</span>
          <button 
            onClick={onLogout} 
            className="logout-btn" 
            title="Sair do Sistema"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              marginLeft: '10px',
              fontSize: '14px',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <i className="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      </div>
    </header>
  );
};
