import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectUser } from '../features/auth/authSlice';

export function RequireAuth({ children, roles }) {
  const user = useSelector(selectUser);
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export function GuestOnly({ children }) {
  const user = useSelector(selectUser);
  const location = useLocation();
  if (user) {
    // signed-in visitor hitting the agent sign-up → send to the upgrade flow
    if (location.pathname === '/register' && new URLSearchParams(location.search).get('role') === 'agent') {
      return <Navigate to="/become-agent" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return children;
}
