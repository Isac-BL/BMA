import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase.ts';
import { User, Appointment, Service } from '../types.ts';
import { formatCurrency } from '../utils.ts';
import BarberNavigation from '../components/BarberNavigation.tsx';
import BarberSidebar from '../components/BarberSidebar.tsx';

interface BarberScheduleProps {
    user: User;
}

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEK_DAYS_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

const STATUS_MAP: Record<string, { label: string, color: string, bg: string, icon: string }> = {
    pending: { label: 'PENDENTE', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: 'schedule' },
    confirmed: { label: 'CONFIRMADO', color: 'text-primary', bg: 'bg-primary/10', icon: 'verified' },
    completed: { label: 'CONCLUÍDO', color: 'text-green-500', bg: 'bg-green-500/10', icon: 'check_circle' },
    cancelled_client: { label: 'CANC. CLIENTE', color: 'text-red-400', bg: 'bg-red-400/10', icon: 'cancel' },
    cancelled_barber: { label: 'CANC. BARBEIRO', color: 'text-red-600', bg: 'bg-red-600/10', icon: 'block' },
};

const BarberSchedule: React.FC<BarberScheduleProps & { onLogout: () => void }> = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Rescheduling State
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');

    // Generate 14 days for the default strip
    const dates = useMemo(() => {
        const d = [];
        for (let i = 0; i < 14; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            d.push({
                full: date.toISOString().split('T')[0],
                dayName: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(),
                dayNum: date.getDate(),
                month: date.getMonth(),
                year: date.getFullYear()
            });
        }
        return d;
    }, []);

    const [selectedDate, setSelectedDate] = useState(dates[0].full);
    const [viewDate, setViewDate] = useState(new Date()); // Used for Month view navigation

    useEffect(() => {
        fetchScheduleData();
        if (viewMode === 'day') {
            const interval = setInterval(() => setCurrentTime(new Date()), 60000);
            return () => clearInterval(interval);
        }
    }, [selectedDate, viewMode, user.id, viewDate]);

    const fetchScheduleData = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('appointments')
                .select(`
                    *,
                    client:client_id(name),
                    appointment_services(
                        service:service_id(name, duration)
                    )
                `)
                .eq('barber_id', user.id);

            if (viewMode === 'day') {
                query = query.eq('appointment_date', selectedDate);
            } else if (viewMode === 'week') {
                const date = new Date(selectedDate + 'T12:00:00');
                const startOfWeek = new Date(date);
                startOfWeek.setDate(date.getDate() - date.getDay());
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);

                query = query.gte('appointment_date', startOfWeek.toISOString().split('T')[0])
                    .lte('appointment_date', endOfWeek.toISOString().split('T')[0]);
            } else if (viewMode === 'month') {
                const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
                const endOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);

                query = query.gte('appointment_date', startOfMonth.toISOString().split('T')[0])
                    .lte('appointment_date', endOfMonth.toISOString().split('T')[0]);
            }

            const { data, error } = await query.order('appointment_date').order('appointment_time');
            if (error) throw error;

            // Map the data to a cleaner structure
            const mappedData = data.map(app => ({
                ...app,
                services_list: app.appointment_services?.map((as: any) => as.service) || []
            }));

            setAppointments(mappedData);
        } catch (err) {
            console.error('Error fetching schedule data:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateAppointmentStatus = async (appId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: newStatus })
                .eq('id', appId);

            if (error) throw error;

            setAppointments(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
            setSelectedAppointmentId(null);
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Erro ao atualizar status.');
        }
    };

    const handleReschedule = async () => {
        if (!selectedAppointmentId || !rescheduleDate || !rescheduleTime) return;

        try {
            const { error } = await supabase
                .from('appointments')
                .update({
                    appointment_date: rescheduleDate,
                    appointment_time: rescheduleTime,
                    status: 'confirmed' // Usually reset to confirmed on reschedule
                })
                .eq('id', selectedAppointmentId);

            if (error) throw error;

            // Success! Refetch or update locally
            setIsRescheduling(false);
            setSelectedAppointmentId(null);
            fetchScheduleData();
        } catch (err) {
            console.error('Error rescheduling:', err);
            alert('Erro ao remarcar agendamento.');
        }
    };

    const nowPos = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        if (selectedDate !== todayStr || viewMode !== 'day') return -1;

        const h = currentTime.getHours();
        const m = currentTime.getMinutes();
        if (h < 8 || h > 22) return -1;

        const startHour = 8;
        const minutesFromStart = (h - startHour) * 60 + m;
        return (minutesFromStart / 60) * 120 + 24;
    }, [currentTime, selectedDate, viewMode]);

    const timelineSlots = useMemo(() => {
        const hours = [];
        for (let h = 8; h <= 21; h++) {
            hours.push(`${String(h).padStart(2, '0')}:00`);
        }
        return hours;
    }, []);

    const getStatusBorder = (status: string) => {
        switch (status) {
            case 'confirmed': return 'border-primary';
            case 'pending': return 'border-yellow-500';
            case 'completed': return 'border-green-500';
            case 'cancelled_client':
            case 'cancelled_barber': return 'border-red-500 opacity-40';
            default: return 'border-blue-500';
        }
    };

    const weekDays = useMemo(() => {
        const date = new Date(selectedDate + 'T12:00:00');
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());

        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            days.push({
                full: d.toISOString().split('T')[0],
                dayName: WEEK_DAYS_SHORT[i],
                dayNum: d.getDate()
            });
        }
        return days;
    }, [selectedDate]);

    // Calendar Helper
    const calendarDays = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        // Pad previous month
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({ day: prevMonthLastDay - i, current: false });
        }
        // Current month
        for (let i = 1; i <= daysInMonth; i++) {
            const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            days.push({ day: i, current: true, full: d });
        }
        return days;
    }, [viewDate]);

    const selectedAppointment = appointments.find(a => a.id === selectedAppointmentId);

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased overflow-hidden h-screen flex flex-col max-w-md mx-auto relative shadow-2xl">
            <BarberSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                user={user}
                onLogout={onLogout}
            />
            {/* Top App Bar */}
            <header className="flex-none bg-white dark:bg-background-dark pt-4 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-surface-dark transition-colors relative text-slate-900 dark:text-white">
                            <span className="material-symbols-outlined">menu</span>
                            <div className="absolute top-1 left-1 size-2 bg-primary rounded-full animate-pulse"></div>
                        </button>
                        <div>
                            <h1 className="text-xl font-black tracking-tight dark:text-white">
                                {viewMode === 'month' ? `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}` :
                                    viewMode === 'week' ? (() => {
                                        const start = new Date(weekDays[0].full + 'T12:00:00');
                                        const end = new Date(weekDays[6].full + 'T12:00:00');
                                        return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;
                                    })() :
                                        `${MONTHS[new Date(selectedDate + 'T12:00:00').getMonth()]} ${new Date(selectedDate + 'T12:00:00').getFullYear()}`}
                            </h1>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Barbearia Mateus Andrade</p>
                        </div>
                    </div>
                </div>

                {/* View Toggle */}
                <div className="px-4 pb-4">
                    <div className="flex p-1 mb-4 bg-gray-100 dark:bg-surface-dark rounded-xl">
                        <button onClick={() => setViewMode('day')} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${viewMode === 'day' ? 'bg-white dark:bg-primary text-background-dark shadow-sm' : 'text-gray-400'}`}>DIA</button>
                        <button onClick={() => setViewMode('week')} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${viewMode === 'week' ? 'bg-white dark:bg-primary text-background-dark shadow-sm' : 'text-gray-400'}`}>SEMANA</button>
                        <button onClick={() => setViewMode('month')} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${viewMode === 'month' ? 'bg-white dark:bg-primary text-background-dark shadow-sm' : 'text-gray-400'}`}>MÊS</button>
                    </div>

                    {viewMode === 'day' && (
                        <div className="flex justify-between items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
                            {dates.map((d) => {
                                const isSelected = selectedDate === d.full;
                                return (
                                    <button key={d.full} onClick={() => setSelectedDate(d.full)} className={`flex flex-col items-center justify-center min-w-[3.2rem] h-16 rounded-2xl transition-all ${isSelected ? 'bg-primary shadow-gold text-background-dark scale-105' : 'bg-transparent text-gray-400'}`}>
                                        <span className={`text-[10px] font-bold mb-1 ${isSelected ? 'text-background-dark/60' : 'text-gray-500'}`}>{d.dayName}</span>
                                        <span className="text-lg font-black">{d.dayNum}</span>
                                        {isSelected && <div className="size-1 bg-background-dark rounded-full mt-1"></div>}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {viewMode === 'month' && (
                        <div className="flex items-center justify-between pb-2">
                            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} className="p-1 rounded-full hover:bg-surface-dark transition-colors"><span className="material-symbols-outlined">chevron_left</span></button>
                            <span className="text-xs font-bold text-primary uppercase tracking-widest">{MONTHS[viewDate.getMonth()]}</span>
                            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} className="p-1 rounded-full hover:bg-surface-dark transition-colors"><span className="material-symbols-outlined">chevron_right</span></button>
                        </div>
                    )}
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto relative bg-white dark:bg-background-dark rounded-t-[2.5rem] border-t border-gray-100 dark:border-white/5 shadow-inner px-4 pt-8 pb-32 no-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                        <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full mb-4"></div>
                        <p className="text-xs font-bold tracking-widest uppercase">Sincronizando...</p>
                    </div>
                ) : (
                    <>
                        {viewMode === 'day' && (
                            <div className="flex flex-col relative h-[1800px]">
                                {nowPos !== -1 && (
                                    <div className="absolute left-0 w-full flex items-center z-30 pointer-events-none" style={{ top: nowPos }}>
                                        <div className="w-12 text-right pr-2 text-primary font-black text-[10px]">{currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                        <div className="flex-1 h-px bg-primary relative">
                                            <div className="absolute right-0 -top-1 size-2 rounded-full bg-primary shadow-gold"></div>
                                        </div>
                                    </div>
                                )}
                                {timelineSlots.map((time) => {
                                    const slotApps = appointments.filter(a => a.appointment_time.startsWith(time.split(':')[0]));
                                    return (
                                        <div key={time} className="flex min-h-[120px] relative border-t border-gray-100 dark:border-white/5 last:border-b-0">
                                            <div className="w-12 flex-none text-right pr-3 pt-2 text-[11px] font-black text-gray-300 dark:text-white/20">{time}</div>
                                            <div className="flex-1 py-3 group relative">
                                                {slotApps.length > 0 ? (
                                                    <div className="flex flex-col gap-2">
                                                        {slotApps.map(app => (
                                                            <div key={app.id} className="relative">
                                                                <div
                                                                    onClick={() => setSelectedAppointmentId(selectedAppointmentId === app.id ? null : app.id)}
                                                                    className={`bg-surface-dark rounded-2xl p-4 border-l-4 shadow-soft transition-all active:scale-[0.98] cursor-pointer ${getStatusBorder(app.status)}`}
                                                                >
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div>
                                                                            <h3 className={`text-white font-black text-lg leading-tight ${app.status.startsWith('cancelled') ? 'line-through decoration-red-500/50' : ''}`}>{app.client?.name}</h3>
                                                                            +                                                                            <p className="text-primary text-xs font-bold mt-1 tracking-wider uppercase truncate">
                                                                                {app.services_list?.map((s: any) => s.name).join(' + ') || 'Serviço'}
                                                                            </p>
                                                                        </div>
                                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${STATUS_MAP[app.status]?.bg} ${STATUS_MAP[app.status]?.color}`}>
                                                                            {STATUS_MAP[app.status]?.label}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-4 text-[10px] font-bold text-white/40">
                                                                        <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">schedule</span>{app.appointment_time}</div>
                                                                        <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">payments</span>{formatCurrency(app.value)}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <button className="w-full h-full min-h-[80px] border-2 border-dashed border-gray-100 dark:border-white/5 hover:border-primary/50 rounded-2xl flex items-center justify-center gap-2 group transition-all hover:bg-primary/5">
                                                        <span className="material-symbols-outlined text-gray-300 dark:text-white/10 group-hover:text-primary transition-colors">add_circle</span>
                                                        <span className="text-xs font-black uppercase tracking-widest text-gray-300 dark:text-white/10 group-hover:text-primary">Novo Agendamento</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {viewMode === 'week' && (
                            <div className="flex flex-col gap-6">
                                <div className="bg-surface-darker/50 rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-primary/5 to-transparent">
                                    <h4 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary text-sm">analytics</span>Resumo da Semana</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-background-dark rounded-2xl p-4 border border-white/5">
                                            <p className="text-text-muted text-[10px] font-bold uppercase mb-1">Agendamentos</p>
                                            <p className="text-white font-black text-2xl">{appointments.length}</p>
                                        </div>
                                        <div className="bg-background-dark rounded-2xl p-4 border border-white/5">
                                            <p className="text-text-muted text-[10px] font-bold uppercase mb-1">Previsão</p>
                                            <p className="text-primary font-black text-2xl">R$ {appointments.reduce((sum, app) => sum + (parseFloat(app.value) || 0), 0).toFixed(0)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-white/40 text-[10px] font-black uppercase tracking-widest px-2">Detalhes Diários</h3>
                                    {weekDays.map((day) => {
                                        const dayApps = appointments.filter(a => a.appointment_date === day.full);
                                        return (
                                            <div key={day.full} onClick={() => { setSelectedDate(day.full); setViewMode('day'); }} className="bg-surface-dark rounded-3xl p-5 border border-white/5 hover:border-primary/30 transition-all active:scale-[0.98] cursor-pointer">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-12 rounded-2xl bg-background-dark border border-primary/20 flex flex-col items-center justify-center">
                                                            <span className="text-primary text-[10px] font-black">{day.dayName}</span>
                                                            <span className="text-white text-xl font-black">{day.dayNum}</span>
                                                        </div>
                                                        <div><h3 className="text-white font-black text-lg">Agendamentos</h3><p className="text-text-muted text-xs font-bold">{dayApps.length} Marcados hoje</p></div>
                                                    </div>
                                                    <span className="material-symbols-outlined text-gray-500">chevron_right</span>
                                                </div>
                                                {dayApps.length > 0 ? (
                                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                                        {dayApps.slice(0, 3).map(app => (
                                                            <div key={app.id} className="min-w-[120px] bg-background-dark/50 p-2 rounded-xl border border-white/5">
                                                                <p className="text-white text-[10px] font-bold truncate">{app.client?.name}</p>
                                                                <p className="text-primary text-[10px] font-black">{app.appointment_time}</p>
                                                            </div>
                                                        ))}
                                                        {dayApps.length > 3 && <div className="min-w-[40px] flex items-center justify-center text-text-muted text-xs font-black">+{dayApps.length - 3}</div>}
                                                    </div>
                                                ) : <p className="text-text-muted text-xs italic font-medium opacity-50">Nenhum atendimento</p>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {viewMode === 'month' && (
                            <div className="flex flex-col gap-6">
                                <div className="grid grid-cols-7 gap-1">
                                    {WEEK_DAYS_SHORT.map(d => <div key={d} className="text-center text-[10px] font-black text-gray-500 pb-2">{d[0]}</div>)}
                                    {calendarDays.map((d, i) => {
                                        const hasApps = d.full && appointments.some(a => a.appointment_date === d.full);
                                        const isSelected = d.full === selectedDate;
                                        return (
                                            <button key={i} disabled={!d.current} onClick={() => { if (d.full) { setSelectedDate(d.full); setViewMode('day'); } }} className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all ${!d.current ? 'opacity-20' : isSelected ? 'bg-primary text-background-dark' : 'bg-surface-dark hover:bg-surface-highlight'}`}>
                                                <span className={`text-sm font-black ${isSelected ? 'text-background-dark' : 'text-white'}`}>{d.day}</span>
                                                {hasApps && <div className={`absolute bottom-1.5 size-1.5 rounded-full ${isSelected ? 'bg-background-dark' : 'bg-primary'}`}></div>}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="bg-surface-darker/50 rounded-3xl p-6 border border-white/5"><h4 className="text-white font-black text-sm uppercase tracking-widest mb-4">Resumo do Mês</h4><div className="grid grid-cols-2 gap-4"><div className="bg-background-dark rounded-2xl p-4 border border-white/5"><p className="text-text-muted text-[10px] font-bold uppercase mb-1">Total</p><p className="text-white font-black text-2xl">{appointments.length}</p></div><div className="bg-background-dark rounded-2xl p-4 border border-white/5"><p className="text-text-muted text-[10px] font-bold uppercase mb-1">Confirmados</p><p className="text-primary font-black text-2xl">{appointments.filter(a => a.status === 'confirmed' || a.status === 'completed').length}</p></div></div></div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Management Overlay / Modal */}
            {selectedAppointmentId && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background-dark/80 backdrop-blur-sm animate-in fade-in duration-300 px-4 pb-8">
                    <div className="w-full max-w-md bg-surface-dark rounded-[2.5rem] border border-white/5 p-6 shadow-2xl animate-in slide-in-from-bottom duration-500">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${STATUS_MAP[selectedAppointment?.status]?.bg} ${STATUS_MAP[selectedAppointment?.status]?.color} mb-2 inline-block`}>
                                    {STATUS_MAP[selectedAppointment?.status]?.label}
                                </span>
                                <h2 className="text-white font-black text-2xl tracking-tight">{selectedAppointment?.client?.name}</h2>
                                <div className="mt-2 space-y-1">
                                    {selectedAppointment?.services_list?.map((s: any, idx: number) => (
                                        <p key={idx} className="text-primary font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">content_cut</span>
                                            {s.name} ({s.duration} min)
                                        </p>
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => { setSelectedAppointmentId(null); setIsRescheduling(false); }} className="size-10 bg-white/5 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {!isRescheduling ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="bg-background-dark p-4 rounded-2xl border border-white/5">
                                        <p className="text-[10px] font-bold text-text-muted uppercase mb-1">Horário</p>
                                        <p className="text-white font-black text-lg">{selectedAppointment?.appointment_time}</p>
                                    </div>
                                    <div className="bg-background-dark p-4 rounded-2xl border border-white/5">
                                        <p className="text-[10px] font-bold text-text-muted uppercase mb-1">Valor</p>
                                        <p className="text-white font-black text-lg">{formatCurrency(selectedAppointment?.value || 0)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => updateAppointmentStatus(selectedAppointmentId, 'confirmed')}
                                        className="flex flex-col items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary p-4 rounded-2xl border border-primary/20 transition-all font-black text-xs uppercase tracking-widest"
                                    >
                                        <span className="material-symbols-outlined">verified</span>
                                        Confirmar
                                    </button>
                                    <button
                                        onClick={() => { setIsRescheduling(true); setRescheduleDate(selectedAppointment?.appointment_date); setRescheduleTime(selectedAppointment?.appointment_time); }}
                                        className="flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white p-4 rounded-2xl border border-white/10 transition-all font-black text-xs uppercase tracking-widest"
                                    >
                                        <span className="material-symbols-outlined">event_repeat</span>
                                        Remarcar
                                    </button>
                                    <button
                                        onClick={() => updateAppointmentStatus(selectedAppointmentId, 'completed')}
                                        className="flex flex-col items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 p-4 rounded-2xl border border-green-500/20 transition-all font-black text-xs uppercase tracking-widest"
                                    >
                                        <span className="material-symbols-outlined">check_circle</span>
                                        Finalizar
                                    </button>
                                    <button
                                        onClick={() => updateAppointmentStatus(selectedAppointmentId, 'cancelled_barber')}
                                        className="flex flex-col items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 p-4 rounded-2xl border border-red-500/20 transition-all font-black text-xs uppercase tracking-widest"
                                    >
                                        <span className="material-symbols-outlined">block</span>
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div>
                                    <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block">Nova Data</label>
                                    <input
                                        type="date"
                                        value={rescheduleDate}
                                        onChange={e => setRescheduleDate(e.target.value)}
                                        className="w-full h-14 bg-background-dark border border-white/10 rounded-2xl px-4 text-white font-bold focus:ring-1 focus:ring-primary [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block">Novo Horário</label>
                                    <input
                                        type="time"
                                        value={rescheduleTime}
                                        onChange={e => setRescheduleTime(e.target.value)}
                                        className="w-full h-14 bg-background-dark border border-white/10 rounded-2xl px-4 text-white font-bold focus:ring-1 focus:ring-primary [color-scheme:dark]"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setIsRescheduling(false)} className="flex-1 h-14 rounded-2xl bg-white/5 text-white font-black text-sm uppercase tracking-widest">Voltar</button>
                                    <button onClick={handleReschedule} className="flex-[2] h-14 rounded-2xl bg-primary text-background-dark font-black text-sm uppercase tracking-widest shadow-gold shadow-primary/20">Confirmar Remarcação</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Floating Action Button */}
            <button className="absolute bottom-28 right-6 size-14 bg-primary hover:bg-[#c9a026] text-background-dark rounded-full shadow-gold flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-50">
                <span className="material-symbols-outlined text-3xl font-black">add</span>
            </button>

            <BarberNavigation />
        </div>
    );
};

export default BarberSchedule;
