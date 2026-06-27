import React, { useState, useMemo, useRef } from 'react';
import { Product, Category } from '../types';
import { DEFAULT_CATEGORY_IMAGES } from '../supabaseClient';

interface ProductsViewProps {
  products: Product[];
  onCreateProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>, file?: File) => Promise<void>;
  onUpdateProduct: (id: string, product: Partial<Product>, file?: File) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onAddStockMovement: (product_id: string, type: 'Entrada' | 'Saída manual' | 'Ajuste', quantity: number, obs: string) => Promise<void>;
  userEmail: string;
}

const CATEGORY_OPTIONS = [
  { id: 'dca569b3-1fb3-4244-a117-9d69cc2915a9', name: 'Perfumes' },
  { id: '3d325674-7447-4a8a-bd7d-e9cd1246c6dd', name: 'Hidratantes' },
  { id: 'b73330bf-29fd-46b8-aff2-5a298c8592dc', name: 'Body Splash' },
  { id: '2894918a-6a61-423c-af79-ae2e058e2dc9', name: 'Kits' },
  { id: '39263b3d-a23f-4599-a685-eab7c5d2fdc8', name: 'Outros' },
];

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddStockMovement,
  userEmail
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementProduct, setMovementProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<'Entrada' | 'Saída manual' | 'Ajuste'>('Entrada');
  const [movementQty, setMovementQty] = useState<number>(0);
  const [movementObs, setMovementObs] = useState('');

  const [formName, setFormName] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategoryId, setFormCategoryId] = useState<string>('cat-1');
  const [formStock, setFormStock] = useState<number>(0);
  const [formMinStock, setFormMinStock] = useState<number>(2);
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formRetailPrice, setFormRetailPrice] = useState<number>(0);
  const [formWholesalePrice, setFormWholesalePrice] = useState<number>(0);
  const [formDescription, setFormDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.includes(search)) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

      const matchCategory = selectedCategory === '' || p.category_id === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [products, search, selectedCategory]);

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormBarcode('');
    setFormCategoryId('dca569b3-1fb3-4244-a117-9d69cc2915a9');
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

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormBarcode(product.barcode || '');
    setFormCategoryId(product.category_id || 'dca569b3-1fb3-4244-a117-9d69cc2915a9');
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
        category_id: formCategoryId,
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
      setErrorMsg(err.message || 'Erro ao salvar produto.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMovementModal = (product: Product) => {
    setMovementProduct(product);
    setMovementType('Entrada');
    setMovementQty(0);
    setMovementObs('');
    setErrorMsg('');
    setIsMovementModalOpen(true);
  };

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementProduct) return;
    if (movementQty <= 0) {
      setErrorMsg('A quantidade deve ser maior que zero.');
      return;
    }

    if (movementType === 'Saída manual' && movementProduct.stock < movementQty) {
      setErrorMsg(`Estoque insuficiente. Disponível: ${movementProduct.stock} unidades.`);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const obs = movementObs || (
        movementType === 'Entrada' ? 'Entrada manual de mercadoria' :
        movementType === 'Ajuste' ? 'Ajuste manual de estoque' :
        'Saída manual de estoque'
      );
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
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between' }}>
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

          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            <button
              className={`filter-chip ${selectedCategory === '' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('')}
            >
              Todos
            </button>
            {CATEGORY_OPTIONS.map(cat => (
              <button
                key={cat.id}
                className={`filter-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <i className="fa-solid fa-plus" style={{ marginRight: '8px' }}></i> Novo Produto
          </button>
        </div>
      </div>

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
                        background: `url(${p.photo_url || DEFAULT_CATEGORY_IMAGES[p.category_name as keyof typeof DEFAULT_CATEGORY_IMAGES] || DEFAULT_CATEGORY_IMAGES.Outros}) center/cover`,
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
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{p.category_name}</span>
                    </td>
                    <td>{getStockBadge(p.stock, p.min_stock)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(p.cost_price)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--primary)', fontWeight: 600 }}>{formatCurrency(p.retail_price)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--secondary)', fontWeight: 600 }}>{formatCurrency(p.wholesale_price)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleOpenMovementModal(p)}
                          title="Movimentar Estoque"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                        >
                          <i className="fa-solid fa-right-left"></i> Movimentar
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleOpenEditModal(p)}
                          title="Editar Detalhes"
                          style={{ padding: '6px 8px', fontSize: '12px' }}
                        >
                          <i className="fa-solid fa-pencil"></i>
                        </button>
                        <button
                          className="btn"
                          onClick={() => handleDeleteClick(p)}
                          title="Excluir Produto"
                          style={{ padding: '6px 8px', fontSize: '12px', background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
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

      {/* MODAL: PRODUCT REGISTER & EDIT */}
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
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                  >
                    {CATEGORY_OPTIONS.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Quantidade em Estoque</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    disabled={!!editingProduct}
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                  />
                  {editingProduct && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Use "Movimentar" para alterar o estoque.</span>}
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
                  <input type="number" className="form-control" step="0.01" min="0" required value={formCostPrice} onChange={(e) => setFormCostPrice(Number(e.target.value))} />
                </div>
                <div>
                  <label className="form-label">Preço Varejo (R$) *</label>
                  <input type="number" className="form-control" step="0.01" min="0" required value={formRetailPrice} onChange={(e) => setFormRetailPrice(Number(e.target.value))} />
                </div>
                <div>
                  <label className="form-label">Preço Atacado (R$) *</label>
                  <input type="number" className="form-control" step="0.01" min="0" required value={formWholesalePrice} onChange={(e) => setFormWholesalePrice(Number(e.target.value))} />
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
                <label className="form-label">Foto do Produto</label>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }}
                  />
                  <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                    Escolher Imagem
                  </button>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {selectedFile ? selectedFile.name : editingProduct?.photo_url ? 'Mantendo imagem atual' : 'Sem foto (será usado placeholder)'}
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

      {/* MODAL: STOCK MOVEMENT */}
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
                  {(['Entrada', 'Saída manual', 'Ajuste'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`btn ${movementType === type ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1 }}
                      onClick={() => setMovementType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label className="form-label">
                  {movementType === 'Entrada' && 'Quantidade a Adicionar *'}
                  {movementType === 'Saída manual' && 'Quantidade a Retirar *'}
                  {movementType === 'Ajuste' && 'Novo Saldo Final *'}
                </label>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  required
                  value={movementQty === 0 ? '' : movementQty}
                  onChange={(e) => setMovementQty(Number(e.target.value))}
                  placeholder={movementType === 'Ajuste' ? 'Quantidade exata' : 'Número de itens'}
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
