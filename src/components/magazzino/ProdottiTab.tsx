import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, AlertTriangle, Clock, Package, Eye, EyeOff, Settings, Filter, X, TrendingUp, Check, Euro, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useConfirm } from '../../hooks/useConfirm';
import { magazzinoService } from '../../services/magazzino';
import { Prodotto, CategoriaProdotto, AlertProdotto } from '../../types/magazzino';
import { ProdottoModal } from './ProdottoModal';
import { CategorieModal } from './CategorieModal';

interface ProdottiTabProps { onRefresh: () => void; alerts: AlertProdotto[]; }
interface ToastState { message: string; type: 'success' | 'error'; }

export function ProdottiTab({ onRefresh, alerts: _alerts }: ProdottiTabProps) {
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [categorie, setCategorie] = useState<CategoriaProdotto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [showInattivi, setShowInattivi] = useState(false);
  const [filterSottoScorta, setFilterSottoScorta] = useState(false);
  const [filterInScadenza, setFilterInScadenza] = useState(false);
  const [showCategorieFilter, setShowCategorieFilter] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategorieModalOpen, setIsCategorieModalOpen] = useState(false);
  const [editingProdotto, setEditingProdotto] = useState<Prodotto | null>(null);
  const [quickCaricoId, setQuickCaricoId] = useState<string | null>(null);
  const [quickCaricoQuantita, setQuickCaricoQuantita] = useState('');
  const [quickCaricoLoading, setQuickCaricoLoading] = useState(false);
  const { confirm: showConfirm, confirmState, handleCancel } = useConfirm();

  const loadData = async (params?: { search?: string; cat?: string; inattivi?: boolean; sottoScorta?: boolean; inScadenza?: boolean }) => {
    try {
      setLoading(true);
      const [p, c] = await Promise.all([
        magazzinoService.getProdotti({
          search: (params?.search ?? searchTerm) || undefined,
          categoriaId: (params?.cat ?? selectedCategoria) || undefined,
          attivoOnly: !(params?.inattivi ?? showInattivi),
          soloSottoScorta: params?.sottoScorta ?? filterSottoScorta,
          soloInScadenza: params?.inScadenza ?? filterInScadenza,
        }),
        magazzinoService.getCategorie(),
      ]);
      setProdotti(p); setCategorie(c);
    } catch { setToast({ message: 'Errore nel caricamento dei prodotti', type: 'error' }); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadData({ search: searchTerm, cat: selectedCategoria, inattivi: showInattivi, sottoScorta: filterSottoScorta, inScadenza: filterInScadenza });
  }, [searchTerm, selectedCategoria, showInattivi, filterSottoScorta, filterInScadenza]);

  const handleOpenModal = (prodotto?: Prodotto) => { setEditingProdotto(prodotto || null); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingProdotto(null); };
  const handleSave = async () => { handleCloseModal(); await loadData(); onRefresh(); setToast({ message: editingProdotto ? 'Prodotto aggiornato' : 'Prodotto creato', type: 'success' }); };

  const handleToggleAttivo = async (prodotto: Prodotto) => {
    try {
      if (prodotto.attivo) { await magazzinoService.deactivateProdotto(prodotto.id); setToast({ message: 'Prodotto disattivato', type: 'success' }); }
      else { await magazzinoService.reactivateProdotto(prodotto.id); setToast({ message: 'Prodotto riattivato', type: 'success' }); }
      await loadData(); onRefresh();
    } catch { setToast({ message: 'Errore durante l\'operazione', type: 'error' }); }
  };

  const handleDelete = async (prodotto: Prodotto) => {
    if (!await showConfirm({ title: 'Elimina Prodotto', message: `Sei sicuro di voler eliminare "${prodotto.nome}"? Questa azione non può essere annullata.`, confirmText: 'Elimina', variant: 'danger' })) return;
    try { await magazzinoService.deleteProdotto(prodotto.id); setToast({ message: 'Prodotto eliminato', type: 'success' }); await loadData(); onRefresh(); }
    catch (error: any) { setToast({ message: error.message || 'Errore durante l\'eliminazione', type: 'error' }); }
  };

  const formatPrice = (p: number | null) => p === null ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(p);
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('it-IT') : '—';

  const handleQuickCarico = async (prodottoId: string) => {
    const q = parseInt(quickCaricoQuantita);
    if (!q || q <= 0) { setToast({ message: 'Inserisci una quantità valida', type: 'error' }); return; }
    setQuickCaricoLoading(true);
    try { await magazzinoService.registraCarico({ prodotto_id: prodottoId, quantita: q, note: 'Carico rapido' }); setToast({ message: `Caricato +${q} unità`, type: 'success' }); setQuickCaricoId(null); setQuickCaricoQuantita(''); await loadData(); onRefresh(); }
    catch { setToast({ message: 'Errore durante il carico', type: 'error' }); }
    finally { setQuickCaricoLoading(false); }
  };

  // Stats
  const sottoScorta = prodotti.filter(p => p.scorta_minima > 0 && p.giacenza <= p.scorta_minima).length;
  const inScadenza = prodotti.filter(p => p.data_scadenza && new Date(p.data_scadenza) > new Date() && new Date(p.data_scadenza) <= new Date(Date.now() + 30 * 86400000)).length;
  const valoreInventario = prodotti.reduce((a, p) => a + (p.prezzo_vendita || 0) * p.giacenza, 0);

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in-up">
        {[
          { icon: <Package size={18} style={{ color: '#6366f1' }} />, value: prodotti.length, label: 'Totale prodotti', accent: 'rgba(99, 102, 241, 0.1)' },
          { icon: <ShieldAlert size={18} style={{ color: '#ef4444' }} />, value: sottoScorta, label: 'Sotto scorta', accent: 'rgba(239, 68, 68, 0.1)' },
          { icon: <Clock size={18} style={{ color: '#f59e0b' }} />, value: inScadenza, label: 'In scadenza (30gg)', accent: 'rgba(245, 158, 11, 0.1)' },
          { icon: <Euro size={18} style={{ color: '#10b981' }} />, value: `\u20AC ${valoreInventario.toFixed(0)}`, label: 'Valore inventario', accent: 'rgba(16, 185, 129, 0.1)' },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.accent }}>{s.icon}</div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>{s.value}</p>
              <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--color-text-muted)' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--color-text-muted)' }} />
          <input type="text" placeholder="Cerca per nome, codice, barcode, marca..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm" style={{ background: 'var(--input-bg, var(--glass-border))', border: '1px solid var(--glass-border)', color: 'var(--color-text-primary)' }} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter pills */}
          <button onClick={() => setFilterSottoScorta(!filterSottoScorta)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ background: filterSottoScorta ? '#ef4444' : 'var(--glass-border)', color: filterSottoScorta ? 'white' : 'var(--color-text-secondary)' }}>
            <AlertTriangle size={13} />Sotto scorta
          </button>
          <button onClick={() => setFilterInScadenza(!filterInScadenza)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ background: filterInScadenza ? '#f59e0b' : 'var(--glass-border)', color: filterInScadenza ? 'white' : 'var(--color-text-secondary)' }}>
            <Clock size={13} />In scadenza
          </button>
          <button onClick={() => setShowInattivi(!showInattivi)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ background: showInattivi ? 'var(--color-primary)' : 'var(--glass-border)', color: showInattivi ? 'white' : 'var(--color-text-secondary)' }}>
            {showInattivi ? <Eye size={13} /> : <EyeOff size={13} />}{showInattivi ? 'Tutti' : 'Solo attivi'}
          </button>

          {/* Categorie dropdown */}
          <div className="relative">
            <button onClick={() => setShowCategorieFilter(!showCategorieFilter)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ background: selectedCategoria ? 'var(--color-primary)' : 'var(--glass-border)', color: selectedCategoria ? 'white' : 'var(--color-text-secondary)' }}>
              <Filter size={13} />Categorie
              {selectedCategoria && <span className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'rgba(255,255,255,0.25)' }}>1</span>}
            </button>
            {showCategorieFilter && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl shadow-xl z-50 overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
                <div className="px-3 py-2.5 flex justify-between items-center" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <span className="font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Filtra per Categoria</span>
                  <button onClick={() => setShowCategorieFilter(false)} className="p-1 rounded transition-colors" style={{ color: 'var(--color-text-muted)' }}><X size={14} /></button>
                </div>
                <div className="p-2 max-h-64 overflow-y-auto">
                  <button onClick={() => { setSelectedCategoria(''); setShowCategorieFilter(false); }}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors"
                    style={{ background: !selectedCategoria ? 'rgba(var(--color-primary-rgb, 99, 102, 241), 0.08)' : 'transparent', color: 'var(--color-text-primary)', fontWeight: !selectedCategoria ? 600 : 400 }}>
                    Tutte le categorie
                  </button>
                  <div className="my-1" style={{ borderTop: '1px solid var(--glass-border)' }} />
                  {categorie.map(cat => {
                    const sel = selectedCategoria === cat.id;
                    return (
                      <button key={cat.id} onClick={() => { setSelectedCategoria(sel ? '' : cat.id); setShowCategorieFilter(false); }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm"
                        style={{ background: sel ? 'rgba(var(--color-primary-rgb, 99, 102, 241), 0.08)' : 'transparent', color: 'var(--color-text-primary)', fontWeight: sel ? 600 : 400 }}>
                        <span>{cat.nome}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="p-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
                  <button onClick={() => { setShowCategorieFilter(false); setIsCategorieModalOpen(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                    <Settings size={14} />Gestisci Categorie
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-6" style={{ background: 'var(--glass-border)' }} />
          <Button variant="primary" size="sm" onClick={() => handleOpenModal()}><Plus size={14} className="mr-1" />Nuovo</Button>
        </div>
      </div>

      {/* TABLE */}
      <div className="rounded-2xl overflow-hidden animate-fade-in-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', animationDelay: '100ms' }}>
        {loading && prodotti.length === 0 ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-4 items-center">
                <div className="h-4 w-16 rounded shimmer" /><div className="flex-1 space-y-2"><div className="h-4 w-36 rounded shimmer" /><div className="h-3 w-24 rounded shimmer" /></div>
                <div className="h-4 w-20 rounded shimmer" /><div className="h-4 w-16 rounded shimmer" /><div className="h-4 w-16 rounded shimmer" />
              </div>
            ))}
          </div>
        ) : prodotti.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(99, 102, 241, 0.08)' }}>
              <Package size={28} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Nessun prodotto trovato</p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
              {searchTerm || selectedCategoria || filterSottoScorta || filterInScadenza ? 'Prova a modificare i filtri' : 'Crea il primo prodotto'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                  {['Codice', 'Prodotto', 'Categoria', 'Giacenza', 'Scorta Min', 'Prezzo Vend.', 'Scadenza', ''].map(col => (
                    <th key={col} className={`px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider ${['Giacenza', 'Scorta Min', 'Prezzo Vend.'].includes(col) ? 'text-right' : 'text-left'}`}
                      style={{ color: 'var(--color-text-muted)' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prodotti.map(prodotto => {
                  const isScorta = prodotto.scorta_minima > 0 && prodotto.giacenza <= prodotto.scorta_minima;
                  const isScadenza = prodotto.data_scadenza && new Date(prodotto.data_scadenza) <= new Date(Date.now() + 30 * 86400000);
                  const isScaduto = prodotto.data_scadenza && new Date(prodotto.data_scadenza) < new Date();
                  return (
                    <tr key={prodotto.id} className="group transition-colors cursor-pointer"
                      style={{ borderBottom: '1px solid var(--glass-border)', opacity: prodotto.attivo ? 1 : 0.5 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-border)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => handleOpenModal(prodotto)}
                    >
                      <td className="px-4 py-3"><span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>{prodotto.codice}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {(isScorta || isScadenza) && <AlertTriangle size={14} className="shrink-0" style={{ color: isScaduto ? '#ef4444' : '#f59e0b' }} />}
                          <div className="min-w-0">
                            <p className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{prodotto.nome}</p>
                            {(prodotto.marca || prodotto.linea) && <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{[prodotto.marca, prodotto.linea].filter(Boolean).join(' — ')}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {prodotto.categoria_nome ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>{prodotto.categoria_nome}</span>
                        ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold" style={{ color: isScorta ? '#ef4444' : 'var(--color-text-primary)' }}>{prodotto.giacenza} <span className="font-normal text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{prodotto.unita_misura}</span></span>
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: 'var(--color-text-muted)' }}>{prodotto.scorta_minima} {prodotto.unita_misura}</td>
                      <td className="px-4 py-3 text-right" style={{ color: 'var(--color-text-secondary)' }}>{formatPrice(prodotto.prezzo_vendita)}</td>
                      <td className="px-4 py-3">
                        <span style={{ color: isScaduto ? '#ef4444' : isScadenza ? '#f59e0b' : 'var(--color-text-muted)', fontWeight: isScaduto ? 600 : 400 }}>{formatDate(prodotto.data_scadenza)}</span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          {quickCaricoId === prodotto.id ? (
                            <div className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                              <input type="number" min="1" value={quickCaricoQuantita} onChange={e => setQuickCaricoQuantita(e.target.value)} placeholder="Qtà"
                                className="w-14 px-1.5 py-0.5 text-sm rounded text-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--color-text-primary)' }}
                                autoFocus disabled={quickCaricoLoading}
                                onKeyDown={e => { if (e.key === 'Enter') handleQuickCarico(prodotto.id); else if (e.key === 'Escape') { setQuickCaricoId(null); setQuickCaricoQuantita(''); } }} />
                              <button onClick={() => handleQuickCarico(prodotto.id)} disabled={quickCaricoLoading || !quickCaricoQuantita} className="p-1 rounded transition-colors" style={{ color: '#10b981' }} title="Conferma">
                                {quickCaricoLoading ? <div className="w-3.5 h-3.5 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" /> : <Check size={14} />}
                              </button>
                              <button onClick={() => { setQuickCaricoId(null); setQuickCaricoQuantita(''); }} disabled={quickCaricoLoading} className="p-1 rounded transition-colors" style={{ color: 'var(--color-text-muted)' }} title="Annulla"><X size={14} /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setQuickCaricoId(prodotto.id); setQuickCaricoQuantita(''); }} className="p-1.5 rounded-lg transition-colors hover:bg-black/5" style={{ color: '#10b981' }} title="Ricarica rapida"><TrendingUp size={15} /></button>
                              <button onClick={() => handleOpenModal(prodotto)} className="p-1.5 rounded-lg transition-colors hover:bg-black/5" style={{ color: 'var(--color-text-muted)' }} title="Modifica"><Edit2 size={15} /></button>
                              <button onClick={() => handleToggleAttivo(prodotto)} className="p-1.5 rounded-lg transition-colors hover:bg-black/5" style={{ color: 'var(--color-text-muted)' }} title={prodotto.attivo ? 'Disattiva' : 'Riattiva'}>
                                {prodotto.attivo ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                              <button onClick={() => handleDelete(prodotto)} className="p-1.5 rounded-lg transition-colors hover:bg-black/5" style={{ color: '#ef4444' }} title="Elimina"><Trash2 size={15} /></button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {prodotti.length > 0 && (
          <div className="px-4 py-2.5 flex items-center justify-between text-[11px] font-medium" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--glass-border)' }}>
            <span>{prodotti.length} prodott{prodotti.length === 1 ? 'o' : 'i'} — {prodotti.reduce((a, p) => a + p.giacenza, 0)} pezzi totali</span>
            <span>Valore: {'\u20AC'} {valoreInventario.toFixed(2)}</span>
          </div>
        )}
      </div>

      <ProdottoModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSave} prodotto={editingProdotto} categorie={categorie} />
      <CategorieModal isOpen={isCategorieModalOpen} onClose={() => setIsCategorieModalOpen(false)} onSave={loadData} />
      <ConfirmDialog isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} confirmText={confirmState.confirmText} variant={confirmState.variant} onConfirm={confirmState.onConfirm} onCancel={handleCancel} />
    </div>
  );
}
