import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase.ts';
import { User, Appointment } from '../types.ts';
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
                    client:client_id(name, avatar),
                    service:service_id(name)
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

            appointments?.forEach(app => {
                const val = parseFloat(app.value) || 0;
                const isEarned = app.status === 'confirmed' || app.status === 'completed';
                if (!isEarned) return;

                const appDate = new Date(app.appointment_date + 'T00:00:00');

                if (app.appointment_date === todayStr) today += val;
                if (appDate >= startOfWeek) week += val;
                month += val;
            });

            setStats({
                today,
                week,
                month,
                history: appointments || []
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
                    <button onClick={() => navigate('/barber/schedule')} className="group flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm transition-all active:scale-95 dark:bg-surface-dark dark:text-white dark:hover:bg-surface-dark/80 border border-gray-100 dark:border-white/5">
                        <span className="material-symbols-outlined text-primary transition-transform group-hover:scale-110">calendar_month</span>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto no-scrollbar">
                    {/* Summary Cards Section */}
                    <section className="flex flex-col gap-4 px-4 pt-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold leading-tight tracking-[-0.015em]">Resumo de Ganhos</h3>
                            <button className="text-xs font-bold text-primary hover:underline">Ver Relatórios</button>
                        </div>
                        {/* Horizontal Scroll Container for Cards */}
                        <div className="flex snap-x gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide no-scrollbar">
                            {/* Daily Card */}
                            <div className="snap-center shrink-0 relative flex w-[280px] flex-col gap-4 overflow-hidden rounded-2xl bg-white p-5 shadow-lg dark:bg-surface-dark dark:shadow-black/40 border border-gray-100 dark:border-white/5">
                                <div className="absolute -right-4 -top-4 opacity-[0.03] dark:opacity-[0.05]">
                                    <span className="material-symbols-outlined text-[120px]">wb_sunny</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                            <span className="material-symbols-outlined text-lg">today</span>
                                        </div>
                                        <span className="text-sm font-medium text-slate-500 dark:text-gray-400">Hoje</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">R$ {stats.today.toFixed(2).replace('.', ',')}</p>
                                    <div className="mt-2 flex items-center gap-1 text-sm font-medium text-green-500">
                                        <span className="material-symbols-outlined text-base">trending_up</span>
                                        <span>Em progresso</span>
                                    </div>
                                </div>
                            </div>
                            {/* Weekly Card */}
                            <div className="snap-center shrink-0 relative flex w-[280px] flex-col gap-4 overflow-hidden rounded-2xl bg-white p-5 shadow-lg dark:bg-surface-dark dark:shadow-black/40 border border-gray-100 dark:border-white/5">
                                <div className="absolute -right-4 -top-4 opacity-[0.03] dark:opacity-[0.05]">
                                    <span className="material-symbols-outlined text-[120px]">date_range</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                            <span className="material-symbols-outlined text-lg">calendar_view_week</span>
                                        </div>
                                        <span className="text-sm font-medium text-slate-500 dark:text-gray-400">Semana</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">R$ {stats.week.toFixed(2).replace('.', ',')}</p>
                                    <div className="mt-2 flex items-center gap-1 text-sm font-medium text-green-500">
                                        <span className="material-symbols-outlined text-base">trending_up</span>
                                        <span>Estimado</span>
                                    </div>
                                </div>
                            </div>
                            {/* Monthly Card */}
                            <div className="snap-center shrink-0 relative flex w-[280px] flex-col gap-4 overflow-hidden rounded-2xl bg-white p-5 shadow-lg dark:bg-surface-dark dark:shadow-black/40 border border-gray-100 dark:border-white/5">
                                <div className="absolute -right-4 -top-4 opacity-[0.03] dark:opacity-[0.05]">
                                    <span className="material-symbols-outlined text-[120px]">account_balance_wallet</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                            <span className="material-symbols-outlined text-lg">calendar_month</span>
                                        </div>
                                        <span className="text-sm font-medium text-slate-500 dark:text-gray-400">Mês</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">R$ {stats.month.toFixed(2).replace('.', ',')}</p>
                                    <div className="mt-2 flex items-center gap-1 text-sm font-medium text-green-500">
                                        <span className="material-symbols-outlined text-base">trending_up</span>
                                        <span>Fechamento</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Transactions List */}
                    <section className="flex flex-col gap-4 px-4 pt-2">
                        <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] text-slate-900 dark:text-white">Histórico de Atendimentos</h3>
                        <div className="flex flex-col gap-3 pb-8">
                            {stats.history.length > 0 ? (
                                stats.history.map((app) => (
                                    <div key={app.id} className="group flex items-center justify-between rounded-xl bg-white p-3 shadow-sm transition-colors hover:bg-slate-50 dark:bg-surface-dark dark:hover:bg-surface-dark/80 border border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-[56px] w-[56px] shadow-inner ring-1 ring-gray-100 dark:ring-white/10"
                                                style={{ backgroundImage: `url("${app.client?.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCZVE5hBRYsPYen69kDlzLDHlLXUAXwm5d-BfE92U29IuHXLLzPMfA6tLKSfFdQeHsxsFfz6eXV8LJ9Ux9UET7EXanIm0Rcc7hzMNglwy9iC3w4mZH8zO8UZIIRrzyGl9PTmPWldZZE46xmsNPtN3GbzqILDpLfr0jT-14MaB5pIhBzUQFnsYwz6lcYucokK23Y0dtxqI3BQsVAmN7Y5ZDXr5EcJLOtkxWTQKAYoaZeiM4xGb-a7Y-Wkiw4Ew_zPv1N3QTs-E_ejSo'}")` }}
                                            ></div>
                                            <div className="flex flex-col justify-center gap-0.5">
                                                <p className="text-base font-bold leading-none text-slate-900 dark:text-white">{app.client?.name || 'Cliente'}</p>
                                                <p className="text-xs font-medium text-slate-500 dark:text-gray-400">{app.service?.name}</p>
                                                <p className="text-[11px] text-slate-400 dark:text-gray-500">
                                                    {new Date(app.appointment_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}, {app.appointment_time}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5">
                                            <p className={`text-base font-bold ${app.status === 'confirmed' || app.status === 'completed' ? 'text-primary' : 'text-slate-400 dark:text-gray-500'}`}>
                                                R$ {parseFloat(app.value).toFixed(2).replace('.', ',')}
                                            </p>
                                            <div className={`flex items-center rounded-full px-2 py-0.5 border ${app.status === 'confirmed' || app.status === 'completed'
                                                ? 'bg-green-100 border-green-200 dark:bg-green-500/10 dark:border-green-500/20'
                                                : app.status === 'pending'
                                                    ? 'bg-primary/10 border-primary/20'
                                                    : 'bg-red-100 border-red-200 dark:bg-red-500/10 dark:border-red-500/20'
                                                }`}>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${app.status === 'confirmed' || app.status === 'completed'
                                                    ? 'text-green-700 dark:text-green-400'
                                                    : app.status === 'pending'
                                                        ? 'text-primary'
                                                        : 'text-red-700 dark:text-red-400'
                                                    }`}>
                                                    {app.status === 'confirmed' || app.status === 'completed' ? 'Pago' : app.status === 'pending' ? 'Pendente' : 'Canc.'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 flex flex-col items-center justify-center opacity-30">
                                    <span className="material-symbols-outlined text-5xl mb-2">history</span>
                                    <p className="text-sm font-bold uppercase tracking-widest">Sem movimentações</p>
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
