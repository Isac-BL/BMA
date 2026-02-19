import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase.ts';
import { User, Service } from '../types.ts';
import BarberSidebar from '../components/BarberSidebar.tsx';

interface ManageServicesProps {
  user: User;
  onLogout: () => void;
}

const ManageServices: React.FC<ManageServicesProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);

  useEffect(() => {
    fetchServices();
  }, [user.id]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('barber_id', user.id)
        .order('name');

      if (error) throw error;
      const mappedServices = (data || []).map(s => ({
        ...s,
        price: s.price ? parseFloat(s.price.toString()) : 0,
        name: s.name || 'Serviço sem nome'
      }));
      setServices(mappedServices);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService?.name) return;

    try {
      const price = parseFloat(editingService.price?.toString() || '0');
      const duration = parseInt(editingService.duration?.toString() || '30');

      const { error } = editingService.id
        ? await supabase
          .from('services')
          .update({ name: editingService.name, price, duration })
          .eq('id', editingService.id)
        : await supabase
          .from('services')
          .insert({ name: editingService.name, price, duration, barber_id: user.id });

      if (error) throw error;

      setIsModalOpen(false);
      setEditingService(null);
      fetchServices();
    } catch (err: any) {
      console.error('Error saving service:', err);
      alert(`Erro ao salvar serviço: ${err.message || 'Erro desconhecido'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchServices();
    } catch (err) {
      console.error('Error deleting service:', err);
    }
  };

  const getServiceIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('corte')) return 'content_cut';
    if (lowerName.includes('barba')) return 'face';
    if (lowerName.includes('sobrancelha')) return 'visibility';
    if (lowerName.includes('combo')) return 'diamond';
    return 'content_cut';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-white overflow-hidden h-screen flex flex-col">
      <BarberSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        onLogout={onLogout}
      />

      {/* Top App Bar */}
      <header className="shrink-0 z-20 bg-background-dark/95 backdrop-blur-md border-b border-[#2d2a22] sticky top-0">
        <div className="flex items-center px-4 py-3 justify-between max-w-md mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="text-white flex size-10 items-center justify-center rounded-full hover:bg-white/5 transition-colors group"
          >
            <span className="material-symbols-outlined text-2xl text-white group-hover:text-primary transition-colors">arrow_back</span>
          </button>
          <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
            Gerenciar Serviços
          </h2>
        </div>
      </header>

      {/* Main Content: Service List */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative w-full max-w-md mx-auto px-4 py-6 pb-32 space-y-4">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Catálogo de Serviços</h1>
          <p className="text-[#b7b19e] text-sm">Gerencie os preços e durações dos seus atendimentos.</p>
        </div>

        {/* Service Items */}
        {services.length === 0 ? (
          <div className="py-20 text-center opacity-40">
            <span className="material-symbols-outlined text-4xl mb-2">content_cut</span>
            <p className="text-xs font-bold uppercase tracking-widest">Nenhum serviço cadastrado</p>
          </div>
        ) : (
          services.map(service => {
            const icon = getServiceIcon(service.name || '');
            const isCombo = (service.name || '').toLowerCase().includes('combo');

            return (
              <div
                key={service.id}
                className={`group relative flex flex-col sm:flex-row gap-4 p-4 rounded-xl border transition-all duration-300 ${isCombo
                  ? 'bg-gradient-to-br from-surface-dark to-[#2A271E] border-primary/20 shadow-soft hover:border-primary/40'
                  : 'bg-surface-dark border-[#2d2a22] shadow-soft hover:border-primary/30 hover:shadow-glow'
                  }`}
              >
                {isCombo && (
                  <div className="absolute top-3 right-3 sm:hidden">
                    <span className="material-symbols-outlined text-primary text-opacity-40">diamond</span>
                  </div>
                )}

                <div className="flex items-start gap-4 flex-1">
                  <div className={`flex items-center justify-center rounded-xl shrink-0 size-14 border ${isCombo
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-[#2d2a22] text-primary border-white/5'
                    }`}>
                    <span className="material-symbols-outlined text-[28px]">{icon}</span>
                  </div>

                  <div className="flex flex-1 flex-col justify-center gap-1">
                    <div className="flex justify-between items-start">
                      <p className="text-white text-lg font-bold leading-tight">{service.name}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 text-[#b7b19e]">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        {service.duration} min
                      </span>
                      <span className="h-1 w-1 rounded-full bg-[#b7b19e]/40"></span>
                      <span className="text-primary font-bold text-base">
                        R$ {(service.price || 0).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 border-t border-white/5 sm:border-t-0 sm:border-l sm:pl-4 pt-3 sm:pt-0 justify-end sm:justify-center">
                  <button
                    onClick={() => { setEditingService(service); setIsModalOpen(true); }}
                    aria-label="Editar"
                    className={`flex items-center justify-center size-10 rounded-lg transition-colors ${isCombo
                      ? 'bg-primary/10 hover:bg-primary/20 text-primary'
                      : 'bg-white/5 hover:bg-primary/20 text-[#b7b19e] hover:text-primary'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(service.id!)}
                    aria-label="Remover"
                    className="flex items-center justify-center size-10 rounded-lg bg-white/5 hover:bg-red-500/20 text-[#b7b19e] hover:text-red-400 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Floating Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-dark via-background-dark/95 to-transparent pt-12 z-10 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <button
            onClick={() => { setEditingService({ name: '', price: 0, duration: 30 }); setIsModalOpen(true); }}
            className="w-full cursor-pointer flex items-center justify-center rounded-xl h-14 px-6 bg-primary hover:bg-[#cda224] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(225,180,45,0.3)] text-[#171611] gap-3 text-base font-bold tracking-[0.015em]"
          >
            <span className="material-symbols-outlined text-[24px]">add</span>
            <span className="truncate">Adicionar Serviço</span>
          </button>
        </div>
      </div>

      {/* Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-background-dark/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface-dark w-full max-w-sm rounded-[2.5rem] border border-white/5 p-8 shadow-2xl animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white font-black text-xl uppercase tracking-tight">
                {editingService?.id ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="size-10 bg-white/5 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-1.5 block ml-1">Nome do Serviço</label>
                <input
                  type="text"
                  value={editingService?.name}
                  onChange={e => setEditingService({ ...editingService, name: e.target.value })}
                  className="w-full bg-background-dark border border-white/10 rounded-2xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="Ex: Corte Degradê"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-1.5 block ml-1">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingService?.price}
                    onChange={e => setEditingService({ ...editingService, price: e.target.value })}
                    className="w-full bg-background-dark border border-white/10 rounded-2xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0,00"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-1.5 block ml-1">Tempo (min)</label>
                  <input
                    type="number"
                    value={editingService?.duration}
                    onChange={e => setEditingService({ ...editingService, duration: e.target.value })}
                    className="w-full bg-background-dark border border-white/10 rounded-2xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="30"
                    required
                  />
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-primary text-background-dark font-black text-sm uppercase tracking-widest py-4 rounded-2xl shadow-gold hover:bg-[#cda224] active:scale-95 transition-all"
                >
                  {editingService?.id ? 'Salvar Alterações' : 'Criar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageServices;
