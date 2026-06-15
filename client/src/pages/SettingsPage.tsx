import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Sun, Moon, Monitor, Save, Loader2, Languages, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LangContext';
import { authApi } from '../services/api';
import { Avatar } from '../components/Avatar';
import toast from 'react-hot-toast';

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLang();

  const [name, setName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(lang === 'he' ? 'הקובץ גדול מדי (מקסימום 2MB)' : 'File too large (max 2MB)');
      return;
    }
    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const { data } = await authApi.updateProfile({ avatar: base64 });
        updateUser(data);
        toast.success(lang === 'he' ? 'תמונת הפרופיל עודכנה' : 'Avatar updated');
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error(lang === 'he' ? 'שגיאה בהעלאת תמונה' : 'Upload failed');
      setUploadingAvatar(false);
    }
  }

  async function handleSaveProfile() {
    if (!name.trim()) return;
    setSavingProfile(true);
    try {
      const { data } = await authApi.updateProfile({ name: name.trim() });
      updateUser(data);
      toast.success(t.settings.profileUpdated);
    } catch {
      toast.error(t.settings.profileFailed);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) { toast.error(t.settings.passwordsMismatch); return; }
    if (newPassword.length < 6) { toast.error(t.auth.passwordTooShort); return; }
    setSavingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      toast.success(t.settings.passwordChanged);
    } catch (err: any) {
      toast.error(err.response?.data?.error || t.settings.passwordFailed);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">{t.settings.title}</h1>

        {/* Profile */}
        <section className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.settings.profile}</h2>
          </div>
          <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="relative group">
              {user && <Avatar name={user.name} avatar={user.avatar} size="xl" />}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">{user?.name}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  {lang === 'he' ? 'שנה תמונה' : 'Change photo'}
                </button>
                {user?.avatar && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <button
                      onClick={async () => {
                        try {
                          const { data } = await authApi.updateProfile({ avatar: '' });
                          updateUser(data);
                          toast.success(lang === 'he' ? 'התמונה הוסרה' : 'Photo removed');
                        } catch {
                          toast.error(lang === 'he' ? 'שגיאה בהסרת התמונה' : 'Failed to remove photo');
                        }
                      }}
                      className="text-xs text-red-500 hover:text-red-600 font-medium"
                    >
                      {lang === 'he' ? 'הסר תמונה' : 'Remove photo'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.settings.displayName}</label>
              <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.auth.email}</label>
              <input type="email" className="input bg-slate-50 dark:bg-slate-800" value={user?.email || ''} disabled />
              <p className="text-xs text-slate-400 mt-1">{t.settings.emailCantChange}</p>
            </div>
            <button onClick={handleSaveProfile} disabled={savingProfile || name === user?.name} className="btn-primary">
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t.settings.saveProfile}
            </button>
          </div>
        </section>

        {/* Language */}
        <section className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Languages className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.settings.language}</h2>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setLang('he')}
              className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                lang === 'he' ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <span className="text-xl">🇮🇱</span>
              <div className="text-start">
                <p className={`text-sm font-medium ${lang === 'he' ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300'}`}>{t.settings.hebrew}</p>
                <p className="text-xs text-slate-400">RTL</p>
              </div>
            </button>
            <button
              onClick={() => setLang('en')}
              className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                lang === 'en' ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <span className="text-xl">🇺🇸</span>
              <div className="text-start">
                <p className={`text-sm font-medium ${lang === 'en' ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300'}`}>{t.settings.english}</p>
                <p className="text-xs text-slate-400">LTR</p>
              </div>
            </button>
          </div>
        </section>

        {/* Appearance */}
        <section className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Monitor className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.settings.appearance}</h2>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => theme !== 'light' && toggleTheme()}
              className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                theme === 'light' ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <Sun className={`w-5 h-5 ${theme === 'light' ? 'text-primary-600' : 'text-slate-400'}`} />
              <div className="text-start">
                <p className={`text-sm font-medium ${theme === 'light' ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300'}`}>{t.settings.light}</p>
                <p className="text-xs text-slate-400">{t.settings.lightDesc}</p>
              </div>
            </button>
            <button
              onClick={() => theme !== 'dark' && toggleTheme()}
              className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                theme === 'dark' ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <Moon className={`w-5 h-5 ${theme === 'dark' ? 'text-primary-600' : 'text-slate-400'}`} />
              <div className="text-start">
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300'}`}>{t.settings.dark}</p>
                <p className="text-xs text-slate-400">{t.settings.darkDesc}</p>
              </div>
            </button>
          </div>
        </section>

        {/* Password */}
        <section className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.settings.changePassword}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.settings.currentPassword}</label>
              <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t.settings.enterCurrentPassword} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.settings.newPassword}</label>
              <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t.auth.minChars} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.settings.confirmNewPassword}</label>
              <input type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t.settings.repeatNewPassword} />
            </div>
            <button onClick={handleChangePassword} disabled={savingPassword || !currentPassword || !newPassword} className="btn-primary">
              {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {t.settings.changePassword}
            </button>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
