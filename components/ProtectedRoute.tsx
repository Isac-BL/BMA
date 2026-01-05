import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { User, UserRole } from '../types';

interface ProtectedRouteProps {
    user: User | null;
    allowedRoles: UserRole[];
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ user, allowedRoles, children }) => {
    const location = useLocation();

    if (!user) {
        // If not logged in, redirect to login (or landing).
        // For now, redirect to Landing as per previous behavior, 
        // or maybe to a selection screen.
        // User request: "Redirecionar usuários sem permissão"
        return <Navigate to="/" replace state={{ from: location }} />;
    }

    if (!allowedRoles.includes(user.role)) {
        // If logged in but wrong role, redirect to their dashboard
        if (user.role === UserRole.BARBER) {
            return <Navigate to="/barber" replace />;
        } else {
            return <Navigate to="/client" replace />;
        }
    }

    return <>{children}</>;
};

export default ProtectedRoute;
