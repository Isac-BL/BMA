import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Appointment, User, Service } from '../types.ts';
import { formatCurrency } from '../utils.ts';
import { supabase } from '../supabase.ts';

interface ConfirmationProps {
  bookingState: {
    services: Service[];
    barber: User | null;
    date: string | null;
    time: string | null;
  };
  user: User;
}

const Confirmation: React.FC<ConfirmationProps> = ({ bookingState, user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPrice = bookingState.services.reduce((acc, s) => acc + s.price, 0);
  const totalDuration = bookingState.services.reduce((acc, s) => acc + s.duration, 0);

  const handleFinalize = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      if (bookingState.services.length === 0 || !bookingState.barber || !bookingState.date || !bookingState.time) {
        throw new Error('Dados de agendamento incompletos.');
      }

      // 0. Final availability check to prevent last-second conflicts
      const { data: conflicts } = await supabase
        .from('appointments')
        .select(`
          appointment_time, 
          appointment_services(service:service_id(duration))
        `)
        .eq('barber_id', bookingState.barber.id)
        .eq('appointment_date', bookingState.date)
        .not('status', 'ilike', 'cancelled%');

      const toMin = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };

      const slotStart = toMin(bookingState.time);
      const slotEnd = slotStart + totalDuration;

      const hasConflict = (conflicts || []).some(app => {
        const appStart = toMin(app.appointment_time);
        const appDur = (app.appointment_services as any[])?.reduce((sum, s) => sum + (s.service?.duration || 0), 0) || 30;
        const appEnd = appStart + appDur;
        return (slotStart < appEnd && slotEnd > appStart);
      });

      if (hasConflict) {
        throw new Error('Desculpe, este horário acabou de ser reservado por outra pessoa. Por favor, selecione outro horário.');
      }

      // 1. Create the main appointment
      // We still store the first service_id for backward compatibility if needed, 
      // but the real source of truth will be the join table.
      const { data: appointment, error: insertError } = await supabase
        .from('appointments')
        .insert([{
          client_id: user.id,
          barber_id: bookingState.barber.id,
          service_id: bookingState.services[0].id, // Primary service
          appointment_date: bookingState.date,
          appointment_time: bookingState.time,
          value: totalPrice,
          status: 'confirmed'
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Insert all selected services into the join table
      const serviceLinks = bookingState.services.map(service => ({
        appointment_id: appointment.id,
        service_id: service.id
      }));

      const { error: servicesError } = await supabase
        .from('appointment_services')
        .insert(serviceLinks);

      if (servicesError) throw servicesError;

      // 3. Notify the Barber
      const serviceNames = bookingState.services.map(s => s.name).join(' + ');
      const formattedDate = new Date(bookingState.date + 'T12:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });

      const { error: notifError } = await supabase
        .from('notifications')
        .insert([{
          user_id: bookingState.barber.id,
          appointment_id: appointment.id,
          type: 'confirmation',
          title: 'Novo Agendamento',
          content: `${user.name} agendou ${serviceNames} para ${formattedDate} às ${bookingState.time}.`,
          created_at: new Date().toISOString()
        }]);

      if (notifError) {
        console.error('Error sending notification to barber:', notifError);
      }

      navigate('/client');
    } catch (err: any) {
      console.error('Error finalizing appointment:', err);
      setError(err.message || 'Erro ao processar agendamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (bookingState.services.length === 0 || !bookingState.barber || !bookingState.date || !bookingState.time) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-background-dark h-screen text-white text-center">
        <span className="material-symbols-outlined text-6xl text-primary/20 mb-4">warning</span>
        <p className="text-white/60 mb-6">Ops! Algumas informações do agendamento estão faltando.</p>
        <button onClick={() => navigate('/client/book/services')} className="bg-primary text-background-dark font-bold px-6 py-2 rounded-lg">Voltar ao Início</button>
      </div>
    );
  }

  const formattedDate = new Date(bookingState.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden max-w-md mx-auto bg-background-dark">
      <header className="flex items-center justify-between px-4 py-4 sticky top-0 z-10 bg-background-dark/95 backdrop-blur-md border-b border-white/5">
        <button onClick={() => navigate('/client/book/schedule')} className="size-10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </button>
        <h1 className="text-white font-bold tracking-tight">Confirmação</h1>
        <div className="w-10"></div>
      </header>

      <main className="p-6 space-y-4 flex-1 overflow-y-auto no-scrollbar pb-40">
        <div className="bg-surface-dark p-6 rounded-3xl border border-white/5 shadow-soft">
          <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-4">Serviços Selecionados</p>
          <div className="space-y-4">
            {bookingState.services.map((service, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-2xl">content_cut</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white text-sm font-black truncate">{service.name}</h3>
                  <p className="text-text-muted text-[10px] font-bold uppercase">{service.duration} minutos</p>
                </div>
                <div className="text-white font-bold text-sm">
                  R$ {service.price.toFixed(2).replace('.', ',')}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Duração Total</span>
            <span className="text-white font-bold text-sm">{totalDuration} minutos</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-dark p-5 rounded-3xl border border-white/5 flex flex-col items-center text-center">
            <span className="material-symbols-outlined text-primary mb-2">calendar_month</span>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-1">Data</p>
            <p className="text-white font-bold text-sm">{formattedDate}</p>
          </div>
          <div className="bg-surface-dark p-5 rounded-3xl border border-white/5 flex flex-col items-center text-center">
            <span className="material-symbols-outlined text-primary mb-2">schedule</span>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-1">Horário</p>
            <p className="text-white font-bold text-sm">{bookingState.time}</p>
          </div>
        </div>

        <div className="bg-surface-dark p-6 rounded-3xl border border-white/5 flex items-center gap-4">
          <div
            className="size-14 rounded-full bg-cover bg-center border-2 border-primary/20"
            style={{ backgroundImage: `url(${bookingState.barber.avatar || 'https://ih1.redbubble.net/image.1024340084.6729/flat,750x,075,f-pad,750x1000,f8f8f8.jpg'})` }}
          ></div>
          <div className="flex-1">
            <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-1">Barbeiro</p>
            <p className="text-white font-black text-lg">{bookingState.barber.name}</p>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/10 p-6 rounded-3xl flex items-center justify-between">
          <span className="text-white/60 font-bold">Total a pagar</span>
          <span className="text-primary text-xl font-black">{formatCurrency(totalPrice)}</span>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-sm font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-xl">error</span>
            {error}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-background-dark/80 backdrop-blur-xl border-t border-white/5 max-w-md mx-auto z-20 rounded-t-[2rem]">
        <button
          onClick={handleFinalize}
          disabled={loading}
          className={`w-full h-16 bg-primary text-background-dark font-black text-lg rounded-2xl shadow-gold transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${loading ? 'opacity-50 cursor-wait' : 'hover:bg-[#c9a026]'}`}
        >
          {loading ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-background-dark border-t-transparent rounded-full"></div>
              <span>Processando...</span>
            </>
          ) : (
            <>
              <span>CONFIRMAR AGENDAMENTO</span>
              <span className="material-symbols-outlined">check_circle</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Confirmation;
