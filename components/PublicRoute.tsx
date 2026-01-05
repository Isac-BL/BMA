import React from 'react';
import { Navigate } from 'react-router-dom';
import { User, UserRole } from '../types';

interface PublicRouteProps {
    user: User | null;
    children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ user, children }) => {
    if (user) {
        if (user.role === UserRole.BARBER) {
            return <Navigate to="/barber" replace />;
        } else {
            return <Navigate to="/client" replace />;
        }
    }

    return <>{children}</>;
};

export default PublicRoute;
