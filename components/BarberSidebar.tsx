import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '../types.ts';

interface BarberSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onLogout: () => void;
}

const BarberSidebar: React.FC<BarberSidebarProps> = ({ isOpen, onClose, user, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { label: 'Início', path: '/barber', icon: 'grid_view' },
        { label: 'Agenda', path: '/barber/schedule', icon: 'calendar_month' },
        { label: 'Financeiro', path: '/barber/finances', icon: 'payments' },
        { label: 'Meus Horários', path: '/barber/hours', icon: 'more_time' },
        { label: 'Meus Serviços', path: '/barber/services', icon: 'content_cut' },
    ];

    const secondaryItems = [
        { label: 'Meu Perfil', path: '/barber/profile', icon: 'person' },
        { label: 'Relatórios', path: '/barber/finances', icon: 'analytics' },
    ];

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-background-dark/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>

            {/* Sidebar Panel */}
            <aside
                className={`fixed top-0 left-0 bottom-0 w-[280px] bg-surface-darker z-[101] shadow-2xl transition-transform duration-500 ease-out border-r border-white/5 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Header */}
                <div className="p-8 border-b border-white/5 bg-gradient-to-br from-primary/10 to-transparent">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative">
                            <div
                                className="size-14 rounded-2xl bg-cover bg-center ring-2 ring-primary/20 shadow-lg"
                                style={{
                                    backgroundImage: `url("${user.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtqFd9kXRuriwN1cEPJaLyCboKwOwEwYjCdnrh35EOMmO0K3JKVVbpW66iZGHPzh598PLFB_y1nBw3sG6zX_4nJOtypefF6mYbHPW2Pg_LFQetDTc2AxMf_O9PauILygQ27bLqnutTzBF_mAvkB4yDMoSSo4yI9g7JmuB_hCVaX8MJ82ULLJLQoyaNLU4dx-IsgTS0eEmZqUcJEymS2id4o5ItpuaMFNpjDVhyXyxLiGknlEAqs5-Odpsxsh2CZ0J2MJ84KRxboMc'}")`,
                                    backgroundPosition: `${user.avatar_pos_x ?? 50}% ${user.avatar_pos_y ?? 50}%`,
                                    backgroundSize: `${user.avatar_zoom ?? 100}%`
                                }}
                            ></div>
                            <div className="absolute -bottom-1 -right-1 size-4 bg-green-500 border-2 border-surface-darker rounded-full"></div>
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-white font-black text-xs uppercase tracking-widest opacity-40">Barbeiro</h2>
                            <p className="text-white font-black text-lg leading-tight truncate max-w-[140px] mb-2">{user.name.split(' ')[0]}</p>
                            <button
                                onClick={() => { navigate('/barber/profile'); onClose(); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-300 w-fit"
                            >
                                <span className="material-symbols-outlined text-sm">edit</span>
                                <span className="text-[10px] font-black uppercase tracking-wider">Editar Perfil</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Menu */}
                <nav className="flex-1 overflow-y-auto py-6 px-4 no-scrollbar">
                    <div className="space-y-1 mb-8">
                        {menuItems.map((item) => {
                            const active = location.pathname === item.path;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => { navigate(item.path); onClose(); }}
                                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${active ? 'bg-primary text-background-dark shadow-gold font-black' : 'text-gray-400 hover:bg-white/5 hover:text-white font-bold'}`}
                                >
                                    <span className={`material-symbols-outlined text-[22px] ${active ? 'filled' : ''}`}>{item.icon}</span>
                                    <span className="text-sm uppercase tracking-widest">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="pt-6 border-t border-white/5 space-y-1">
                        <h3 className="px-4 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-4">Administrativo</h3>
                        {secondaryItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => { navigate(item.path); onClose(); }}
                                className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-400 hover:bg-white/5 hover:text-white transition-all duration-300 font-bold"
                            >
                                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                <span className="text-xs uppercase tracking-widest">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Footer */}
                <div className="p-6 mt-auto">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all duration-300 font-black text-xs uppercase tracking-widest border border-red-500/20"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        Sair da Conta
                    </button>
                    <p className="text-center text-[9px] text-white/10 font-bold mt-6 uppercase tracking-[0.2em]">Antigravity v1.0.4</p>
                </div>
            </aside>
        </>
    );
};

export default BarberSidebar;
