import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getBallots } from '../api/ballots';
import { useAuthStore } from '../store/auth';
import Spinner from '../components/Spinner';

interface Ballot {
  id: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
  isSecret: boolean;
  closesAt: string | null;
  createdBy: { name: string };
  _count: { votes: number };
}

function StatusBadge({ status }: { status: Ballot['status'] }) {
  if (status === 'OPEN') return <span className="badge-open">Open</span>;
  if (status === 'CLOSED') return <span className="badge-closed">Closed</span>;
  return <span className="badge-draft">Draft</span>;
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: ballots, isLoading } = useQuery<Ballot[]>({
    queryKey: ['ballots'],
    queryFn: getBallots,
  });

  const open = ballots?.filter(b => b.status === 'OPEN') ?? [];
  const closed = ballots?.filter(b => b.status === 'CLOSED') ?? [];
  const drafts = ballots?.filter(b => b.status === 'DRAFT') ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Welcome, {user?.name?.split(' ')[0]}
      </h1>

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-400 py-4">
          <Spinner className="w-5 h-5" />
          <span className="text-sm">Loading ballots…</span>
        </div>
      )}

      {/* Open ballots */}
      {open.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="badge-open">Open</span>
            <span>Active Ballots</span>
          </h2>
          <div className="grid gap-4">
            {open.map(b => (
              <BallotCard key={b.id} ballot={b} />
            ))}
          </div>
        </section>
      )}

      {/* Draft ballots — admin only */}
      {user?.role === 'ADMIN' && drafts.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="badge-draft">Draft</span>
            <span>Draft Ballots</span>
          </h2>
          <div className="grid gap-4">
            {drafts.map(b => (
              <BallotCard key={b.id} ballot={b} />
            ))}
          </div>
        </section>
      )}

      {/* Closed ballots */}
      {closed.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="badge-closed">Closed</span>
            <span>Past Ballots</span>
          </h2>
          <div className="grid gap-4">
            {closed.map(b => (
              <BallotCard key={b.id} ballot={b} />
            ))}
          </div>
        </section>
      )}

      {!isLoading && ballots?.length === 0 && (
        <div className="card text-center text-gray-500 py-12">
          No ballots yet.
          {user?.role === 'ADMIN' && (
            <div className="mt-3">
              <Link to="/admin" className="btn-primary inline-block">
                Create a ballot
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BallotCard({ ballot }: { ballot: Ballot }) {
  return (
    <Link to={`/ballots/${ballot.id}`} className="card block hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={ballot.status} />
            {ballot.isSecret && (
              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Secret
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{ballot.title}</h3>
          {ballot.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{ballot.description}</p>
          )}
        </div>
        <div className="text-right text-xs text-gray-400 shrink-0">
          <div>{ballot._count.votes} vote{ballot._count.votes !== 1 ? 's' : ''}</div>
          {ballot.closesAt && ballot.status === 'OPEN' && (
            <div className="mt-1">Closes {formatDate(ballot.closesAt)}</div>
          )}
        </div>
      </div>
    </Link>
  );
}
