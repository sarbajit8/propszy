import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { api, apiError } from '../lib/api';
import { selectUser } from '../features/auth/authSlice';

const BENEFITS = [
  ['Level-wise commission', 'Earn on every conversion — yours and your downline’s, per project-wise rates.'],
  ['Build a network', 'Recruit sub-agents with your referral code and grow a team.'],
  ['Transparent ledger', 'Track pending vs. paid commissions and payouts in your dashboard.'],
  ['Verified & trusted', 'One-time KYC, then a public profile buyers can see.'],
];

export default function BecomeAgent() {
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [ref, setRef] = useState(sp.get('ref') || '');
  const [busy, setBusy] = useState(false);

  // agents / staff don't belong here
  useEffect(() => {
    if (user?.role === 'AGENT') navigate('/agent', { replace: true });
    else if (user?.role === 'ADMIN' || user?.role === 'SUBADMIN') navigate('/admin/agents', { replace: true });
  }, [user, navigate]);

  const apply = async () => {
    setBusy(true);
    try {
      await api.post('/agents/apply', { referralCode: ref || undefined });
      toast.success('You’re an agent now — complete your KYC to start earning.');
      // reflect the new role/session
      window.location.assign('/agent/kyc');
      return;
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const isCustomer = user && user.role === 'CUSTOMER';

  return (
    <div className="bg-slate-50">
      {/* hero */}
      <div className="bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="container-app grid gap-8 py-14 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">Partner programme</p>
            <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">Earn as a Propszy agent</h1>
            <p className="mt-3 max-w-md text-brand-100">
              Refer buyers, build a downline and earn level-wise commission on every conversion — with a
              transparent ledger and one-time KYC.
            </p>

            <div className="mt-6">
              {isCustomer ? (
                <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-sm text-brand-50">Signed in as <b className="text-white">{user.name}</b>. Upgrade this account to an agent:</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={ref}
                      onChange={(e) => setRef(e.target.value)}
                      placeholder="Sponsor referral code (optional)"
                      className="flex-1 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none"
                    />
                    <button onClick={apply} disabled={busy} className="btn bg-white text-brand-700 hover:bg-brand-50">
                      {busy ? 'Submitting…' : 'Apply as agent'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <Link to={`/register?role=agent${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`} className="btn bg-white text-brand-700 hover:bg-brand-50">
                    Register as an agent
                  </Link>
                  <Link to="/login" className="btn border border-white/40 text-white hover:bg-white/10">
                    I already have an account
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {BENEFITS.map(([t, d]) => (
              <div key={t} className="rounded-xl bg-white/10 p-4 backdrop-blur">
                <p className="font-semibold text-white">{t}</p>
                <p className="mt-1 text-sm text-brand-100">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* how it works */}
      <div className="container-app py-14">
        <h2 className="text-xl font-bold">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            ['1', 'Register', 'Create an agent account (or upgrade your existing one).'],
            ['2', 'Complete KYC', 'Upload PAN / ID and bank details for payouts — reviewed by admin.'],
            ['3', 'Add leads', 'Share your referral code or add buyer enquiries against any project.'],
            ['4', 'Get paid', 'On every conversion, commission is credited up your sponsor chain.'],
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
