import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/employees';

  const [email, setEmail] = useState('admin@peoplepay360.internal');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(redirect);
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-surface-sunken flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-border-strong rounded-[var(--radius-md)] shadow-modal overflow-hidden p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-sm bg-primary-600 text-surface-sunken flex items-center justify-center font-black text-xl mb-3 shadow-gold">
            HR
          </div>
          <h1 className="text-2xl font-bold font-display text-ink-900">
            HRMS <span className="text-primary-600">OXP</span> Portal
          </h1>
          <p className="text-xs text-ink-600 mt-1">
            Enterprise HR & Payroll Platform — Authenticate
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-sm bg-danger-50 border border-danger-600/30 text-xs font-semibold text-danger-600 flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Work Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@oxp.com"
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-ink-600 uppercase tracking-wider">
                Password
              </label>
              <a href="#forgot" className="text-xs text-primary-600 hover:underline">
                Forgot password?
              </a>
            </div>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-full h-11 mt-2 font-bold"
          >
            <span>{loading ? 'Signing In...' : 'Sign In to Portal'}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        {/* Quick Demo Logins */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs font-bold text-ink-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary-600" />
            <span>Quick Demo Role Logins</span>
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@peoplepay360.internal', 'admin123')}
              className="p-2 border border-border rounded-sm bg-surface-muted hover:border-primary-600/50 hover:text-primary-600 text-left font-semibold text-ink-900 transition-colors cursor-pointer"
            >
              👑 Admin (admin123)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('hr.manager@peoplepay360.internal', 'manager123')}
              className="p-2 border border-border rounded-sm bg-surface-muted hover:border-primary-600/50 hover:text-primary-600 text-left font-semibold text-ink-900 transition-colors cursor-pointer"
            >
              👥 HR Manager (manager123)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('payroll.manager@peoplepay360.internal', 'payroll123')}
              className="p-2 border border-border rounded-sm bg-surface-muted hover:border-primary-600/50 hover:text-primary-600 text-left font-semibold text-ink-900 transition-colors cursor-pointer"
            >
              💰 Payroll Manager (payroll123)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('alex.morgan@peoplepay360.internal', 'employee123')}
              className="p-2 border border-border rounded-sm bg-surface-muted hover:border-primary-600/50 hover:text-primary-600 text-left font-semibold text-ink-900 transition-colors cursor-pointer"
            >
              👤 Employee (employee123)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
