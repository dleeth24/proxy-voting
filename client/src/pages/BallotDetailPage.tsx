import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBallot,
  getMyVote,
  getEffectiveProxy,
  getBallotResults,
  castVote,
  castProxyVote,
  getProxyPrincipals,
  openBallot,
  closeBallot,
} from '../api/ballots';
import { useAuthStore } from '../store/auth';

interface BallotOption {
  id: string;
  label: string;
  orderIndex: number;
}

interface Ballot {
  id: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
  isSecret: boolean;
  closesAt: string | null;
  options: BallotOption[];
  createdBy: { name: string };
}

interface ResultOption {
  id: string;
  label: string;
  count: number;
  percentage: number;
  voters?: { name: string; votedAs: string; castByName?: string }[];
}

interface Principal {
  id: string;
  name: string;
  email: string;
  hasVoted: boolean;
}

export default function BallotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [selectedOption, setSelectedOption] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [proxyVoteFor, setProxyVoteFor] = useState<Principal | null>(null);
  const [proxyOptionId, setProxyOptionId] = useState('');

  const { data: ballot, isLoading } = useQuery<Ballot>({
    queryKey: ['ballot', id],
    queryFn: () => getBallot(id!),
    enabled: !!id,
  });

  const { data: myVote } = useQuery({
    queryKey: ['my-vote', id],
    queryFn: () => getMyVote(id!),
    enabled: !!id && ballot?.status !== 'DRAFT',
  });

  const { data: effectiveProxy } = useQuery({
    queryKey: ['effective-proxy', id],
    queryFn: () => getEffectiveProxy(id!),
    enabled: !!id && ballot?.status === 'OPEN',
  });

  const { data: results } = useQuery({
    queryKey: ['results', id],
    queryFn: () => getBallotResults(id!),
    enabled: !!id && ballot?.status !== 'DRAFT',
  });

  const { data: principals } = useQuery<Principal[]>({
    queryKey: ['proxy-principals', id],
    queryFn: () => getProxyPrincipals(id!),
    enabled: !!id && ballot?.status === 'OPEN',
  });

  const voteMutation = useMutation({
    mutationFn: (optionId: string) => castVote(id!, optionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-vote', id] });
      qc.invalidateQueries({ queryKey: ['results', id] });
      qc.invalidateQueries({ queryKey: ['ballots'] });
      setConfirming(false);
    },
  });

  const proxyVoteMutation = useMutation({
    mutationFn: ({ principalId, optionId }: { principalId: string; optionId: string }) =>
      castProxyVote(id!, principalId, optionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proxy-principals', id] });
      qc.invalidateQueries({ queryKey: ['results', id] });
      setProxyVoteFor(null);
      setProxyOptionId('');
    },
  });

  const openMutation = useMutation({
    mutationFn: () => openBallot(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ballot', id] });
      qc.invalidateQueries({ queryKey: ['ballots'] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => closeBallot(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ballot', id] });
      qc.invalidateQueries({ queryKey: ['ballots'] });
    },
  });

  if (isLoading) return <div className="text-gray-500">Loading…</div>;
  if (!ballot) return <div className="text-red-600">Ballot not found.</div>;

  const isAdmin = user?.role === 'ADMIN';
  const hasVoted = !!myVote;
  const proxyedOut = effectiveProxy?.proxy && ballot.status === 'OPEN';
  const myPrincipals = principals?.filter(p => !p.hasVoted) ?? [];

  return (
    <div className="max-w-2xl">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
      >
        ← Back
      </button>

      <div className="card mb-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={ballot.status} />
              {ballot.isSecret && (
                <span className="text-xs text-gray-400">Secret ballot</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{ballot.title}</h1>
          </div>
          {isAdmin && (
            <div className="flex gap-2 shrink-0">
              {ballot.status === 'DRAFT' && (
                <button
                  className="btn-primary text-sm"
                  onClick={() => openMutation.mutate()}
                  disabled={openMutation.isPending}
                >
                  Open ballot
                </button>
              )}
              {ballot.status === 'OPEN' && (
                <button
                  className="btn-danger text-sm"
                  onClick={() => closeMutation.mutate()}
                  disabled={closeMutation.isPending}
                >
                  Close ballot
                </button>
              )}
            </div>
          )}
        </div>

        {ballot.description && (
          <p className="text-gray-600 text-sm">{ballot.description}</p>
        )}

        {ballot.closesAt && ballot.status === 'OPEN' && (
          <p className="text-xs text-gray-400 mt-2">
            Closes {new Date(ballot.closesAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Proxy notice */}
      {proxyedOut && ballot.status === 'OPEN' && !hasVoted && (
        <div className="card mb-4 border-l-4" style={{ borderColor: 'var(--color-primary)' }}>
          <p className="text-sm text-gray-700">
            Your vote will be cast by{' '}
            <strong>{effectiveProxy.proxy.name}</strong>{' '}
            ({effectiveProxy.source === 'override' ? 'ballot override' : 'standing proxy'}).
          </p>
          <p className="text-xs text-gray-500 mt-1">
            You can change this on the <a href="/proxy" className="underline">My Proxy</a> page.
          </p>
        </div>
      )}

      {/* Vote cast notice */}
      {hasVoted && (
        <div className="card mb-4 bg-green-50 border border-green-200">
          <p className="text-sm text-green-800 font-medium">
            ✓ Vote recorded:{' '}
            <strong>{myVote.option?.label}</strong>
            {myVote.isProxyVote && (
              <span className="text-green-600 font-normal"> (cast by {myVote.castBy?.name})</span>
            )}
          </p>
        </div>
      )}

      {/* Voting interface */}
      {ballot.status === 'OPEN' && !hasVoted && !proxyedOut && (
        <div className="card mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">Cast your vote</h2>
          <div className="space-y-2 mb-4">
            {ballot.options.map(opt => (
              <label
                key={opt.id}
                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50"
                style={selectedOption === opt.id ? { borderColor: 'var(--color-primary)', backgroundColor: 'var(--color-primary-light)' } : { borderColor: '#e5e7eb' }}
              >
                <input
                  type="radio"
                  name="vote"
                  value={opt.id}
                  checked={selectedOption === opt.id}
                  onChange={() => setSelectedOption(opt.id)}
                  className="accent-current"
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                <span className="text-sm font-medium text-gray-800">{opt.label}</span>
              </label>
            ))}
          </div>

          {!confirming ? (
            <button
              className="btn-primary"
              disabled={!selectedOption}
              onClick={() => setConfirming(true)}
            >
              Submit vote
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-700">
                Confirm: <strong>{ballot.options.find(o => o.id === selectedOption)?.label}</strong>?
              </p>
              <button
                className="btn-primary text-sm"
                onClick={() => voteMutation.mutate(selectedOption)}
                disabled={voteMutation.isPending}
              >
                {voteMutation.isPending ? 'Submitting…' : 'Confirm'}
              </button>
              <button
                className="btn-secondary text-sm"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
            </div>
          )}
          {voteMutation.isError && (
            <p className="text-sm text-red-600 mt-2">Error casting vote. Please try again.</p>
          )}
        </div>
      )}

      {/* Proxy voting for principals */}
      {ballot.status === 'OPEN' && principals && principals.length > 0 && (
        <div className="card mb-4">
          <h2 className="font-semibold text-gray-800 mb-1">Proxy votes to cast</h2>
          <p className="text-xs text-gray-500 mb-3">Partners who designated you as their proxy on this ballot</p>
          <div className="space-y-3">
            {principals.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  {p.hasVoted && <p className="text-xs text-green-600">✓ Vote cast</p>}
                </div>
                {!p.hasVoted && (
                  proxyVoteFor?.id === p.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="form-select text-sm py-1"
                        value={proxyOptionId}
                        onChange={e => setProxyOptionId(e.target.value)}
                      >
                        <option value="">Select option…</option>
                        {ballot.options.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                      <button
                        className="btn-primary text-sm py-1"
                        disabled={!proxyOptionId || proxyVoteMutation.isPending}
                        onClick={() =>
                          proxyVoteMutation.mutate({ principalId: p.id, optionId: proxyOptionId })
                        }
                      >
                        Submit
                      </button>
                      <button
                        className="btn-secondary text-sm py-1"
                        onClick={() => { setProxyVoteFor(null); setProxyOptionId(''); }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn-secondary text-sm"
                      onClick={() => { setProxyVoteFor(p); setProxyOptionId(''); }}
                    >
                      Vote for {p.name.split(' ')[0]}
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results && ballot.status !== 'DRAFT' && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-1">Results</h2>
          <p className="text-xs text-gray-400 mb-4">
            {results.totalVoted} of {results.totalEligible} partners voted
          </p>
          <div className="space-y-3">
            {results.options.map((opt: ResultOption) => (
              <div key={opt.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-800">{opt.label}</span>
                  <span className="text-gray-500">{opt.count} ({opt.percentage}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${opt.percentage}%`, backgroundColor: 'var(--color-primary)' }}
                  />
                </div>
                {opt.voters && opt.voters.length > 0 && (
                  <div className="mt-2 ml-2 space-y-0.5">
                    {opt.voters.map((v, i) => (
                      <p key={i} className="text-xs text-gray-500">
                        {v.name}
                        {v.votedAs === 'proxy' && v.castByName && (
                          <span className="text-gray-400"> (via {v.castByName})</span>
                        )}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'OPEN') return <span className="badge-open">Open</span>;
  if (status === 'CLOSED') return <span className="badge-closed">Closed</span>;
  return <span className="badge-draft">Draft</span>;
}
