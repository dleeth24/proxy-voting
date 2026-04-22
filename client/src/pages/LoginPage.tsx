import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/auth';
import Spinner from '../components/Spinner';

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
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-1">Burr &amp; Forman</p>
          <h1 className="text-2xl font-bold text-gray-900">Partner Voting Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Select your profile to continue</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner className="w-6 h-6 text-gray-400" />
          </div>
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
                <option value="">Choose a partner…</option>
                {admins.length > 0 && (
                  <optgroup label="Firm Administration">
                    {admins.map(u => (
                      <option key={u.id} value={u.email}>
                        {u.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {partners.length > 0 && (
                  <optgroup label="Partners">
                    {partners.map(u => (
                      <option key={u.id} value={u.email}>
                        {u.name}
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
              {loginMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner className="w-4 h-4" />
                  Signing in…
                </span>
              ) : (
                'Continue'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
