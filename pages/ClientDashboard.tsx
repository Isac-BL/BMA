import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Appointment } from '../types.ts';
import { formatCurrency } from '../utils.ts';
import { supabase } from '../supabase.ts';
import ClientNavigation from '../components/ClientNavigation.tsx';

interface ClientDashboardProps {
  user: User;
  onLogout: () => void;
  setBookingState?: (state: any) => void;
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({ user, onLogout, setBookingState }) => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const STATUS_MAP: Record<string, { label: string, color: string, bg: string }> = {
    pending: { label: 'PENDENTE', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    confirmed: { label: 'CONFIRMADO', color: 'text-primary', bg: 'bg-primary/10' },
    completed: { label: 'CONCLUÍDO', color: 'text-green-500', bg: 'bg-green-500/10' },
    cancelled_client: { label: 'CANC. CLIENTE', color: 'text-red-400', bg: 'bg-red-400/10' },
    cancelled_barber: { label: 'CANC. BARBEIRO', color: 'text-red-600', bg: 'bg-red-600/10' },
  };
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchAppointments();
    fetchNotifications();

    // Subscribe to real-time notifications
    const notifChannel = supabase
      .channel('realtime_notifications_client')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    // Subscribe to real-time appointments updates
    const appChannel = supabase
      .channel('realtime_appointments_client')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `client_id=eq.${user.id}`
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(appChannel);
    };
  }, [user.id]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          barber:barber_id(id, name, avatar_url, role),
          appointment_services(service:service_id(id, name, duration, price))
        `)
        .eq('client_id', user.id)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error('Error fetching client appointments:', err);
    } finally {
      setLoading(false);
    }
  };


  const handleCancel = async (appointmentId: string) => {
    if (!window.confirm('Tem certeza que deseja cancelar este agendamento?')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled_client' })
        .eq('id', appointmentId);

      if (error) throw error;

      // Optimistic update
      // Notify Barber
      const targetApp = appointments.find(a => a.id === appointmentId);
      if (targetApp?.barber_id) {
        await supabase.from('notifications').insert([{
          user_id: targetApp.barber_id,
          appointment_id: appointmentId,
          type: 'cancellation',
          title: 'Agendamento Cancelado',
          content: `${user.name} cancelou o agendamento de ${targetApp.appointment_date} às ${targetApp.appointment_time}.`,
          created_at: new Date().toISOString()
        }]);
      }
      setAppointments(prev => prev.map(app =>
        app.id === appointmentId ? { ...app, status: 'cancelled_client' } : app
      ));
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      alert('Erro ao cancelar agendamento.');
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
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden pb-32 max-w-md mx-auto bg-background-dark">
      {/* Background Ambient Effect */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-50 pointer-events-none"></div>

      <div className="sticky top-0 z-40 flex items-center bg-background-dark/80 backdrop-blur-xl p-4 pb-4 justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 overflow-hidden rounded-full border border-primary/30 bg-surface-dark bg-cover bg-center"
            style={{
              backgroundImage: `url(${user.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtqFd9kXRuriwN1cEPJaLyCboKwOwEwYjCdnrh35EOMmO0K3JKVVbpW66iZGHPzh598PLFB_y1nBw3sG6zX_4nJOtypefF6mYbHPW2Pg_LFQetDTc2AxMf_O9PauILygQ27bLqnutTzBF_mAvkB4yDMoSSo4yI9g7JmuB_hCVaX8MJ82ULLJLQoyaNLU4dx-IsgTS0eEmZqUcJEymS2id4o5ItpuaMFNpjDVhyXyxLiGknlEAqs5-Odpsxsh2CZ0J2MJ84KRxboMc'})`,
              backgroundPosition: `${user.avatar_pos_x ?? 50}% ${user.avatar_pos_y ?? 50}%`,
              backgroundSize: `${user.avatar_zoom ?? 100}%`
            }}
          >
          </div>
          <div className="flex flex-col">
            <p className="text-white text-sm font-bold leading-none">Olá, {user.name.split(' ')[0]}</p>
            <p className="text-primary text-[10px] font-bold uppercase tracking-wider mt-1 mb-2">Cliente VIP</p>
            <button
              onClick={() => navigate('/client/profile')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-300 w-fit"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              <span className="text-[10px] font-black uppercase tracking-wider">Editar Perfil</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotifications(true)}
            className="text-white/40 hover:text-white transition-colors bg-surface-dark p-2 rounded-full border border-white/5 flex items-center justify-center relative"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 size-2 bg-primary rounded-full animate-pulse"></span>
            )}
          </button>
          <button onClick={onLogout} className="text-white/40 hover:text-white transition-colors bg-surface-dark p-2 rounded-full border border-white/5 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">logout</span>
          </button>
        </div>
      </div>

      {showNotifications && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background-dark/80 backdrop-blur-sm animate-in fade-in duration-300 px-4 pb-8">
          <div className="w-full max-w-md bg-surface-dark rounded-[2.5rem] border border-white/5 p-6 shadow-2xl animate-in slide-in-from-bottom duration-500 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-black text-xl tracking-tight">Notificações</h3>
              <button onClick={() => setShowNotifications(false)} className="size-10 bg-white/5 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
              {notifications.length === 0 ? (
                <div className="py-10 text-center opacity-40">
                  <span className="material-symbols-outlined text-4xl mb-2">notifications_off</span>
                  <p className="text-xs font-bold uppercase tracking-widest">Nenhuma notificação</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className="bg-background-dark/50 border border-white/5 p-4 rounded-2xl">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-primary text-[10px] font-black uppercase tracking-widest">{notif.type === 'confirmation' ? 'Confirmação' : notif.type === 'cancellation' ? 'Cancelamento' : 'Lembrete'}</p>
                      <p className="text-white/20 text-[10px] font-bold">{new Date(notif.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <h4 className="text-white font-bold text-sm mb-1">{notif.title}</h4>
                    <p className="text-text-muted text-xs leading-relaxed">{notif.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-white tracking-tight uppercase">Meus Agendamentos</h2>
          <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded-md">{appointments.length} Ativos</span>
        </div>

        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 w-full relative z-0 py-12">
              <div className="flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Illustration/Icon */}
                <div className="relative group">
                  {/* Glow behind icon */}
                  <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <div className="relative flex items-center justify-center size-40 rounded-full bg-gradient-to-b from-[#322d1e] to-[#1d190f] border border-white/5 shadow-2xl">
                    <span className="material-symbols-outlined text-primary/80 text-[64px]" style={{ fontVariationSettings: "'wght' 200" }}>calendar_clock</span>
                    {/* Floating status badge */}
                    <div className="absolute -right-2 -bottom-2 bg-[#2a261a] border border-primary/30 p-2 rounded-full shadow-lg">
                      <span className="material-symbols-outlined text-gray-400 text-[20px]">priority_high</span>
                    </div>
                  </div>
                </div>
                {/* Text Content */}
                <div className="flex flex-col items-center gap-3 max-w-[320px] text-center">
                  <h3 className="text-white text-2xl font-bold leading-tight tracking-tight">
                    Agenda Vazia
                  </h3>
                  <p className="text-white/40 text-sm font-normal leading-relaxed px-4">
                    Parece que você ainda não marcou seu corte ou barba. Garanta seu visual para a semana.
                  </p>
                </div>
                {/* Primary Action Button */}
                <button
                  onClick={() => navigate('/client/book/services')}
                  className="flex w-full max-w-[280px] cursor-pointer items-center justify-center gap-2 rounded-xl h-12 bg-primary hover:bg-[#d4a828] active:scale-95 transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(225,180,45,0.3)] group mt-4 text-background-dark font-bold text-sm tracking-wide uppercase"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  <span>Agendar um Serviço</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((app) => {
                const appDate = new Date(app.appointment_date + 'T12:00:00');
                const canCancel = ['pending', 'confirmed'].includes(app.status);

                return (
                  <div key={app.id} className="group bg-surface-dark border border-white/5 rounded-3xl p-5 shadow-soft transition-all hover:border-primary/20">
                    <div className="flex gap-5">
                      <div className="flex flex-col items-center justify-center w-16 h-16 bg-background-dark rounded-2xl border border-primary/20 shrink-0 group-hover:border-primary/50 transition-colors">
                        <span className="text-primary text-[10px] font-black uppercase tracking-widest opacity-60">
                          {appDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                        </span>
                        <span className="text-white text-2xl font-black">{appDate.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <p className="text-white font-black text-lg truncate leading-tight">
                              {[...new Set(app.appointment_services?.map((s: any) => s.service?.name).filter(Boolean))].join(' + ') || 'Serviço'}
                            </p>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded mt-1.5 w-fit ${STATUS_MAP[app.status]?.bg} ${STATUS_MAP[app.status]?.color}`}>
                              {STATUS_MAP[app.status]?.label}
                            </span>
                          </div>
                          <p className="text-primary font-black text-sm">{formatCurrency(app.value)}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1.5 text-text-muted text-xs font-bold bg-background-dark/50 px-2.5 py-1.5 rounded-full">
                            <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                            {app.appointment_time}
                          </div>
                          <div className="flex items-center gap-1.5 text-text-muted text-xs font-bold bg-background-dark/50 px-2.5 py-1.5 rounded-full border border-white/5">
                            <span className="material-symbols-outlined text-[16px] text-primary">person</span>
                            {app.barber?.name.split(' ')[0]}
                          </div>
                        </div>
                      </div>
                    </div>
                    {canCancel && (
                      <div className="mt-4 pt-4 border-t border-white/5 flex justify-end gap-2">
                        {setBookingState && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setBookingState({
                                barber: {
                                  id: app.barber.id,
                                  name: app.barber.name,
                                  avatar: app.barber.avatar_url,
                                  role: app.barber.role || 'BARBER', // ensure role is present
                                  email: '' // required by type but not used logic
                                },
                                services: app.appointment_services?.map((as: any) => ({
                                  id: as.service.id,
                                  name: as.service.name,
                                  duration: as.service.duration,
                                  price: as.service.price
                                })) || [],
                                date: app.appointment_date,
                                time: null,
                                rescheduleAppointmentId: app.id
                              });
                              navigate('/client/book/schedule');
                            }}
                            className="px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-sm">edit_calendar</span>
                            Adiar
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancel(app.id); }}
                          className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">cancel</span>
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>


      <ClientNavigation />
    </div>
  );
};

export default ClientDashboard;
