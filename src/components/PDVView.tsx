import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Client, SaleItem } from '../types';
import { DEFAULT_CATEGORY_IMAGES } from '../supabaseClient';

interface PDVViewProps {
  products: Product[];
  clients: Client[];
  onSubmitSale: (saleData: {
    total_price: number;
    discount: number;
    payment_method: 'PIX' | 'Cartão' | 'Dinheiro' | 'Crediário';
    client_id: string | null;
  }, items: Array<{
    product_id: string;
    quantity: number;
    price: number;
    cost_price: number;
  }>) => Promise<void>;
  onNavigateToClients: () => void;
}

interface CartItem {
  product: Product;
  quantity: number;
  priceType: 'retail' | 'wholesale';
}

export const PDVView: React.FC<PDVViewProps> = ({
  products,
  clients,
  onSubmitSale,
  onNavigateToClients
}) => {  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);

  // Corrigido para 'percent' para sincronizar perfeitamente com o seu select
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'Cartão' | 'Dinheiro' | 'Crediário'>('PIX');
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Operational states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input on load
useEffect(() => {
  if (!currentUser) return; 

  refreshAllData();
}, [currentUser, refreshAllData]);

  // Filter products for left grid selection
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery));

      const matchesCategory = categoryFilter === '' || p.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  // Categories list
  const categories: Array<Product['category']> = ['Perfumes', 'Hidratantes', 'Body Splash', 'Kits', 'Outros'];

  // --- BARCODE READER KEYBOARD SIMULATION ---
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = searchQuery.trim();
      if (!code) return;

      const matchedProduct = products.find(p => p.barcode === code);
      if (matchedProduct) {
        addToCart(matchedProduct);
        setSearchQuery('');
        showSuccessToast(`Produto "${matchedProduct.name}" adicionado via leitor!`);
      }
    }
  };

  // Add Product to Cart
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      setErrorMsg(`O produto "${product.name}" está sem estoque.`);
      return;
    }

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.product.id === product.id);

      if (existingIndex !== -1) {
        const item = prevCart[existingIndex];
        if (item.quantity >= product.stock) {
          setErrorMsg(`Não é possível adicionar mais unidades. Limite de estoque (${product.stock}) atingido.`);
          return prevCart;
        }
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...item,
          quantity: item.quantity + 1
        };
        return updated;
      } else {
        setErrorMsg('');
        return [...prevCart, { product, quantity: 1, priceType: 'retail' }];
      }
    });
  };

  // Update Cart Quantity
  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }

    const item = cart.find(item => item.product.id === productId);
    if (!item) return;

    if (qty > item.product.stock) {
      setErrorMsg(`Estoque máximo atingido para ${item.product.name} (${item.product.stock} un disponíveis)`);
      return;
    }

    setErrorMsg('');
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  // Toggle Item Price Type (Retail vs Wholesale)
  const togglePriceType = (productId: string, type: 'retail' | 'wholesale') => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId ? { ...item, priceType: type } : item
      )
    );
  };

  // Remove Item from Cart
  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  // Clear Cart
  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setDiscountType('fixed');
    setSelectedClientId('');
    setPaymentMethod('PIX');
    setErrorMsg('');
  };

  // --- CALCULATION SUMMARIES ---
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalCost = 0;


    cart.forEach(item => {
      const price = item.priceType === 'retail'
        ? item.product.retail_price
        : item.product.wholesale_price;

      subtotal += price * item.quantity;
      totalCost += item.product.cost_price * item.quantity;
    });

cart.forEach(item => {
    const price = item.priceType === 'retail'
      ? item.product.retail_price
      : item.product.wholesale_price;

    subtotal += price * item.quantity;
    totalCost += item.product.cost_price * item.quantity;
  });

  // Corrigido para checar 'percent'
  const calculatedDiscount = discountType === 'percent'
    ? subtotal * (discount / 100)
    : discount;

  const finalTotal = Math.max(0, subtotal - calculatedDiscount);

  return {
    subtotal,
    totalCost,
    discountValue: calculatedDiscount,
    total: finalTotal,
  };
}, [cart, discount, discountType]);

// Handle Checkout Submit
const handleCheckout = async (e: React.FormEvent) => {
  e.preventDefault();
  if (cart.length === 0) {
    setErrorMsg('O carrinho está vazio.');
    return;
  }

  if (paymentMethod === 'Crediário' && !selectedClientId) {
    setErrorMsg('Para vendas no Crediário, selecione obrigatoriamente um cliente.');
    return;
  }

  try {
    setLoading(true);
    setErrorMsg('');

    const saleItemsPayload = cart.map(item => {
      const activePrice = item.priceType === 'retail'
        ? item.product.retail_price
        : item.product.wholesale_price;

      return {
        product_id: item.product.id,
        quantity: item.quantity,
        price: activePrice,
        cost_price: item.product.cost_price
      };
    });

    await onSubmitSale({
      total_price: totals.total,
      discount: totals.discountValue,
      payment_method: paymentMethod,
      client_id: selectedClientId || null
    }, saleItemsPayload);

    showSuccessToast('Venda registrada com sucesso!');
    clearCart();
  } catch (err: any) {
    console.error(err);
    setErrorMsg(err.message || 'Erro ao finalizar venda.');
  } finally {
    loading && setLoading(false);
  }
};

const showSuccessToast = (msg: string) => {
  setSuccessMsg(msg);
  setTimeout(() => setSuccessMsg(''), 3500);
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

return (
  <section id="view-pdv" className="app-view">

    {/* Toast notifications */}
    {successMsg && (
      <div className="toast toast-success show" style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}>
        <i className="fa-solid fa-circle-check"></i> <span>{successMsg}</span>
      </div>
    )}

    <div className="pdv-layout">

      {/* LEFT COLUMN: PRODUCT PICKER */}
      <div className="pdv-products">

        {/* Search and Category Filter Header */}
        <div className="pdv-search-bar card" style={{ padding: '12px', display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <div className="search-input-wrapper" style={{ flex: 1, margin: 0 }}>
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              className="form-control"
              ref={searchInputRef}
              placeholder="Escaneie o código ou busque pelo nome do produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>

          <select
            className="form-control"
            style={{ maxWidth: '160px' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Todas Categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Product Grid */}
        <div className="pdv-grid-wrapper" style={{ height: 'calc(100vh - 220px)', overflowY: 'auto' }}>
          {filteredProducts.length === 0 ? (
            <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-box-open" style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.5 }}></i>
              <p>Nenhum produto correspondente encontrado.</p>
            </div>
          ) : (
            <div className="pdv-products-grid">
              {filteredProducts.map(p => {
                const isLowStock = p.stock <= p.min_stock;
                const isOutOfStock = p.stock === 0;

                return (
                  <div
                    key={p.id}
                    className={`pdv-item-card ${isOutOfStock ? 'disabled' : ''}`}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    style={{
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      opacity: isOutOfStock ? 0.5 : 1,
                      position: 'relative'
                    }}
                  >
                    <div
                      className="pdv-item-image"
                      style={{ background: `url(${p.photo_url || DEFAULT_CATEGORY_IMAGES[p.category as keyof typeof DEFAULT_CATEGORY_IMAGES] || ''}) center/cover` }}
                    >
                      {isOutOfStock && (
                        <div style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          background: 'rgba(0,0,0,0.7)',
                          display: 'flex', justifyContent: 'center', alignItems: 'center',
                          fontWeight: 'bold', color: 'var(--danger)', fontSize: '12px'
                        }}>
                          ESGOTADO
                        </div>
                      )}
                      {isLowStock && !isOutOfStock && (
                        <span style={{
                          position: 'absolute', top: '5px', right: '5px',
                          fontSize: '9px', fontWeight: 'bold', background: 'var(--warning-bg)',
                          color: 'var(--warning)', padding: '2px 6px', borderRadius: '4px',
                          border: '1px solid rgba(245, 158, 11, 0.3)'
                        }}>
                          Estoque: {p.stock}
                        </span>
                      )}
                    </div>

                    <div className="pdv-item-info" style={{ padding: '10px' }}>
                      <span className="pdv-item-name" style={{ fontWeight: 600, display: 'block', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.name}>
                        {p.name}
                      </span>
                      <span className="pdv-item-category" style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                        {p.category}
                      </span>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Varejo</span>
                          <strong style={{ color: 'var(--primary)', fontSize: '13px' }}>{formatCurrency(p.retail_price)}</strong>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Atacado</span>
                          <strong style={{ color: 'var(--secondary)', fontSize: '13px' }}>{formatCurrency(p.wholesale_price)}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: SHOPPING CART */}
      <div className="card pdv-cart" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
        <div className="cart-header" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
            <i className="fa-solid fa-cart-shopping" style={{ color: 'var(--primary)' }}></i> Carrinho
          </h3>
          <button className="btn" style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.05)' }} onClick={clearCart}>
            Limpar
          </button>
        </div>

        {/* Cart Item list */}
        <div className="cart-items-list" style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {cart.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', padding: '20px' }}>
              <i className="fa-solid fa-basket-shopping" style={{ fontSize: '36px', marginBottom: '10px', opacity: 0.3 }}></i>
              <p style={{ textAlign: 'center', fontSize: '13px' }}>Carrinho vazio. Clique nos produtos à esquerda para adicioná-los.</p>
            </div>
          ) : (
            cart.map((item, idx) => {
              const activePrice = item.priceType === 'retail'
                ? item.product.retail_price
                : item.product.wholesale_price;

              return (
                <div key={idx} className="cart-item-row" style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ flex: 1, paddingRight: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', display: 'block' }}>{item.product.name}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Estoque atual: {item.product.stock} un</span>
                    </div>
                    <button
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Price type toggle button */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '2px' }}>
                      <button
                        type="button"
                        className={`btn ${item.priceType === 'retail' ? 'btn-primary' : ''}`}
                        style={{ padding: '3px 8px', fontSize: '9px', minWidth: '55px', height: 'auto', background: item.priceType === 'retail' ? 'var(--primary)' : 'none' }}
                        onClick={() => togglePriceType(item.product.id, 'retail')}
                      >
                        Varejo
                      </button>
                      <button
                        type="button"
                        className={`btn ${item.priceType === 'wholesale' ? 'btn-primary' : ''}`}
                        style={{ padding: '3px 8px', fontSize: '9px', minWidth: '55px', height: 'auto', background: item.priceType === 'wholesale' ? 'var(--secondary)' : 'none' }}
                        onClick={() => togglePriceType(item.product.id, 'wholesale')}
                      >
                        Atacado
                      </button>
                    </div>

                    {/* Quantity input switcher */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: '2px 6px', fontSize: '10px', background: 'rgba(255,255,255,0.05)' }}
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 0)}
                        style={{ width: '35px', textAlign: 'center', background: 'none', border: '1px solid var(--border-color)', color: 'white', fontSize: '12px', borderRadius: '4px', padding: '2px 0' }}
                      />
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: '2px 6px', fontSize: '10px', background: 'rgba(255,255,255,0.05)' }}
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>

                    {/* Line Item Total */}
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>
                      {formatCurrency(activePrice * item.quantity)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Checkout Area Summary */}
        <div className="cart-summary" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
          {errorMsg && (
            <div className="alert-banner" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', marginBottom: '10px', padding: '8px', fontSize: '11px', display: 'flex' }}>
              <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleCheckout}>
            {/* Form grid checkout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>

              {/* BLOCO DO DESCONTO CORRIGIDO COM O SEU SELECT NATIVO */}
              <div className="summary-row discount-container">
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px', display: 'block' }}>Desconto</label>
                <div className="discount-inputs" style={{ display: 'flex', gap: '6px' }}>
                  <select
                    id="cart-discount-type"
                    className="form-control"
                    style={{ width: '65px', padding: '2px 4px', height: '30px', fontSize: '12px', fontWeight: '600' }}
                    value={discountType}
                    onChange={(e) => {
                      setDiscountType(e.target.value as 'fixed' | 'percent');
                      setDiscount(0); // Reseta o valor para não dar pulos absurdos de caixa
                    }}
                  >
                    <option value="fixed">R$</option>
                    <option value="percent">%</option>
                  </select>

                  <input
                    type="number"
                    className="form-control"
                    id="cart-discount"
                    min="0"
                    max={discountType === 'percent' ? 100 : undefined}
                    step="0.01"
                    style={{ width: '80px', padding: '4px 8px', textAlign: 'right', height: '30px' }}
                    value={discount === 0 ? '' : discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Método de Pagamento</label>
                <select
                  className="form-control"
                  style={{ padding: '6px' }}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                >
                  <option value="PIX">PIX</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Crediário">Crediário (Fiado)</option>
                </select>
              </div>
            </div>

            {/* Client Selection (Required for Crediário) */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ fontSize: '11px', margin: 0 }}>
                  Cliente {paymentMethod === 'Crediário' && <span style={{ color: 'var(--danger)' }}>*</span>}
                </label>
                <button
                  type="button"
                  onClick={onNavigateToClients}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '10px', cursor: 'pointer' }}
                >
                  + Novo Cliente
                </button>
              </div>

              <select
                className="form-control"
                style={{ padding: '6px' }}
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">-- Selecione o cliente --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.debt > 0 ? `(Dívida: ${formatCurrency(c.debt)})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Cost, subtotal and totals metrics */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: '1px solid var(--border-color)' }}>
              <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span>Subtotal:</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.discountValue > 0 && (
                <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--danger)', marginBottom: '4px' }}>
                  <span>Desconto {discountType === 'percent' && `(${discount}%)`}:</span>
                  <span>-{formatCurrency(totals.discountValue)}</span>
                </div>
              )}
              <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold', borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '6px' }}>
                <span>Total a Pagar:</span>
                <span style={{ color: 'var(--primary)' }}>{formatCurrency(totals.total)}</span>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading || cart.length === 0}
              style={{ padding: '12px', fontSize: '14px', fontWeight: 'bold' }}
            >
              {loading ? 'Finalizando...' : 'Finalizar Venda'}
            </button>
          </form>
        </div>
      </div>

    </div>
  </section>
)}
