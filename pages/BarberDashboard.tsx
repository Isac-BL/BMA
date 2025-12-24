import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase.ts';
import { User, Appointment } from '../types.ts';
import BarberNavigation from '../components/BarberNavigation.tsx';
import BarberSidebar from '../components/BarberSidebar.tsx';

interface BarberDashboardProps {
  user: User;
  onLogout: () => void;
}

interface DashboardStats {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  nextAppointment: {
    clientName: string;
    time: string;
    serviceName: string;
  } | null;
}

const BarberDashboard: React.FC<BarberDashboardProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    todayCount: 0,
    weekCount: 0,
    monthCount: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    nextAppointment: null
  });

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const formattedDate = today.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    weekday: 'long'
  });
  const firstName = user.name.split(' ')[0];

  useEffect(() => {
    fetchDashboardData();
  }, [user.id]);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch appointments from the start of the current month for accurate stats
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:client_id(name),
          service:service_id(name)
        `)
        .eq('barber_id', user.id)
        .gte('appointment_date', startOfMonthStr)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) throw error;

      // 2. Calculate Stats
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      // reset time for comparison
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);

      let todayCount = 0;
      let weekCount = 0;
      let monthCount = 0;
      let todayRevenue = 0;
      let weekRevenue = 0;
      let monthRevenue = 0;

      appointments?.forEach(app => {
        const appDateOnly = new Date(app.appointment_date + 'T00:00:00');
        const isCancelled = app.status.startsWith('cancelled');
        const isEarned = app.status === 'confirmed' || app.status === 'completed';

        if (app.appointment_date === todayStr && !isCancelled) {
          todayCount++;
          if (isEarned) todayRevenue += parseFloat(app.value) || 0;
        }

        if (appDateOnly >= startOfWeek && !isCancelled) {
          weekCount++;
          if (isEarned) weekRevenue += parseFloat(app.value) || 0;
        }

        if (appDateOnly >= startOfMonthDate && !isCancelled) {
          monthCount++;
          if (isEarned) monthRevenue += parseFloat(app.value) || 0;
        }
      });

      // 3. Find Next Appointment (closest to now, must be pending or confirmed)
      // We search from today onwards
      const nextApp = appointments?.find(app => {
        const appTime = new Date(app.appointment_date + 'T' + app.appointment_time);
        return appTime >= now && (app.status === 'pending' || app.status === 'confirmed');
      });

      setStats({
        todayCount,
        weekCount,
        monthCount,
        todayRevenue,
        weekRevenue,
        monthRevenue,
        nextAppointment: nextApp ? {
          clientName: (nextApp.client as any)?.name || 'Cliente',
          time: nextApp.appointment_time,
          serviceName: (nextApp.service as any)?.name || 'Serviço'
        } : null
      });

    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
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
    <div className="bg-background-light dark:bg-background-dark font-display text-white transition-colors duration-300 min-h-screen">
      <BarberSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        onLogout={onLogout}
      />
      <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto overflow-hidden bg-background-light dark:bg-background-dark shadow-2xl">
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-surface-dark transition-colors relative text-slate-900 dark:text-white">
              <span className="material-symbols-outlined">menu</span>
              <div className="absolute top-1 left-1 size-2 bg-primary rounded-full animate-pulse"></div>
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-none mb-0.5">Bem-vindo,</span>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-none">{user.name}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center justify-center size-10 rounded-full bg-gray-100 dark:bg-surface-dark text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-primary/20 transition-colors relative">
              <span className="material-symbols-outlined text-[24px]">notifications</span>
              <span className="absolute top-2.5 right-2.5 size-2 bg-primary rounded-full animate-pulse"></span>
            </button>
            <button
              onClick={onLogout}
              className="flex items-center justify-center size-10 rounded-full bg-gray-100 dark:bg-surface-dark text-gray-900 dark:text-white hover:bg-red-500/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
          <section className="px-6 pt-6 pb-2">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Olá, {firstName}
                <span className="text-2xl animate-pulse">👋</span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                {formattedDate}
              </p>
            </div>
          </section>

          <section className="px-6 py-4">
            {stats.nextAppointment ? (
              <div className="w-full bg-gradient-to-r from-surface-darker to-surface-dark border border-white/5 rounded-xl p-4 flex items-center justify-between shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">content_cut</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Próximo Cliente</p>
                    <p className="font-bold text-white">{stats.nextAppointment.clientName}</p>
                    <p className="text-[10px] text-primary/80 uppercase font-bold">{stats.nextAppointment.serviceName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Horário</p>
                  <p className="font-bold text-primary">{stats.nextAppointment.time}</p>
                </div>
              </div>
            ) : (
              <div className="w-full bg-surface-dark/50 border border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-gray-500 text-3xl">event_busy</span>
                <p className="text-sm text-gray-400">Nenhum agendamento pendente</p>
              </div>
            )}
          </section>

          <section className="px-6 pb-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Agendamentos</h3>
              <button
                onClick={() => navigate('/barber/hours')}
                className="text-primary text-xs font-semibold hover:text-primary/80 transition-colors"
              >
                Ver Agenda
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-surface-dark rounded-xl p-3 flex flex-col items-center justify-center gap-1 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="size-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-1">
                  <span className="material-symbols-outlined text-[18px] text-gray-600 dark:text-gray-300">today</span>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.todayCount}</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Hoje</span>
              </div>
              <div className="bg-white dark:bg-surface-dark rounded-xl p-3 flex flex-col items-center justify-center gap-1 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="size-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-1">
                  <span className="material-symbols-outlined text-[18px] text-gray-600 dark:text-gray-300">date_range</span>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.weekCount}</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Semana</span>
              </div>
              <div className="bg-white dark:bg-surface-dark rounded-xl p-3 flex flex-col items-center justify-center gap-1 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="size-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-1">
                  <span className="material-symbols-outlined text-[18px] text-gray-600 dark:text-gray-300">calendar_month</span>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.monthCount}</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Mês</span>
              </div>
            </div>
          </section>

          <section className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Financeiro</h3>
              <button className="text-primary text-xs font-semibold hover:text-primary/80 transition-colors">Relatórios</button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-white dark:bg-surface-dark rounded-xl p-4 flex items-center justify-between shadow-soft border border-gray-100 dark:border-white/5 relative overflow-hidden">
                <div className="absolute w-1 h-full left-0 top-0 bg-primary/40 rounded-l-xl"></div>
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Faturamento Hoje</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">R$ <span className="text-primary">{stats.todayRevenue.toFixed(2).replace('.', ',')}</span></span>
                  </div>
                </div>
                <div className="flex items-center text-green-500 text-xs font-bold bg-green-500/10 px-2 py-1 rounded">
                  <span className="material-symbols-outlined text-[14px] mr-1">trending_up</span>
                  Ativo
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-surface-dark rounded-xl p-4 flex flex-col justify-between h-32 shadow-soft border border-gray-100 dark:border-white/5 relative overflow-hidden group">
                  <div className="flex justify-between items-start">
                    <div className="size-9 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">bar_chart</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Semanal</p>
                    <p className="text-lg font-bold text-primary">R$ {stats.weekRevenue.toFixed(0)}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-surface-dark rounded-xl p-4 flex flex-col justify-between h-32 shadow-soft border border-gray-100 dark:border-white/5 relative overflow-hidden group">
                  <div className="flex justify-between items-start">
                    <div className="size-9 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Mensal</p>
                    <p className="text-lg font-bold text-primary">R$ {stats.monthRevenue.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <div className="h-6 w-full"></div>
        </main>

        <BarberNavigation />
      </div>
    </div>
  );
};

export default BarberDashboard;
