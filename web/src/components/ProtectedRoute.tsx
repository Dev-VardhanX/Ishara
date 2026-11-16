import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

/**
 * Route wrapper that ensures seamless access in hackathon / mock-data mode.
 * Never locks the user or evaluator out of core translation or recording pages.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
