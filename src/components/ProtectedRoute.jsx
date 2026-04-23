import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/useUser';
import { canAccessVotingArea, getAuthBlockReason } from '../services/authPolicy';

const LoadingFallback = () => <div className="loading">CARREGANDO...</div>;

export function ProtectedRoute() {
  const { user, loading } = useUser();
  const location = useLocation();

  if (loading) return <LoadingFallback />;

  if (!canAccessVotingArea(user)) {
    const reason = getAuthBlockReason(user);
    return <Navigate to="/" replace state={{ reason, from: location.pathname }} />;
  }

  return <Outlet />;
}

export function PublicRoute() {
  const { user, loading } = useUser();

  if (loading) return <LoadingFallback />;

  if (canAccessVotingArea(user)) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}