import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Appointment } from '../types.ts';
import { supabase } from '../supabase.ts';

interface ClientDashboardProps {
  user: User;
  onLogout: () => void;
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({ user, onLogout }) => {
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
  const [showAIConsultant, setShowAIConsultant] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [user.id]);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          barber:barber_id(name, avatar_url),
          service:service_id(name, duration)
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

  const handleAskAI = async () => {
    // Note: AI tool would be used here if integrated via backend or separate service
    if (!aiMessage.trim()) return;
    const userMsg = aiMessage;
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setAiMessage('');
    setIsTyping(true);

    // Simulate delay
    setTimeout(() => {
      setChatHistory(prev => [...prev, { role: 'model', text: 'Como sou um consultor premium, recomendo cortes que valorizam seu rosto. Baseado no seu perfil VIP, um degrade americano ou um undercut clássico seriam excelentes opções!' }]);
      setIsTyping(false);
    }, 1500);
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
      <div className="sticky top-0 z-40 flex items-center bg-background-dark/80 backdrop-blur-xl p-4 pb-4 justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 overflow-hidden rounded-full border border-primary/30 bg-surface-dark bg-cover bg-center"
            style={{ backgroundImage: `url(${user.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtqFd9kXRuriwN1cEPJaLyCboKwOwEwYjCdnrh35EOMmO0K3JKVVbpW66iZGHPzh598PLFB_y1nBw3sG6zX_4nJOtypefF6mYbHPW2Pg_LFQetDTc2AxMf_O9PauILygQ27bLqnutTzBF_mAvkB4yDMoSSo4yI9g7JmuB_hCVaX8MJ82ULLJLQoyaNLU4dx-IsgTS0eEmZqUcJEymS2id4o5ItpuaMFNpjDVhyXyxLiGknlEAqs5-Odpsxsh2CZ0J2MJ84KRxboMc'})` }}
          >
          </div>
          <div>
            <p className="text-white text-sm font-bold leading-none">Olá, {user.name.split(' ')[0]}</p>
            <p className="text-primary text-[10px] font-bold uppercase tracking-wider mt-1">Cliente VIP</p>
          </div>
        </div>
        <button onClick={onLogout} className="text-white/40 hover:text-white transition-colors bg-surface-dark p-2 rounded-full border border-white/5 flex items-center justify-center">
          <span className="material-symbols-outlined text-xl">logout</span>
        </button>
      </div>

      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-white tracking-tight uppercase">Meus Agendamentos</h2>
          <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded-md">{appointments.length} Ativos</span>
        </div>

        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="bg-surface-dark rounded-3xl p-10 border border-white/5 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6 text-primary/30 border border-dashed border-primary/20">
                <span className="material-symbols-outlined text-4xl">event_busy</span>
              </div>
              <p className="text-white font-black text-lg mb-2">Sem agendamentos</p>
              <p className="text-text-muted text-sm px-4 leading-relaxed font-medium">Você ainda não reservou seu estilo. Que tal mudar o visual agora?</p>
            </div>
          ) : (
            appointments.map((app) => {
              const appDate = new Date(app.appointment_date + 'T12:00:00');
              return (
                <div key={app.id} className="group bg-surface-dark border border-white/5 rounded-3xl p-5 shadow-soft transition-all active:scale-[0.98] hover:border-primary/20">
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
                          <p className="text-white font-black text-lg truncate leading-tight">{app.service?.name}</p>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded mt-1.5 w-fit ${STATUS_MAP[app.status]?.bg} ${STATUS_MAP[app.status]?.color}`}>
                            {STATUS_MAP[app.status]?.label}
                          </span>
                        </div>
                        <span className="text-primary font-black text-sm">R$ {parseFloat(app.value).toFixed(2).replace('.', ',')}</span>
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
                </div>
              );
            })
          )}
        </div>

        <button
          onClick={() => setShowAIConsultant(true)}
          className="mt-10 relative overflow-hidden rounded-3xl bg-surface-darker border border-white/10 p-6 cursor-pointer group shadow-2xl transition-all hover:border-primary/30"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform group-hover:opacity-20">
            <span className="material-symbols-outlined text-[100px] text-primary">psychology</span>
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="size-2 bg-primary rounded-full animate-ping"></span>
              <span className="text-primary text-[10px] font-black uppercase tracking-widest">Estilo IA Ativo</span>
            </div>
            <h3 className="text-white font-black text-2xl leading-tight">VISAGISMO<br />INTELIGENTE</h3>
            <p className="text-white/40 text-sm font-medium mt-3 leading-relaxed">Não sabe qual corte combina mais? Nossa IA analisa as tendências para você.</p>
          </div>
        </button>
      </div>

      {showAIConsultant && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background-dark animate-slide-up">
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-background-dark/95 backdrop-blur-md">
            <h3 className="text-white font-black text-lg tracking-tight">Estilo IA Premium</h3>
            <button onClick={() => setShowAIConsultant(false)} className="size-10 flex items-center justify-center bg-surface-dark rounded-full text-white/40 hover:text-white transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl">
              <p className="text-primary text-xs font-bold leading-relaxed">Olá {user.name.split(' ')[0]}! Sou seu assistente de estilo. Como posso ajudar com seu visual hoje?</p>
            </div>
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${msg.role === 'user' ? 'bg-primary text-background-dark font-black shadow-gold' : 'bg-surface-dark text-white border border-white/5 shadow-soft'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-widest animate-pulse">
                <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                IA ANALISANDO...
              </div>
            )}
          </div>
          <div className="p-6 border-t border-white/5 bg-background-dark/95 backdrop-blur-md">
            <div className="flex gap-3">
              <input
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAskAI()}
                className="flex-1 bg-surface-dark border-none rounded-2xl text-white px-5 h-14 text-sm font-medium focus:ring-1 focus:ring-primary shadow-inner"
                placeholder="Ex: Qual barba combina com rosto oval?"
              />
              <button onClick={handleAskAI} className="bg-primary text-background-dark size-14 rounded-2xl flex items-center justify-center shadow-gold active:scale-95 transition-all">
                <span className="material-symbols-outlined font-black">send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-8 left-0 right-0 px-6 z-30 max-w-md mx-auto">
        <button
          onClick={() => navigate('/client/book/services')}
          className="flex w-full cursor-pointer items-center justify-center rounded-3xl h-14 bg-primary hover:bg-[#c9a026] text-background-dark gap-3 text-lg font-black shadow-gold transition-all active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[28px] font-black">add_circle</span>
          <span className="tracking-tighter">NOVO AGENDAMENTO</span>
        </button>
      </div>
    </div>
  );
};

export default ClientDashboard;
