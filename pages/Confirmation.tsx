import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Appointment, User, Service, BookingState, AppointmentService } from '../types.ts';
import { formatCurrency } from '../utils.ts';
import { supabase } from '../supabase.ts';
import BarberNavigation from '../components/BarberNavigation.tsx';

interface ConfirmationProps {
  bookingState: BookingState;
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
      let conflictQuery = supabase
        .from('appointments')
        .select(`
          appointment_time, 
          appointment_services(service:service_id(duration))
        `)
        .eq('barber_id', bookingState.barber.id)
        .eq('appointment_date', bookingState.date)
        .not('status', 'ilike', 'cancelled%');

      if (bookingState.rescheduleAppointmentId) {
        conflictQuery = conflictQuery.neq('id', bookingState.rescheduleAppointmentId);
      }

      const { data: conflicts } = await conflictQuery;

      const toMin = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };

      const slotStart = toMin(bookingState.time);
      const slotEnd = slotStart + totalDuration;

      const hasConflict = (conflicts || []).some(app => {
        const appStart = toMin(app.appointment_time);

        // Handle array or object structure for appointment_services
        let appDur = 0;
        if (Array.isArray(app.appointment_services)) {
          app.appointment_services.forEach((as) => {
            const service = (Array.isArray(as.service) ? as.service[0] : as.service) as { duration: number } | undefined;
            appDur += (service?.duration || 0);
          });
        }
        if (appDur === 0) appDur = 30;

        const appEnd = appStart + appDur;
        return (slotStart < appEnd && slotEnd > appStart);
      });

      if (hasConflict) {
        throw new Error('Desculpe, este horário acabou de ser reservado por outra pessoa. Por favor, selecione outro horário.');
      }

      // 1. If Rescheduling, Update Existing Appointment
      if (bookingState.rescheduleAppointmentId) {
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            appointment_date: bookingState.date,
            appointment_time: bookingState.time,
            barber_id: bookingState.barber.id,
            status: 'confirmed',
            value: totalPrice
          })
          .eq('id', bookingState.rescheduleAppointmentId);

        if (updateError) throw updateError;

        // We can optionally update appointment_services if we allow changing services during reschedule,
        // but for now, "Adiar" usually implies just changing the time. 
        // If we want to support full re-booking, we would delete old services and insert new ones.
        // Let's assume full update to be safe and consistent with the state

        // Clear old services
        const { error: deleteServicesError } = await supabase
          .from('appointment_services')
          .delete()
          .eq('appointment_id', bookingState.rescheduleAppointmentId);
        if (deleteServicesError) throw deleteServicesError;

        // Insert new services - Deduplicate by ID
        const uniqueServices = bookingState.services.filter((s, idx, self) =>
          self.findIndex(t => t.id === s.id) === idx
        );

        const serviceLinks = uniqueServices.map(service => ({
          appointment_id: bookingState.rescheduleAppointmentId,
          service_id: service.id
        }));

        const { error: servicesError } = await supabase
          .from('appointment_services')
          .insert(serviceLinks);

        if (servicesError) throw servicesError;

        // Notification for Reschedule
        const formattedDateNotif = new Date(bookingState.date + 'T12:00:00').toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit'
        });

        const notifications = [];
        const isBarberAction = user.role === 'BARBER';

        // 1. If Barber is rescheduling, notify the Client
        if (isBarberAction) {
          // Find client_id if it exists (for non-guest appointments)
          const { data: appData } = await supabase.from('appointments').select('client_id, client_name').eq('id', bookingState.rescheduleAppointmentId).single();

          if (appData?.client_id) {
            notifications.push({
              user_id: appData.client_id,
              appointment_id: bookingState.rescheduleAppointmentId,
              type: 'confirmation',
              title: 'Horário Alterado',
              content: `Seu agendamento foi reagendado pela barbearia para ${formattedDateNotif} às ${bookingState.time}.`,
              created_at: new Date().toISOString()
            });
          }
        } else {
          // 2. If Client is rescheduling, notify the Barber
          notifications.push({
            user_id: bookingState.barber.id,
            appointment_id: bookingState.rescheduleAppointmentId,
            type: 'confirmation',
            title: 'Agendamento Reagendado',
            content: `${user.name} reagendou para ${formattedDateNotif} às ${bookingState.time}.`,
            created_at: new Date().toISOString()
          });

          // Also notify the client
          notifications.push({
            user_id: user.id,
            appointment_id: bookingState.rescheduleAppointmentId,
            type: 'confirmation',
            title: 'Agendamento Reagendado',
            content: `Seu agendamento foi reagendado com sucesso para ${formattedDateNotif} às ${bookingState.time}.`,
            created_at: new Date().toISOString()
          });
        }

        if (notifications.length > 0) {
          const { error: notifError } = await supabase.from('notifications').insert(notifications);
          if (notifError) console.error('Error sending reschedule notifications:', notifError);
        }

      } else {
        // CREATE NEW APPOINTMENT (Old Logic)
        const isBarberBookingGuest = user.role === 'BARBER' && bookingState.guestName;

        const { data: appointment, error: insertError } = await supabase
          .from('appointments')
          .insert([{
            client_id: isBarberBookingGuest ? null : user.id,
            client_name: isBarberBookingGuest ? bookingState.guestName : (user.role === 'BARBER' ? 'Cliente Manual' : null),
            barber_id: bookingState.barber.id,
            appointment_date: bookingState.date,
            appointment_time: bookingState.time,
            value: totalPrice,
            status: 'confirmed'
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        // 2. Insert all selected services into the join table - Deduplicate by ID
        const uniqueServices = bookingState.services.filter((s, idx, self) =>
          self.findIndex(t => t.id === s.id) === idx
        );

        const serviceLinks = uniqueServices.map(service => ({
          appointment_id: appointment.id,
          service_id: service.id
        }));

        const { error: servicesError } = await supabase
          .from('appointment_services')
          .insert(serviceLinks);

        if (servicesError) throw servicesError;

        // 3. Notify the Barber
        const serviceNames = [...new Set(bookingState.services.map(s => s.name))].join(' + ');
        const formattedDateNotif = new Date(bookingState.date + 'T12:00:00').toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit'
        });

        const notifications = [];
        const isClientAction = user.role === 'CLIENT';

        // barber.id should always get a notification saying "New appointment from X"
        notifications.push({
          user_id: bookingState.barber.id,
          appointment_id: appointment.id,
          type: 'confirmation',
          title: 'Novo Agendamento',
          content: isClientAction
            ? `${user.name} agendou ${serviceNames} para ${formattedDateNotif} às ${bookingState.time}.`
            : `Você agendou ${serviceNames} para ${bookingState.guestName || 'Cliente'} em ${formattedDateNotif} às ${bookingState.time}.`,
          created_at: new Date().toISOString()
        });

        // client side notification (only if they have a real account)
        if (isClientAction) {
          notifications.push({
            user_id: user.id,
            appointment_id: appointment.id,
            type: 'confirmation',
            title: 'Agendamento Confirmado',
            content: `Seu agendamento de ${serviceNames} com ${bookingState.barber.name} para ${formattedDateNotif} às ${bookingState.time} foi realizado com sucesso!`,
            created_at: new Date().toISOString()
          });
        }

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) {
          console.error('Error sending notifications during confirmation:', notifError);
          alert(`Agendamento realizado, mas houve uma instabilidade ao enviar as notificações.`);
        }
      }

      navigate(user.role === 'BARBER' ? '/barber/schedule' : '/client', { replace: true });
    } catch (err) {
      const error = err as Error;
      console.error('Error finalizing appointment:', error);
      setError(error.message || 'Erro ao processar agendamento. Tente novamente.');
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
      <header className="flex items-center justify-between px-4 py-4 sticky top-0 z-10 bg-background-dark/80 backdrop-blur-xl border-b border-white/5 will-change-transform">
        <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
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
          <div className="size-14 rounded-full overflow-hidden border-2 border-primary/20 shrink-0">
            <img
              src={bookingState.barber.avatar || 'https://ih1.redbubble.net/image.1024340084.6729/flat,750x,075,f-pad,750x1000,f8f8f8.jpg'}
              alt={bookingState.barber.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="flex-1">
            <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-1">Barbeiro</p>
            <p className="text-white font-black text-lg">{bookingState.barber.name}</p>
          </div>
        </div>

        {(bookingState.guestName || user.role === 'BARBER') && (
          <div className="bg-surface-dark p-6 rounded-3xl border border-white/5 flex items-center gap-4">
            <div className="size-14 rounded-full bg-white/5 flex items-center justify-center border-2 border-white/5">
              <span className="material-symbols-outlined text-white/20">person</span>
            </div>
            <div className="flex-1">
              <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-1">Cliente</p>
              <p className="text-white font-black text-lg">
                {user.role === 'BARBER'
                  ? (bookingState.guestName || 'Cliente Manual')
                  : user.name
                }
              </p>
            </div>
          </div>
        )}

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
      {user.role === 'BARBER' && <BarberNavigation />}
    </div>
  );
};

export default Confirmation;
