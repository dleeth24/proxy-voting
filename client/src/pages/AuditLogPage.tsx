import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLog } from '../api/admin';

interface AuditEntry {
  id: string;
  action: string;
  actor: { name: string; email: string };
  ballot: { title: string } | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditLogResponse {
  logs: AuditEntry[];
  total: number;
  page: number;
  limit: number;
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const limit = 50;

  const params: Record<string, string> = { page: String(page), limit: String(limit) };
  if (actionFilter) params.action = actionFilter;

  const { data, isLoading } = useQuery<AuditLogResponse>({
    queryKey: ['audit-log', page, actionFilter],
    queryFn: () => getAuditLog(params),
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const actions = [
    'BALLOT_CREATED', 'BALLOT_OPENED', 'BALLOT_CLOSED',
    'VOTE_CAST', 'PROXY_VOTE_CAST',
    'STANDING_PROXY_SET', 'STANDING_PROXY_REVOKED',
    'BALLOT_PROXY_OVERRIDE_SET', 'BALLOT_PROXY_OVERRIDE_REVOKED',
    'PROXY_HOLDER_ADDED', 'PROXY_HOLDER_REMOVED',
    'USER_LOGIN', 'SETTINGS_UPDATED',
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Audit Log</h1>

      <div className="flex gap-3 mb-4">
        <select
          className="form-select max-w-xs"
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}
        >
          <option value="">All actions</option>
          {actions.map(a => (
            <option key={a} value={a}>{formatAction(a)}</option>
          ))}
        </select>
        {actionFilter && (
          <button className="btn-secondary text-sm" onClick={() => { setActionFilter(''); setPage(1); }}>
            Clear filter
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ballot</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Details</th>
                </tr>
              </thead>
              <tbody>
                {data?.logs.map(log => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap text-xs">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                      {log.actor.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="badge-primary">{formatAction(log.action)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-[160px] truncate">
                      {log.ballot?.title ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs max-w-[200px] truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : ''}
                    </td>
                  </tr>
                ))}
                {data?.logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      No entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                {data?.total} total entries
              </p>
              <div className="flex gap-2">
                <button
                  className="btn-secondary text-sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500 self-center">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn-secondary text-sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
