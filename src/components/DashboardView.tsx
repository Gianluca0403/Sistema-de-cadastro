import React, { useMemo } from 'react';
import { Product, Sale, Client } from '../types';
import { DEFAULT_CATEGORY_IMAGES } from '../supabaseClient';

interface DashboardViewProps {
  products: Product[];
  sales: Sale[];
  clients: Client[];
  onNavigateToStock: () => void;
  onNavigateToPDV: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  sales,
  clients,
  onNavigateToStock,
  onNavigateToPDV
}) => {
  // --- METRICS COMPUTATION ---
  const metrics = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thisMonthStr = todayStr.substring(0, 7); // YYYY-MM
    
    // Get last month string
    let lastMonthVal = now.getMonth() - 1;
    let lastMonthYear = now.getFullYear();
    if (lastMonthVal < 0) {
      lastMonthVal = 11;
      lastMonthYear -= 1;
    }
    const lastMonthStr = `${lastMonthYear}-${String(lastMonthVal + 1).padStart(2, '0')}`;

    let totalSalesToday = 0;
    let totalSalesMonth = 0;
    let totalSalesLastMonth = 0;
    
    sales.forEach(sale => {
      const saleDate = sale.created_at.split('T')[0];
      const saleMonth = saleDate.substring(0, 7);

      if (saleDate === todayStr) {
        totalSalesToday += Number(sale.total_price) || 0;
      }
      if (saleMonth === thisMonthStr) {
        totalSalesMonth += Number(sale.total_price) || 0;
      }
      if (saleMonth === lastMonthStr) {
        totalSalesLastMonth += Number(sale.total_price) || 0;
      }
    });

    // Profit computation (requires item cost prices)
    // For mock/simple metrics:
    // Profit = sales price minus cost price of items, accounting for discounts.
    // Let's assume a default profit of 35% if cost price isn't registered, but since we have cost_price on items we can use it!
    // We don't load sale_items inside this component directly, but we can compute it if sales has items, or fall back.
    // Wait! Let's compute profit. If a sale has items, we sum (price - cost_price) * quantity - discount.
    // If it doesn't have items array populated, we can estimate it based on (retail_price - cost_price) or default 40%.
    // In our dbService, we make sure to save items. Let's write the code to check if items exist.
    let totalProfitMonth = 0;
    sales.forEach(sale => {
      const saleMonth = sale.created_at.substring(0, 7);
      if (saleMonth === thisMonthStr) {
        if (sale.items && sale.items.length > 0) {
          let saleProfit = 0;
          sale.items.forEach(item => {
            const cost = Number(item.cost_price) || 0;
            const price = Number(item.price) || 0;
            saleProfit += (price - cost) * item.quantity;
          });
          totalProfitMonth += Math.max(0, saleProfit - (Number(sale.discount) || 0));
        } else {
          // Fallback: estimate profit as 35% of total sales price if item breakdown isn't attached
          totalProfitMonth += (Number(sale.total_price) || 0) * 0.35;
        }
      }
    });

    // Total outstanding receivables (crediário debt)
    const totalReceivablesPending = clients.reduce((acc, client) => acc + (Number(client.debt) || 0), 0);

    // Stock metrics
    let lowStockItemsCount = 0;
    let totalInventoryCost = 0;
    let totalInventoryValue = 0;

    products.forEach(p => {
      const qty = Number(p.stock) || 0;
      totalInventoryCost += qty * (Number(p.cost_price) || 0);
      totalInventoryValue += qty * (Number(p.retail_price) || 0);
      if (qty <= (Number(p.min_stock) || 0)) {
        lowStockItemsCount++;
      }
    });

    return {
      totalSalesToday,
      totalSalesMonth,
      totalSalesLastMonth,
      totalProfitMonth,
      totalReceivablesPending,
      totalInventoryCost,
      totalInventoryValue,
      lowStockItemsCount,
      totalProductsCount: products.length
    };
  }, [products, sales, clients]);

  // --- BEST SELLING PRODUCTS (Top 5) ---
  const topSelling = useMemo(() => {
    const productQtyMap: Record<string, { name: string; category: string; qty: number; totalSales: number }> = {};

    sales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          if (!productQtyMap[item.product_id]) {
            // Find product category
            const prod = products.find(p => p.id === item.product_id);
            productQtyMap[item.product_id] = {
              name: item.product_name || prod?.name || 'Produto Removido',
              category: prod?.category || 'Outros',
              qty: 0,
              totalSales: 0
            };
          }
          productQtyMap[item.product_id].qty += item.quantity;
          productQtyMap[item.product_id].totalSales += item.quantity * Number(item.price);
        });
      }
    });

    return Object.values(productQtyMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [sales, products]);

  // --- LAST 7 DAYS SALES FOR CHART ---
  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const daySales = sales
        .filter(sale => sale.created_at.split('T')[0] === dateStr)
        .reduce((sum, sale) => sum + (Number(sale.total_price) || 0), 0);

      const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
      data.push({ label, value: daySales, dateStr });
    }
    return data;
  }, [sales]);

  // Calculate SVG dimensions
  const maxChartValue = useMemo(() => {
    const maxVal = Math.max(...chartData.map(d => d.value));
    return maxVal === 0 ? 1000 : maxVal * 1.15; // 15% headroom
  }, [chartData]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <section id="view-dashboard" className="app-view">
      {/* Metric Cards Grid */}
      <div className="metrics-grid">
        <div className="card metric-card">
          <div className="metric-info">
            <h3>Vendas Hoje</h3>
            <div className="value" id="metric-today-sales">{formatCurrency(metrics.totalSalesToday)}</div>
            <span className="subtitle">Feito hoje</span>
          </div>
          <div className="metric-icon gold"><i className="fa-solid fa-calendar-day"></i></div>
        </div>
        
        <div className="card metric-card">
          <div className="metric-info">
            <h3>Vendas no Mês</h3>
            <div className="value" id="metric-month-sales">{formatCurrency(metrics.totalSalesMonth)}</div>
            <span className="subtitle" id="metric-last-month-compare">
              Vs. {formatCurrency(metrics.totalSalesLastMonth)} mês ant.
            </span>
          </div>
          <div className="metric-icon pink"><i className="fa-solid fa-calendar-days"></i></div>
        </div>

        <div className="card metric-card">
          <div className="metric-info">
            <h3>Lucro Estimado</h3>
            <div className="value" id="metric-month-profit" style={{ color: 'var(--success)' }}>
              {formatCurrency(metrics.totalProfitMonth)}
            </div>
            <span className="subtitle">Língua líquida do mês</span>
          </div>
          <div className="metric-icon green"><i className="fa-solid fa-hand-holding-dollar"></i></div>
        </div>

        <div className="card metric-card">
          <div className="metric-info">
            <h3>Pendente (Crediário)</h3>
            <div className="value" id="metric-pending-sales" style={{ color: 'var(--warning)' }}>
              {formatCurrency(metrics.totalReceivablesPending)}
            </div>
            <span className="subtitle">Total fiado ativo</span>
          </div>
          <div className="metric-icon red"><i className="fa-solid fa-file-invoice-dollar"></i></div>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {metrics.lowStockItemsCount > 0 && (
        <div id="dashboard-stock-warning" className="alert-banner" style={{ display: 'flex', marginBottom: '25px' }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--warning)', marginRight: '10px' }}></i>
          <span>
            Atenção: Existem <strong id="warning-stock-count">{metrics.lowStockItemsCount}</strong> produtos com estoque baixo ou esgotado!{' '}
            <button 
              onClick={onNavigateToStock} 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--primary)', 
                textDecoration: 'underline', 
                cursor: 'pointer',
                font: 'inherit',
                fontWeight: 'bold',
                padding: 0
              }}
            >
              Verificar estoque agora.
            </button>
          </span>
        </div>
      )}

      {/* Double Column Section (Chart + Top Sellers) */}
      <div className="dashboard-sections">
        {/* Sales Chart Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="section-header">
            <h2 className="section-title"><i className="fa-solid fa-chart-line"></i> Evolução de Vendas (7 Dias)</h2>
          </div>
          
          {/* Custom SVG Chart - Sleek Area Graph with CSS Glows */}
          <div className="chart-container" style={{ position: 'relative', height: '260px', marginTop: '15px' }}>
            {metrics.totalSalesMonth === 0 && sales.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-chart-bar" style={{ fontSize: '32px', marginBottom: '10px' }}></i>
                <p>Nenhuma venda registrada nos últimos 7 dias.</p>
                <button className="btn btn-primary" onClick={onNavigateToPDV} style={{ marginTop: '10px', padding: '6px 16px' }}>
                  Ir para o PDV
                </button>
              </div>
            ) : (
              <svg width="100%" height="100%" viewBox="0 0 600 240" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <defs>
                  {/* Glowing line gradient */}
                  <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-axis helper grids */}
                <line x1="40" y1="30" x2="580" y2="30" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="40" y1="95" x2="580" y2="95" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="40" y1="160" x2="580" y2="160" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="40" y1="210" x2="580" y2="210" stroke="var(--border-color)" strokeWidth="1" />

                {/* Render area under path */}
                <path
                  d={`
                    M 40 210
                    ${chartData.map((d, index) => {
                      const x = 50 + index * 85;
                      const y = 210 - (d.value / maxChartValue) * 170;
                      return `L ${x} ${y}`;
                    }).join(' ')}
                    L 560 210 Z
                  `}
                  fill="url(#chartGlow)"
                />

                {/* Render path line */}
                <path
                  d={chartData.map((d, index) => {
                    const x = 50 + index * 85;
                    const y = 210 - (d.value / maxChartValue) * 170;
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Render points and labels */}
                {chartData.map((d, index) => {
                  const x = 50 + index * 85;
                  const y = 210 - (d.value / maxChartValue) * 170;

                  return (
                    <g key={index}>
                      {/* Circle dot */}
                      <circle
                        cx={x}
                        cy={y}
                        r="5"
                        fill="var(--bg-main)"
                        stroke="var(--primary)"
                        strokeWidth="3"
                        style={{ cursor: 'pointer' }}
                      />
                      
                      {/* Hover Tooltip Value */}
                      {d.value > 0 && (
                        <text
                          x={x}
                          y={y - 12}
                          textAnchor="middle"
                          fill="var(--text-primary)"
                          fontSize="9"
                          fontWeight="bold"
                          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                        >
                          {Math.round(d.value)}
                        </text>
                      )}

                      {/* X-axis label */}
                      <text
                        x={x}
                        y="230"
                        textAnchor="middle"
                        fill="var(--text-muted)"
                        fontSize="9"
                        fontWeight="500"
                      >
                        {d.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* Top Selling Products Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="section-header">
            <h2 className="section-title"><i className="fa-solid fa-fire"></i> Mais Vendidos</h2>
          </div>
          <div className="table-container" style={{ flex: 1, marginTop: '10px' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th style={{ textAlign: 'center' }}>Qtd Vendida</th>
                  <th style={{ textAlign: 'right' }}>Total Recebido</th>
                </tr>
              </thead>
              <tbody id="top-selling-tbody">
                {topSelling.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                      Nenhuma venda registrada ainda no sistema.
                    </td>
                  </tr>
                ) : (
                  topSelling.map((item, index) => (
                    <tr key={index}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: `url(${DEFAULT_CATEGORY_IMAGES[item.category as keyof typeof DEFAULT_CATEGORY_IMAGES] || DEFAULT_CATEGORY_IMAGES.Outros}) center/cover`,
                          flexShrink: 0
                        }}></div>
                        <div>
                          <span style={{ fontWeight: 600, display: 'block' }}>{item.name}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.category}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.qty} un</td>
                      <td style={{ textAlign: 'right', color: 'var(--primary)', fontWeight: 'bold' }}>
                        {formatCurrency(item.totalSales)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Summary Cards (Footer Area) */}
      <div className="metrics-grid" style={{ marginTop: '25px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Custo do Estoque Físico</span>
            <h4 style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px', color: 'var(--text-secondary)' }}>
              {formatCurrency(metrics.totalInventoryCost)}
            </h4>
          </div>
          <i className="fa-solid fa-hand-holding-dollar" style={{ fontSize: '24px', color: 'var(--text-muted)', opacity: 0.3 }}></i>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Valor de Venda do Estoque</span>
            <h4 style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px', color: 'var(--primary)' }}>
              {formatCurrency(metrics.totalInventoryValue)}
            </h4>
          </div>
          <i className="fa-solid fa-tags" style={{ fontSize: '24px', color: 'var(--text-muted)', opacity: 0.3 }}></i>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Catálogo de Produtos</span>
            <h4 style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>
              {metrics.totalProductsCount} itens
            </h4>
          </div>
          <i className="fa-solid fa-box" style={{ fontSize: '24px', color: 'var(--text-muted)', opacity: 0.3 }}></i>
        </div>
      </div>
    </section>
  );
};
