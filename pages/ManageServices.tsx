import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase.ts';
import { User, Service } from '../types.ts';
import BarberSidebar from '../components/BarberSidebar.tsx';
import BarberNavigation from '../components/BarberNavigation.tsx';

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
      setServices(data || []);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService?.name || !editingService?.price || !editingService?.duration) return;

    try {
      const serviceData = {
        ...editingService,
        barber_id: user.id,
        price: parseFloat(editingService.price.toString()),
        duration: parseInt(editingService.duration.toString())
      };

      const { error } = await supabase
        .from('services')
        .upsert(serviceData);

      if (error) throw error;

      setIsModalOpen(false);
      setEditingService(null);
      fetchServices();
    } catch (err) {
      console.error('Error saving service:', err);
      alert('Erro ao salvar serviço');
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

  if (loading) return <div className="min-h-screen bg-background-dark flex items-center justify-center"><div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full"></div></div>;

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased min-h-screen">
      <BarberSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        onLogout={onLogout}
      />
      <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto overflow-hidden bg-background-light dark:bg-background-dark shadow-2xl pb-24">
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-surface-dark transition-colors relative text-slate-900 dark:text-white">
              <span className="material-symbols-outlined">menu</span>
              <div className="absolute top-1 left-1 size-2 bg-primary rounded-full animate-pulse"></div>
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-none">Meus Serviços</h2>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between">
            <h3 className="text-primary font-black text-xs uppercase tracking-[0.2em]">Serviços Ativos</h3>
            <button
              onClick={() => { setEditingService({ name: '', price: 0, duration: 30 }); setIsModalOpen(true); }}
              className="bg-primary text-background-dark text-[10px] font-black uppercase px-4 py-2 rounded-xl shadow-gold active:scale-95 transition-all"
            >
              + Novo Serviço
            </button>
          </div>

          <div className="space-y-4">
            {services.map(service => (
              <div key={service.id} className="bg-white dark:bg-surface-dark rounded-3xl p-5 border border-gray-100 dark:border-white/5 shadow-soft flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white">{service.name}</h4>
                  <p className="text-primary font-bold text-xs">R$ {parseFloat(service.price.toString()).toFixed(2).replace('.', ',')} • {service.duration} min</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingService(service); setIsModalOpen(true); }} className="p-2 text-gray-400 hover:text-primary transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
                  <button onClick={() => handleDelete(service.id!)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-lg">delete</span></button>
                </div>
              </div>
            ))}
          </div>
        </main>

        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm">
            <div className="bg-surface-dark w-full max-w-sm rounded-[2.5rem] border border-white/5 p-8 shadow-2xl">
              <h2 className="text-white font-black text-xl mb-6 uppercase tracking-tight">{editingService?.id ? 'Editar Serviço' : 'Novo Serviço'}</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-1.5 block">Nome do Serviço</label>
                  <input type="text" value={editingService?.name} onChange={e => setEditingService({ ...editingService, name: e.target.value })} className="w-full bg-background-dark border border-white/10 rounded-2xl px-4 py-3 text-white font-bold" placeholder="Ex: Corte Degradê" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-1.5 block">Preço (R$)</label>
                    <input type="number" step="0.01" value={editingService?.price} onChange={e => setEditingService({ ...editingService, price: e.target.value })} className="w-full bg-background-dark border border-white/10 rounded-2xl px-4 py-3 text-white font-bold" placeholder="0,00" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-1.5 block">Tempo (min)</label>
                    <input type="number" value={editingService?.duration} onChange={e => setEditingService({ ...editingService, duration: e.target.value })} className="w-full bg-background-dark border border-white/10 rounded-2xl px-4 py-3 text-white font-bold" placeholder="30" required />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-black text-xs uppercase tracking-widest text-white/40">Cancelar</button>
                  <button type="submit" className="flex-[2] bg-primary text-background-dark font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-gold">Salvar Serviço</button>
                </div>
              </form>
            </div>
          </div>
        )}
        <BarberNavigation />
      </div>
    </div>
  );
};

export default ManageServices;
