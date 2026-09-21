import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { bootstrapAuth, selectAuthReady } from './features/auth/authSlice';
import { RequireAuth, RequireKyc, GuestOnly } from './routes/guards';
import { Spinner } from './components/ui';
import { usePublicConfig, applyRuntimeConfig } from './lib/publicConfig';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';

import PublicLayout from './components/PublicLayout';
import DashboardLayout from './components/DashboardLayout';
import AccountLayout from './components/AccountLayout';

import Home from './pages/Home';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import MapPage from './pages/MapPage';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Wishlist from './pages/Wishlist';
import BecomeAgent from './pages/BecomeAgent';
import NotFound from './pages/NotFound';

import Login from './pages/auth/Login';
import AdminLogin from './pages/auth/AdminLogin';
import AgentLogin from './pages/auth/AgentLogin';
import Register from './pages/auth/Register';
import { ForgotPassword, ResetPassword } from './pages/auth/ForgotPassword';

import { AccountOverview, Favorites, Enquiries, Activity, MyProperties } from './pages/account/Account';
import Profile from './pages/account/Profile';

import { AgentOverview, AgentLeads, AgentCommissions, AgentRecruit } from './pages/agent/Agent';
import AgentLeadForm from './pages/agent/AgentLeadForm';
import AgentRates from './pages/agent/AgentRates';
import AgentTree from './pages/agent/AgentTree';
import AgentKyc from './pages/agent/AgentKyc';

import AdminOverview from './pages/admin/AdminOverview';
import AdminProjects from './pages/admin/AdminProjects';
import AdminProjectForm from './pages/admin/AdminProjectForm';
import AdminPropertyForm from './pages/admin/AdminPropertyForm';
import AdminLeads from './pages/admin/AdminLeads';
import AdminSettings from './pages/admin/AdminSettings';
import AdminHome from './pages/admin/AdminHome';
import AdminCities from './pages/admin/AdminCities';
import AdminDevelopers from './pages/admin/AdminDevelopers';
import AdminCategories from './pages/admin/AdminCategories';
import AdminBlog from './pages/admin/AdminBlog';
import AdminConfigurations from './pages/admin/AdminConfigurations';
import {
  AdminAgents, AdminUsers, AdminKyc, AdminMlm, AdminCommissions, AdminReports, AdminProperties, AdminCms, AdminWishlists,
} from './pages/admin/AdminMisc';

const STAFF = ['ADMIN', 'SUBADMIN'];

export default function App() {
  const dispatch = useDispatch();
  const ready = useSelector(selectAuthReady);
  const { data: publicCfg } = usePublicConfig();

  useEffect(() => { dispatch(bootstrapAuth()); }, [dispatch]);
  useEffect(() => { applyRuntimeConfig(publicCfg); }, [publicCfg]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner className="h-8 w-8 text-brand-600" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:idOrSlug" element={<ProjectDetail />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/properties/:id" element={<PropertyDetail />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/wishlist" element={<RequireAuth><Wishlist /></RequireAuth>} />
        <Route path="/become-associate" element={<BecomeAgent />} />
      </Route>

      {/* Auth */}
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/associate/login" element={<AgentLogin />} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Customer */}
      <Route path="/account" element={<RequireAuth><AccountLayout /></RequireAuth>}>
        <Route index element={<AccountOverview />} />
        <Route path="favorites" element={<Favorites />} />
        <Route path="properties" element={<MyProperties />} />
        <Route path="properties/new" element={<AdminPropertyForm />} />
        <Route path="properties/:id" element={<AdminPropertyForm />} />
        <Route path="enquiries" element={<Enquiries />} />
        <Route path="activity" element={<Activity />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Associate (agent) */}
      <Route path="/associate" element={<RequireAuth roles={['AGENT', 'ADMIN']}><DashboardLayout area="associate" /></RequireAuth>}>
        <Route index element={<RequireKyc><AgentOverview /></RequireKyc>} />
        <Route path="tree" element={<RequireKyc><AgentTree /></RequireKyc>} />
        <Route path="leads" element={<RequireKyc><AgentLeads /></RequireKyc>} />
        <Route path="leads/new" element={<RequireKyc><AgentLeadForm /></RequireKyc>} />
        <Route path="rates" element={<RequireKyc><AgentRates /></RequireKyc>} />
        <Route path="commissions" element={<RequireKyc><AgentCommissions /></RequireKyc>} />
        <Route path="recruit" element={<RequireKyc><AgentRecruit /></RequireKyc>} />
        <Route path="kyc" element={<AgentKyc />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<RequireAuth roles={STAFF}><DashboardLayout area="admin" /></RequireAuth>}>
        <Route index element={<AdminOverview />} />
        <Route path="projects" element={<AdminProjects />} />
        <Route path="projects/new" element={<AdminProjectForm />} />
        <Route path="projects/:id" element={<AdminProjectForm />} />
        <Route path="properties" element={<AdminProperties />} />
        <Route path="properties/new" element={<AdminPropertyForm />} />
        <Route path="properties/:id" element={<AdminPropertyForm />} />
        <Route path="leads" element={<AdminLeads />} />
        <Route path="associates" element={<AdminAgents />} />
        <Route path="customers" element={<AdminUsers />} />
        <Route path="kyc" element={<AdminKyc />} />
        <Route path="mlm" element={<AdminMlm />} />
        <Route path="commissions" element={<AdminCommissions />} />
        <Route path="cms" element={<AdminCms />} />
        <Route path="blog" element={<AdminBlog />} />
        <Route path="home" element={<AdminHome />} />
        <Route path="cities" element={<AdminCities />} />
        <Route path="developers" element={<AdminDevelopers />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="configurations" element={<AdminConfigurations />} />
        <Route path="wishlists" element={<AdminWishlists />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="reports" element={<AdminReports />} />
      </Route>

      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
    </ErrorBoundary>
  );
}
