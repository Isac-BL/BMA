
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase.ts';
import { User, Appointment } from '../types.ts';
import { formatCurrency } from '../utils.ts';
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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

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
    fetchNotifications();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel('realtime_notifications')
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

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch appointments from the start of the current month
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:client_id(name),
          appointment_services(service:service_id(name))
        `)
        .eq('barber_id', user.id)
        .gte('appointment_date', startOfMonthStr)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) throw error;

      // Calculate Stats
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);

      let todayCount = 0;
      let weekCount = 0;
      let monthCount = 0;
      let todayRevenue = 0;
      let weekRevenue = 0;
      let monthRevenue = 0;
      let nextAppCandidate: any = null;

      appointments?.forEach(app => {
        const appDateOnly = new Date(app.appointment_date + 'T00:00:00');
        const isCancelled = app.status.startsWith('cancelled');
        const isEarned = app.status === 'completed';

        if (app.appointment_date === todayStr && !isCancelled) {
          todayCount++;
          if (isEarned) todayRevenue += parseFloat(app.value) || 0;

          // Find next appointment for today
          const [h, m] = app.appointment_time.split(':').map(Number);
          const appTime = new Date();
          appTime.setHours(h, m, 0, 0);
          if (appTime > now && !nextAppCandidate && !isCancelled) {
            nextAppCandidate = app;
          }
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

      setStats({
        todayCount,
        weekCount,
        monthCount,
        todayRevenue,
        weekRevenue,
        monthRevenue,
        nextAppointment: nextAppCandidate ? {
          clientName: nextAppCandidate.client?.name || 'Cliente',
          time: nextAppCandidate.appointment_time,
          serviceName: nextAppCandidate.appointment_services?.map((as: any) => as.service?.name).join(' + ') || 'Serviço'
        } : null
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
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
              {notifications.length > 0 && (
                <div className="absolute top-1 left-1 size-2 bg-primary rounded-full animate-pulse"></div>
              )}
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500 dark:text-gray-400">{formattedDate}</span>
              <h2 className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">Olá, {firstName}</h2>
            </div>
          </div>
          <button onClick={() => setShowNotifications(true)} className="relative h-10 w-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-surface-dark text-slate-900 dark:text-white hover:scale-105 active:scale-95 transition-all">
            <span className="material-symbols-outlined">notifications</span>
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-background-dark ring-2 ring-white dark:ring-background-dark">
                {notifications.length}
              </span>
            )}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar">
          {/* Main Revenue Card */}
          <section className="px-4 pt-4">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-surface-dark p-6 shadow-2xl shadow-primary/20 border border-white/5">
              <div className="absolute -right-8 -top-8 size-40 rounded-full bg-primary/10 blur-3xl"></div>
              <div className="absolute -left-8 -bottom-8 size-40 rounded-full bg-primary/5 blur-3xl"></div>

              <div className="relative space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <span className="material-symbols-outlined">payments</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Faturamento Hoje</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-green-500 text-[10px] font-black uppercase tracking-widest bg-green-500/10 px-2 py-1 rounded-lg">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    <span>No Ar</span>
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <h1 className="text-5xl font-black tracking-tight text-white">
                    {formatCurrency(stats.todayRevenue)}
                  </h1>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-2xl bg-white/5 p-3 border border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Semana</p>
                    <p className="text-lg font-black text-white">{formatCurrency(stats.weekRevenue)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3 border border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Mês</p>
                    <p className="text-lg font-black text-white">{formatCurrency(stats.monthRevenue)}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Next Appointment Card */}
          <section className="px-4 mt-6">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-gray-400 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary">schedule_send</span>
                Próximo Cliente
              </h3>
            </div>
            {stats.nextAppointment ? (
              <div className="group relative flex items-center justify-between rounded-3xl bg-white p-5 shadow-soft transition-all hover:bg-slate-50 dark:bg-surface-dark dark:hover:bg-surface-dark/60 border border-slate-100 dark:border-white/5 overflow-hidden">
                <div className="absolute left-0 top-0 h-full w-1.5 bg-primary"></div>
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-3xl">person</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-lg font-black leading-none text-slate-900 dark:text-white capitalize">{stats.nextAppointment.clientName}</h4>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.15em]">{stats.nextAppointment.serviceName}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.nextAppointment.time}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">Confirmado</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 rounded-3xl bg-white/50 dark:bg-surface-dark/20 border border-dashed border-slate-200 dark:border-white/5">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-white/10 mb-2">event_busy</span>
                <p className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Sem agendamentos próximos</p>
              </div>
            )}
          </section>

          {/* Quick Stats Grid */}
          <section className="grid grid-cols-3 gap-3 px-4 mt-6">
            <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-4 shadow-soft dark:bg-surface-dark border border-slate-100 dark:border-white/5">
              <span className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase mb-1">Hoje</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.todayCount}</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-4 shadow-soft dark:bg-surface-dark border border-slate-100 dark:border-white/5">
              <span className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase mb-1">Semana</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.weekCount}</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-4 shadow-soft dark:bg-surface-dark border border-slate-100 dark:border-white/5">
              <span className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase mb-1">Mês</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.monthCount}</span>
            </div>
          </section>

          {/* Activity Section */}
          <section className="px-4 mt-8 pb-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-gray-400">Atalhos Rápidos</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => navigate('/barber/schedule')} className="flex flex-col items-center gap-3 p-6 rounded-[2rem] bg-primary text-background-dark shadow-gold hover:scale-[1.02] active:scale-[0.98] transition-all group">
                <span className="material-symbols-outlined text-4xl">calendar_month</span>
                <span className="font-black text-sm uppercase tracking-widest">Agenda</span>
              </button>
              <button onClick={() => navigate('/barber/finances')} className="flex flex-col items-center gap-3 p-6 rounded-[2rem] bg-surface-dark text-white border border-white/5 hover:bg-surface-highlight hover:scale-[1.02] active:scale-[0.98] transition-all">
                <span className="material-symbols-outlined text-4xl text-primary">account_balance_wallet</span>
                <span className="font-black text-sm uppercase tracking-widest">Finanças</span>
              </button>
            </div>
          </section>
        </main>

        <BarberNavigation />
      </div>

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
                notifications.map((notif: any) => (
                  <div key={notif.id} className="p-5 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-primary text-[10px] font-black uppercase tracking-widest">Novo Agendamento</p>
                      <p className="text-white/20 text-[10px] font-bold">{new Date(notif.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <p className="text-white text-sm font-bold leading-relaxed">{notif.content}</p>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                  <span className="material-symbols-outlined text-6xl mb-2">notifications_off</span>
                  <p className="text-xs font-black uppercase tracking-widest">Sem novas notificações</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarberDashboard;
