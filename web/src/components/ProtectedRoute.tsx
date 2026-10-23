import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HandMetal } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E9EEF7] flex flex-col items-center justify-center p-6 select-none">
        <div className="clay-card p-8 flex flex-col items-center gap-4 max-w-xs text-center animate-pulse">
          <div className="w-14 h-14 rounded-2xl bg-[#7C9CFF] flex items-center justify-center text-white shadow-clay-raised">
            <HandMetal className="w-8 h-8 animate-bounce" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#2B2D42]">Loading Ishara</h3>
            <p className="text-xs font-semibold text-[#6E7387] mt-1">
              Restoring your translation session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect unauthenticated visitors to /login, remembering the path they intended to visit
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
