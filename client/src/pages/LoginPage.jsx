import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [values, setValues] = useState({ email: '', password: '', role: 'buyer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await login(values);
      navigate(user.role === 'seller' ? '/dashboard' : '/marketplace', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="auth-panel">
        <div className="auth-intro"><p className="eyebrow text-campus-700">GOOD TO SEE YOU AGAIN</p><h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Welcome back.</h1><p className="mt-3 text-slate-600">Sign in to pick up where you left off.</p></div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="form-label" htmlFor="login-role">Sign in as</label>
            <select id="login-role" className="form-input" value={values.role} onChange={(e) => setValues({ ...values, role: e.target.value })}>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="login-email">Email address</label>
            <input id="login-email" autoComplete="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} className="form-input" type="email" required />
          </div>
          <div>
            <label className="form-label" htmlFor="login-password">Password</label>
            <input id="login-password" autoComplete="current-password" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} className="form-input" type="password" required />
          </div>

          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</p>}
          <button disabled={loading} className="primary-btn w-full" type="submit">{loading ? 'Signing you in…' : 'Sign in'} {!loading && <ArrowRight size={17} className="ml-2" />}</button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">Need an account? <Link to="/register" className="font-semibold text-campus-700">Register here</Link></p>
      </div>
    </div>
  );
}
