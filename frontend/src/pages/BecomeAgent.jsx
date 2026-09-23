import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/auth/authSlice';
import { KycWizard } from './agent/AgentKyc';

const BENEFITS = [
  ['Level-wise commission', 'Earn on every conversion — yours and your downline’s, per project-wise rates.'],
  ['Build a network', 'Recruit sub-associates with your referral code and grow a team.'],
  ['Transparent ledger', 'Track pending vs. paid commissions and payouts in your dashboard.'],
  ['Verified & trusted', 'One-time KYC, then a public profile buyers can see.'],
];

export default function BecomeAgent() {
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const initialRef = sp.get('ref') || '';

  // Staff don't belong here
  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'SUBADMIN') {
      navigate('/admin/associates', { replace: true });
    }
  }, [user, navigate]);

  const isApprovedAgent = user?.role === 'AGENT' && user?.kycStatus === 'APPROVED';
  const isCustomer = user && user.role === 'CUSTOMER';

  return (
    <div className="bg-slate-50">
      {/* hero */}
      <div className="bg-gradient-to-br from-brand-700 via-brand-800 to-indigo-950 text-white">
        <div className="container-app grid gap-8 py-14 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">Partner programme</p>
            <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">Earn as a Propszy Agent</h1>
            <p className="mt-3 max-w-md text-brand-100">
              Refer buyers, build a network and earn level-wise commission on every conversion.
              Submit your KYC verification to get approved by Admin.
            </p>

            <div className="mt-6">
              {isApprovedAgent ? (
                <div className="rounded-2xl border border-emerald-400/40 bg-emerald-950/40 p-5 backdrop-blur-xl">
                  <p className="text-sm font-medium text-emerald-200">✓ You are an approved Propszy Agent</p>
                  <p className="mt-1 text-xs text-white/80">You have full access to both the Agent and Customer dashboards.</p>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <Link to="/associate" className="btn bg-white text-brand-700 hover:bg-brand-50">Open Associate Dashboard</Link>
                    <Link to="/account" className="btn border border-white/40 text-white hover:bg-white/10">Open Customer Dashboard</Link>
                  </div>
                </div>
              ) : isCustomer ? (
                <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl">
                  <p className="text-sm text-brand-100">
                    Signed in as <b className="text-white">{user.name}</b> (Customer).
                  </p>
                  <p className="mt-1 text-xs text-brand-200">
                    Complete all 4 KYC steps below to apply for your Associate account. Once reviewed and approved by Admin, your account will be upgraded to an Associate with dual access to both dashboards.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <Link to={`/register?role=associate${initialRef ? `&ref=${encodeURIComponent(initialRef)}` : ''}`} className="btn bg-white text-brand-700 hover:bg-brand-50">
                    Register as an associate (with KYC)
                  </Link>
                  <Link to="/associate/login" className="btn border border-white/40 text-white hover:bg-white/10">
                    Agent sign in
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {BENEFITS.map(([t, d]) => (
              <div key={t} className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="font-semibold text-white">{t}</p>
                <p className="mt-1 text-sm text-brand-100">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* If customer is logged in: render the complete KYC Upgrade form */}
      {isCustomer && (
        <div className="container-app py-12">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900">Associate Upgrade &amp; Verification</h2>
            <p className="mt-1 text-sm text-slate-500">
              Fill up your personal details, upload 4 required documents, and add your bank details for admin approval.
            </p>
          </div>
          <KycWizard
            initialReferralCode={initialRef}
            customTitle="Associate Upgrade Application"
            showDashboardLinks={true}
          />
        </div>
      )}

      {/* how it works */}
      <div className="container-app py-14">
        <h2 className="text-xl font-bold">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            ['1', 'Register or Apply', 'Sign up as an agent or upgrade your existing customer account.'],
            ['2', 'Submit Complete KYC', 'Upload PAN, Photo, Address proof, Bank proof and payout bank details.'],
            ['3', 'Admin Approval', 'Propszy admin verifies your details and promotes your account to Agent.'],
            ['4', 'Dual Access & Earning', 'Access both Associate & Customer dashboards, recruit and earn commissions.'],
          ].map(([n, t, d]) => (
            <div key={n} className="card p-5">
              <div className="mb-2 grid h-9 w-9 place-items-center rounded-lg bg-brand-100 font-bold text-brand-700">{n}</div>
              <p className="text-sm font-semibold">{t}</p>
              <p className="mt-1 text-sm text-slate-500">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
