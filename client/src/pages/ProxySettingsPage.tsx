import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMe, setStandingProxy, removeStandingProxy, getPartners } from '../api/users';
import { getProxyHolders } from '../api/admin';

interface Partner {
  id: string;
  name: string;
  email: string;
}

interface ProxyHolder {
  userId: string;
  user: { id: string; name: string; email: string };
  addedBy: { name: string };
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  standingProxy: { id: string; name: string } | null;
  approvedProxyHolder: { addedAt: string } | null;
}

export default function ProxySettingsPage() {
  const qc = useQueryClient();

  const { data: me } = useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const { data: partners } = useQuery<Partner[]>({
    queryKey: ['partners'],
    queryFn: getPartners,
  });

  const { data: holders } = useQuery<ProxyHolder[]>({
    queryKey: ['proxy-holders'],
    queryFn: getProxyHolders,
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

  const availablePartners = partners?.filter(p => p.id !== me?.standingProxy?.id) ?? [];
  const availableHolders = holders?.filter(h => h.userId !== me?.id) ?? [];

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Proxy Settings</h1>

      {me?.approvedProxyHolder && (
        <div className="card mb-6 border-l-4" style={{ borderColor: 'var(--color-primary)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
            You are an approved proxy holder
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Other partners may designate you to vote on their behalf.
          </p>
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-1">Standing Proxy</h2>
        <p className="text-sm text-gray-500 mb-4">
          Your standing proxy votes for you on all ballots unless you set a ballot-specific override.
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

      <div className="card mt-4">
        <h2 className="font-semibold text-gray-800 mb-1">Approved Proxy Holders</h2>
        <p className="text-sm text-gray-500 mb-3">
          These partners have been approved by admins to act as proxies.
        </p>
        {availableHolders.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No approved proxy holders yet.</p>
        ) : (
          <div className="space-y-2">
            {availableHolders.map(h => (
              <div key={h.userId} className="flex items-center gap-3 text-sm">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {h.user.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{h.user.name}</p>
                  <p className="text-xs text-gray-400">Added by {h.addedBy.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
