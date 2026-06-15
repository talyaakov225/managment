import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export function LoginPage() {
  const { login } = useAuth();
  const { t, isRTL } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSent(true);
    } catch {
      toast.error(t.auth.forgotError || 'שגיאה בשליחת הבקשה');
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
      toast.success(t.auth.welcomeBackToast);
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { error?: string; message?: string }; status?: number } })?.response;
      if (resp?.data?.error === 'PENDING_APPROVAL') {
        toast.error(t.auth.pendingApprovalLogin, { duration: 5000 });
      } else {
        toast.error(resp?.data?.message || resp?.data?.error || t.auth.loginFailed);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left/Right Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center p-1.5">
                <img src="/assets/לוגו תקשורת חדש.svg" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-3xl font-bold text-white">רמי לוי תקשורת</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4 leading-tight whitespace-pre-line">
              {t.auth.heroTitle}
            </h1>
            <p className="text-lg text-primary-200 max-w-md">
              {t.auth.heroDesc}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12 grid grid-cols-3 gap-4"
          >
            {[
              { label: t.auth.featureKanban, value: t.auth.featureDragDrop },
              { label: t.auth.featureTeamwork, value: t.auth.featureRealtime },
              { label: t.auth.featureTracking, value: t.auth.featureControl },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-sm text-primary-200">{item.label}</p>
                <p className="text-white font-semibold mt-1">{item.value}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-slate-950">
        <motion.div
          initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src="/assets/לוגו תקשורת חדש.svg" alt="Logo" className="w-10 h-10 object-contain" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">רמי לוי תקשורת</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t.auth.welcomeBack}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">{t.auth.enterCredentials}</p>

          <AnimatePresence mode="wait">
            {!showForgot ? (
              <motion.div key="login-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.auth.email}</label>
                    <div className="relative">
                      <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        className="input ps-11"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t.auth.password}</label>
                      <button
                        type="button"
                        onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotSent(false); }}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {t.auth.forgotPassword}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="input ps-11 pe-11"
                        placeholder={t.auth.enterPassword}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {t.auth.signIn}
                        <ArrowIcon className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                  {t.auth.noAccount}{' '}
                  <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                    {t.auth.signUp}
                  </Link>
                </p>
              </motion.div>
            ) : (
              <motion.div key="forgot-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {!forgotSent ? (
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <KeyRound className="w-8 h-8 text-primary-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">{t.auth.forgotTitle}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center">{t.auth.forgotDesc}</p>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.auth.email}</label>
                      <div className="relative">
                        <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="email"
                          className="input ps-11"
                          placeholder="your@email.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" disabled={forgotLoading} className="btn-primary w-full py-3">
                      {forgotLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        t.auth.sendResetRequest
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowForgot(false)}
                      className="w-full text-center text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 mt-2"
                    >
                      {t.auth.backToLogin}
                    </button>
                  </form>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Mail className="w-8 h-8 text-green-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.auth.resetRequestSent}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.auth.resetRequestDesc}</p>
                    <button
                      onClick={() => { setShowForgot(false); setForgotSent(false); }}
                      className="btn-primary w-full py-3 mt-4"
                    >
                      {t.auth.backToLogin}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  );
}
