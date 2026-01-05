
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase.ts';
import { User, Appointment } from '../types.ts';
import { formatCurrency } from '../utils.ts';
import BarberNavigation from '../components/BarberNavigation.tsx';
import BarberSidebar from '../components/BarberSidebar.tsx';

interface BarberFinancesProps {
    user: User;
    onLogout: () => void;
}

const BarberFinances: React.FC<BarberFinancesProps> = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [stats, setStats] = useState({
        today: 0,
        week: 0,
        month: 0,
        history: [] as any[]
    });

    useEffect(() => {
        fetchFinanceData();
    }, [user.id]);

    const fetchFinanceData = async () => {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

            const { data: appointments, error } = await supabase
                .from('appointments')
                .select(`
                    *,
                    client:client_id(name, avatar_url, avatar_pos_x, avatar_pos_y, avatar_zoom),
                    appointment_services(
                        service:service_id(name)
                    )
                `)
                .eq('barber_id', user.id)
                .gte('appointment_date', startOfMonth)
                .order('appointment_date', { ascending: false })
                .order('appointment_time', { ascending: false });

            if (error) throw error;

            const todayStr = now.toISOString().split('T')[0];
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);

            let today = 0;
            let week = 0;
            let month = 0;

            const mappedData = appointments?.map(app => {
                const val = parseFloat(app.value) || 0;
                const isEarned = app.status === 'completed';
                const services_list = app.appointment_services?.map((as: any) => as.service) || [];

                if (isEarned) {
                    const appDate = new Date(app.appointment_date + 'T00:00:00');
                    if (app.appointment_date === todayStr) today += val;
                    if (appDate >= startOfWeek) week += val;
                    month += val;
                }

                return {
                    ...app,
                    services_list,
                    display_services: services_list.map((s: any) => s.name).join(' + ') || 'Sem serviço'
                };
            }) || [];

            setStats({
                today,
                week,
                month,
                history: mappedData
            });
        } catch (err) {
            console.error('Error fetching finances:', err);
        } finally {
            setLoading(false);
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
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased">
            <BarberSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                user={user}
                onLogout={onLogout}
            />

            <div className="relative flex min-h-screen flex-col overflow-x-hidden pb-[80px] max-w-md mx-auto bg-background-light dark:bg-background-dark shadow-2xl">
                {/* Top App Bar */}
                <header className="sticky top-0 z-30 flex items-center justify-between bg-background-light/95 px-4 py-4 backdrop-blur-md dark:bg-background-dark/95 border-b border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-surface-dark transition-colors relative text-slate-900 dark:text-white">
                            <span className="material-symbols-outlined">menu</span>
                            <div className="absolute top-1 left-1 size-2 bg-primary rounded-full animate-pulse"></div>
                        </button>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-500 dark:text-gray-400">Bem-vindo, {user.name.split(' ')[0]}</span>
                            <h2 className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">Financeiro</h2>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto no-scrollbar">
                    {/* Summary Cards Section */}
                    <section className="flex flex-col gap-4 px-4 pt-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold leading-tight tracking-[-0.015em]">Resumo de Ganhos</h3>
                        </div>
                        <div className="flex snap-x gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide no-scrollbar">
                            <div className="snap-center shrink-0 relative flex w-[280px] flex-col gap-4 overflow-hidden rounded-3xl bg-white p-6 shadow-xl dark:bg-surface-dark dark:shadow-black/40 border border-gray-100 dark:border-white/5">
                                <div className="absolute -right-4 -top-4 opacity-[0.03] dark:opacity-[0.1]">
                                    <span className="material-symbols-outlined text-[120px]">payments</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <span className="material-symbols-outlined text-xl">today</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-500 dark:text-gray-400">Hoje</span>
                                </div>
                                <div>
                                    <p className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{formatCurrency(stats.today)}</p>
                                    <div className="mt-2 flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-green-500">
                                        <span className="material-symbols-outlined text-sm">trending_up</span>
                                        <span>Ganhos do dia</span>
                                    </div>
                                </div>
                            </div>
                            <div className="snap-center shrink-0 relative flex w-[280px] flex-col gap-4 overflow-hidden rounded-3xl bg-white p-6 shadow-xl dark:bg-surface-dark dark:shadow-black/40 border border-gray-100 dark:border-white/5">
                                <div className="absolute -right-4 -top-4 opacity-[0.03] dark:opacity-[0.1]">
                                    <span className="material-symbols-outlined text-[120px]">calendar_view_week</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <span className="material-symbols-outlined text-xl">event</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-500 dark:text-gray-400">Semana</span>
                                </div>
                                <div>
                                    <p className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{formatCurrency(stats.week)}</p>
                                    <div className="mt-2 flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-green-500">
                                        <span className="material-symbols-outlined text-sm">trending_up</span>
                                        <span>Total na semana</span>
                                    </div>
                                </div>
                            </div>
                            <div className="snap-center shrink-0 relative flex w-[280px] flex-col gap-4 overflow-hidden rounded-3xl bg-white p-6 shadow-xl dark:bg-surface-dark dark:shadow-black/40 border border-gray-100 dark:border-white/5">
                                <div className="absolute -right-4 -top-4 opacity-[0.03] dark:opacity-[0.1]">
                                    <span className="material-symbols-outlined text-[120px]">account_balance_wallet</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <span className="material-symbols-outlined text-xl">savings</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-500 dark:text-gray-400">Mensal</span>
                                </div>
                                <div>
                                    <p className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{formatCurrency(stats.month)}</p>
                                    <div className="mt-2 flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-green-500">
                                        <span className="material-symbols-outlined text-sm">trending_up</span>
                                        <span>Faturamento mês</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Transactions List */}
                    <section className="flex flex-col gap-4 px-4 mt-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] text-slate-900 dark:text-white">Histórico Detalhado</h3>
                            <button onClick={fetchFinanceData} className="p-2 bg-white/5 rounded-lg active:scale-95 transition-all">
                                <span className="material-symbols-outlined text-primary">refresh</span>
                            </button>
                        </div>
                        <div className="flex flex-col gap-4 pb-12">
                            {stats.history.length > 0 ? (
                                stats.history.map((app) => (
                                    <div key={app.id} className="group relative flex items-center justify-between rounded-3xl bg-white p-4 shadow-soft transition-all hover:bg-slate-50 dark:bg-surface-dark dark:hover:bg-surface-dark/60 border border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="bg-center bg-no-repeat aspect-square bg-cover rounded-2xl h-14 w-14 shadow-inner ring-1 ring-gray-100 dark:ring-white/10"
                                                style={{
                                                    backgroundImage: `url("${app.client?.avatar_url || 'https://ih1.redbubble.net/image.1024340084.6729/flat,750x,075,f-pad,750x1000,f8f8f8.jpg'}")`,
                                                    backgroundPosition: `${app.client?.avatar_pos_x ?? 50}% ${app.client?.avatar_pos_y ?? 50}%`,
                                                    backgroundSize: `${app.client?.avatar_zoom ?? 100}%`
                                                }}
                                            ></div>
                                            <div className="flex flex-col justify-center gap-1">
                                                <p className="text-base font-black leading-none text-slate-900 dark:text-white">{app.client?.name || 'Cliente'}</p>
                                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest truncate max-w-[150px]">
                                                    {[...new Set(app.appointment_services?.map((as: any) => as.service?.name))].join(' + ') || 'Sem serviço'}
                                                </p>
                                                <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-tight">
                                                    {new Date(app.appointment_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}, {app.appointment_time}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <p className={`text-lg font-black ${app.status === 'confirmed' || app.status === 'completed' ? 'text-white' : 'text-slate-400 dark:text-gray-500'}`}>
                                                {formatCurrency(app.value)}
                                            </p>
                                            <div className={`flex items-center rounded-lg px-2 py-1 border ${app.status === 'completed'
                                                ? 'bg-green-500/10 border-green-500/20'
                                                : app.status === 'confirmed' || app.status === 'pending'
                                                    ? 'bg-primary/10 border-primary/20'
                                                    : 'bg-red-500/10 border-red-500/20'
                                                }`}>
                                                <span className={`text-[9px] font-black uppercase tracking-wider ${app.status === 'completed'
                                                    ? 'text-green-400'
                                                    : app.status === 'confirmed' || app.status === 'pending'
                                                        ? 'text-primary'
                                                        : 'text-red-400'
                                                    }`}>
                                                    {app.status === 'completed' ? 'Pago' : app.status === 'confirmed' || app.status === 'pending' ? 'Pendente' : 'Canc.'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 flex flex-col items-center justify-center opacity-30 text-center px-10">
                                    <span className="material-symbols-outlined text-6xl mb-4 text-primary">account_balance_wallet</span>
                                    <p className="text-sm font-black uppercase tracking-[0.2em]">Sem movimentações no período</p>
                                </div>
                            )}
                        </div>
                    </section>
                </main>

                <BarberNavigation />
            </div>
        </div>
    );
};

export default BarberFinances;
