import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const [values, setValues] = useState(() => {
    const role = searchParams.get('role');
    return { name: '', email: '', password: '', college: '', studentId: '', role: ['buyer', 'seller'].includes(role) ? role : '' };
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await register(values);
      navigate(user.role === 'seller' ? '/dashboard' : '/marketplace', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="auth-panel">
        <div className="auth-intro"><p className="eyebrow text-campus-700">YOUR CAMPUS, CONNECTED</p><h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Make room for<br />something good.</h1><p className="mt-3 text-slate-600">Create your account and choose how you want to take part.</p></div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-5 md:grid-cols-2">
          <fieldset className="md:col-span-2">
            <legend className="mb-2 text-sm font-semibold text-slate-800">I’m here to… <span className="text-rose-600">*</span></legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`role-choice ${values.role === 'buyer' ? 'role-choice-active' : ''}`}><input type="radio" name="role" value="buyer" checked={values.role === 'buyer'} onChange={(e) => setValues({ ...values, role: e.target.value })} required /><span className="role-choice-icon"><ShoppingBag size={19} /></span><span><strong>Find a good deal</strong><small>Browse listings and bid as a buyer</small></span></label>
              <label className={`role-choice ${values.role === 'seller' ? 'role-choice-active' : ''}`}><input type="radio" name="role" value="seller" checked={values.role === 'seller'} onChange={(e) => setValues({ ...values, role: e.target.value })} required /><span className="role-choice-icon"><Store size={19} /></span><span><strong>Pass something on</strong><small>List and manage items as a seller</small></span></label>
            </div>
          </fieldset>
          <div className="md:col-span-2"><label className="form-label" htmlFor="register-name">Full name</label><input id="register-name" autoComplete="name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} className="form-input" required /></div>
          <div className="md:col-span-2"><label className="form-label" htmlFor="register-email">Email address</label><input id="register-email" autoComplete="email" type="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} className="form-input" required /></div>
          <div className="md:col-span-2"><label className="form-label" htmlFor="register-college">College / campus</label><input id="register-college" autoComplete="organization" value={values.college} onChange={(e) => setValues({ ...values, college: e.target.value })} className="form-input" required /></div>
          <div><label className="form-label" htmlFor="register-student-id">Student ID <span className="font-normal text-slate-500">(optional)</span></label><input id="register-student-id" value={values.studentId} onChange={(e) => setValues({ ...values, studentId: e.target.value })} className="form-input" /></div>
          <div><label className="form-label" htmlFor="register-password">Password</label><input id="register-password" autoComplete="new-password" type="password" minLength="6" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} className="form-input" required /></div>
          {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="primary-btn md:col-span-2">{loading ? 'Creating your account…' : 'Create my account'} {!loading && <ArrowRight size={17} className="ml-2" />}</button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">Already a member? <Link to="/login" className="font-semibold text-campus-700 hover:underline">Sign in</Link></p>
      </div>
    </div>
  );
}
