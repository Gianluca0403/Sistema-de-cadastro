/**
 * APP.js - Lógica de Aplicação, Navegação, Renderização e Eventos
 * Sistema de Gestão JAJA Cosméticos
 */

// --- ESTADO GLOBAL DA APLICAÇÃO ---
const AppState = {
    activeView: 'dashboard',
    cart: [],
    salesChartInstance: null,
    confirmCallback: null
};

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar dados do LocalStorage
    DB.init();
    
    // Configurar Event Listeners Globais
    Events.init();
    
    // Abrir a View Inicial
    UI.switchView('dashboard');
});

// ==========================================================================
// UI - CONTROLADORES DE RENDERIZAÇÃO E INTERFACE
// ==========================================================================
const UI = {
    // Alternar entre Telas (Views)
    switchView(viewName) {
        AppState.activeView = viewName;
        
        // Ocultar todas as telas e remover classe ativa do menu
        document.querySelectorAll('.app-view').forEach(view => view.style.display = 'none');
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        
        // Exibir a tela ativa
        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) targetView.style.display = 'block';
        
        // Ativar itens do menu correspondentes
        const sidebarMenu = document.querySelector(`.menu-item[data-view="${viewName}"]`);
        if (sidebarMenu) sidebarMenu.classList.add('active');
        
        const mobileTab = document.querySelector(`.nav-tab[data-view="${viewName}"]`);
        if (mobileTab) mobileTab.classList.add('active');
        
        // Atualizar título do Header
        this.updateHeaderTitle(viewName);
        
        // Renderizar conteúdo específico da tela
        this.renderViewData(viewName);
    },

    updateHeaderTitle(viewName) {
        const titleText = document.getElementById('page-title-text');
        const subtitleText = document.getElementById('page-subtitle-text');
        
        const titles = {
            dashboard: { t: 'Dashboard', s: 'Visão geral do seu negócio hoje' },
            pdv: { t: 'Ponto de Venda (PDV)', s: 'Registre vendas de forma simples e rápida' },
            estoque: { t: 'Controle de Estoque', s: 'Gerencie seu catálogo de produtos e estoques' },
            clientes: { t: 'Meus Clientes', s: 'Cadastro e histórico de compras dos clientes' },
            vendas: { t: 'Histórico de Vendas', s: 'Acompanhe e filtre todas as transações realizadas' },
            configuracoes: { t: 'Ajustes & Backup', s: 'Configurações do sistema e segurança dos dados' }
        };
        
        if (titles[viewName]) {
            titleText.textContent = titles[viewName].t;
            subtitleText.textContent = titles[viewName].s;
        }
    },

    renderViewData(viewName) {
        switch (viewName) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'pdv':
                this.renderPDV();
                break;
            case 'estoque':
                this.renderStock();
                break;
            case 'clientes':
                this.renderClients();
                break;
            case 'vendas':
                this.renderSales();
                break;
            case 'configuracoes':
                // Nenhuma renderização dinâmica pesada necessária de imediato
                break;
        }
    },

    // --- MODAIS ---
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Travar scroll
        }
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = ''; // Destravar scroll
        }
    },

    openConfirmModal(title, message, onConfirm) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        AppState.confirmCallback = onConfirm;
        this.openModal('modal-confirm');
    },

    // --- TOAST NOTIFICATIONS ---
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-circle-xmark';
        if (type === 'info') icon = 'fa-circle-info';
        
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);
        
        // Trigger de animação
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remover após 3 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // ==========================================================================
    // RENDER: DASHBOARD
    // ==========================================================================
    renderDashboard() {
        const metrics = DB.getMetrics();
        
        // Atualizar KPI Cards
        document.getElementById('metric-today-sales').textContent = Utils.formatCurrency(metrics.totalSalesToday);
        document.getElementById('metric-month-sales').textContent = Utils.formatCurrency(metrics.totalSalesMonth);
        document.getElementById('metric-month-profit').textContent = Utils.formatCurrency(metrics.totalProfitMonth);
        document.getElementById('metric-pending-sales').textContent = Utils.formatCurrency(metrics.totalReceivablesPending);
        
        // Comparativo com o mês anterior
        document.getElementById('metric-last-month-compare').textContent = `Vs. ${Utils.formatCurrency(metrics.totalSalesLastMonth)} mês anterior`;

        // Banner de Alerta de Estoque
        const warningBanner = document.getElementById('dashboard-stock-warning');
        if (metrics.lowStockItemsCount > 0) {
            document.getElementById('warning-stock-count').textContent = metrics.lowStockItemsCount;
            warningBanner.style.display = 'flex';
        } else {
            warningBanner.style.display = 'none';
        }

        // Renderizar Mais Vendidos (Top 5)
        this.renderTopSelling();

        // Renderizar Gráfico de Vendas
        this.renderSalesChart();
    },

    renderTopSelling() {
        const sales = DB.getSales();
        const productMap = {};
        
        sales.forEach(sale => {
            sale.items.forEach(item => {
                if (!productMap[item.productId]) {
                    productMap[item.productId] = { name: item.name, quantity: 0, total: 0 };
                }
                productMap[item.productId].quantity += item.quantity;
                productMap[item.productId].total += (item.quantity * item.price);
            });
        });

        // Ordenar por quantidade vendida
        const sortedProducts = Object.values(productMap)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        const tbody = document.getElementById('top-selling-tbody');
        tbody.innerHTML = '';

        if (sortedProducts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Nenhuma venda registrada ainda.</td></tr>`;
            return;
        }

        sortedProducts.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 500;">${p.name}</td>
                <td>${p.quantity} un</td>
                <td style="color: var(--primary); font-weight: 600;">${Utils.formatCurrency(p.total)}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderSalesChart() {
        const sales = DB.getSales();
        const salesByDay = {};

        // Obter os últimos 10 dias
        const labels = [];
        for (let i = 9; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            salesByDay[dateStr] = 0;
            // Formatador para exibição: "DD/MM"
            labels.push(dateStr.split('-').reverse().slice(0, 2).join('/'));
        }

        // Somar vendas por dia
        sales.forEach(sale => {
            const saleDate = sale.date.split('T')[0];
            if (salesByDay[saleDate] !== undefined) {
                salesByDay[saleDate] += sale.total;
            }
        });

        const dataValues = Object.values(salesByDay);

        const ctx = document.getElementById('salesChart').getContext('2d');

        if (AppState.salesChartInstance) {
            AppState.salesChartInstance.destroy();
        }

        // Gradiente dourado para a linha
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(223, 168, 61, 0.4)');
        gradient.addColorStop(1, 'rgba(223, 168, 61, 0.0)');

        AppState.salesChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Faturamento',
                    data: dataValues,
                    borderColor: '#dfa83d',
                    borderWidth: 3,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#dfa83d',
                    pointBorderColor: '#0b0914',
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#dfa83d',
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#94a3b8',
                            callback: value => 'R$ ' + value
                        }
                    }
                }
            }
        });
    },

    // ==========================================================================
    // RENDER: PDV (TELA DE VENDAS)
    // ==========================================================================
    renderPDV() {
        const products = DB.getProducts();
        const container = document.getElementById('pdv-products-container');
        
        // Filtros
        const searchQuery = document.getElementById('pdv-search').value.toLowerCase();
        const categoryFilter = document.getElementById('pdv-filter-category').value;

        container.innerHTML = '';

        const filteredProducts = products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery) || 
                                 p.brand.toLowerCase().includes(searchQuery) ||
                                 (p.code && p.code.includes(searchQuery));
            const matchesCategory = !categoryFilter || p.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });

        if (filteredProducts.length === 0) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Nenhum produto disponível.</div>`;
            return;
        }

        filteredProducts.forEach(p => {
            const isOutOfStock = p.stock <= 0;
            const isLowStock = p.stock <= p.minStock && p.stock > 0;
            
            let stockClass = '';
            let stockLabel = `${p.stock} un`;
            if (isOutOfStock) {
                stockClass = 'alert';
                stockLabel = 'Esgotado';
            } else if (isLowStock) {
                stockClass = 'alert';
                stockLabel = `Baixo (${p.stock} un)`;
            }

            const div = document.createElement('div');
            div.className = `pdv-item-card ${isOutOfStock ? 'disabled' : ''}`;
            div.innerHTML = `
                <span class="category-badge">${p.category}</span>
                <span class="brand">${p.brand || 'Sem marca'}</span>
                <span class="name">${p.name}</span>
                <div class="price-row">
                    <span class="price">${Utils.formatCurrency(p.salePrice)}</span>
                    <span class="stock ${stockClass}">${stockLabel}</span>
                </div>
            `;
            
            if (!isOutOfStock) {
                div.onclick = () => this.addItemToCart(p);
            }
            container.appendChild(div);
        });

        // Atualizar lista de clientes no carrinho
        const clientSelect = document.getElementById('cart-client-select');
        const prevSelected = clientSelect.value;
        clientSelect.innerHTML = `<option value="">Cliente Geral (Não Identificado)</option>`;
        
        DB.getClients().forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.name;
            if (c.id === prevSelected) option.selected = true;
            clientSelect.appendChild(option);
        });

        this.renderCart();
    },

    addItemToCart(product) {
        const existingItem = AppState.cart.find(item => item.productId === product.id);
        
        if (existingItem) {
            if (existingItem.quantity >= product.stock) {
                this.showToast(`Estoque insuficiente! Apenas ${product.stock} em estoque.`, 'error');
                return;
            }
            existingItem.quantity++;
        } else {
            AppState.cart.push({
                productId: product.id,
                name: product.name,
                price: Number(product.salePrice),
                costPrice: Number(product.costPrice),
                quantity: 1
            });
        }
        
        this.renderCart();
    },

    renderCart() {
        const container = document.getElementById('cart-items-container');
        const emptyMessage = document.getElementById('cart-empty-message');
        
        // Limpar lista exceto mensagem de vazio
        container.querySelectorAll('.cart-item').forEach(el => el.remove());

        if (AppState.cart.length === 0) {
            emptyMessage.style.display = 'block';
            document.getElementById('cart-subtotal').textContent = 'R$ 0,00';
            document.getElementById('cart-total').textContent = 'R$ 0,00';
            return;
        }

        emptyMessage.style.display = 'none';
        let subtotal = 0;

        AppState.cart.forEach((item, index) => {
            const itemTotal = item.quantity * item.price;
            subtotal += itemTotal;

            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-details">
                    <span class="cart-item-name">${item.name}</span>
                    <span class="cart-item-price">${Utils.formatCurrency(item.price)}</span>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="UI.adjustCartQty(${index}, -1)"><i class="fa-solid fa-minus"></i></button>
                        <span class="qty-val">${item.quantity}</span>
                        <button class="qty-btn" onclick="UI.adjustCartQty(${index}, 1)"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </div>
                <div class="cart-item-actions">
                    <button class="remove-cart-item" onclick="UI.removeCartItem(${index})"><i class="fa-solid fa-trash-can"></i></button>
                    <span class="cart-item-total">${Utils.formatCurrency(itemTotal)}</span>
                </div>
            `;
            container.appendChild(div);
        });

        document.getElementById('cart-subtotal').textContent = Utils.formatCurrency(subtotal);
        this.updateCartTotals();
    },

    adjustCartQty(index, amt) {
        const item = AppState.cart[index];
        const dbProduct = DB.getProductById(item.productId);
        
        if (!dbProduct) return;

        const newQty = item.quantity + amt;
        
        if (newQty <= 0) {
            this.removeCartItem(index);
        } else if (newQty > dbProduct.stock) {
            this.showToast(`Estoque máximo atingido (${dbProduct.stock} unidades).`, 'error');
        } else {
            item.quantity = newQty;
            this.renderCart();
        }
    },

    removeCartItem(index) {
        AppState.cart.splice(index, 1);
        this.renderCart();
    },

    updateCartTotals() {
        const subtotal = AppState.cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const discountInput = document.getElementById('cart-discount');
        const discount = Math.max(0, Number(discountInput.value) || 0);
        
        const total = Math.max(0, subtotal - discount);
        document.getElementById('cart-total').textContent = Utils.formatCurrency(total);
    },

    // Finalizar Venda do Carrinho
    completeSale() {
        if (AppState.cart.length === 0) {
            this.showToast('Adicione pelo menos um produto ao carrinho!', 'error');
            return;
        }

        const clientId = document.getElementById('cart-client-select').value;
        const discount = Math.max(0, Number(document.getElementById('cart-discount').value) || 0);
        const subtotal = AppState.cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const total = Math.max(0, subtotal - discount);
        
        const totalCost = AppState.cart.reduce((sum, item) => sum + (item.quantity * (item.costPrice || 0)), 0);
        const profit = total - totalCost;

        // Identificar Cliente
        let clientName = 'Cliente Geral';
        if (clientId) {
            const client = DB.getClientById(clientId);
            if (client) clientName = client.name;
        }

        // Método de pagamento selecionado
        const paymentMethodEl = document.querySelector('.payment-option.active');
        const paymentMethod = paymentMethodEl ? paymentMethodEl.getAttribute('data-method') : 'Pix';
        
        // Status de acordo com o pagamento
        // Fiados começam como 'Pendente', outros como 'Pago'
        const status = paymentMethod === 'Fiado' ? 'Pendente' : 'Pago';

        const sale = {
            date: new Date().toISOString(),
            clientId: clientId || null,
            clientName: clientName,
            items: [...AppState.cart],
            subtotal,
            discount,
            total,
            totalCost,
            profit,
            paymentMethod,
            status
        };

        // Salvar venda
        const savedSale = DB.saveSale(sale);

        // Mostrar Toast
        this.showToast('Venda registrada com sucesso!');
        
        // Limpar carrinho
        AppState.cart = [];
        document.getElementById('cart-discount').value = 0;
        
        // Atualizar PDV e ir para histórico para ver cupom
        this.renderPDV();
        
        // Mostrar modal com recibo da venda efetuada
        this.viewSaleDetails(savedSale.id);
    },

    // ==========================================================================
    // RENDER: ESTOQUE (PRODUTOS)
    // ==========================================================================
    renderStock() {
        const products = DB.getProducts();
        const tbody = document.getElementById('stock-tbody');
        
        const searchQuery = document.getElementById('stock-search').value.toLowerCase();
        const categoryFilter = document.getElementById('stock-filter-category').value;
        const levelFilter = document.getElementById('stock-filter-level').value;

        tbody.innerHTML = '';

        const filtered = products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery) || 
                                 p.brand.toLowerCase().includes(searchQuery) || 
                                 (p.code && p.code.includes(searchQuery));
            const matchesCategory = !categoryFilter || p.category === categoryFilter;
            
            let matchesLevel = true;
            if (levelFilter === 'low') matchesLevel = p.stock <= p.minStock && p.stock > 0;
            if (levelFilter === 'out') matchesLevel = p.stock <= 0;
            if (levelFilter === 'ok') matchesLevel = p.stock > p.minStock;

            return matchesSearch && matchesCategory && matchesLevel;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">Nenhum produto cadastrado com os filtros ativos.</td></tr>`;
            return;
        }

        filtered.forEach(p => {
            const isOutOfStock = p.stock <= 0;
            const isLowStock = p.stock <= p.minStock && p.stock > 0;
            
            let stockBadgeClass = 'badge-success';
            let progressBarColor = 'ok';
            
            if (isOutOfStock) {
                stockBadgeClass = 'badge-danger';
                progressBarColor = 'empty';
            } else if (isLowStock) {
                stockBadgeClass = 'badge-warning';
                progressBarColor = 'warning';
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-family: monospace; font-size: 12px; color: var(--text-secondary);">${p.code || '-'}</td>
                <td>
                    <div style="font-weight: 600; color: var(--text-primary);">${p.name}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${p.brand || 'Sem marca'}</div>
                </td>
                <td><span class="badge badge-info" style="font-size: 9px;">${p.category}</span></td>
                <td>
                    <span class="badge ${stockBadgeClass}">${p.stock} un</span>
                    <div class="stock-progress-bar" style="max-width: 80px;">
                        <div class="stock-progress ${progressBarColor}" style="width: ${Math.min(100, (p.stock / (p.minStock || 2) * 50))}%"></div>
                    </div>
                </td>
                <td>${Utils.formatCurrency(p.costPrice)}</td>
                <td style="font-weight: 600; color: var(--primary);">${Utils.formatCurrency(p.salePrice)}</td>
                <td style="color: var(--success); font-weight: 500;">${Utils.formatCurrency(p.salePrice - p.costPrice)}</td>
                <td style="text-align: right;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <!-- Ajustes Rápidos de Estoque -->
                        <button class="btn btn-secondary btn-sm" onclick="UI.quickAdjustStock('${p.id}', 1)" title="Adicionar 1 un" style="padding: 4px 8px;">
                            <i class="fa-solid fa-plus" style="font-size: 10px;"></i>
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="UI.quickAdjustStock('${p.id}', -1)" title="Retirar 1 un" style="padding: 4px 8px;">
                            <i class="fa-solid fa-minus" style="font-size: 10px;"></i>
                        </button>
                        <!-- Editar / Deletar -->
                        <button class="btn btn-secondary btn-sm" onclick="UI.openEditProductModal('${p.id}')" title="Editar" style="padding: 4px 8px;">
                            <i class="fa-solid fa-pen" style="font-size: 10px;"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="UI.deleteProduct('${p.id}')" title="Excluir" style="padding: 4px 8px;">
                            <i class="fa-solid fa-trash-can" style="font-size: 10px;"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    quickAdjustStock(id, amt) {
        const products = DB.getProducts();
        const p = products.find(prod => prod.id === id);
        if (p) {
            p.stock = Math.max(0, p.stock + amt);
            p.updatedAt = new Date().toISOString();
            DB.saveProducts(products);
            this.showToast('Estoque atualizado!');
            this.renderStock();
        }
    },

    openAddProductModal() {
        document.getElementById('product-modal-title').textContent = 'Novo Produto';
        document.getElementById('product-form').reset();
        document.getElementById('prod-id').value = '';
        this.openModal('modal-product');
    },

    openEditProductModal(id) {
        const p = DB.getProductById(id);
        if (p) {
            document.getElementById('product-modal-title').textContent = 'Editar Produto';
            document.getElementById('prod-id').value = p.id;
            document.getElementById('prod-name').value = p.name;
            document.getElementById('prod-brand').value = p.brand || '';
            document.getElementById('prod-category').value = p.category;
            document.getElementById('prod-costPrice').value = p.costPrice;
            document.getElementById('prod-salePrice').value = p.salePrice;
            document.getElementById('prod-stock').value = p.stock;
            document.getElementById('prod-minStock').value = p.minStock;
            document.getElementById('prod-code').value = p.code || '';
            document.getElementById('prod-description').value = p.description || '';
            
            this.openModal('modal-product');
        }
    },

    deleteProduct(id) {
        const p = DB.getProductById(id);
        if (p) {
            this.openConfirmModal(
                'Excluir Produto?',
                `Deseja realmente excluir o produto "${p.name}"? Isso não afetará o histórico de vendas antigas.`,
                () => {
                    DB.deleteProduct(id);
                    this.showToast('Produto excluído com sucesso!');
                    this.renderStock();
                }
            );
        }
    },

    // ==========================================================================
    // RENDER: CLIENTES
    // ==========================================================================
    renderClients() {
        const clients = DB.getClients();
        const sales = DB.getSales();
        const container = document.getElementById('clients-container');
        
        const searchQuery = document.getElementById('clients-search').value.toLowerCase();

        container.innerHTML = '';

        const filtered = clients.filter(c => {
            return c.name.toLowerCase().includes(searchQuery) || c.phone.includes(searchQuery);
        });

        if (filtered.length === 0) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Nenhum cliente cadastrado com os filtros ativos.</div>`;
            return;
        }

        filtered.forEach(c => {
            // Calcular estatísticas deste cliente
            const clientSales = sales.filter(s => s.clientId === c.id);
            const totalSpent = clientSales.reduce((sum, s) => sum + s.total, 0);
            
            // Checar se possui pendência (Fiado)
            const debtSales = clientSales.filter(s => s.status === 'Pendente');
            const totalDebt = debtSales.reduce((sum, s) => sum + s.total, 0);

            // Link do WhatsApp
            const cleanPhone = c.phone.replace(/\D/g, '');
            const waLink = `https://wa.me/55${cleanPhone}`;

            const card = document.createElement('div');
            card.className = 'card client-card';
            card.innerHTML = `
                <div class="client-card-header">
                    <div class="client-main-info">
                        <span class="client-name">${c.name}</span>
                        <span class="client-registered-at">Membro desde ${new Date(c.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                    ${totalDebt > 0 ? `<span class="badge badge-danger" style="font-size: 8px;">Em Débito</span>` : ''}
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <div class="client-contact-item">
                        <i class="fa-solid fa-phone"></i>
                        <span>${Utils.formatPhone(c.phone)}</span>
                        <a href="${waLink}" target="_blank" title="Enviar WhatsApp" style="margin-left: auto;">
                            <i class="fa-brands fa-whatsapp" style="font-size: 16px; color: #25d366;"></i>
                        </a>
                    </div>
                    ${c.email ? `
                    <div class="client-contact-item">
                        <i class="fa-solid fa-envelope"></i>
                        <span style="font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.email}</span>
                    </div>` : ''}
                    ${c.birthdate ? `
                    <div class="client-contact-item">
                        <i class="fa-solid fa-cake-candles"></i>
                        <span>Niver: ${Utils.formatBirthdate(c.birthdate)}</span>
                    </div>` : ''}
                </div>

                <div class="client-stats">
                    <div class="client-stat-box">
                        <span class="client-stat-label">Compras</span>
                        <span class="client-stat-val">${clientSales.length}</span>
                    </div>
                    <div class="client-stat-box">
                        <span class="client-stat-label">Total Gasto</span>
                        <span class="client-stat-val" style="color: var(--primary);">${Utils.formatCurrency(totalSpent)}</span>
                    </div>
                </div>

                ${totalDebt > 0 ? `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(239, 68, 68, 0.05); padding: 8px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.15);">
                    <span style="font-size: 11px; color: var(--danger); font-weight: 600;">Débito (Fiado):</span>
                    <span style="font-size: 13px; color: var(--danger); font-weight: 700;">${Utils.formatCurrency(totalDebt)}</span>
                </div>` : ''}

                <div class="client-actions">
                    <button class="btn btn-secondary btn-sm" onclick="UI.openEditClientModal('${c.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="UI.deleteClient('${c.id}')"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;
            container.appendChild(card);
        });
    },

    openAddClientModal() {
        document.getElementById('client-modal-title').textContent = 'Novo Cliente';
        document.getElementById('client-form').reset();
        document.getElementById('cli-id').value = '';
        this.openModal('modal-client');
    },

    openEditClientModal(id) {
        const c = DB.getClientById(id);
        if (c) {
            document.getElementById('client-modal-title').textContent = 'Editar Cliente';
            document.getElementById('cli-id').value = c.id;
            document.getElementById('cli-name').value = c.name;
            document.getElementById('cli-phone').value = c.phone;
            document.getElementById('cli-birthdate').value = c.birthdate || '';
            document.getElementById('cli-email').value = c.email || '';
            document.getElementById('cli-notes').value = c.notes || '';
            
            this.openModal('modal-client');
        }
    },

    deleteClient(id) {
        const c = DB.getClientById(id);
        if (c) {
            this.openConfirmModal(
                'Excluir Cliente?',
                `Deseja realmente excluir o cadastro de "${c.name}"? Isso não afetará o histórico de vendas deste cliente.`,
                () => {
                    DB.deleteClient(id);
                    this.showToast('Cliente excluído com sucesso!');
                    this.renderClients();
                }
            );
        }
    },

    // ==========================================================================
    // RENDER: HISTÓRICO DE VENDAS
    // ==========================================================================
    renderSales() {
        const sales = DB.getSales();
        const tbody = document.getElementById('sales-tbody');

        // Filtros
        const dateStart = document.getElementById('sales-filter-start').value;
        const dateEnd = document.getElementById('sales-filter-end').value;
        const paymentFilter = document.getElementById('sales-filter-payment').value;
        const statusFilter = document.getElementById('sales-filter-status').value;

        tbody.innerHTML = '';

        // Filtrar e ordenar vendas por data decrescente
        const filtered = sales.filter(s => {
            const saleDateOnly = s.date.split('T')[0];
            const matchesStart = !dateStart || saleDateOnly >= dateStart;
            const matchesEnd = !dateEnd || saleDateOnly <= dateEnd;
            const matchesPayment = !paymentFilter || s.paymentMethod === paymentFilter;
            const matchesStatus = !statusFilter || s.status === statusFilter;

            return matchesStart && matchesEnd && matchesPayment && matchesStatus;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">Nenhuma venda encontrada para os filtros ativos.</td></tr>`;
            return;
        }

        filtered.forEach(s => {
            const saleDateFormatted = new Date(s.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            const itemSummary = s.items.map(item => `${item.quantity}x ${item.name.substring(0, 15)}...`).join(', ');
            
            const isPending = s.status === 'Pendente';
            const statusBadge = isPending ? 
                `<span class="badge badge-warning" style="cursor: pointer;" onclick="UI.toggleSaleStatus('${s.id}')" title="Clique para marcar como PAGO">Pendente <i class="fa-solid fa-arrows-spin" style="font-size: 8px;"></i></span>` : 
                `<span class="badge badge-success">Pago</span>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-size: 13px; color: var(--text-secondary);">${saleDateFormatted}</td>
                <td style="font-family: monospace; font-size: 11px;">${s.id}</td>
                <td style="font-weight: 500;">${s.clientName}</td>
                <td style="font-size: 12px; color: var(--text-secondary); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${s.items.map(i => `${i.quantity}x ${i.name}`).join('\n')}">
                    ${itemSummary}
                </td>
                <td style="font-weight: 700; color: var(--primary);">${Utils.formatCurrency(s.total)}</td>
                <td><span class="badge badge-info" style="font-size: 9px;">${s.paymentMethod}</span></td>
                <td>${statusBadge}</td>
                <td style="text-align: right;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <button class="btn btn-secondary btn-sm" onclick="UI.viewSaleDetails('${s.id}')" title="Ver Recibo" style="padding: 4px 8px;">
                            <i class="fa-solid fa-receipt" style="font-size: 10px;"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="UI.deleteSale('${s.id}')" title="Estornar Venda" style="padding: 4px 8px;">
                            <i class="fa-solid fa-trash-can" style="font-size: 10px;"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    toggleSaleStatus(id) {
        const sales = DB.getSales();
        const sale = sales.find(s => s.id === id);
        
        if (sale && sale.status === 'Pendente') {
            this.openConfirmModal(
                'Quitar Fiado / Pendência?',
                `Deseja marcar a venda no valor de ${Utils.formatCurrency(sale.total)} de "${sale.clientName}" como PAGA?`,
                () => {
                    DB.updateSaleStatus(id, 'Pago');
                    this.showToast('Venda quitada com sucesso!');
                    this.renderSales();
                    this.renderDashboard(); // Atualiza dashboard também
                }
            );
        }
    },

    deleteSale(id) {
        const sales = DB.getSales();
        const s = sales.find(sale => sale.id === id);
        
        if (s) {
            this.openConfirmModal(
                'Estornar Venda?',
                `Atenção: Ao estornar a venda de ${Utils.formatCurrency(s.total)}, as quantidades vendidas retornarão ao estoque.`,
                () => {
                    DB.deleteSale(id);
                    this.showToast('Venda estornada com sucesso!');
                    this.renderSales();
                    this.renderDashboard();
                }
            );
        }
    },

    viewSaleDetails(id) {
        const sales = DB.getSales();
        const sale = sales.find(s => s.id === id);
        
        if (!sale) return;

        AppState.activeSale = id;
        const receiptContainer = document.getElementById('receipt-content');
        
        const dateStr = new Date(sale.date).toLocaleString('pt-BR');
        
        let clientDetailsHtml = '';
        if (sale.clientId) {
            const c = DB.getClientById(sale.clientId);
            if (c) {
                clientDetailsHtml = `
                    <p><strong>Cliente:</strong> ${c.name}</p>
                    <p><strong>WhatsApp:</strong> ${Utils.formatPhone(c.phone)}</p>
                `;
            }
        } else {
            clientDetailsHtml = `<p><strong>Cliente:</strong> Cliente Geral</p>`;
        }

        let itemsHtml = '';
        sale.items.forEach(item => {
            itemsHtml += `
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; color: #f8fafc;">
                    <span>${item.quantity}x ${item.name}</span>
                    <span>${Utils.formatCurrency(item.quantity * item.price)}</span>
                </div>
            `;
        });

        receiptContainer.innerHTML = `
            <div style="text-align: center; border-bottom: 1px dashed var(--border-color); padding-bottom: 15px; margin-bottom: 15px;">
                <h4 style="font-family: 'Playfair Display', serif; font-size: 18px; color: var(--primary);">JAJA Cosméticos & Perfumes</h4>
                <p style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">Cupom de Venda Não Fiscal</p>
                <p style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">ID: ${sale.id}</p>
                <p style="font-size: 11px; color: var(--text-secondary);">${dateStr}</p>
            </div>
            
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 15px; border-bottom: 1px dashed var(--border-color); padding-bottom: 15px;">
                ${clientDetailsHtml}
                <p><strong>Método de Pagamento:</strong> ${sale.paymentMethod}</p>
                <p><strong>Status:</strong> <span class="badge ${sale.status === 'Pago' ? 'badge-success' : 'badge-warning'}" style="font-size:8px;">${sale.status}</span></p>
            </div>

            <div style="margin-bottom: 15px; border-bottom: 1px dashed var(--border-color); padding-bottom: 15px;">
                <p style="font-weight: 600; font-size: 12px; margin-bottom: 8px; color: var(--text-muted);">ITENS</p>
                ${itemsHtml}
            </div>

            <div style="font-size: 13px; display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between; color: var(--text-secondary);">
                    <span>Subtotal:</span>
                    <span>${Utils.formatCurrency(sale.subtotal || sale.total)}</span>
                </div>
                ${sale.discount ? `
                <div style="display: flex; justify-content: space-between; color: var(--danger);">
                    <span>Desconto:</span>
                    <span>-${Utils.formatCurrency(sale.discount)}</span>
                </div>` : ''}
                <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 16px; color: var(--primary); margin-top: 6px; border-top: 1px solid var(--border-color); padding-top: 6px;">
                    <span>TOTAL:</span>
                    <span>${Utils.formatCurrency(sale.total)}</span>
                </div>
            </div>
        `;

        this.openModal('modal-sale-details');
    },

    // Compartilhar por WhatsApp
    shareReceiptOnWhatsApp() {
        const saleId = AppState.activeSale;
        const sales = DB.getSales();
        const sale = sales.find(s => s.id === saleId);
        
        if (!sale) return;

        let receiptText = `*JAJA Cosméticos & Perfumes*\n`;
        receiptText += `_Cupom de Compra_\n\n`;
        receiptText += `*Data:* ${new Date(sale.date).toLocaleString('pt-BR')}\n`;
        receiptText += `*ID:* ${sale.id}\n`;
        receiptText += `*Pagamento:* ${sale.paymentMethod}\n`;
        receiptText += `*Status:* ${sale.status}\n\n`;
        receiptText += `*ITENS:*\n`;
        
        sale.items.forEach(item => {
            receiptText += `- ${item.quantity}x ${item.name} (${Utils.formatCurrency(item.price)} un): ${Utils.formatCurrency(item.quantity * item.price)}\n`;
        });
        
        receiptText += `\n`;
        if (sale.discount) {
            receiptText += `*Subtotal:* ${Utils.formatCurrency(sale.subtotal || sale.total)}\n`;
            receiptText += `*Desconto:* -${Utils.formatCurrency(sale.discount)}\n`;
        }
        receiptText += `*TOTAL:* ${Utils.formatCurrency(sale.total)}\n\n`;
        receiptText += `Agradecemos a preferência! Volte sempre! ✨`;

        // Localizar celular do cliente se houver
        let phone = '';
        if (sale.clientId) {
            const c = DB.getClientById(sale.clientId);
            if (c) phone = c.phone.replace(/\D/g, '');
        }

        const url = `https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(receiptText)}`;
        window.open(url, '_blank');
    }
};

// ==========================================================================
// EVENTS - GERENCIADOR DE EVENTOS DA APLICAÇÃO
// ==========================================================================
const Events = {
    init() {
        this.bindNavigation();
        this.bindPDVEvents();
        this.bindStockEvents();
        this.bindClientEvents();
        this.bindSalesHistoryEvents();
        this.bindSystemEvents();
    },

    // Clicks nos Menus de Navegação
    bindNavigation() {
        // Sidebar (Desktop)
        document.querySelectorAll('#sidebar .menu-item').forEach(item => {
            item.onclick = (e) => {
                const targetView = item.getAttribute('data-view');
                UI.switchView(targetView);
            };
        });

        // Bottom Nav (Mobile)
        document.querySelectorAll('#bottom-nav .nav-tab').forEach(tab => {
            tab.onclick = (e) => {
                const targetView = tab.getAttribute('data-view');
                UI.switchView(targetView);
            };
        });

        // Botão Quick PDV no Header
        document.getElementById('btn-quick-pdv').onclick = () => {
            UI.switchView('pdv');
        };

        // Link no alerta de estoque baixo
        document.getElementById('link-go-to-stock').onclick = (e) => {
            e.preventDefault();
            UI.switchView('estoque');
        };
    },

    // Lógica do PDV / Carrinho
    bindPDVEvents() {
        // Barra de Pesquisa no PDV (com suporte a leitor de código de barras)
        document.getElementById('pdv-search').oninput = (e) => {
            const query = e.target.value.trim();
            if (query.length >= 3) {
                const products = DB.getProducts();
                // Procurar correspondência exata de código de barras/SKU
                const exactMatch = products.find(p => p.code && p.code.toLowerCase() === query.toLowerCase());
                if (exactMatch) {
                    if (exactMatch.stock > 0) {
                        UI.addItemToCart(exactMatch);
                        e.target.value = ''; // Limpa campo de pesquisa
                        UI.showToast(`Adicionado: ${exactMatch.name}`);
                    } else {
                        UI.showToast(`Produto esgotado: ${exactMatch.name}`, 'error');
                        e.target.value = ''; // Limpa também
                    }
                }
            }
            UI.renderPDV();
        };
        document.getElementById('pdv-filter-category').onchange = () => UI.renderPDV();

        // Botões do Carrinho
        document.getElementById('btn-clear-cart').onclick = () => {
            AppState.cart = [];
            UI.renderCart();
            UI.showToast('Carrinho limpo!', 'info');
        };

        document.getElementById('cart-discount').oninput = () => UI.updateCartTotals();

        // Alterar Opção de Pagamento
        document.querySelectorAll('.payment-option').forEach(opt => {
            opt.onclick = () => {
                document.querySelectorAll('.payment-option').forEach(el => el.classList.remove('active'));
                opt.classList.add('active');
            };
        });

        // Finalizar venda
        document.getElementById('btn-complete-sale').onclick = () => UI.completeSale();

        // Botão Add Cliente Rápido
        document.getElementById('btn-add-client-fast').onclick = () => UI.openAddClientModal();
    },

    // Lógica do Estoque
    bindStockEvents() {
        // Filtros
        document.getElementById('stock-search').oninput = () => UI.renderStock();
        document.getElementById('stock-filter-category').onchange = () => UI.renderStock();
        document.getElementById('stock-filter-level').onchange = () => UI.renderStock();

        // Abrir Modal de Cadastro de Produto
        document.getElementById('btn-add-product').onclick = () => UI.openAddProductModal();

        // Formulário do Produto (Submissão)
        document.getElementById('product-form').onsubmit = (e) => {
            e.preventDefault();
            
            const product = {
                id: document.getElementById('prod-id').value || null,
                name: document.getElementById('prod-name').value,
                brand: document.getElementById('prod-brand').value,
                category: document.getElementById('prod-category').value,
                costPrice: Number(document.getElementById('prod-costPrice').value),
                salePrice: Number(document.getElementById('prod-salePrice').value),
                stock: Number(document.getElementById('prod-stock').value),
                minStock: Number(document.getElementById('prod-minStock').value),
                code: document.getElementById('prod-code').value,
                description: document.getElementById('prod-description').value
            };

            DB.saveProduct(product);
            UI.showToast(product.id ? 'Produto editado com sucesso!' : 'Produto cadastrado com sucesso!');
            UI.closeModal('modal-product');
            
            // Re-renderizar
            UI.renderStock();
            if (AppState.activeView === 'pdv') UI.renderPDV();
        };
    },

    // Lógica de Clientes
    bindClientEvents() {
        document.getElementById('clients-search').oninput = () => UI.renderClients();
        document.getElementById('btn-add-client').onclick = () => UI.openAddClientModal();

        // Formulário do Cliente
        document.getElementById('client-form').onsubmit = (e) => {
            e.preventDefault();

            const client = {
                id: document.getElementById('cli-id').value || null,
                name: document.getElementById('cli-name').value,
                phone: document.getElementById('cli-phone').value,
                birthdate: document.getElementById('cli-birthdate').value,
                email: document.getElementById('cli-email').value,
                notes: document.getElementById('cli-notes').value
            };

            DB.saveClient(client);
            UI.showToast(client.id ? 'Cliente editado com sucesso!' : 'Cliente cadastrado com sucesso!');
            UI.closeModal('modal-client');

            // Re-renderizar
            UI.renderClients();
            if (AppState.activeView === 'pdv') UI.renderPDV(); // Atualiza select do PDV
        };
    },

    // Lógica do Histórico de Vendas
    bindSalesHistoryEvents() {
        // Filtros
        document.getElementById('sales-filter-start').onchange = () => UI.renderSales();
        document.getElementById('sales-filter-end').onchange = () => UI.renderSales();
        document.getElementById('sales-filter-payment').onchange = () => UI.renderSales();
        document.getElementById('sales-filter-status').onchange = () => UI.renderSales();

        document.getElementById('btn-clear-sales-filters').onclick = () => {
            document.getElementById('sales-filter-start').value = '';
            document.getElementById('sales-filter-end').value = '';
            document.getElementById('sales-filter-payment').value = '';
            document.getElementById('sales-filter-status').value = '';
            UI.renderSales();
        };

        // Ações do comprovante
        document.getElementById('btn-share-receipt').onclick = () => UI.shareReceiptOnWhatsApp();
        document.getElementById('btn-print-receipt').onclick = () => {
            window.print();
        };
    },

    // Lógica do Sistema (Configurações, Modal de Confirmação, etc.)
    bindSystemEvents() {
        // Confirmação (Sim)
        document.getElementById('btn-confirm-yes').onclick = () => {
            if (AppState.confirmCallback) {
                AppState.confirmCallback();
            }
            UI.closeModal('modal-confirm');
        };

        // Exportar DB
        document.getElementById('btn-export-db').onclick = () => {
            DB.exportDatabase();
            UI.showToast('Dados exportados para download!', 'info');
        };

        // Importar DB
        document.getElementById('import-db-file').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                const success = DB.importDatabase(evt.target.result);
                if (success) {
                    UI.showToast('Dados importados com sucesso!');
                    UI.renderViewData(AppState.activeView);
                    // Forçar atualização do dashboard caso esteja na config
                    UI.renderDashboard();
                } else {
                    UI.showToast('Arquivo inválido ou corrompido!', 'error');
                }
            };
            reader.readAsText(file);
        };

        // Carregar dados demonstrativos
        document.getElementById('btn-load-demo-data').onclick = () => {
            UI.openConfirmModal(
                'Carregar dados de demonstração?',
                'Isto irá substituir seus produtos, clientes e histórico de vendas atuais por dados de simulação.',
                () => {
                    DB.clearAllData();
                    DB.loadMockData();
                    UI.showToast('Dados de simulação carregados!');
                    UI.renderViewData(AppState.activeView);
                    UI.renderDashboard();
                }
            );
        };

        // Resetar Banco
        document.getElementById('btn-reset-db').onclick = () => {
            UI.openConfirmModal(
                'Zerar Sistema?',
                'Esta ação é irreversível! Todos os produtos, vendas, clientes e configurações serão excluídos permanentemente.',
                () => {
                    DB.clearAllData();
                    // Reinicializar vazio
                    localStorage.setItem('jaja_cosmeticos_products', JSON.stringify([]));
                    localStorage.setItem('jaja_cosmeticos_clients', JSON.stringify([]));
                    localStorage.setItem('jaja_cosmeticos_sales', JSON.stringify([]));
                    
                    UI.showToast('Todos os dados foram excluídos!', 'info');
                    UI.renderViewData(AppState.activeView);
                    UI.renderDashboard();
                }
            );
        };
    }
};

// ==========================================================================
// UTILS - FUNÇÕES AUXILIARES DE FORMATAÇÃO E SUPORTE
// ==========================================================================
const Utils = {
    // R$ 1.250,50
    formatCurrency(val) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(val);
    },

    // (11) 99999-8888
    formatPhone(phoneStr) {
        const num = phoneStr.replace(/\D/g, '');
        if (num.length === 11) {
            return `(${num.substring(0, 2)}) ${num.substring(2, 7)}-${num.substring(7)}`;
        }
        if (num.length === 10) {
            return `(${num.substring(0, 2)}) ${num.substring(2, 6)}-${num.substring(6)}`;
        }
        return phoneStr;
    },

    // DD/MM/AAAA
    formatBirthdate(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    },

    // "03 de Agosto" para aniversariantes
    formatBirthdateShort(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const months = [
                'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
            ];
            const day = parts[2];
            const month = months[parseInt(parts[1]) - 1];
            return `${day} de ${month}`;
        }
        return dateStr;
    }
};
