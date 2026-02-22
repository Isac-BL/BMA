import React, { useState, useEffect, useMemo } from 'react';
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
    const [selectedScheduleDate, setSelectedScheduleDate] = useState(new Date().toISOString().split('T')[0]);
    const [occupiedSlots, setOccupiedSlots] = useState<{ time: string, count: number }[]>([]);
    const [loadingSchedule, setLoadingSchedule] = useState(false);
    const [barberCount, setBarberCount] = useState(1);

    const scheduleDates = useMemo(() => {
        const d = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            d.push({
                full: date.toISOString().split('T')[0],
                day: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(),
                num: date.getDate().toString()
            });
        }
        return d;
    }, []);

    const timeSlots = useMemo(() => {
        const slots = [];
        for (let h = 8; h <= 19; h++) {
            slots.push(`${String(h).padStart(2, '0')}:00`);
            slots.push(`${String(h).padStart(2, '0')}:30`);
        }
        return slots;
    }, []);

    useEffect(() => {
        fetchNextAppointment();
        fetchNotifications();
        fetchBarberCount();

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

    const fetchBarberCount = async () => {
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'BARBER');
        if (count) setBarberCount(count);
    };

    // Separate effect for schedule overview to avoid recursive triggers or collisions
    useEffect(() => {
        fetchBarberSchedule();
    }, [selectedScheduleDate]);

    const fetchBarberSchedule = async () => {
        setLoadingSchedule(true);
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('appointment_time, status')
                .eq('appointment_date', selectedScheduleDate)
                .not('status', 'ilike', 'cancelled%');

            if (!error && data) {
                // Group by time to see how many barbers are busy per slot
                const counts: Record<string, number> = {};
                data.forEach(app => {
                    const time = app.appointment_time.substring(0, 5);
                    counts[time] = (counts[time] || 0) + 1;
                });

                const mapped = Object.entries(counts).map(([time, count]) => ({ time, count }));
                setOccupiedSlots(mapped);
            } else {
                setOccupiedSlots([]);
            }
        } catch (err) {
            console.error('Error fetching barber schedule:', err);
        } finally {
            setLoadingSchedule(false);
        }
    };

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

    const handleClearNotifications = async () => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('user_id', user.id);
            if (error) throw error;
            setNotifications([]);
        } catch (err) {
            console.error('Error clearing notifications:', err);
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

                {/* Barber Schedule Overview */}
                <section className="space-y-6 pb-12">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.25em]">Agenda da Barbearia</h2>
                        <p className="text-[10px] text-primary font-black uppercase tracking-widest">Confira os horários preenchidos</p>
                    </div>

                    <div className="bg-surface-dark/30 rounded-[2.5rem] border border-white/5 p-6 space-y-6">
                        {/* Internal Date Strip */}
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                            {scheduleDates.map((d, idx) => {
                                const isSelected = selectedScheduleDate === d.full;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedScheduleDate(d.full)}
                                        className={`flex flex-col items-center justify-center min-w-[55px] h-16 rounded-2xl transition-all duration-300 ${isSelected ? 'bg-primary text-background-dark shadow-gold scale-105' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                    >
                                        <span className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isSelected ? 'text-background-dark/60' : 'text-white/30'}`}>{d.day}</span>
                                        <span className="text-lg font-black">{d.num}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Slots Grid */}
                        {loadingSchedule ? (
                            <div className="flex flex-col items-center justify-center py-10 opacity-20">
                                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mb-3"></div>
                                <p className="text-[8px] font-black uppercase tracking-widest">Sincronizando...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-2 text-center">
                                {timeSlots.map((time) => {
                                    const occupied = occupiedSlots.find(s => s.time === time);
                                    const count = occupied?.count || 0;
                                    const isFullyOccupied = count >= barberCount;
                                    const isPartiallyOccupied = count > 0 && count < barberCount;

                                    return (
                                        <div
                                            key={time}
                                            className={`py-2.5 rounded-xl text-[10px] font-black transition-all border ${isFullyOccupied
                                                ? 'bg-primary/20 border-primary/30 text-primary shadow-[0_0_10px_rgba(225,180,45,0.1)]'
                                                : isPartiallyOccupied
                                                    ? 'bg-primary/5 border-primary/20 text-primary/60'
                                                    : 'bg-white/5 border-white/5 text-white/20'}`}
                                        >
                                            <span className={isFullyOccupied ? 'animate-pulse' : ''}>{time}</span>
                                            <div className={`text-[7px] mt-0.5 opacity-50 ${isFullyOccupied ? 'block' : 'hidden'}`}>LOTADO</div>
                                            {isPartiallyOccupied && <div className={`text-[7px] mt-0.5 opacity-40 block`}>{barberCount - count} {barberCount - count === 1 ? 'VAGA DISPONÍVEL' : 'VAGAS DISPONÍVEIS'}</div>}
                                            {!occupied && <div className="text-[7px] mt-0.5 opacity-0">LIVRE</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-4 pt-2">
                            <div className="flex items-center gap-1.5">
                                <div className="size-2 rounded-full bg-primary/20 border border-primary/30"></div>
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Lotado</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="size-2 rounded-full bg-primary/5 border border-primary/20"></div>
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Disponível</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="size-2 rounded-full bg-white/5 border border-white/10"></div>
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Livre</span>
                            </div>
                        </div>
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
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Sua Barba em Dia</p>
                                    {notifications.length > 0 && (
                                        <button onClick={handleClearNotifications} className="text-[9px] font-black text-white/30 hover:text-red-500 uppercase tracking-widest transition-colors ml-2">
                                            Limpar
                                        </button>
                                    )}
                                </div>
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
