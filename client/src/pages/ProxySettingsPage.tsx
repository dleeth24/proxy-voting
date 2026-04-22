import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMe, setStandingProxy, removeStandingProxy, getPartners } from '../api/users';
import Spinner from '../components/Spinner';

interface Partner {
  id: string;
  name: string;
  email: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  standingProxy: { id: string; name: string } | null;
}

export default function ProxySettingsPage() {
  const qc = useQueryClient();

  const { data: me, isLoading: meLoading } = useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const { data: partners } = useQuery<Partner[]>({
    queryKey: ['partners'],
    queryFn: getPartners,
  });

  const setMutation = useMutation({
    mutationFn: (proxyId: string) => setStandingProxy(proxyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['effective-proxy'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeStandingProxy,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['effective-proxy'] });
    },
  });

  if (meLoading) return (
    <div className="flex items-center gap-2 text-gray-400 py-4">
      <Spinner className="w-5 h-5" />
      <span className="text-sm">Loading…</span>
    </div>
  );

  const availablePartners = partners?.filter(p => p.id !== me?.id && p.id !== me?.standingProxy?.id) ?? [];

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Proxy Settings</h1>

      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-1">Standing Proxy</h2>
        <p className="text-sm text-gray-500 mb-4">
          Your standing proxy votes on your behalf for all ballots when you're unavailable.
        </p>

        {me?.standingProxy ? (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-900">{me.standingProxy.name}</p>
              <p className="text-xs text-gray-500">Current standing proxy</p>
            </div>
            <button
              className="btn-danger text-sm"
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
            >
              Revoke
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic mb-3">No standing proxy set — you vote directly.</p>
        )}

        {availablePartners.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {me?.standingProxy ? 'Change standing proxy' : 'Set standing proxy'}
            </label>
            <div className="flex gap-2">
              <select
                className="form-select"
                defaultValue=""
                onChange={e => {
                  if (e.target.value) setMutation.mutate(e.target.value);
                  e.target.value = '';
                }}
                disabled={setMutation.isPending}
              >
                <option value="">Choose a partner…</option>
                {availablePartners.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {setMutation.isError && (
          <p className="text-sm text-red-600 mt-2">Failed to set proxy. Please try again.</p>
        )}
      </div>
    </div>
  );
}
