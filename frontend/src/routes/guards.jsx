import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectUser } from '../features/auth/authSlice';

export function RequireAuth({ children, roles }) {
  const user = useSelector(selectUser);
  const location = useLocation();

  // three separate sign-in pages: associate (agent) routes → mobile-OTP
  // associate portal, admin-only routes → password-based admin console,
  // everything else (customer areas) → the mobile-OTP customer sign-in
  const isAgentRoute = roles?.includes('AGENT');
  const isAdminRoute = !isAgentRoute && roles?.some((r) => ['ADMIN', 'SUBADMIN'].includes(r));
  const loginPath = isAgentRoute ? '/associate/login' : isAdminRoute ? '/admin/login' : '/login';

  if (!user) return <Navigate to={loginPath} state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) {
    if (isAgentRoute && user.role === 'CUSTOMER') {
      return <Navigate to="/become-associate" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return children;
}

// Gates the working parts of the associate panel (network, leads, commissions,
// rates, recruiting) behind an APPROVED KYC — an agent can still see the
// KYC status page itself, but nothing that touches
// downline/commission/lead data until an admin has verified them.
export function RequireKyc({ children }) {
  const user = useSelector(selectUser);
  const location = useLocation();
  if (user?.role === 'CUSTOMER') {
    return <Navigate to="/become-associate" replace />;
  }
  if (user?.role !== 'AGENT') return children; // staff previewing the panel bypass KYC entirely
  if (user.kycStatus !== 'APPROVED') {
    return <Navigate to="/associate/kyc" state={{ from: location, locked: true }} replace />;
  }
  return children;
}

export function GuestOnly({ children }) {
  const user = useSelector(selectUser);
  const location = useLocation();
  if (user) {
    // signed-in visitor hitting the associate sign-up → send to the upgrade flow
    if (location.pathname === '/register' && new URLSearchParams(location.search).get('role') === 'associate') {
      return <Navigate to="/become-associate" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return children;
}
