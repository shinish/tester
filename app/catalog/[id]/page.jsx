'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Play, Calendar, User, Tag, FileText, Settings, Code, Loader, Clock, CheckCircle, XCircle, AlertCircle, History } from 'lucide-react';
import Button from '@/components/Button';

export default function CatalogDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [automation, setAutomation] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextTaskId, setNextTaskId] = useState(null);

  useEffect(() => {
    fetchAutomation();
    fetchRuns();
    fetchNextTaskId();
  }, [params.id]);

  const fetchAutomation = async () => {
    try {
      const res = await fetch(`/api/automations/${params.id}`);
      const data = await res.json();
      setAutomation(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching automation:', error);
      setLoading(false);
    }
  };

  const fetchRuns = async () => {
    try {
      const res = await fetch(`/api/runs?automationId=${params.id}`);
      const data = await res.json();
      setRuns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching runs:', error);
      setRuns([]);
    }
  };

  const fetchNextTaskId = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const params = new URLSearchParams();
      if (user.email) params.append('userEmail', user.email);
      if (user.id) params.append('userId', user.id);

      const res = await fetch(`/api/runs/next-id?${params.toString()}`);
      const data = await res.json();
      setNextTaskId(data.nextTaskId);
    } catch (error) {
      console.error('Error fetching next task ID:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4" style={{ color: '#22c55e' }} />;
      case 'failed':
        return <XCircle className="h-4 w-4" style={{ color: '#ef4444' }} />;
      case 'running':
        return <Clock className="h-4 w-4 animate-spin" style={{ color: '#3b82f6' }} />;
      case 'pending':
        return <AlertCircle className="h-4 w-4" style={{ color: '#f59e0b' }} />;
      default:
        return <Clock className="h-4 w-4" style={{ color: 'var(--muted)' }} />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      success: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '#22c55e' },
      failed: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '#ef4444' },
      running: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '#3b82f6' },
      pending: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '#f59e0b' },
    };

    const style = styles[status] || { bg: 'var(--surface)', color: 'var(--muted)', border: 'var(--border)' };

    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full"
        style={{
          backgroundColor: style.bg,
          color: style.color,
          border: `1px solid ${style.border}`
        }}
      >
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDuration = (startedAt, completedAt) => {
    if (!completedAt) return '-';

    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const durationMs = end - start;

    // Handle invalid durations (negative or zero)
    if (durationMs <= 0) return '< 0.1 min';

    // Convert to minutes with 1 decimal place
    const minutes = (durationMs / 1000 / 60).toFixed(1);
    return `${minutes} min`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]" style={{ backgroundColor: 'var(--bg)' }}>
        <Loader className="h-12 w-12 animate-spin mb-4" style={{ color: '#4C12A1' }} />
        <p style={{ color: 'var(--muted)' }}>Loading automation...</p>
      </div>
    );
  }

  if (!automation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]" style={{ backgroundColor: 'var(--bg)' }}>
        <p className="text-lg font-medium mb-4" style={{ color: 'var(--text)' }}>Automation not found</p>
        <Button variant="primary" onClick={() => router.push('/catalog')}>
          Back to Catalog
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-7xl mx-auto py-8 px-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/catalog')}
              className="p-2 rounded-lg hover:opacity-80 transition-all"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              <ArrowLeft className="h-5 w-5" style={{ color: 'var(--text)' }} />
            </button>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{automation.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span
                  className="px-3 py-1 text-sm font-semibold rounded-full"
                  style={{ backgroundColor: 'rgba(76, 18, 161, 0.1)', color: '#4C12A1' }}
                >
                  {automation.namespace}
                </span>
                <span className="text-sm" style={{ color: 'var(--muted)' }}>
                  {automation.runs || 0} total runs
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            icon={Play}
            onClick={() => router.push(`/catalog/${params.id}/run`)}
          >
            Run Automation
          </Button>
        </div>

        {/* Description */}
        {automation.description && (
          <div className="rounded-lg p-6 shadow-sm" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
              {automation.description}
            </p>
          </div>
        )}

        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backend Configuration */}
          <div className="rounded-lg p-6 shadow-sm" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5" style={{ color: '#4C12A1' }} />
              <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Configuration</h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Template ID</p>
                <code className="block text-sm font-mono px-3 py-2 rounded" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
                  {automation.templateId || 'Not configured'}
                </code>
              </div>
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Inventory ID</p>
                <code className="block text-sm font-mono px-3 py-2 rounded" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
                  {automation.inventoryId || 'Not configured'}
                </code>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="rounded-lg p-6 shadow-sm" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5" style={{ color: '#4C12A1' }} />
              <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Metadata</h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Created By</p>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" style={{ color: 'var(--muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text)' }}>{automation.createdBy}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Created On</p>
                <p className="text-sm" style={{ color: 'var(--text)' }}>
                  {new Date(automation.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Execution History - ServiceNow Style Table */}
        <div className="rounded-lg shadow-sm" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" style={{ color: '#4C12A1' }} />
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Execution History</h2>
              <span
                className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full"
                style={{ backgroundColor: 'rgba(76, 18, 161, 0.1)', color: '#4C12A1' }}
              >
                {runs.length}
              </span>
            </div>
          </div>

          {runs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Clock className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.5 }} />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>No executions yet</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Run this automation to see execution history
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                      Run ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                      Executed By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                      Start Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                      End Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                      AWX Job ID
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run, index) => (
                    <tr
                      key={run.id}
                      className="transition-colors hover:bg-opacity-50"
                      style={{
                        borderBottom: index !== runs.length - 1 ? '1px solid var(--border)' : 'none',
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code
                          className="text-sm font-mono font-semibold"
                          style={{ color: '#4C12A1' }}
                        >
                          {run.uniqueId || run.id.substring(0, 8)}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(run.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" style={{ color: 'var(--muted)' }} />
                          <span className="text-sm" style={{ color: 'var(--text)' }}>
                            {run.executedBy || 'System'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm" style={{ color: 'var(--text)' }}>
                          {new Date(run.startedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>
                          {new Date(run.startedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {run.completedAt ? (
                          <>
                            <div className="text-sm" style={{ color: 'var(--text)' }}>
                              {new Date(run.completedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-xs" style={{ color: 'var(--muted)' }}>
                              {new Date(run.completedAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </>
                        ) : (
                          <span className="text-sm" style={{ color: 'var(--muted)' }}>-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono" style={{ color: 'var(--text)' }}>
                          {formatDuration(run.startedAt, run.completedAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {run.awxJobId ? (
                          <code className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg)', color: 'var(--muted)' }}>
                            {run.awxJobId}
                          </code>
                        ) : (
                          <span className="text-sm" style={{ color: 'var(--muted)' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
