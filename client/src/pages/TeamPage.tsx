import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, UserPlus, Shield, Crown, User, Trash2, Loader2, Mail } from 'lucide-react';
import { memberApi, projectApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import type { ProjectMember, Project } from '../types';
import toast from 'react-hot-toast';

export function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t, isRTL } = useLang();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [inviting, setInviting] = useState(false);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const roleConfig = {
    OWNER: { label: t.team.owner, icon: Crown, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
    ADMIN: { label: t.team.admin, icon: Shield, color: 'text-primary-500 bg-primary-50 dark:bg-primary-950/30' },
    MEMBER: { label: t.team.member, icon: User, color: 'text-slate-500 bg-slate-100 dark:bg-slate-800' },
  };

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    try {
      const [projRes, membersRes] = await Promise.all([projectApi.getById(id!), memberApi.getByProject(id!)]);
      setProject(projRes.data); setMembers(membersRes.data);
    } catch { navigate('/dashboard'); }
    finally { setLoading(false); }
  }

  const isOwnerOrAdmin = members.some((m) => m.userId === user?.id && (m.role === 'OWNER' || m.role === 'ADMIN'));

  async function handleInvite() {
    if (!inviteEmail.trim() || !id) return;
    setInviting(true);
    try {
      const { data } = await memberApi.add(id, { email: inviteEmail.trim(), role: inviteRole });
      setMembers((prev) => [...prev, data]); setShowInvite(false); setInviteEmail('');
      toast.success(t.team.memberAdded);
    } catch (err: any) { toast.error(err.response?.data?.error || t.team.addFailed); }
    finally { setInviting(false); }
  }

  async function handleRemove(userId: string, name: string) {
    if (!id) return;
    if (!confirm(t.team.removeConfirm.replace('{name}', name))) return;
    try {
      await memberApi.remove(id, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      toast.success(t.team.memberRemoved);
    } catch (err: any) { toast.error(err.response?.data?.error || t.team.removeFailed); }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-primary-600 animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(`/projects/${id}`)} className="btn-ghost p-2">
            <BackIcon className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">{t.team.teamMembers}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{project?.name}</p>
          </div>
          {isOwnerOrAdmin && (
            <button onClick={() => setShowInvite(true)} className="btn-primary">
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">{t.team.addMember}</span>
            </button>
          )}
        </div>

        <div className="space-y-3">
          {members.map((member) => {
            const role = roleConfig[member.role as keyof typeof roleConfig] || roleConfig.MEMBER;
            const RoleIcon = role.icon;
            return (
              <motion.div key={member.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4 flex items-center gap-4">
                <Avatar name={member.user.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {member.user.name}
                    {member.userId === user?.id && <span className="text-xs text-slate-400 ms-2">{t.common.you}</span>}
                  </p>
                  <p className="text-sm text-slate-500 truncate">{member.user.email}</p>
                </div>
                <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg ${role.color}`}>
                  <RoleIcon className="w-3.5 h-3.5" />{role.label}
                </span>
                {isOwnerOrAdmin && member.role !== 'OWNER' && member.userId !== user?.id && (
                  <button onClick={() => handleRemove(member.userId, member.user.name)} className="btn-ghost p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {members.length === 0 && (
          <EmptyState icon={User} title={t.team.noMembersTitle} description={t.team.noMembersDesc}
            action={isOwnerOrAdmin ? { label: t.team.addMember, onClick: () => setShowInvite(true) } : undefined} />
        )}
      </motion.div>

      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title={t.team.addMember} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); handleInvite(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.team.emailAddress}</label>
            <div className="relative">
              <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="email" className="input ps-11" placeholder="member@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} autoFocus />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">{t.team.mustHaveAccount}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.team.role}</label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'MEMBER' | 'ADMIN')} className="input">
              <option value="MEMBER">{t.team.member}</option>
              <option value="ADMIN">{t.team.admin}</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary flex-1">{t.common.cancel}</button>
            <button type="submit" disabled={!inviteEmail.trim() || inviting} className="btn-primary flex-1">{inviting ? t.common.adding : t.team.addMember}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
