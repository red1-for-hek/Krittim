'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Loader2,
  LogOut,
  Mail,
  Save,
  Settings as SettingsIcon,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';

import AnimatedMeshBackground from '@/components/layout/AnimatedMeshBackground';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuthStore } from '@/store/authStore';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, checking, hydrateSession, updateProfile, deleteAccount, logout } = useAuthStore();

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [dobDraft, setDobDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [error, setError] = useState('');

  const name = nameDraft ?? user?.name ?? '';
  const email = user?.email ?? '';
  const dob = dobDraft ?? user?.dateOfBirth ?? '';

  useEffect(() => {
    void hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (!checking && !isAuthenticated) {
      router.replace('/login');
    }
  }, [checking, isAuthenticated, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Full name is required.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), dateOfBirth: dob.trim() || undefined });
      setNameDraft(null);
      setDobDraft(null);
      toast.success('Profile updated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      toast.success('Account deleted');
      router.push('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  if (checking || !isAuthenticated) {
    return (
      <div className="relative flex min-h-dvh w-full items-center justify-center bg-background px-4">
        <AnimatedMeshBackground />
        <div className="glass-panel relative z-10 flex flex-col items-center gap-3 rounded-2xl px-8 py-7 text-center">
          <Loader2 className="size-6 animate-spin text-brand" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Loading profile…</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Verifying your session.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      <AnimatedMeshBackground />

      <header className="glass-bar sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 px-4 md:px-6">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.push('/')}
            aria-label="Back to chat"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <ArrowLeft className="size-5" strokeWidth={1.9} />
          </button>
          <div className="flex items-center gap-2">
            <UserRound className="size-4 text-brand" strokeWidth={1.8} />
            <h1 className="text-sm font-semibold tracking-tight text-foreground">Profile</h1>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push('/settings')}
          className="whitespace-nowrap rounded-xl border-hairline bg-surface text-xs"
        >
          <SettingsIcon className="size-3.5" />
          Settings
        </Button>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-8 md:py-10">
        <div className="space-y-6">
          {/* Identity Banner */}
          <section className="glass-panel rounded-2xl p-6 md:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-soft text-xl font-semibold text-white shadow-[0_0_24px_-6px_var(--brand)]">
                  {user?.initials ?? '?'}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold tracking-tight text-foreground">
                    {user?.name}
                  </h2>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {user?.handle} · {user?.provider ?? 'email'} · {user?.plan}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="self-start rounded-xl border-hairline bg-surface sm:self-center"
              >
                <LogOut className="size-3.5" />
                Log out
              </Button>
            </div>
          </section>

          {/* Account Details Form */}
          <section className="glass-panel rounded-2xl p-6 md:p-7">
            <div className="mb-6">
              <h3 className="text-base font-semibold tracking-tight text-foreground">Account details</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Update your display name and personal preferences.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="profile-name" className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <UserRound className="size-3.5 text-brand" strokeWidth={1.9} />
                    Full name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setNameDraft(e.target.value)}
                    className="h-11 w-full rounded-xl border border-hairline bg-surface-soft px-3.5 text-sm text-foreground outline-none transition-colors focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/20"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="profile-email" className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <Mail className="size-3.5 text-brand" strokeWidth={1.9} />
                    Email address
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    readOnly
                    className="h-11 w-full cursor-not-allowed rounded-xl border border-hairline bg-surface-soft/60 px-3.5 text-sm text-muted-foreground outline-none"
                  />
                  <p className="text-[11px] text-muted-foreground/70">
                    Email cannot be changed after signup.
                  </p>
                </div>
              </div>

              <div className="max-w-sm space-y-2">
                <label htmlFor="profile-dob" className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <CalendarIcon className="size-3.5 text-brand" strokeWidth={1.9} />
                  Date of birth
                </label>
                <input
                  id="profile-dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDobDraft(e.target.value)}
                  className="h-11 w-full rounded-xl border border-hairline bg-surface-soft px-3.5 text-sm text-foreground outline-none transition-colors focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/20"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/[0.08] px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-br from-brand to-brand-soft px-5 text-white hover:brightness-110"
                >
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          </section>

          {/* Danger Zone */}
          <section className="glass-panel rounded-2xl border-destructive/30 bg-destructive/[0.05] p-6 md:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Delete account</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Permanently remove your account, saved profile, and all server-side chat history.
                </p>
              </div>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={() => setConfirmDeleteOpen(true)}
                className="shrink-0 whitespace-nowrap rounded-xl"
              >
                {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                Delete account
              </Button>
            </div>
          </section>

          <p className="text-center text-[11px] text-muted-foreground/60">
            Krittim AI · built by BNMPC IT Club
          </p>
        </div>
      </main>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete your account?"
        description="This permanently deletes your Krittim AI account and removes all associated chats and groups. This action cannot be undone."
        confirmLabel="Delete account"
        destructive
        onConfirm={() => {
          void handleDeleteAccount();
        }}
      />
    </div>
  );
}
