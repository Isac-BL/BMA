import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Service } from '../types.ts';
import { supabase } from '../supabase.ts';

interface ServiceSelectionProps {
  bookingState: any;
  setBookingState: (state: any) => void;
}

const ServiceSelection: React.FC<ServiceSelectionProps> = ({ bookingState, setBookingState }) => {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');

      if (error) throw error;

      // Map DB numeric price to number
      const mappedServices = data.map((s: any) => ({
        ...s,
        price: parseFloat(s.price),
        icon: s.name.toLowerCase().includes('barba') ? 'content_cut' : 'face' // Simple heuristic for icons
      }));
      setServices(mappedServices);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = selectedCategory === 'Todos'
    ? services
    : services.filter(s => s.name.toLowerCase().includes(selectedCategory.toLowerCase()));

  const handleSelect = (service: Service) => {
    setBookingState({ ...bookingState, service });
  };

  const handleContinue = () => {
    if (bookingState.service) {
      navigate('/client/book/schedule');
    }
  };

  if (loading) {
    return (
      <div className="bg-background-dark min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col pb-24 max-w-md mx-auto bg-background-dark">
      <div className="sticky top-0 z-20 flex items-center bg-background-dark/95 backdrop-blur-md p-4 pb-2 justify-between border-b border-white/5">
        <div
          onClick={() => navigate('/client')}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full active:bg-white/10 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </div>
        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Nossos Serviços</h2>
        <div className="text-white flex size-12 shrink-0 items-center justify-center rounded-full active:bg-white/10 transition-colors cursor-pointer">
          <span className="material-symbols-outlined text-2xl">account_circle</span>
        </div>
      </div>

      <div className="px-5 pt-6 pb-2">
        <h1 className="text-white tracking-tight text-3xl font-extrabold leading-tight">Escolha o seu <br /><span className="text-primary">estilo premium</span></h1>
      </div>

      <div className="flex gap-3 px-5 py-4 overflow-x-auto no-scrollbar w-full">
        {['Todos', 'Cabelo', 'Barba'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 transition-transform active:scale-95 ${selectedCategory === cat ? 'bg-primary shadow-glow' : 'bg-surface-highlight border border-white/5'}`}
          >
            <span className={`${selectedCategory === cat ? 'text-background-dark font-bold' : 'text-white/80 font-medium'} text-sm leading-normal`}>
              {cat}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 px-4 mt-2">
        {filteredServices.length > 0 ? filteredServices.map(service => {
          const isSelected = bookingState.service?.id === service.id;
          return (
            <div
              key={service.id}
              onClick={() => handleSelect(service)}
              className={`group relative flex flex-col gap-3 rounded-2xl bg-surface-dark p-4 shadow-soft border transition-all duration-200 cursor-pointer ${isSelected ? 'border-primary ring-1 ring-primary/20 shadow-glow' : 'border-white/5 active:border-primary/50'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-colors ${isSelected ? 'bg-primary text-background-dark' : 'bg-background-dark text-primary border border-white/5'}`}>
                    <span className="material-symbols-outlined text-[28px]">{(service as any).icon || 'content_cut'}</span>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-white text-lg font-bold leading-snug">{service.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="material-symbols-outlined text-base text-gray-400">schedule</span>
                      <p className="text-gray-400 text-sm font-medium">{service.duration} min</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1 pt-3 border-t border-white/5">
                <p className={`${isSelected ? 'text-white' : 'text-primary'} font-bold text-lg`}>
                  R$ {service.price.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-white/10 mb-4">content_cut</span>
            <p className="text-white/40">Nenhum serviço disponível no momento.</p>
          </div>
        )}
      </div>

      {bookingState.service && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface-dark/95 backdrop-blur-xl border-t border-white/10 p-5 pb-8 shadow-[0_-5px_30px_rgba(0,0,0,0.5)] max-w-md mx-auto">
          <button
            onClick={handleContinue}
            className="w-full h-14 bg-primary rounded-xl flex items-center justify-center gap-3 shadow-gold hover:bg-[#c9a026] active:scale-[0.98] transition-all"
          >
            <span className="text-background-dark font-bold text-lg">Continuar</span>
            <span className="material-symbols-outlined text-background-dark">arrow_forward</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ServiceSelection;
