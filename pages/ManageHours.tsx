import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase.ts';
import { User, WorkingHour, Interval, BlockedDay } from '../types.ts';
import BarberSidebar from '../components/BarberSidebar.tsx';
import BarberNavigation from '../components/BarberNavigation.tsx';

interface ManageHoursProps {
  user: User;
  onLogout: () => void;
}

type HourData = Record<string, { active: boolean; intervals: Interval[] }>;

const ManageHours: React.FC<ManageHoursProps> = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workingHours, setWorkingHours] = useState<HourData>({});
  const [blockedDays, setBlockedDays] = useState<BlockedDay[]>([]);
  const [selectedBlockDate, setSelectedBlockDate] = useState(new Date());

  const days = [
    'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira',
    'Sexta-feira', 'Sábado', 'Domingo'
  ];

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: hours }, { data: blocked }] = await Promise.all([
        supabase.from('working_hours').select('*').eq('barber_id', user.id),
        supabase.from('blocked_days').select('*').eq('barber_id', user.id)
      ]);

      const hoursMap: HourData = {};
      days.forEach((day, index) => {
        const found = hours?.find(h => h.day_of_week === index);
        hoursMap[day] = {
          active: found?.active ?? false,
          intervals: found?.intervals ?? [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '18:00' }]
        };
      });
      setWorkingHours(hoursMap);
      setBlockedDays(blocked || []);
    } catch (err) {
      console.error('Error fetching hours:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveHours = async (day: string) => {
    setSaving(true);
    try {
      const { active, intervals } = workingHours[day];
      const dayIndex = days.indexOf(day);

      const startTime = intervals.length > 0 ? intervals[0].start : '08:00';
      const endTime = intervals.length > 0 ? intervals[intervals.length - 1].end : '18:00';

      // First check if it exists
      const { data: existing } = await supabase
        .from('working_hours')
        .select('id')
        .eq('barber_id', user.id)
        .eq('day_of_week', dayIndex)
        .maybeSingle();

      let error;
      if (existing) {
        // Update
        const { error: updateError } = await supabase
          .from('working_hours')
          .update({
            active,
            intervals,
            start_time: startTime,
            end_time: endTime
          })
          .eq('id', existing.id);
        error = updateError;
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('working_hours')
          .insert({
            barber_id: user.id,
            day_of_week: dayIndex,
            active,
            intervals,
            start_time: startTime,
            end_time: endTime
          });
        error = insertError;
      }

      if (error) throw error;
      alert('Horários salvos com sucesso!');
    } catch (err) {
      const error = err as Error;
      console.error('Error saving hours:', error);
      alert(`Erro ao salvar horários: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], active: !prev[day].active }
    }));
  };

  const addInterval = (day: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        intervals: [...prev[day].intervals, { start: '08:00', end: '12:00' }]
      }
    }));
  };

  const removeInterval = (day: string, index: number) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        intervals: prev[day].intervals.filter((_, i) => i !== index)
      }
    }));
  };

  const updateInterval = (day: string, index: number, field: 'start' | 'end', value: string) => {
    setWorkingHours(prev => {
      const newIntervals = [...prev[day].intervals];
      newIntervals[index] = { ...newIntervals[index], [field]: value };
      return {
        ...prev,
        [day]: { ...prev[day], intervals: newIntervals }
      };
    });
  };

  const addBlockedDay = async (reason: string) => {
    // Avoid timezone shift by getting pieces from the date object
    const year = selectedBlockDate.getFullYear();
    const month = String(selectedBlockDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedBlockDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    try {
      const { data, error } = await supabase
        .from('blocked_days')
        .insert({ barber_id: user.id, blocked_date: dateStr, reason })
        .select()
        .single();

      if (error) throw error;
      setBlockedDays(prev => [...prev, data]);
    } catch (err) {
      const error = err as Error;
      console.error('Error blocking day:', error);
      alert(`Erro ao bloquear: ${error.message}`);
    }
  };

  const removeBlockedDay = async (id: string) => {
    try {
      const { error } = await supabase.from('blocked_days').delete().eq('id', id);
      if (error) throw error;
      setBlockedDays(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Error removing block:', err);
    }
  };

  if (loading) return <div className="min-h-screen bg-background-dark flex items-center justify-center"><div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full"></div></div>;

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-white transition-colors duration-300 min-h-screen">
      <BarberSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        onLogout={onLogout}
      />
      <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto overflow-hidden bg-background-light dark:bg-background-dark shadow-2xl pb-24">
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-surface-dark transition-colors relative text-slate-900 dark:text-white">
              <span className="material-symbols-outlined">menu</span>
              <div className="absolute top-1 left-1 size-2 bg-primary rounded-full animate-pulse"></div>
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-none">Meus Horários</h2>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-8 overflow-y-auto no-scrollbar">
          <section>
            <h3 className="text-primary font-black text-xs uppercase tracking-[0.2em] mb-4">Configuração Semanal</h3>
            <div className="space-y-4">
              {days.map(day => (
                <div key={day} className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-soft">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-extrabold text-slate-900 dark:text-white">{day}</span>
                    <button onClick={() => toggleDay(day)} className={`w-12 h-6 rounded-full relative transition-colors ${workingHours[day].active ? 'bg-primary' : 'bg-gray-200 dark:bg-white/10'}`}>
                      <div className={`absolute top-1 size-4 rounded-full bg-white transition-all ${workingHours[day].active ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                  {workingHours[day].active && (
                    <div className="space-y-3">
                      {workingHours[day].intervals.map((interval, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="time" value={interval.start} onChange={e => updateInterval(day, i, 'start', e.target.value)} className="bg-gray-50 dark:bg-background-dark border border-gray-100 dark:border-white/5 rounded-xl px-3 py-2 text-sm font-bold [color-scheme:dark]" />
                          <span className="text-gray-400">até</span>
                          <input type="time" value={interval.end} onChange={e => updateInterval(day, i, 'end', e.target.value)} className="bg-gray-50 dark:bg-background-dark border border-gray-100 dark:border-white/5 rounded-xl px-3 py-2 text-sm font-bold [color-scheme:dark]" />
                          <button onClick={() => removeInterval(day, i)} className="text-red-500 p-1"><span className="material-symbols-outlined text-lg">delete</span></button>
                        </div>
                      ))}
                      <div>
                        <button onClick={() => addInterval(day)} className="text-[10px] font-black uppercase text-primary border border-primary/20 rounded-lg px-3 py-1.5">+ Adicionar Intervalo</button>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex justify-end">
                    <button onClick={() => saveHours(day)} className={`text-[10px] font-black uppercase rounded-lg px-6 py-2 shadow-gold transition-all active:scale-95 ${workingHours[day].active ? 'bg-primary text-background-dark' : 'bg-surface-dark border border-white/10 text-white/50 hover:bg-surface-highlight hover:text-white'}`}>
                      {workingHours[day].active ? 'Salvar Horários' : 'Confirmar Dia Fechado'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-primary font-black text-xs uppercase tracking-[0.2em] mb-4">Dias Bloqueados</h3>
            <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-soft">
              <div className="flex gap-2 mb-6">
                <input type="date" value={selectedBlockDate.toISOString().split('T')[0]} onChange={e => setSelectedBlockDate(new Date(e.target.value))} className="flex-1 bg-gray-50 dark:bg-background-dark border border-gray-100 dark:border-white/5 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white [color-scheme:dark]" />
                <button onClick={() => { const r = prompt('Motivo do bloqueio:'); if (r) addBlockedDay(r); }} className="bg-primary text-background-dark font-black px-6 rounded-2xl shadow-gold active:scale-95 transition-all">Bloquear</button>
              </div>
              <div className="space-y-3">
                {blockedDays.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-background-dark rounded-2xl border border-gray-100 dark:border-white/5">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {(() => {
                          const [y, m, day] = d.blocked_date.split('-').map(Number);
                          return new Date(y, m - 1, day).toLocaleDateString('pt-BR');
                        })()}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">{d.reason}</p>
                    </div>
                    <button onClick={() => removeBlockedDay(d.id)} className="text-red-500"><span className="material-symbols-outlined text-lg">delete</span></button>
                  </div>
                ))}
                {blockedDays.length === 0 && <p className="text-center py-4 text-xs font-bold text-gray-400 uppercase tracking-widest opacity-30">Nenhum dia bloqueado</p>}
              </div>
            </div>
          </section>
        </main>
        <BarberNavigation />
      </div>
    </div>
  );
};

export default ManageHours;
