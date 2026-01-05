import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Service, User } from '../types.ts';
import { formatCurrency } from '../utils.ts';
import { supabase } from '../supabase.ts';
import BarberNavigation from '../components/BarberNavigation.tsx';

interface ServiceSelectionProps {
  bookingState: any;
  setBookingState: (state: any) => void;
  user: User;
}

const ServiceSelection: React.FC<ServiceSelectionProps> = ({ bookingState, setBookingState, user }) => {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

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

      const mappedServices = data.map((s: any) => ({
        ...s,
        price: parseFloat(s.price),
        icon: getServiceIcon(s.name)
      }));
      setServices(mappedServices);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
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


  const handleSelect = (service: Service) => {
    const isAlreadySelected = bookingState.services.some((s: Service) => s.id === service.id);
    let newSelectedServices;

    if (isAlreadySelected) {
      newSelectedServices = bookingState.services.filter((s: Service) => s.id !== service.id);
    } else {
      newSelectedServices = [...bookingState.services, service];
    }

    setBookingState({ ...bookingState, services: newSelectedServices });
  };

  const handleContinue = () => {
    if (bookingState.services.length > 0) {
      navigate(user.role === 'BARBER' ? '/barber/book/schedule' : '/client/book/schedule');
    }
  };

  const totalSelected = bookingState.services.length;
  const totalPrice = bookingState.services.reduce((acc: number, s: Service) => acc + s.price, 0);
  const totalDuration = bookingState.services.reduce((acc: number, s: Service) => acc + s.duration, 0);

  if (loading) {
    return (
      <div className="bg-background-dark min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col pb-32 max-w-md mx-auto bg-background-dark">
      <div className="sticky top-0 z-20 flex items-center bg-background-dark/95 backdrop-blur-md p-4 pb-2 justify-between border-b border-white/5">
        <div
          onClick={() => navigate(user.role === 'BARBER' ? '/barber/schedule' : '/client')}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full active:bg-white/10 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </div>
        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Nossos Serviços</h2>
        <div className="w-12 h-12"></div>
      </div>

      <div className="px-5 pt-6 pb-2">
        <h1 className="text-white tracking-tight text-3xl font-extrabold leading-tight">Escolha o seu <br /><span className="text-primary">estilo premium</span></h1>
        <p className="text-white/40 text-sm mt-2">Você pode selecionar mais de um serviço.</p>
      </div>

      {user.role === 'BARBER' && (
        <div className="px-5 mt-4">
          <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2 block ml-1">Nome do Cliente</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-white/20 group-focus-within:text-primary transition-colors">person</span>
            </div>
            <input
              type="text"
              placeholder="Digite o nome do cliente..."
              value={bookingState.guestName || ''}
              onChange={(e) => setBookingState({ ...bookingState, guestName: e.target.value })}
              className="w-full h-14 bg-surface-dark border border-white/5 rounded-2xl pl-12 pr-4 text-white font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-white/10"
            />
          </div>
        </div>
      )}


      <div className="flex flex-col gap-4 px-4 mt-6">
        {services.length > 0 ? services.map(service => {
          const isSelected = bookingState.services.some((s: Service) => s.id === service.id);
          return (
            <div
              key={service.id}
              onClick={() => handleSelect(service)}
              className={`group relative flex flex-col gap-3 rounded-2xl bg-surface-dark p-4 shadow-soft border transition-all duration-300 cursor-pointer ${isSelected ? 'border-primary ring-1 ring-primary/20 shadow-glow' : 'border-white/5 active:border-primary/50'}`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                </div>
              )}

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${isSelected ? 'bg-primary text-background-dark scale-105' : 'bg-background-dark text-primary border border-white/5'}`}>
                    <span className="material-symbols-outlined text-[28px]">{service.icon || 'content_cut'}</span>
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
              <p className={`${isSelected ? 'text-white' : 'text-primary'} font-black text-lg`}>
                {formatCurrency(service.price)}
              </p>
            </div>
          );
        }) : (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-white/10 mb-4">content_cut</span>
            <p className="text-white/40">Nenhum serviço encontrado.</p>
          </div>
        )}
      </div>

      {totalSelected > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface-dark/95 backdrop-blur-xl border-t border-white/10 p-5 pb-8 shadow-[0_-5px_30px_rgba(0,0,0,0.5)] max-w-md mx-auto rounded-t-[2rem]">
          <div className="flex justify-between items-center mb-4 px-1">
            <div className="flex flex-col">
              <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Total selecionado</span>
              <span className="text-white font-bold">{totalSelected} {totalSelected === 1 ? 'serviço' : 'serviços'} • {totalDuration} min</span>
            </div>
            <div className="text-right">
              <span className="text-primary text-2xl font-black">{formatCurrency(totalPrice)}</span>
            </div>
          </div>
          <button
            onClick={handleContinue}
            className="w-full h-14 bg-primary rounded-xl flex items-center justify-center gap-3 shadow-gold hover:bg-[#c9a026] active:scale-[0.98] transition-all"
          >
            <span className="text-background-dark font-bold text-lg uppercase tracking-tight">Continuar para horário</span>
            <span className="material-symbols-outlined text-background-dark">arrow_forward</span>
          </button>
        </div>
      )}
      {user.role === 'BARBER' && <BarberNavigation />}
    </div>
  );
};

export default ServiceSelection;
