import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getBallots, createBallot } from '../api/ballots';
import { getProxyHolders, addProxyHolder, removeProxyHolder } from '../api/admin';
import { getUsers } from '../api/users';
import api from '../api/client';

interface Ballot {
  id: string;
  title: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
  isSecret: boolean;
  _count: { votes: number };
  createdBy: { name: string };
}

interface ProxyHolder {
  userId: string;
  user: { id: string; name: string; email: string };
  addedBy: { name: string };
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  approvedProxyHolder: null | { addedAt: string };
}

type Tab = 'ballots' | 'proxy-holders' | 'settings';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('ballots');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin</h1>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['ballots', 'proxy-holders', 'settings'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize -mb-px ${
              tab === t
                ? 'border-current text-current'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            style={tab === t ? { color: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : {}}
          >
            {t === 'proxy-holders' ? 'Proxy Holders' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'ballots' && <BallotsTab />}
      {tab === 'proxy-holders' && <ProxyHoldersTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

// ── Ballots Tab ──────────────────────────────────────────────────────────────

function BallotsTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    isSecret: true,
    closesAt: '',
    options: ['', ''],
  });

  const { data: ballots } = useQuery<Ballot[]>({
    queryKey: ['ballots'],
    queryFn: getBallots,
  });

  const createMutation = useMutation({
    mutationFn: (data: unknown) => createBallot(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ballots'] });
      setShowForm(false);
      setForm({ title: '', description: '', isSecret: true, closesAt: '', options: ['', ''] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const options = form.options
      .map((label, i) => ({ label: label.trim(), orderIndex: i }))
      .filter(o => o.label);
    if (options.length < 2) return;

    createMutation.mutate({
      title: form.title,
      description: form.description || undefined,
      isSecret: form.isSecret,
      closesAt: form.closesAt ? new Date(form.closesAt).toISOString() : undefined,
      options,
    });
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">All Ballots</h2>
        <button className="btn-primary text-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New ballot'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">Create New Ballot</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                className="form-input"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="form-input"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isSecret}
                  onChange={e => setForm(f => ({ ...f, isSecret: e.target.checked }))}
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                Secret ballot
              </label>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Close date</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={form.closesAt}
                  onChange={e => setForm(f => ({ ...f, closesAt: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Options (min 2) *</label>
              <div className="space-y-2">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="form-input"
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={e => {
                        const opts = [...form.options];
                        opts[i] = e.target.value;
                        setForm(f => ({ ...f, options: opts }));
                      }}
                    />
                    {form.options.length > 2 && (
                      <button
                        type="button"
                        className="text-red-500 px-2"
                        onClick={() => setForm(f => ({ ...f, options: f.options.filter((_, j) => j !== i) }))}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="text-sm mt-2"
                style={{ color: 'var(--color-primary)' }}
                onClick={() => setForm(f => ({ ...f, options: [...f.options, ''] }))}
              >
                + Add option
              </button>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create ballot'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
            {createMutation.isError && (
              <p className="text-sm text-red-600">Failed to create ballot.</p>
            )}
          </form>
        </div>
      )}

      <div className="space-y-2">
        {ballots?.map(b => (
          <Link
            key={b.id}
            to={`/ballots/${b.id}`}
            className="card block hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <StatusBadge status={b.status} />
                  {b.isSecret && <span className="text-xs text-gray-400">Secret</span>}
                </div>
                <p className="font-medium text-gray-900">{b.title}</p>
                <p className="text-xs text-gray-400">Created by {b.createdBy.name}</p>
              </div>
              <span className="text-sm text-gray-400">{b._count.votes} votes</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Proxy Holders Tab ────────────────────────────────────────────────────────

function ProxyHoldersTab() {
  const qc = useQueryClient();

  const { data: holders } = useQuery<ProxyHolder[]>({
    queryKey: ['proxy-holders'],
    queryFn: getProxyHolders,
  });

  const { data: users } = useQuery<UserItem[]>({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const addMutation = useMutation({
    mutationFn: (userId: string) => addProxyHolder(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proxy-holders'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeProxyHolder(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proxy-holders'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const holderIds = new Set(holders?.map(h => h.userId) ?? []);
  const nonHolders = users?.filter(u => !holderIds.has(u.id)) ?? [];

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Approved Proxy Holders</h2>

      <div className="card mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Add a proxy holder</h3>
        <select
          className="form-select"
          defaultValue=""
          onChange={e => {
            if (e.target.value) addMutation.mutate(e.target.value);
            e.target.value = '';
          }}
          disabled={addMutation.isPending}
        >
          <option value="">Select a partner to approve…</option>
          {nonHolders.map(u => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.role})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {holders?.map(h => (
          <div key={h.userId} className="card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {h.user.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{h.user.name}</p>
                <p className="text-xs text-gray-400">{h.user.email} · Added by {h.addedBy.name}</p>
              </div>
            </div>
            <button
              className="btn-danger text-sm"
              onClick={() => removeMutation.mutate(h.userId)}
              disabled={removeMutation.isPending}
            >
              Remove
            </button>
          </div>
        ))}
        {holders?.length === 0 && (
          <p className="text-sm text-gray-400 italic">No approved proxy holders yet.</p>
        )}
      </div>
    </div>
  );
}

// ── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const qc = useQueryClient();
  const [color, setColor] = useState('#1e3a5f');
  const [saved, setSaved] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (value: string) =>
      api.put('/api/v1/settings', { key: 'primaryColor', value }).then(r => r.data),
    onSuccess: () => {
      document.documentElement.style.setProperty('--color-primary', color);
      qc.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <div className="max-w-sm">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Appearance</h2>
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-2">Primary color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-12 h-10 rounded cursor-pointer border border-gray-300"
          />
          <input
            type="text"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="form-input font-mono text-sm"
            placeholder="#1e3a5f"
          />
        </div>
        <button
          className="btn-primary mt-4"
          onClick={() => saveMutation.mutate(color)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving…' : saved ? '✓ Saved' : 'Save color'}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'OPEN') return <span className="badge-open">Open</span>;
  if (status === 'CLOSED') return <span className="badge-closed">Closed</span>;
  return <span className="badge-draft">Draft</span>;
}
