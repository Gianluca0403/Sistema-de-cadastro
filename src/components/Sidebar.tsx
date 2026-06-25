import React from 'react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  dbType: 'Supabase' | 'Mock LocalStorage';
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, dbType }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-chart-pie' },
    { id: 'pdv', label: 'PDV / Vendas', icon: 'fa-solid fa-cash-register' },
    { id: 'estoque', label: 'Estoque', icon: 'fa-solid fa-boxes-stacked' },
    { id: 'clientes', label: 'Clientes', icon: 'fa-solid fa-user-group' },
    { id: 'movimentacoes', label: 'Histórico', icon: 'fa-solid fa-clock-rotate-left' },
    { id: 'configuracoes', label: 'Ajustes & Backup', icon: 'fa-solid fa-sliders' }
  ];

  return (
    <aside id="sidebar">
      <div className="brand">
        <i className="fa-solid fa-wand-magic-sparkles brand-icon"></i>
        <span className="brand-name">JAJA Cosméticos</span>
      </div>
      
      <nav>
        <ul className="menu-list">
          {menuItems.map(item => (
            <li 
              key={item.id}
              className={`menu-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => onViewChange(item.id)}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="sidebar-footer" style={{ padding: '20px', borderTop: '1px solid var(--border-color)' }}>
        <div className="store-info">
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>JAJA Perfumaria</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: dbType === 'Supabase' ? 'var(--success)' : 'var(--warning)',
              display: 'inline-block'
            }}></span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {dbType === 'Supabase' ? 'Supabase Conectado' : 'Modo Demonstração'}
            </span>
          </div>
          <p style={{ fontSize: '10px', marginTop: '6px', color: 'var(--text-muted)' }}>v1.1.0 &copy; 2026</p>
        </div>
      </div>
    </aside>
  );
};
