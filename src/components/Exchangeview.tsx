import React, { useEffect, useMemo, useState } from 'react';

import { Product, Customer, Sale, SaleItem } from '../types';

interface ExchangeViewProps {
  sales: Sale[];
  products: Product[];
  clients: Customer[];
  hasOpenCashRegister: boolean;
  activeCashRegisterId: string | null;
  userEmail: string;

  /**
   * Venda enviada pelo Histórico de Vendas.
   * Quando preenchida, a troca já abre com essa venda selecionada.
   */
  initialSale?: Sale | null;

  onGetSaleItems: (saleId: string) => Promise<SaleItem[]>;

  onCreateExchange: (params: {
    original_sale_id: string | null;
    customer_id: string | null;
    returnedItems: Array<{
      product_id: string;
      quantity: number;
      price: number;
    }>;
    newItems: Array<{
      product_id: string;
      quantity: number;
      price: number;
    }>;
    resolution:
      | 'sem_diferenca'
      | 'pago_pelo_cliente'
      | 'devolvido_ao_cliente'
      | 'credito_cliente'
      | 'divida_cliente';
    payment_method: 'PIX' | 'Cartão' | 'Dinheiro' | null;
  }) => Promise<void>;
}

interface NewCartItem {
  product: Product;
  quantity: number;
  priceType: 'retail' | 'wholesale';
}

type Resolution =
  | 'sem_diferenca'
  | 'pago_pelo_cliente'
  | 'devolvido_ao_cliente'
  | 'credito_cliente'
  | 'divida_cliente';

const STORE_WHATSAPP_KEY = 'jaja_store_whatsapp_number';

export const ExchangeView: React.FC<ExchangeViewProps> = ({
  sales,
  products,
  clients,
  hasOpenCashRegister,
  activeCashRegisterId,
  userEmail,
  initialSale,
  onGetSaleItems,
  onCreateExchange
}) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);

  // ============================================================
  // STEP 1 - VENDA ORIGINAL
  // ============================================================

  const [saleSearch, setSaleSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(
    initialSale || null
  );

  const [originalItems, setOriginalItems] = useState<SaleItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // ============================================================
  // STEP 2 - ITENS DEVOLVIDOS
  // ============================================================

  const [returnQuantities, setReturnQuantities] = useState<
    Record<string, number>
  >({});

  // ============================================================
  // STEP 3 - NOVOS PRODUTOS
  // ============================================================

  const [productSearch, setProductSearch] = useState('');
  const [newCart, setNewCart] = useState<NewCartItem[]>([]);

  // ============================================================
  // STEP 4 - RESOLUÇÃO
  // ============================================================

  const [resolution, setResolution] = useState<Resolution | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<
    'PIX' | 'Cartão' | 'Dinheiro'
  >('PIX');

  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ============================================================
  // WHATSAPP
  // ============================================================

  const [exchangeWhatsAppText, setExchangeWhatsAppText] = useState('');

  // ============================================================
  // QUANDO VIER DO HISTÓRICO, SELECIONA AUTOMATICAMENTE A VENDA
  // ============================================================

  useEffect(() => {
    if (!initialSale) return;

    const loadInitialSale = async () => {
      setSelectedSale(initialSale);
      setSaleSearch('');
      setReturnQuantities({});
      setOriginalItems([]);
      setErrorMsg('');

      try {
        setLoadingItems(true);

        const items = await onGetSaleItems(initialSale.id);

        setOriginalItems(items);
      } catch (err) {
        console.error('Erro ao carregar itens da venda:', err);
        setErrorMsg('Erro ao carregar os itens dessa venda.');
      } finally {
        setLoadingItems(false);
      }
    };

    loadInitialSale();
  }, [initialSale, onGetSaleItems]);

  // ============================================================
  // BUSCA DE VENDAS
  // ============================================================

  const matchingSales = useMemo(() => {
    if (!saleSearch.trim()) return [];

    const term = saleSearch.toLowerCase();

    return sales
      .filter(
        (s) =>
          (s.customer_name &&
            s.customer_name.toLowerCase().includes(term)) ||
          s.id.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [sales, saleSearch]);

  // ============================================================
  // SELECIONAR VENDA
  // ============================================================

  const handleSelectSale = async (sale: Sale) => {
    setSelectedSale(sale);
    setSaleSearch('');
    setReturnQuantities({});
    setNewCart([]);
    setResolution('');
    setErrorMsg('');
    setSuccessMsg('');
    setExchangeWhatsAppText('');

    try {
      setLoadingItems(true);

      const items = await onGetSaleItems(sale.id);

      setOriginalItems(items);
    } catch (err) {
      console.error('Erro ao carregar itens da venda:', err);
      setErrorMsg('Erro ao carregar os itens dessa venda.');
    } finally {
      setLoadingItems(false);
    }
  };

  // ============================================================
  // QUANTIDADE DEVOLVIDA
  // ============================================================

  const updateReturnQty = (
    saleItemId: string,
    qty: number,
    max: number
  ) => {
    const clamped = Math.max(0, Math.min(qty, max));

    setReturnQuantities((prev) => ({
      ...prev,
      [saleItemId]: clamped
    }));
  };

  // ============================================================
  // BUSCA DE PRODUTOS
  // ============================================================

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return [];

    const term = productSearch.toLowerCase();

    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.barcode && p.barcode.includes(term))
      )
      .slice(0, 8);
  }, [products, productSearch]);

  // ============================================================
  // ADICIONAR PRODUTO NOVO
  // ============================================================

  const addToNewCart = (product: Product) => {
    if (product.stock <= 0) return;

    setNewCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);

      if (idx !== -1) {
        const updated = [...prev];

        const newQuantity = Math.min(
          updated[idx].quantity + 1,
          product.stock
        );

        updated[idx] = {
          ...updated[idx],
          quantity: newQuantity
        };

        return updated;
      }

      return [
        ...prev,
        {
          product,
          quantity: 1,
          priceType: 'retail'
        }
      ];
    });

    setProductSearch('');
  };

  const updateNewCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setNewCart((prev) =>
        prev.filter((i) => i.product.id !== productId)
      );

      return;
    }

    setNewCart((prev) =>
      prev.map((i) => {
        if (i.product.id !== productId) return i;

        return {
          ...i,
          quantity: Math.min(qty, i.product.stock)
        };
      })
    );
  };

  const toggleNewCartPriceType = (
    productId: string,
    type: 'retail' | 'wholesale'
  ) => {
    setNewCart((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? {
              ...i,
              priceType: type
            }
          : i
      )
    );
  };

  const removeFromNewCart = (productId: string) => {
    setNewCart((prev) =>
      prev.filter((i) => i.product.id !== productId)
    );
  };

  // ============================================================
  // PAYLOADS
  // ============================================================

  const returnedItemsPayload = useMemo(() => {
    return originalItems
      .filter((item) => (returnQuantities[item.id] || 0) > 0)
      .map((item) => ({
        product_id: item.product_id,
        quantity: returnQuantities[item.id],
        price: Number(item.price)
      }));
  }, [originalItems, returnQuantities]);

  const newItemsPayload = useMemo(() => {
    return newCart.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      price:
        item.priceType === 'retail'
          ? item.product.retail_price
          : item.product.wholesale_price
    }));
  }, [newCart]);

  const totalReturned = returnedItemsPayload.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const totalNew = newItemsPayload.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const difference =
    Math.round((totalNew - totalReturned) * 100) / 100;

  // ============================================================
  // RESET
  // ============================================================

  const resetAll = () => {
    setSelectedSale(null);
    setOriginalItems([]);
    setReturnQuantities({});
    setNewCart([]);
    setResolution('');
    setPaymentMethod('PIX');
    setErrorMsg('');
  };

  // ============================================================
  // MONTAR MENSAGEM WHATSAPP
  // ============================================================

  const buildExchangeWhatsAppMessage = () => {
    if (!selectedSale) return '';

    let text = `*CONFIRMAÇÃO DE TROCA*\n\n`;

    text += `Venda original: #${selectedSale.id.substring(0, 8)}\n`;
    text += `Cliente: ${
      selectedSale.customer_name || 'Consumidor Final'
    }\n\n`;

    text += `*Produtos devolvidos:*\n`;

    returnedItemsPayload.forEach((item) => {
      const original = originalItems.find(
        (originalItem) =>
          originalItem.product_id === item.product_id
      );

      text += `• ${original?.product_name || 'Produto'} - ${
        item.quantity
      }x - ${formatCurrency(item.price)}\n`;
    });

    text += `\nTotal devolvido: ${formatCurrency(
      totalReturned
    )}\n`;

    text += `\n*Novos produtos:*\n`;

    newItemsPayload.forEach((item) => {
      const product = products.find(
        (p) => p.id === item.product_id
      );

      text += `• ${product?.name || 'Produto'} - ${
        item.quantity
      }x - ${formatCurrency(item.price)}\n`;
    });

    text += `\nTotal dos novos produtos: ${formatCurrency(
      totalNew
    )}\n`;

    if (difference === 0) {
      text += `\n*Diferença:* Sem diferença\n`;
    } else if (difference > 0) {
      text += `\n*Diferença:* ${formatCurrency(
        difference
      )} paga pelo cliente\n`;
    } else {
      text += `\n*Diferença:* ${formatCurrency(
        Math.abs(difference)
      )} devolvida ao cliente\n`;
    }

    text += `\nTroca registrada pelo sistema JAJA.`;

    return text;
  };

  // ============================================================
  // WHATSAPP
  // ============================================================

  const handleSendWhatsApp = () => {
    if (!exchangeWhatsAppText) return;

    let storeNumber =
      localStorage.getItem(STORE_WHATSAPP_KEY) || '';

    const inputNumber = window.prompt(
      'Número de WhatsApp para enviar a confirmação da troca (com DDD):',
      storeNumber
    );

    if (!inputNumber || !inputNumber.trim()) {
      return;
    }

    storeNumber = inputNumber.trim();

    localStorage.setItem(
      STORE_WHATSAPP_KEY,
      storeNumber
    );

    let telefoneLimpo = storeNumber.replace(/\D/g, '');

    if (!telefoneLimpo.startsWith('55')) {
      telefoneLimpo = `55${telefoneLimpo}`;
    }

    const link = `https://wa.me/${telefoneLimpo}?text=${encodeURIComponent(
      exchangeWhatsAppText
    )}`;

    window.open(link, '_blank');
  };

  // ============================================================
  // CONFIRMAR TROCA
  // ============================================================

  const handleConfirm = async () => {
    setErrorMsg('');

    if (!hasOpenCashRegister) {
      setErrorMsg(
        'É necessário ter um caixa aberto para registrar a troca.'
      );
      return;
    }

    if (returnedItemsPayload.length === 0) {
      setErrorMsg(
        'Selecione ao menos um produto devolvido.'
      );
      return;
    }

    if (newItemsPayload.length === 0) {
      setErrorMsg(
        'Selecione ao menos um novo produto para entregar ao cliente.'
      );
      return;
    }

    // ========================================================
    // VALIDAR ESTOQUE
    // ========================================================

    for (const item of newCart) {
      if (item.quantity > item.product.stock) {
        setErrorMsg(
          `Estoque insuficiente de "${item.product.name}" (disponível: ${item.product.stock}).`
        );
        return;
      }
    }

    // ========================================================
    // RESOLUÇÃO
    // ========================================================

    let finalResolution: Resolution = 'sem_diferenca';

    let finalPaymentMethod:
      | 'PIX'
      | 'Cartão'
      | 'Dinheiro'
      | null = null;

    if (difference !== 0) {
      if (!resolution) {
        setErrorMsg(
          'Escolha como resolver a diferença de valor.'
        );
        return;
      }

      finalResolution = resolution;

      const precisaCaixa =
        resolution === 'pago_pelo_cliente' ||
        resolution === 'devolvido_ao_cliente';

      if (precisaCaixa) {
        finalPaymentMethod = paymentMethod;
      }

      const precisaCliente =
        resolution === 'credito_cliente' ||
        resolution === 'divida_cliente';

      if (
        precisaCliente &&
        !selectedSale?.customer_id
      ) {
        setErrorMsg(
          'Essa venda não tem cliente vinculado — não é possível gerar dívida/crédito.'
        );
        return;
      }
    }

    // ========================================================
    // REGISTRAR
    // ========================================================

    try {
      setLoading(true);

      await onCreateExchange({
        original_sale_id: selectedSale?.id || null,
        customer_id: selectedSale?.customer_id || null,
        returnedItems: returnedItemsPayload,
        newItems: newItemsPayload,
        resolution: finalResolution,
        payment_method: finalPaymentMethod
      });

      // Monta a mensagem ANTES de limpar os dados.
      const whatsappText = buildExchangeWhatsAppMessage();

      setExchangeWhatsAppText(whatsappText);

      setSuccessMsg(
        'Troca registrada com sucesso!'
      );

      // Limpa somente a operação atual.
      setSelectedSale(null);
      setOriginalItems([]);
      setReturnQuantities({});
      setNewCart([]);
      setResolution('');
      setPaymentMethod('PIX');

    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'Erro ao registrar a troca.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <section
      id="view-exchange"
      className="app-view"
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}
      >
        <h2
          style={{
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i
            className="fa-solid fa-right-left"
            style={{ color: 'var(--primary)' }}
          />

          Troca de Produtos
        </h2>
      </div>

      {/* ======================================================
          SUCESSO
      ====================================================== */}

      {successMsg && (
        <div
          style={{
            background: 'var(--success-bg)',
            color: 'var(--success)',
            marginBottom: '16px',
            padding: '14px',
            fontSize: '13px',
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              fontWeight: 600
            }}
          >
            <i className="fa-solid fa-circle-check" />
            {successMsg}
          </div>

          <button
            type="button"
            className="btn"
            onClick={handleSendWhatsApp}
            style={{
              background: '#25D366',
              color: '#fff',
              fontWeight: 'bold',
              padding: '9px 14px'
            }}
          >
            <i
              className="fa-brands fa-whatsapp"
              style={{ marginRight: '7px' }}
            />

            Enviar confirmação pelo WhatsApp
          </button>
        </div>
      )}

      {/* ======================================================
          ERRO
      ====================================================== */}

      {errorMsg && (
        <div
          style={{
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            marginBottom: '16px',
            padding: '10px',
            fontSize: '13px',
            borderRadius: '6px'
          }}
        >
          <i
            className="fa-solid fa-circle-exclamation"
            style={{ marginRight: '6px' }}
          />

          {errorMsg}
        </div>
      )}

      {/* ======================================================
          STEP 1
      ====================================================== */}

      <div
        className="card"
        style={{
          padding: '16px',
          marginBottom: '20px'
        }}
      >
        <h3
          style={{
            fontSize: '14px',
            marginBottom: '10px'
          }}
        >
          1. Buscar a venda original
        </h3>

        {!selectedSale ? (
          <>
            <input
              type="text"
              className="form-control"
              placeholder="Busque pelo nome do cliente ou número da venda..."
              value={saleSearch}
              onChange={(e) =>
                setSaleSearch(e.target.value)
              }
            />

            {matchingSales.length > 0 && (
              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                {matchingSales.map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() =>
                      handleSelectSale(sale)
                    }
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background:
                        'rgba(255,255,255,0.03)',
                      border:
                        '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      fontSize: '13px'
                    }}
                  >
                    <span>
                      <strong>
                        {sale.customer_name ||
                          'Cliente não identificado'}
                      </strong>{' '}

                      <span
                        style={{
                          color:
                            'var(--text-muted)'
                        }}
                      >
                        — #{sale.id.substring(0, 8)} —{' '}
                        {new Date(
                          sale.created_at
                        ).toLocaleDateString(
                          'pt-BR'
                        )}
                      </span>
                    </span>

                    <span
                      style={{
                        fontWeight: 600,
                        color: 'var(--primary)'
                      }}
                    >
                      {formatCurrency(
                        sale.total_price
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              background:
                'rgba(255,255,255,0.03)',
              padding: '10px',
              borderRadius: '6px'
            }}
          >
            <span
              style={{ fontSize: '13px' }}
            >
              Venda de{' '}
              <strong>
                {selectedSale.customer_name ||
                  'Cliente não identificado'}
              </strong>{' '}
              — #{selectedSale.id.substring(0, 8)} —{' '}
              {formatCurrency(
                selectedSale.total_price
              )}
            </span>

            <button
              className="btn"
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                background:
                  'rgba(255,255,255,0.05)'
              }}
              onClick={() => {
                resetAll();
                setSuccessMsg('');
                setExchangeWhatsAppText('');
              }}
            >
              Trocar de venda
            </button>
          </div>
        )}
      </div>

      {/* ======================================================
          STEPS 2, 3 E 4
      ====================================================== */}

      {selectedSale && (
        <>
          {/* ==================================================
              STEP 2
          ================================================== */}

          <div
            className="card"
            style={{
              padding: '16px',
              marginBottom: '20px'
            }}
          >
            <h3
              style={{
                fontSize: '14px',
                marginBottom: '10px'
              }}
            >
              2. Produtos que o cliente está devolvendo
            </h3>

            {loadingItems ? (
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)'
                }}
              >
                Carregando itens da venda...
              </p>
            ) : originalItems.length === 0 ? (
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)'
                }}
              >
                Essa venda não possui itens registrados.
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {originalItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      alignItems: 'center',
                      padding: '8px',
                      background:
                        'rgba(255,255,255,0.02)',
                      borderRadius: '6px'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px'
                      }}
                    >
                      <strong>
                        {item.product_name}
                      </strong>

                      <span
                        style={{
                          color:
                            'var(--text-muted)'
                        }}
                      >
                        {' '}
                        — comprado: {item.quantity}x —{' '}
                        {formatCurrency(item.price)} cada
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          color:
                            'var(--text-muted)'
                        }}
                      >
                        Devolver:
                      </span>

                      <input
                        type="number"
                        min={0}
                        max={item.quantity}
                        className="form-control"
                        style={{
                          width: '60px',
                          padding: '4px',
                          textAlign: 'center'
                        }}
                        value={
                          returnQuantities[
                            item.id
                          ] || 0
                        }
                        onChange={(e) =>
                          updateReturnQty(
                            item.id,
                            Number(
                              e.target.value
                            ),
                            item.quantity
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ==================================================
              STEP 3
          ================================================== */}

          <div
            className="card"
            style={{
              padding: '16px',
              marginBottom: '20px'
            }}
          >
            <h3
              style={{
                fontSize: '14px',
                marginBottom: '10px'
              }}
            >
              3. Novos produtos entregues ao cliente
            </h3>

            <input
              type="text"
              className="form-control"
              placeholder="Busque pelo nome ou código de barras do novo produto..."
              value={productSearch}
              onChange={(e) =>
                setProductSearch(e.target.value)
              }
            />

            {filteredProducts.length > 0 && (
              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() =>
                      p.stock > 0 &&
                      addToNewCart(p)
                    }
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      cursor:
                        p.stock > 0
                          ? 'pointer'
                          : 'not-allowed',
                      opacity:
                        p.stock > 0 ? 1 : 0.5,
                      background:
                        'rgba(255,255,255,0.03)',
                      border:
                        '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      fontSize: '13px'
                    }}
                  >
                    <span>
                      {p.name}{' '}
                      <span
                        style={{
                          color:
                            'var(--text-muted)'
                        }}
                      >
                        (estoque: {p.stock})
                      </span>
                    </span>

                    <span
                      style={{
                        color: 'var(--primary)',
                        fontWeight: 600
                      }}
                    >
                      {formatCurrency(
                        p.retail_price
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {newCart.length > 0 && (
              <div
                style={{
                  marginTop: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {newCart.map((item) => {
                  const activePrice =
                    item.priceType === 'retail'
                      ? item.product.retail_price
                      : item.product
                          .wholesale_price;

                  return (
                    <div
                      key={item.product.id}
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        alignItems: 'center',
                        padding: '8px',
                        background:
                          'rgba(255,255,255,0.02)',
                        borderRadius: '6px'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '13px',
                          flex: 1
                        }}
                      >
                        <strong>
                          {item.product.name}
                        </strong>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          background:
                            'rgba(255,255,255,0.05)',
                          borderRadius: '4px',
                          padding: '2px',
                          marginRight: '10px'
                        }}
                      >
                        <button
                          type="button"
                          className="btn"
                          style={{
                            padding: '3px 8px',
                            fontSize: '9px',
                            background:
                              item.priceType ===
                              'retail'
                                ? 'var(--primary)'
                                : 'none'
                          }}
                          onClick={() =>
                            toggleNewCartPriceType(
                              item.product.id,
                              'retail'
                            )
                          }
                        >
                          Varejo
                        </button>

                        <button
                          type="button"
                          className="btn"
                          style={{
                            padding: '3px 8px',
                            fontSize: '9px',
                            background:
                              item.priceType ===
                              'wholesale'
                                ? 'var(--secondary)'
                                : 'none'
                          }}
                          onClick={() =>
                            toggleNewCartPriceType(
                              item.product.id,
                              'wholesale'
                            )
                          }
                        >
                          Atacado
                        </button>
                      </div>

                      <input
                        type="number"
                        min={1}
                        max={item.product.stock}
                        className="form-control"
                        style={{
                          width: '55px',
                          padding: '4px',
                          textAlign: 'center',
                          marginRight: '10px'
                        }}
                        value={item.quantity}
                        onChange={(e) =>
                          updateNewCartQty(
                            item.product.id,
                            Number(
                              e.target.value
                            )
                          )
                        }
                      />

                      <span
                        style={{
                          fontWeight: 600,
                          minWidth: '80px',
                          textAlign: 'right'
                        }}
                      >
                        {formatCurrency(
                          activePrice *
                            item.quantity
                        )}
                      </span>

                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          marginLeft: '8px'
                        }}
                        onClick={() =>
                          removeFromNewCart(
                            item.product.id
                          )
                        }
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ==================================================
              STEP 4
          ================================================== */}

          <div
            className="card"
            style={{
              padding: '16px',
              marginBottom: '20px'
            }}
          >
            <h3
              style={{
                fontSize: '14px',
                marginBottom: '10px'
              }}
            >
              4. Resumo da troca
            </h3>

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                fontSize: '13px',
                marginBottom: '6px'
              }}
            >
              <span>Total devolvido:</span>

              <span>
                {formatCurrency(totalReturned)}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                fontSize: '13px',
                marginBottom: '6px'
              }}
            >
              <span>
                Total dos novos produtos:
              </span>

              <span>
                {formatCurrency(totalNew)}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                fontSize: '15px',
                fontWeight: 'bold',
                borderTop:
                  '1px solid var(--border-color)',
                paddingTop: '8px',
                marginTop: '8px'
              }}
            >
              <span>Diferença:</span>

              <span
                style={{
                  color:
                    difference > 0
                      ? 'var(--danger)'
                      : difference < 0
                        ? 'var(--success)'
                        : 'var(--text-primary)'
                }}
              >
                {difference === 0
                  ? 'Sem diferença'
                  : formatCurrency(
                      Math.abs(difference)
                    )}

                {difference > 0
                  ? ' (cliente deve)'
                  : difference < 0
                    ? ' (loja deve)'
                    : ''}
              </span>
            </div>

            {difference !== 0 && (
              <div
                style={{ marginTop: '16px' }}
              >
                <label
                  className="form-label"
                  style={{
                    fontSize: '12px',
                    marginBottom: '8px',
                    display: 'block'
                  }}
                >
                  Como resolver essa diferença?
                </label>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  {difference > 0 ? (
                    <>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="radio"
                          name="resolution"
                          checked={
                            resolution ===
                            'pago_pelo_cliente'
                          }
                          onChange={() =>
                            setResolution(
                              'pago_pelo_cliente'
                            )
                          }
                        />

                        Cliente paga a diferença agora
                      </label>

                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="radio"
                          name="resolution"
                          checked={
                            resolution ===
                            'divida_cliente'
                          }
                          onChange={() =>
                            setResolution(
                              'divida_cliente'
                            )
                          }
                        />

                        Vira dívida do cliente
                      </label>
                    </>
                  ) : (
                    <>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="radio"
                          name="resolution"
                          checked={
                            resolution ===
                            'devolvido_ao_cliente'
                          }
                          onChange={() =>
                            setResolution(
                              'devolvido_ao_cliente'
                            )
                          }
                        />

                        Devolver o valor ao cliente agora
                      </label>

                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="radio"
                          name="resolution"
                          checked={
                            resolution ===
                            'credito_cliente'
                          }
                          onChange={() =>
                            setResolution(
                              'credito_cliente'
                            )
                          }
                        />

                        Vira crédito do cliente para uma próxima compra
                      </label>
                    </>
                  )}
                </div>

                {(resolution ===
                  'pago_pelo_cliente' ||
                  resolution ===
                    'devolvido_ao_cliente') && (
                  <div
                    style={{
                      marginTop: '10px'
                    }}
                  >
                    <label
                      className="form-label"
                      style={{
                        fontSize: '11px',
                        marginBottom: '4px'
                      }}
                    >
                      Forma de pagamento
                    </label>

                    <select
                      className="form-control"
                      style={{
                        padding: '6px',
                        maxWidth: '200px'
                      }}
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(
                          e.target.value as
                            | 'PIX'
                            | 'Cartão'
                            | 'Dinheiro'
                        )
                      }
                    >
                      <option value="PIX">
                        PIX
                      </option>

                      <option value="Cartão">
                        Cartão
                      </option>

                      <option value="Dinheiro">
                        Dinheiro
                      </option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <button
              className="btn btn-primary w-100"
              style={{
                marginTop: '20px',
                padding: '12px',
                fontWeight: 'bold'
              }}
              disabled={loading}
              onClick={handleConfirm}
            >
              {loading
                ? 'Registrando...'
                : 'Confirmar Troca'}
            </button>
          </div>
        </>
      )}
    </section>
  );
};