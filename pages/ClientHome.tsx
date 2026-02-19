import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Service, Appointment, AppNotification } from '../types.ts';
import { formatCurrency } from '../utils.ts';
import { supabase } from '../supabase.ts';
import ClientNavigation from '../components/ClientNavigation.tsx';

interface ClientHomeProps {
    user: User;
    onLogout: () => void;
}

const ClientHome: React.FC<ClientHomeProps> = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        fetchNextAppointment();
        fetchNotifications();

        // Subscribe to real-time notifications
        const channel = supabase
            .channel(`realtime_notifications_client_home_${user.id}`)
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

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user.id]);

    const fetchNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (!error) setNotifications(data || []);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    };

    const fetchNextAppointment = async (retryCount = 0) => {
        if (retryCount === 0) setLoading(true);
        try {
            const now = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    *,
                    barber:barber_id(name, avatar_url),
                    appointment_services(service:service_id(name, duration, price))
                `)
                .eq('client_id', user.id)
                .gte('appointment_date', now)
                .in('status', ['pending', 'confirmed'])
                .order('appointment_date', { ascending: true })
                .order('appointment_time', { ascending: true })
                .limit(1)
                .single();

            if (!error) {
                // Map services to match the old structure if needed or update UI
                setNextAppointment(data);
            }
        } catch (err) {
            console.error(`Error fetching next appointment (attempt ${retryCount + 1}):`, err);
            if (retryCount < 2) {
                setTimeout(() => fetchNextAppointment(retryCount + 1), (retryCount + 1) * 1000);
                return;
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden pb-32 max-w-md mx-auto bg-background-dark">
            {/* Background Ambient Effect */}
            <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-50 pointer-events-none"></div>

            <header className="sticky top-0 z-40 flex items-center bg-background-dark/80 backdrop-blur-xl p-6 justify-between border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div
                        className="h-12 w-12 overflow-hidden rounded-2xl border-2 border-primary/20 bg-surface-dark bg-cover bg-center shadow-glow"
                        style={{
                            backgroundImage: `url(${user.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtqFd9kXRuriwN1cEPJaLyCboKwOwEwYjCdnrh35EOMmO0K3JKVVbpW66iZGHPzh598PLFB_y1nBw3sG6zX_4nJOtypefF6mYbHPW2Pg_LFQetDTc2AxMf_O9PauILygQ27bLqnutTzBF_mAvkB4yDMoSSo4yI9g7JmuB_hCVaX8MJ82ULLJLKoyaNLU4dx-IsgTS0eEmZqUcJEymS2id4o5ItpuaMFNpjDVhyYyxLiGknlEAqs5-Odpsxsh2CZ0J2MJ84KRxboMc'})`,
                            backgroundPosition: `${user.avatar_pos_x ?? 50}% ${user.avatar_pos_y ?? 50}%`,
                            backgroundSize: `${user.avatar_zoom ?? 100}%`
                        }}
                    >
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-white font-black text-xl tracking-tight leading-none group flex items-center gap-1.5">
                            Olá, {user.name.split(' ')[0]}
                            <span className="animate-bounce">👋</span>
                        </h1>
                        <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mt-2">Membro Gold</p>
                    </div>
                </div>
                <button onClick={() => setShowNotifications(true)} className="relative h-10 w-10 flex items-center justify-center rounded-xl bg-surface-dark text-white hover:scale-105 active:scale-95 transition-all border border-white/5 shadow-glow">
                    <span className="material-symbols-outlined">notifications</span>
                    {notifications.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-background-dark ring-2 ring-background-dark">
                            {notifications.length}
                        </span>
                    )}
                </button>
            </header>

            <main className="flex-1 p-6 space-y-10 relative z-10">
                {/* Next Appointment Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.25em]">Sua Próxima Visita</h2>
                        {nextAppointment && (
                            <button
                                onClick={() => navigate('/client/appointments')}
                                className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                            >
                                Ver Todas
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="h-32 bg-surface-dark/50 rounded-3xl animate-pulse"></div>
                    ) : nextAppointment ? (
                        <div className="bg-gradient-to-br from-surface-dark to-surface-darker border border-primary/20 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <span className="material-symbols-outlined text-[80px] text-primary">event_available</span>
                            </div>

                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <span className="text-primary font-black">
                                        {formatCurrency(nextAppointment.value)}
                                    </span>
                                    <p className="text-white font-black text-2xl truncate mb-1">
                                        {[...new Set(nextAppointment.appointment_services?.map((as) => as.service?.name))].join(' + ') || 'Serviço'}
                                    </p>
                                    <div className="flex items-center gap-2 text-primary">
                                        {nextAppointment.barber?.avatar_url ? (
                                            <div className="size-5 rounded-full bg-cover bg-center border border-primary/20 shrink-0" style={{ backgroundImage: `url(${nextAppointment.barber.avatar_url})` }}></div>
                                        ) : (
                                            <span className="material-symbols-outlined text-sm">person</span>
                                        )}
                                        <p className="text-[11px] font-black uppercase tracking-widest truncate">{nextAppointment.barber?.name}</p>
                                    </div>
                                </div>
                                <div className="bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                                    <p className="text-primary text-[10px] font-black uppercase tracking-widest">Confirmado</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-background-dark/50 p-4 rounded-2xl border border-white/5">
                                    <p className="text-white/30 text-[9px] font-black uppercase tracking-widest mb-1">Data</p>
                                    <p className="text-white font-bold text-sm">
                                        {new Date(nextAppointment.appointment_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                                    </p>
                                </div>
                                <div className="bg-background-dark/50 p-4 rounded-2xl border border-white/5">
                                    <p className="text-white/30 text-[9px] font-black uppercase tracking-widest mb-1">Horário</p>
                                    <p className="text-white font-bold text-sm">{nextAppointment.appointment_time}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-surface-dark/30 border border-dashed border-white/10 rounded-3xl p-8 flex flex-col items-center text-center gap-3">
                            <div className="size-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/20">
                                <span className="material-symbols-outlined">calendar_today</span>
                            </div>
                            <p className="text-white/40 text-sm font-medium mb-2">Nenhum agendamento pendente</p>
                            <button
                                onClick={() => fetchNextAppointment()}
                                className="px-4 py-2 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/20 transition-all"
                            >
                                Recarregar
                            </button>
                        </div>
                    )}
                </section>

                {/* Quick Actions */}
                <section className="space-y-4">
                    <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.25em]">Acesso Rápido</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => navigate('/client/book/services')}
                            className="bg-primary hover:bg-[#d4a828] h-32 rounded-3xl p-5 flex flex-col justify-between transition-all active:scale-95 shadow-gold group"
                        >
                            <div className="size-10 bg-background-dark/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-background-dark font-black">add_circle</span>
                            </div>
                            <p className="text-background-dark font-black text-sm text-left leading-tight">NOVO<br />AGENDAMENTO</p>
                        </button>
                        <button
                            onClick={() => navigate('/client/appointments')}
                            className="bg-surface-dark hover:bg-surface-highlight h-32 rounded-3xl p-5 flex flex-col justify-between transition-all border border-white/5 active:scale-95 group"
                        >
                            <div className="size-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-primary">history</span>
                            </div>
                            <p className="text-white font-black text-sm text-left leading-tight">MEUS<br />CORTES</p>
                        </button>
                    </div>
                </section>

                {/* Style Banner */}
                <section className="bg-surface-darker rounded-[2.5rem] border border-white/5 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 blur-sm group-hover:opacity-20 transition-all">
                        <span className="material-symbols-outlined text-[120px] text-primary">content_cut</span>
                    </div>
                    <div className="relative z-10 space-y-4">
                        <h3 className="text-white font-black text-2xl tracking-tighter leading-tight">O SEU ESTILO É<br /><span className="text-primary uppercase">Nossa Prioridade</span></h3>
                        <p className="text-white/40 text-xs font-medium leading-relaxed max-w-[200px]">Mantenha seu visual sempre impecável com nossos profissionais especializados.</p>
                        <button
                            onClick={() => navigate('/client/book/services')}
                            className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest group/btn"
                        >
                            Agendar agora
                            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </button>
                    </div>
                </section>
            </main>

            <ClientNavigation />

            {/* Notifications Modal */}
            {showNotifications && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="relative w-full max-w-sm h-[80vh] bg-surface-dark rounded-[2.5rem] border border-white/5 flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-6 flex items-center justify-between border-b border-white/5">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">Notificações</h2>
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Sua Barba em Dia</p>
                            </div>
                            <button onClick={() => setShowNotifications(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                            {notifications.length > 0 ? (
                                notifications.map((notif) => (
                                    <div key={notif.id} className="p-5 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-primary text-[10px] font-black uppercase tracking-widest">{notif.title || 'Aviso'}</p>
                                            <p className="text-white/20 text-[10px] font-bold">{new Date(notif.created_at).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                        <p className="text-white text-sm font-bold leading-relaxed">{notif.content}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <span className="material-symbols-outlined text-6xl text-white/5 mb-4">notifications_off</span>
                                    <p className="text-white/20 font-black uppercase tracking-widest text-xs">Nenhuma notificação</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientHome;
