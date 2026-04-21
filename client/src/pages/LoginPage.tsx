import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/auth';

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'PARTNER' | 'ADMIN';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [selectedEmail, setSelectedEmail] = useState('');
  const [error, setError] = useState('');

  const { data: users, isLoading } = useQuery<MockUser[]>({
    queryKey: ['mock-users'],
    queryFn: () => axios.get('/api/v1/auth/users').then(r => r.data),
  });

  const loginMutation = useMutation({
    mutationFn: (email: string) =>
      axios.post('/api/v1/auth/login', { email }).then(r => r.data),
    onSuccess: data => {
      setAuth(data.user, data.token);
      navigate('/');
    },
    onError: () => {
      setError('Login failed. Please try again.');
    },
  });

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmail) return;
    setError('');
    loginMutation.mutate(selectedEmail);
  }

  const admins = users?.filter(u => u.role === 'ADMIN') ?? [];
  const partners = users?.filter(u => u.role === 'PARTNER') ?? [];

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="card w-full max-w-md">
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
            style={{ backgroundColor: 'var(--color-primary-light)' }}
          >
            <svg
              className="w-6 h-6"
              style={{ color: 'var(--color-primary)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Partner Voting</h1>
          <p className="text-sm text-gray-500 mt-1">Select your account to continue</p>
          <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5 inline-block">
            Development mode — no password required
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-gray-500 py-4">Loading users...</div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Sign in as
              </label>
              <select
                className="form-select"
                value={selectedEmail}
                onChange={e => setSelectedEmail(e.target.value)}
                required
              >
                <option value="">Choose a user…</option>
                {admins.length > 0 && (
                  <optgroup label="Admins">
                    {admins.map(u => (
                      <option key={u.id} value={u.email}>
                        {u.name} — {u.email}
                      </option>
                    ))}
                  </optgroup>
                )}
                {partners.length > 0 && (
                  <optgroup label="Partners">
                    {partners.map(u => (
                      <option key={u.id} value={u.email}>
                        {u.name} — {u.email}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={!selectedEmail || loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
