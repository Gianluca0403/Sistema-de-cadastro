import React, { useState, useMemo, useRef } from 'react';
import { Product } from '../types';
import { DEFAULT_CATEGORY_IMAGES } from '../supabaseClient';

interface ProductsViewProps {
  products: Product[];
  onCreateProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>, file?: File) => Promise<void>;
  onUpdateProduct: (id: string, product: Partial<Product>, file?: File) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onAddStockMovement: (product_id: string, type: 'Entrada' | 'Saída manual' | 'Ajuste', quantity: number, obs: string) => Promise<void>;
  userEmail: string;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddStockMovement,
  userEmail
}) => {
  // Navigation & filter states
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementProduct, setMovementProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<'Entrada' | 'Saída manual' | 'Ajuste'>('Entrada');
  const [movementQty, setMovementQty] = useState<number>(0);
  const [movementObs, setMovementObs] = useState('');

  // Form states for Product CRUD
  const [formName, setFormName] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategory, setFormCategory] = useState<'Perfumes' | 'Hidratantes' | 'Body Splash' | 'Kits' | 'Outros'>('Perfumes');
  const [formStock, setFormStock] = useState<number>(0);
  const [formMinStock, setFormMinStock] = useState<number>(2);
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formRetailPrice, setFormRetailPrice] = useState<number>(0);
  const [formWholesalePrice, setFormWholesalePrice] = useState<number>(0);
  const [formDescription, setFormDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status notifications
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // --- FILTERED PRODUCTS ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        (p.barcode && p.barcode.includes(search)) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
      
      const matchCategory = selectedCategory === '' || p.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [products, search, selectedCategory]);

  // Categories list
  const categories: Array<Product['category']> = ['Perfumes', 'Hidratantes', 'Body Splash', 'Kits', 'Outros'];

  // Open product modal for creation
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormBarcode('');
    setFormCategory('Perfumes');
    setFormStock(0);
    setFormMinStock(2);
    setFormCostPrice(0);
    setFormRetailPrice(0);
    setFormWholesalePrice(0);
    setFormDescription('');
    setSelectedFile(null);
    setErrorMsg('');
    setIsProductModalOpen(true);
  };

  // Open product modal for editing
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormBarcode(product.barcode || '');
    setFormCategory(product.category);
    setFormStock(product.stock);
    setFormMinStock(product.min_stock);
    setFormCostPrice(product.cost_price);
    setFormRetailPrice(product.retail_price);
    setFormWholesalePrice(product.wholesale_price);
    setFormDescription(product.description || '');
    setSelectedFile(null);
    setErrorMsg('');
    setIsProductModalOpen(true);
  };

  // Handle Product CRUD submit
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg('O nome do produto é obrigatório.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const productPayload = {
        name: formName,
        barcode: formBarcode,
        category: formCategory,
        stock: formStock,
        min_stock: formMinStock,
        cost_price: formCostPrice,
        retail_price: formRetailPrice,
        wholesale_price: formWholesalePrice,
        description: formDescription || null,
        photo_url: editingProduct?.photo_url || null
      };

      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, productPayload, selectedFile || undefined);
      } else {
        await onCreateProduct(productPayload, selectedFile || undefined);
      }

      setIsProductModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao salvar produto. Verifique se o código de barras é único.');
    } finally {
      setLoading(false);
    }
  };

  // Open Stock Movement Modal
  const handleOpenMovementModal = (product: Product) => {
    setMovementProduct(product);
    setMovementType('Entrada');
    setMovementQty(0);
    setMovementObs('');
    setErrorMsg('');
    setIsMovementModalOpen(true);
  };

  // Handle Stock Movement Submit
  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementProduct) return;
    if (movementQty <= 0) {
      setErrorMsg('A quantidade deve ser maior que zero.');
      return;
    }

    // Validation for exit
    if (movementType === 'Saída manual' && movementProduct.stock < movementQty) {
      setErrorMsg(`Estoque insuficiente. Estoque disponível: ${movementProduct.stock} unidades.`);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const obs = movementObs || (movementType === 'Entrada' ? 'Entrada manual de mercadoria' : movementType === 'Ajuste' ? 'Ajuste manual de estoque' : 'Saída manual de estoque');
      await onAddStockMovement(movementProduct.id, movementType, movementQty, obs);

      setIsMovementModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao movimentar estoque.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (product: Product) => {
    if (window.confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) {
      try {
        await onDeleteProduct(product.id);
      } catch (err: any) {
        alert(err.message || 'Erro ao deletar produto.');
      }
    }
  };

  const getStockBadge = (stock: number, minStock: number) => {
    if (stock === 0) {
      return <span className="badge badge-danger" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Esgotado</span>;
    } else if (stock <= minStock) {
      return <span className="badge badge-warning" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>Estoque Baixo ({stock})</span>;
    } else {
      return <span className="badge badge-success" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>Em estoque ({stock})</span>;
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <section id="view-estoque" className="app-view">
      {/* Top action bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Quick Search */}
          <div className="search-input-wrapper" style={{ flex: 1, minWidth: '260px', margin: 0 }}>
            <i className="fa-solid fa-magnifying-glass"></i>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Buscar por nome, marca ou código de barras..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Quick Category Selector */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            <button 
              className={`filter-chip ${selectedCategory === '' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('')}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Add product button */}
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <i className="fa-solid fa-plus" style={{ marginRight: '8px' }}></i> Novo Produto
          </button>
        </div>
      </div>

      {/* Products list card */}
      <div className="card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Foto / Nome</th>
                <th>Código de Barras</th>
                <th>Categoria</th>
                <th>Estoque</th>
                <th style={{ textAlign: 'right' }}>Custo</th>
                <th style={{ textAlign: 'right' }}>Preço Varejo</th>
                <th style={{ textAlign: 'right' }}>Preço Atacado</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 0' }}>
                    Nenhum produto cadastrado que atenda aos critérios.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => (
                  <tr key={p.id}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: `url(${p.photo_url || DEFAULT_CATEGORY_IMAGES[p.category]}) center/cover`,
                        flexShrink: 0,
                        border: '1px solid var(--border-color)'
                      }}></div>
                      <div>
                        <span style={{ fontWeight: 600, display: 'block' }}>{p.name}</span>
                        {p.description && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {p.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {p.barcode || <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    </td>
                    <td>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{p.category}</span>
                    </td>
                    <td>{getStockBadge(p.stock, p.min_stock)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(p.cost_price)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--primary)', fontWeight: 600 }}>{formatCurrency(p.retail_price)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--secondary)', fontWeight: 600 }}>{formatCurrency(p.wholesale_price)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {/* Adjust stock button */}
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => handleOpenMovementModal(p)}
                          title="Movimentar Estoque (Entradas / Saídas / Ajustes)"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                        >
                          <i className="fa-solid fa-right-left"></i> Movimentar
                        </button>
                        
                        {/* Edit button */}
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => handleOpenEditModal(p)}
                          title="Editar Detalhes"
                          style={{ padding: '6px 8px', fontSize: '12px' }}
                        >
                          <i className="fa-solid fa-pencil"></i>
                        </button>
                        
                        {/* Delete button */}
                        <button 
                          className="btn" 
                          onClick={() => handleDeleteClick(p)}
                          title="Excluir Produto"
                          style={{ 
                            padding: '6px 8px', 
                            fontSize: '12px', 
                            background: 'var(--danger-bg)', 
                            color: 'var(--danger)', 
                            border: '1px solid rgba(239, 68, 68, 0.2)' 
                          }}
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: PRODUCT REGISTER & EDIT */}
      {isProductModalOpen && (
        <div className="modal active">
          <div className="modal-content" style={{ maxWidth: '650px', width: '90%' }}>
            <div className="modal-header">
              <h3>{editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}</h3>
              <button className="modal-close-btn" onClick={() => setIsProductModalOpen(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleProductSubmit}>
              {errorMsg && (
                <div className="alert-banner" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', marginBottom: '15px', display: 'flex' }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '8px' }}></i>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label className="form-label">Nome do Produto *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Body Splash Pure Seduction"
                  />
                </div>
                
                <div>
                  <label className="form-label">Código de Barras</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="Ex: 7890123456789"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                <div>
                  <label className="form-label">Categoria *</label>
                  <select 
                    className="form-control" 
                    value={formCategory} 
                    onChange={(e) => setFormCategory(e.target.value as any)}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="form-label">Quantidade em Estoque</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="0"
                    disabled={!!editingProduct} // Disable direct edit if editing (force movements log)
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                  />
                  {editingProduct && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Use a aba "Movimentar" no painel principal para alterar o estoque.</span>}
                </div>

                <div>
                  <label className="form-label">Estoque Mínimo *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="0"
                    required
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                <div>
                  <label className="form-label">Custo de Compra (R$) *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    step="0.01" 
                    min="0"
                    required
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(Number(e.target.value))}
                  />
                </div>
                
                <div>
                  <label className="form-label">Preço Varejo (R$) *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    step="0.01" 
                    min="0"
                    required
                    value={formRetailPrice}
                    onChange={(e) => setFormRetailPrice(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="form-label">Preço Atacado (R$) *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    step="0.01" 
                    min="0"
                    required
                    value={formWholesalePrice}
                    onChange={(e) => setFormWholesalePrice(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label className="form-label">Descrição Opcional</label>
                <textarea 
                  className="form-control" 
                  style={{ height: '70px', resize: 'vertical' }}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detalhes adicionais sobre o produto..."
                ></textarea>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Foto do Produto (Imagem)</label>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Escolher Imagem
                  </button>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {selectedFile ? selectedFile.name : editingProduct?.photo_url ? 'Mantendo imagem atual' : 'Sem foto selecionada (será usado placeholder)'}
                  </span>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsProductModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: STOCK MOVEMENT ACTIONS (ENTRADA / SAÍDA / AJUSTE) */}
      {isMovementModalOpen && movementProduct && (
        <div className="modal active">
          <div className="modal-content" style={{ maxWidth: '480px', width: '90%' }}>
            <div className="modal-header">
              <h3>Movimentar Estoque</h3>
              <button className="modal-close-btn" onClick={() => setIsMovementModalOpen(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleMovementSubmit}>
              {errorMsg && (
                <div className="alert-banner" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', marginBottom: '15px', display: 'flex' }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '8px' }}></i>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={{ marginBottom: '15px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Produto selecionado:</span>
                <span style={{ fontWeight: 600, fontSize: '15px', display: 'block', margin: '2px 0 6px 0' }}>{movementProduct.name}</span>
                <span style={{ fontSize: '12px', display: 'block' }}>
                  Estoque Atual: <strong style={{ color: 'var(--primary)' }}>{movementProduct.stock} unidades</strong>
                </span>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label className="form-label">Tipo de Movimentação *</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    className={`btn ${movementType === 'Entrada' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setMovementType('Entrada')}
                  >
                    <i className="fa-solid fa-plus-circle"></i> Entrada
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${movementType === 'Saída manual' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setMovementType('Saída manual')}
                  >
                    <i className="fa-solid fa-minus-circle"></i> Saída
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${movementType === 'Ajuste' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setMovementType('Ajuste')}
                  >
                    <i className="fa-solid fa-arrows-spin"></i> Ajuste
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label className="form-label">
                  {movementType === 'Entrada' && 'Quantidade a Adicionar *'}
                  {movementType === 'Saída manual' && 'Quantidade a Retirar *'}
                  {movementType === 'Ajuste' && 'Novo Saldo do Estoque (Quantidade Final) *'}
                </label>
                <input 
                  type="number" 
                  className="form-control" 
                  min="0"
                  required
                  value={movementQty === 0 ? '' : movementQty}
                  onChange={(e) => setMovementQty(Number(e.target.value))}
                  placeholder={movementType === 'Ajuste' ? 'Defina a quantidade exata' : 'Informe o número de itens'}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Observação / Motivo</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={movementObs}
                  onChange={(e) => setMovementObs(e.target.value)}
                  placeholder="Ex: Chegaram 10 perfumes no lote novo"
                />
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsMovementModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Salvando...' : 'Confirmar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
