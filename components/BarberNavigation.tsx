import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BarberNavigation: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => {
        if (path === '/barber' && location.pathname === '/barber') return true;
        if (path !== '/barber' && location.pathname === path) return true;
        // Handle sub-routes if any
        return false;
    };

    const navItems = [
        { label: 'Home', path: '/barber', icon: 'grid_view' },
        { label: 'Agenda', path: '/barber/schedule', icon: 'calendar_month' },
        { label: 'Finanças', path: '/barber/finances', icon: 'payments' },
        { label: 'Horários', path: '/barber/hours', icon: 'more_time' },
        { label: 'Serviços', path: '/barber/services', icon: 'content_cut' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-[80px] bg-white px-4 pt-2 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] dark:bg-surface-darker/95 dark:shadow-[0_-5px_20px_rgba(0,0,0,0.5)] border-t dark:border-white/5 backdrop-blur-xl z-50">
            <div className="flex h-full items-start justify-between">
                {navItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-1 flex-col items-center gap-1 p-2 transition-all duration-300 ${active ? 'text-primary' : 'text-slate-400 dark:text-gray-500 hover:text-gray-300'}`}
                        >
                            <span className={`material-symbols-outlined text-[24px] ${active ? 'filled' : ''}`}>
                                {item.icon}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BarberNavigation;
