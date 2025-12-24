import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Appointment, User, Service } from '../types.ts';
import { supabase } from '../supabase.ts';

interface ConfirmationProps {
  bookingState: {
    service: Service | null;
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

  const handleFinalize = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      if (!bookingState.service || !bookingState.barber || !bookingState.date || !bookingState.time) {
        throw new Error('Dados de agendamento incompletos.');
      }

      const { data, error: insertError } = await supabase
        .from('appointments')
        .insert([{
          client_id: user.id,
          barber_id: bookingState.barber.id,
          service_id: bookingState.service.id,
          appointment_date: bookingState.date,
          appointment_time: bookingState.time,
          value: bookingState.service.price,
          status: 'confirmed'
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (insertError) throw insertError;

      navigate('/client');
    } catch (err: any) {
      console.error('Error finalizing appointment:', err);
      setError(err.message || 'Erro ao processar agendamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!bookingState.service || !bookingState.barber || !bookingState.date || !bookingState.time) {
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

      <main className="p-6 space-y-6 flex-1">
        <div className="bg-surface-dark p-6 rounded-3xl border border-white/5 shadow-soft">
          <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-3">Relevante</p>
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-3xl">content_cut</span>
            </div>
            <div>
              <h3 className="text-white text-xl font-black">{bookingState.service.name}</h3>
              <p className="text-text-muted text-sm mt-1 font-medium">{bookingState.service.duration} minutos</p>
            </div>
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
          <span className="text-primary text-2xl font-black">R$ {bookingState.service.price.toFixed(2).replace('.', ',')}</span>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-sm font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-xl">error</span>
            {error}
          </div>
        )}
      </main>

      <div className="sticky bottom-0 left-0 right-0 p-6 bg-background-dark/80 backdrop-blur-xl border-t border-white/5 max-w-md mx-auto z-20">
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
