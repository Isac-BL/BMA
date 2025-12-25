import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ClientNavigation: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { label: 'Início', icon: 'home', path: '/client' },
        { label: 'Agendar', icon: 'calendar_month', path: '/client/book/services' },
        { label: 'Meus Cortes', icon: 'content_cut', path: '/client/appointments' },
        { label: 'Perfil', icon: 'person', path: '/client/profile' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-[#1a170e]/95 backdrop-blur-xl px-4 pb-6 pt-2 max-w-md mx-auto">
            <div className="flex justify-between items-end">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;

                    return (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-1 flex-col items-center justify-end gap-1.5 transition-colors group py-2 relative ${isActive ? 'text-primary' : 'text-[#8c8675] hover:text-white'}`}
                        >
                            {isActive && (
                                <div className="absolute -top-2 w-10 h-1 bg-primary rounded-full shadow-[0_0_12px_rgba(225,180,45,0.8)] opacity-80"></div>
                            )}
                            <div className="flex h-6 items-center justify-center">
                                <span className={`material-symbols-outlined ${isActive ? 'symbol-filled drop-shadow-[0_0_8px_rgba(225,180,45,0.5)]' : 'symbol-regular group-hover:scale-110 transition-transform'}`}>
                                    {item.icon}
                                </span>
                            </div>
                            <p className={`text-[10px] leading-none tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>
                                {item.label}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ClientNavigation;
