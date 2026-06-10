import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import toast from 'react-hot-toast';

export function RegisterPage() {
  const { register } = useAuth();
  const { t, isRTL } = useLang();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) return;
    if (password !== confirmPassword) { toast.error(t.auth.passwordsMismatch); return; }
    if (password.length < 6) { toast.error(t.auth.passwordTooShort); return; }
    setLoading(true);
    try {
      const result = await register(name, email, password);
      if (result.pendingApproval) {
        setPendingApproval(true);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || t.auth.registrationFailed;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (pendingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{t.auth.pendingTitle}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{t.auth.pendingDesc}</p>
          <div className="card p-4 mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-sm text-slate-600 dark:text-slate-300 text-start">{t.auth.pendingInfo}</p>
            </div>
          </div>
          <Link to="/login" className="btn-primary inline-flex px-8 py-3">{t.auth.backToLogin}</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-40 left-10 w-96 h-96 bg-primary-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center p-1.5">
                <img src="/assets/לוגו תקשורת חדש.svg" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-3xl font-bold text-white">רמי לוי תקשורת</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4 leading-tight whitespace-pre-line">{t.auth.heroRegTitle}</h1>
            <p className="text-lg text-primary-200 max-w-md">{t.auth.heroRegDesc}</p>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-slate-950">
        <motion.div initial={{ opacity: 0, x: isRTL ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src="/assets/לוגו תקשורת חדש.svg" alt="Logo" className="w-10 h-10 object-contain" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">רמי לוי תקשורת</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t.auth.createAccount}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">{t.auth.fillDetails}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.auth.fullName}</label>
              <div className="relative">
                <User className="absolute start-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" className="input ps-11" placeholder={t.auth.yourName} value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.auth.email}</label>
              <div className="relative">
                <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="email" className="input ps-11" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.auth.password}</label>
              <div className="relative">
                <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type={showPassword ? 'text' : 'password'} className="input ps-11 pe-11" placeholder={t.auth.minChars} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.auth.confirmPassword}</label>
              <div className="relative">
                <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type={showPassword ? 'text' : 'password'} className="input ps-11" placeholder={t.auth.repeatPassword} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{t.auth.createAccount}<ArrowIcon className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            {t.auth.hasAccount}{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">{t.auth.signIn}</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
