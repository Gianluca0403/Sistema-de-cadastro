import React, { useRef, useState } from 'react';
import { isSupabaseConfigured } from '../supabaseClient';

interface SettingsViewProps {
  dbType: 'Supabase' | 'Mock LocalStorage';
  onClearAllData: () => void;
  onImportBackup: (jsonString: string) => boolean;
  onExportBackup: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  dbType,
  onClearAllData,
  onImportBackup,
  onExportBackup
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const success = onImportBackup(text);
      if (success) {
        setImportStatus({ type: 'success', msg: 'Backup importado com sucesso! A página será atualizada.' });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setImportStatus({ type: 'error', msg: 'Arquivo de backup inválido. Verifique a estrutura.' });
      }
    };
    reader.readAsText(file);
  };

  const handleClearClick = () => {
    if (window.confirm('ATENÇÃO: Isso apagará TODOS os produtos, clientes, vendas e logs salvos no LocalStorage (modo demonstração). Esta ação é irreversível. Deseja prosseguir?')) {
      onClearAllData();
      alert('Dados limpos com sucesso. A página será atualizada.');
      window.location.reload();
    }
  };

  return (
    <section id="view-configuracoes" className="app-view">
      
      {/* Supabase Connection Status Card */}
      <div className="card" style={{ marginBottom: '25px' }}>
        <div className="section-header">
          <h2 className="section-title"><i className="fa-solid fa-server"></i> Conexão com o Banco de Dados</h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', margin: '20px 0', padding: '15px', borderRadius: '8px', background: dbType === 'Supabase' ? 'var(--success-bg)' : 'var(--warning-bg)', border: `1px solid ${dbType === 'Supabase' ? 'var(--success)' : 'var(--warning)'}30` }}>
          <div style={{ 
            width: '16px', 
            height: '16px', 
            borderRadius: '50%', 
            background: dbType === 'Supabase' ? 'var(--success)' : 'var(--warning)',
            boxShadow: `0 0 10px ${dbType === 'Supabase' ? 'var(--success)' : 'var(--warning)'}`
          }}></div>
          <div>
            <h4 style={{ fontWeight: 600, fontSize: '15px' }}>
              {dbType === 'Supabase' ? 'Banco de Dados Supabase Ativo' : 'Rodando em Modo de Demonstração (Local)'}
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {dbType === 'Supabase' 
                ? 'Seu sistema está sincronizado com a nuvem em tempo real e pronto para produção.'
                : 'Os dados estão sendo salvos apenas no navegador do seu dispositivo atual (LocalStorage).'
              }
            </p>
          </div>
        </div>

        {/* Supabase integration setup instructions */}
        {!isSupabaseConfigured && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Como conectar seu próprio banco de dados Supabase?
            </h4>
            <ol style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '20px', lineHeight: '1.8' }}>
              <li>Crie um projeto gratuito no <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Supabase</a>.</li>
              <li>Execute o script SQL fornecido no arquivo <code style={{ color: 'var(--secondary)' }}>supabase_schema.sql</code> (localizado na raiz do projeto) dentro do <strong>SQL Editor</strong> do Supabase.</li>
              <li>No painel do Supabase, crie um bucket em <strong>Storage</strong> com o nome exato <code style={{ color: 'var(--secondary)' }}>cosmetics_photos</code> e configure o bucket como <strong>Public</strong>.</li>
              <li>Crie um arquivo <code style={{ color: 'var(--secondary)' }}>.env</code> na raiz do projeto local contendo as variáveis:</li>
            </ol>
            
            <pre style={{ 
              background: 'rgba(0,0,0,0.4)', 
              padding: '12px', 
              borderRadius: '6px', 
              fontFamily: 'monospace', 
              fontSize: '11px', 
              color: 'var(--primary)',
              margin: '10px 0 15px 0',
              border: '1px solid var(--border-color)',
              overflowX: 'auto'
            }}>
{`VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key`}
            </pre>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              * Ao fazer o deploy na Netlify, configure essas mesmas variáveis no painel de controle (Site Settings &gt; Environment Variables).
            </p>
          </div>
        )}
      </div>

      {/* Backup and Local Actions Card */}
      <div className="card">
        <div className="section-header">
          <h2 className="section-title"><i className="fa-solid fa-database"></i> Backup & Operações Locais</h2>
        </div>
        
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '10px 0 20px 0' }}>
          Exporte seus dados do LocalStorage para segurança ou importe backups salvos anteriormente.
        </p>

        {importStatus && (
          <div className="alert-banner" style={{ 
            background: importStatus.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', 
            color: importStatus.type === 'success' ? 'var(--success)' : 'var(--danger)', 
            marginBottom: '15px', 
            display: 'flex' 
          }}>
            <i className={`fa-solid ${importStatus.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`} style={{ marginRight: '8px' }}></i>
            <span>{importStatus.msg}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Export JSON backup button */}
          <button className="btn btn-primary" onClick={onExportBackup}>
            <i className="fa-solid fa-file-export" style={{ marginRight: '8px' }}></i> Exportar Backup (JSON)
          </button>
          
          {/* Import JSON backup button */}
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleImportFileChange}
          />
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <i className="fa-solid fa-file-import" style={{ marginRight: '8px' }}></i> Importar Backup (JSON)
          </button>

          {/* Reset button */}
          <button 
            className="btn" 
            onClick={handleClearClick}
            style={{ 
              background: 'var(--danger-bg)', 
              color: 'var(--danger)', 
              border: '1px solid rgba(239, 68, 68, 0.2)',
              marginLeft: 'auto'
            }}
          >
            <i className="fa-solid fa-trash-can" style={{ marginRight: '8px' }}></i> Apagar Tudo
          </button>
        </div>
      </div>

    </section>
  );
};
