/**
 * DB.js - Camada de Dados e Persistência para o Sistema JAJA Cosméticos
 * Utiliza LocalStorage para armazenamento local rápido e offline.
 */

const STORAGE_KEYS = {
    PRODUCTS: 'jaja_cosmeticos_products',
    CLIENTS: 'jaja_cosmeticos_clients',
    SALES: 'jaja_cosmeticos_sales',
    SETTINGS: 'jaja_cosmeticos_settings'
};

const DB = {
    // Inicializar o banco de dados
    init() {
        if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
            this.loadMockData();
        }
    },

    // --- PRODUTOS ---
    getProducts() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS)) || [];
    },

    saveProducts(products) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    },

    getProductById(id) {
        return this.getProducts().find(p => p.id === id);
    },

    saveProduct(product) {
        const products = this.getProducts();
        if (product.id) {
            const index = products.findIndex(p => p.id === product.id);
            if (index !== -1) {
                products[index] = { ...products[index], ...product, updatedAt: new Date().toISOString() };
            }
        } else {
            product.id = 'prod_' + Math.random().toString(36).substr(2, 9);
            product.createdAt = new Date().toISOString();
            product.updatedAt = new Date().toISOString();
            products.push(product);
        }
        this.saveProducts(products);
        return product;
    },

    deleteProduct(id) {
        let products = this.getProducts();
        products = products.filter(p => p.id !== id);
        this.saveProducts(products);
    },

    // --- CLIENTES ---
    getClients() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS)) || [];
    },

    saveClients(clients) {
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    },

    getClientById(id) {
        return this.getClients().find(c => c.id === id);
    },

    saveClient(client) {
        const clients = this.getClients();
        if (client.id) {
            const index = clients.findIndex(c => c.id === client.id);
            if (index !== -1) {
                clients[index] = { ...clients[index], ...client, updatedAt: new Date().toISOString() };
            }
        } else {
            client.id = 'cli_' + Math.random().toString(36).substr(2, 9);
            client.createdAt = new Date().toISOString();
            client.updatedAt = new Date().toISOString();
            clients.push(client);
        }
        this.saveClients(clients);
        return client;
    },

    deleteClient(id) {
        let clients = this.getClients();
        clients = clients.filter(c => c.id !== id);
        this.saveClients(clients);
    },

    // --- VENDAS ---
    getSales() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES)) || [];
    },

    saveSales(sales) {
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    },

    saveSale(sale) {
        const sales = this.getSales();
        const products = this.getProducts();

        sale.id = 'sale_' + Math.random().toString(36).substr(2, 9);
        sale.date = sale.date || new Date().toISOString();

        // Atualizar estoque dos produtos vendidos
        sale.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                product.stock = Math.max(0, product.stock - item.quantity);
                product.updatedAt = new Date().toISOString();
            }
        });

        this.saveProducts(products);
        sales.push(sale);
        this.saveSales(sales);
        return sale;
    },

    deleteSale(id) {
        let sales = this.getSales();
        const saleToDelete = sales.find(s => s.id === id);
        
        if (saleToDelete) {
            // Estornar estoque
            const products = this.getProducts();
            saleToDelete.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    product.stock += item.quantity;
                    product.updatedAt = new Date().toISOString();
                }
            });
            this.saveProducts(products);
        }

        sales = sales.filter(s => s.id !== id);
        this.saveSales(sales);
    },

    updateSaleStatus(id, newStatus) {
        const sales = this.getSales();
        const sale = sales.find(s => s.id === id);
        if (sale) {
            sale.status = newStatus;
            sale.updatedAt = new Date().toISOString();
            this.saveSales(sales);
        }
    },

    // --- CONFIGURAÇÕES & IMPORT/EXPORT ---
    exportDatabase() {
        const dbState = {
            products: this.getProducts(),
            clients: this.getClients(),
            sales: this.getSales(),
            exportedAt: new Date().toISOString()
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dbState));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `backup_jaja_cosmeticos_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    },

    importDatabase(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.products && data.clients && data.sales) {
                this.saveProducts(data.products);
                this.saveClients(data.clients);
                this.saveSales(data.sales);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Erro na importação de dados:", e);
            return false;
        }
    },

    clearAllData() {
        localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
        localStorage.removeItem(STORAGE_KEYS.CLIENTS);
        localStorage.removeItem(STORAGE_KEYS.SALES);
        localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    },

    // --- MÉTRICAS DE NEGÓCIO ---
    getMetrics() {
        const sales = this.getSales();
        const products = this.getProducts();
        
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const thisMonthStr = todayStr.substring(0, 7); // YYYY-MM
        const lastMonthStr = (() => {
            let m = now.getMonth() - 1;
            let y = now.getFullYear();
            if (m < 0) { m = 11; y -= 1; }
            return `${y}-${String(m + 1).padStart(2, '0')}`;
        })();

        let totalSalesToday = 0;
        let totalSalesMonth = 0;
        let totalProfitMonth = 0;
        let totalSalesLastMonth = 0;
        let totalReceivablesPending = 0; // Fiados pendentes

        sales.forEach(sale => {
            const saleDate = sale.date.split('T')[0];
            const saleMonth = saleDate.substring(0, 7);

            if (saleDate === todayStr) {
                totalSalesToday += sale.total;
            }
            if (saleMonth === thisMonthStr) {
                totalSalesMonth += sale.total;
                totalProfitMonth += (sale.profit || (sale.total - (sale.totalCost || 0)));
            }
            if (saleMonth === lastMonthStr) {
                totalSalesLastMonth += sale.total;
            }
            if (sale.status === 'Pendente') {
                totalReceivablesPending += sale.total;
            }
        });

        // Valor de inventário (preço de custo e de venda)
        let totalInventoryCost = 0;
        let totalInventoryValue = 0;
        let lowStockItemsCount = 0;

        products.forEach(p => {
            const qty = Number(p.stock) || 0;
            totalInventoryCost += qty * (Number(p.costPrice) || 0);
            totalInventoryValue += qty * (Number(p.salePrice) || 0);
            if (qty <= (Number(p.minStock) || 0)) {
                lowStockItemsCount++;
            }
        });

        return {
            totalSalesToday,
            totalSalesMonth,
            totalProfitMonth,
            totalSalesLastMonth,
            totalReceivablesPending,
            totalInventoryCost,
            totalInventoryValue,
            lowStockItemsCount,
            totalProductsCount: products.length
        };
    },

    // --- CARREGAR DADOS DEMONSTRATIVOS ---
    loadMockData() {
        const mockProducts = [
            {
                id: 'prod_1',
                name: 'Bleu de Chanel Eau de Parfum',
                brand: 'Chanel',
                category: 'Perfume Importado',
                costPrice: 650.00,
                salePrice: 980.00,
                stock: 8,
                minStock: 2,
                code: '3145891073607',
                description: 'Perfume amadeirado aromático para homens sofisticados.',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'prod_2',
                name: 'Good Girl Eau de Parfum 80ml',
                brand: 'Carolina Herrera',
                category: 'Perfume Importado',
                costPrice: 420.00,
                salePrice: 699.00,
                stock: 12,
                minStock: 3,
                code: '8411061819838',
                description: 'Fragrância ousada e altamente sofisticada, inspirada na visão única da Carolina Herrera.',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'prod_3',
                name: 'Base Líquida Boca Rosa Beauty',
                brand: 'Boca Rosa',
                category: 'Maquiagem',
                costPrice: 32.00,
                salePrice: 65.00,
                stock: 1, // Estoque baixo de propósito
                minStock: 3,
                code: '7898632478129',
                description: 'Base líquida matte, de alta cobertura, resistente à água.',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'prod_4',
                name: 'Malbec Desodorante Colônia 100ml',
                brand: 'O Boticário',
                category: 'Perfume Nacional',
                costPrice: 110.00,
                salePrice: 179.90,
                stock: 15,
                minStock: 4,
                code: '7891033481231',
                description: 'Fragrância masculina feita com notas frescas e amadeiradas à base de álcool vínico.',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'prod_5',
                name: 'Loção Hidratante Cerave 473ml',
                brand: 'Cerave',
                category: 'Corpo & Banho',
                costPrice: 65.00,
                salePrice: 114.90,
                stock: 0, // Sem estoque
                minStock: 2,
                code: '3337875597380',
                description: 'Hidrata e ajuda a restaurar a barreira protetora da pele do corpo e do rosto.',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'prod_6',
                name: 'Batom Matte Velvet Teddy',
                brand: 'M·A·C',
                category: 'Maquiagem',
                costPrice: 60.00,
                salePrice: 109.00,
                stock: 6,
                minStock: 2,
                code: '773602123456',
                description: 'Batom icônico que trouxe fama à M·A·C. Acabamento matte de alta qualidade.',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        const mockClients = [
            {
                id: 'cli_1',
                name: 'Maria Silva Oliveira',
                phone: '11988887777',
                email: 'maria.silva@email.com',
                birthdate: '1992-05-15',
                notes: 'Gosta de fragrâncias florais doces e maquiagens da Boca Rosa.',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'cli_2',
                name: 'João Pedro Santos',
                phone: '11977776666',
                email: 'jp.santos@email.com',
                birthdate: '1988-11-20',
                notes: 'Usa apenas perfumes amadeirados. Compra para dar de presente em datas festivas.',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'cli_3',
                name: 'Ana Julia Costa',
                phone: '11966665555',
                email: 'anajulia.c@email.com',
                birthdate: '1998-08-03',
                notes: 'Cliente VIP. Compra mensalmente cosméticos para skin care. Prefere pagar via Pix.',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        // Gerar vendas de teste para o mês atual
        const now = new Date();
        const makeDate = (offsetDays) => {
            const d = new Date();
            d.setDate(now.getDate() - offsetDays);
            return d.toISOString();
        };

        const mockSales = [
            {
                id: 'sale_1',
                date: makeDate(5),
                clientId: 'cli_1',
                clientName: 'Maria Silva Oliveira',
                items: [
                    { productId: 'prod_2', name: 'Good Girl Eau de Parfum 80ml', quantity: 1, price: 699.00, costPrice: 420.00 },
                    { productId: 'prod_3', name: 'Base Líquida Boca Rosa Beauty', quantity: 1, price: 65.00, costPrice: 32.00 }
                ],
                total: 764.00,
                totalCost: 452.00,
                profit: 312.00,
                paymentMethod: 'Pix',
                status: 'Pago',
                createdAt: makeDate(5),
                updatedAt: makeDate(5)
            },
            {
                id: 'sale_2',
                date: makeDate(2),
                clientId: 'cli_2',
                clientName: 'João Pedro Santos',
                items: [
                    { productId: 'prod_4', name: 'Malbec Desodorante Colônia 100ml', quantity: 2, price: 179.90, costPrice: 110.00 }
                ],
                total: 359.80,
                totalCost: 220.00,
                profit: 139.80,
                paymentMethod: 'Cartão de Crédito',
                status: 'Pago',
                createdAt: makeDate(2),
                updatedAt: makeDate(2)
            },
            {
                id: 'sale_3',
                date: makeDate(0), // Hoje
                clientId: 'cli_3',
                clientName: 'Ana Julia Costa',
                items: [
                    { productId: 'prod_6', name: 'Batom Matte Velvet Teddy', quantity: 1, price: 109.00, costPrice: 60.00 }
                ],
                total: 109.00,
                totalCost: 60.00,
                profit: 49.00,
                paymentMethod: 'Dinheiro',
                status: 'Pago',
                createdAt: makeDate(0),
                updatedAt: makeDate(0)
            },
            {
                id: 'sale_4',
                date: makeDate(1),
                clientId: 'cli_1',
                clientName: 'Maria Silva Oliveira',
                items: [
                    { productId: 'prod_1', name: 'Bleu de Chanel Eau de Parfum', quantity: 1, price: 980.00, costPrice: 650.00 }
                ],
                total: 980.00,
                totalCost: 650.00,
                profit: 330.00,
                paymentMethod: 'Fiado',
                status: 'Pendente',
                createdAt: makeDate(1),
                updatedAt: makeDate(1)
            }
        ];

        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(mockProducts));
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(mockClients));
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(mockSales));
    }
};
