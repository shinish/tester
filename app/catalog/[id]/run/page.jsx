'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Play, ArrowLeft, Loader, CheckCircle2, XCircle, Copy, Terminal, FileJson, Settings2, Sparkles, Tag, User } from 'lucide-react';
import Button from '@/components/Button';

export default function RunAutomationPage() {
  const router = useRouter();
  const params = useParams();
  const [automation, setAutomation] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [reservedTaskId, setReservedTaskId] = useState(null);

  useEffect(() => {
    fetchAutomation();
    reserveTaskId();
  }, [params.id]);

  const fetchAutomation = async () => {
    try {
      const res = await fetch(`/api/automations/${params.id}`);
      const data = await res.json();
      setAutomation(data);

      // Get current user from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      // Pre-populate form with default values and predefined values
      const schema = parseSafeSchema(data.formSchema);
      const initialFormData = {};
      schema.forEach(field => {
        // First check for predefined values (like {{current_user.username}})
        if (field.predefinedValue) {
          let value = field.predefinedValue;

          // Replace {{current_user.username}} with actual username
          if (value.includes('{{current_user.username}}')) {
            value = value.replace('{{current_user.username}}', user.name || user.email || '');
          }
          // Replace {{current_user.email}} with actual email
          if (value.includes('{{current_user.email}}')) {
            value = value.replace('{{current_user.email}}', user.email || '');
          }
          // Replace {{current_user.id}} with actual id
          if (value.includes('{{current_user.id}}')) {
            value = value.replace('{{current_user.id}}', user.id || '');
          }

          initialFormData[field.key] = value;
        }
        // Then check for default values
        else if (field.defaultValue !== undefined && field.defaultValue !== '') {
          initialFormData[field.key] = field.defaultValue;
        }
      });
      setFormData(initialFormData);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching automation:', error);
      setLoading(false);
    }
  };

  const parseSafeSchema = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  const reserveTaskId = async () => {
    try {
      // Get current user from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      const res = await fetch('/api/runs/reserve-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user }),
      });

      const data = await res.json();
      if (res.ok && data.taskId) {
        setReservedTaskId(data.taskId);
      } else {
        console.error('Failed to reserve Task ID:', data.error);
      }
    } catch (error) {
      console.error('Error reserving Task ID:', error);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setResult(null);

    try {
      // Get current user from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      const res = await fetch(`/api/automations/${params.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parameters: formData,
          user: user,
          reservedTaskId: reservedTaskId // Pass the pre-reserved Task ID
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          message: data.message || 'Automation started successfully',
          data: data,
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to run automation',
          data: data,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Error running automation',
        data: error,
      });
    } finally {
      setRunning(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Parse formSchema using useMemo
  const formSchema = useMemo(() => {
    if (!automation || !automation.formSchema) {
      return [];
    }

    try {
      if (Array.isArray(automation.formSchema)) {
        return automation.formSchema;
      }
      const parsed = JSON.parse(automation.formSchema);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }, [automation]);

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
        <XCircle className="h-16 w-16 mb-4" style={{ color: 'var(--muted)' }} />
        <p className="text-lg font-medium mb-4" style={{ color: 'var(--text)' }}>Automation not found</p>
        <Button variant="primary" onClick={() => router.push('/catalog')}>
          Back to Catalog
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto py-8 px-6 space-y-6">
        {/* Reserved Task ID Card */}
        {reservedTaskId && (
          <div className="rounded-lg p-6 shadow-sm" style={{ backgroundColor: 'var(--surface)', border: '2px solid #4C12A1' }}>
            <div className="flex items-center justify-between gap-6">
              {/* Left: Task ID */}
              <div className="flex items-center gap-3">
                <code className="text-2xl font-bold font-mono" style={{ color: '#4C12A1' }}>
                  {reservedTaskId}
                </code>
              </div>

              {/* Right: Username */}
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(76, 18, 161, 0.1)' }}>
                  <User className="h-6 w-6" style={{ color: '#4C12A1' }} />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
                    Current User
                  </p>
                  <p className="text-lg font-bold" style={{ color: '#4C12A1' }}>
                    {JSON.parse(localStorage.getItem('user') || '{}').name ||
                     JSON.parse(localStorage.getItem('user') || '{}').email ||
                     'Guest'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="rounded-lg p-6 shadow-sm" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.push('/catalog')}
              className="p-2 rounded-lg hover:opacity-80 transition-all mt-1"
              style={{ backgroundColor: 'var(--bg)' }}
            >
              <ArrowLeft className="h-5 w-5" style={{ color: 'var(--text)' }} />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-7 w-7" style={{ color: '#4C12A1' }} />
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
                  {automation.name}
                </h1>
              </div>
              <p className="text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
                {automation.description}
              </p>

              <div className="flex items-center gap-3 mt-4">
                <span
                  className="px-3 py-1 text-xs font-semibold rounded-full"
                  style={{ backgroundColor: 'rgba(76, 18, 161, 0.1)', color: '#4C12A1' }}
                >
                  {automation.namespace}
                </span>
                <span className="text-sm" style={{ color: 'var(--muted)' }}>
                  {automation.runs || 0} runs
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Parameters Form */}
        <div className="rounded-lg p-6 shadow-sm" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-6">
            <Settings2 className="h-5 w-5" style={{ color: '#4C12A1' }} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Configuration</h2>
          </div>

          {formSchema.length === 0 ? (
            <div className="text-center py-8 rounded-lg" style={{ backgroundColor: 'var(--bg)' }}>
              <p style={{ color: 'var(--muted)' }}>No parameters required for this automation</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {formSchema.map((field) => (
                <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {field.type === 'text' && (
                    <input
                      type="text"
                      name={field.key}
                      value={formData[field.key] || ''}
                      onChange={handleInputChange}
                      placeholder={field.placeholder || field.defaultValue || ''}
                      required={field.required}
                      disabled={field.disabled || false}
                      className="w-full rounded-lg px-4 py-3 text-sm transition-all"
                      style={{
                        border: '1px solid var(--border)',
                        backgroundColor: field.disabled ? 'var(--bg)' : 'var(--surface)',
                        color: 'var(--text)',
                      }}
                    />
                  )}

                  {field.type === 'password' && (
                    <input
                      type="password"
                      name={field.key}
                      value={formData[field.key] || ''}
                      onChange={handleInputChange}
                      placeholder={field.placeholder || field.defaultValue || ''}
                      required={field.required}
                      disabled={field.disabled || false}
                      className="w-full rounded-lg px-4 py-3 text-sm transition-all"
                      style={{
                        border: '1px solid var(--border)',
                        backgroundColor: field.disabled ? 'var(--bg)' : 'var(--surface)',
                        color: 'var(--text)',
                      }}
                    />
                  )}

                  {field.type === 'number' && (
                    <input
                      type="number"
                      name={field.key}
                      value={formData[field.key] || ''}
                      onChange={handleInputChange}
                      placeholder={field.placeholder || field.defaultValue || ''}
                      required={field.required}
                      disabled={field.disabled || false}
                      className="w-full rounded-lg px-4 py-3 text-sm transition-all"
                      style={{
                        border: '1px solid var(--border)',
                        backgroundColor: field.disabled ? 'var(--bg)' : 'var(--surface)',
                        color: 'var(--text)',
                      }}
                    />
                  )}

                  {field.type === 'select' && (
                    <select
                      name={field.key}
                      value={formData[field.key] || ''}
                      onChange={handleInputChange}
                      required={field.required}
                      disabled={field.disabled || false}
                      className="w-full rounded-lg px-4 py-3 text-sm transition-all appearance-none"
                      style={{
                        border: '1px solid var(--border)',
                        backgroundColor: field.disabled ? 'var(--bg)' : 'var(--surface)',
                        color: 'var(--text)',
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.75rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em',
                        paddingRight: '2.5rem'
                      }}
                    >
                      <option value="">Select an option...</option>
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === 'textarea' && (
                    <textarea
                      name={field.key}
                      value={formData[field.key] || ''}
                      onChange={handleInputChange}
                      placeholder={field.placeholder || field.defaultValue || ''}
                      required={field.required}
                      disabled={field.disabled || false}
                      rows={4}
                      className="w-full rounded-lg px-4 py-3 text-sm transition-all resize-none"
                      style={{
                        border: '1px solid var(--border)',
                        backgroundColor: field.disabled ? 'var(--bg)' : 'var(--surface)',
                        color: 'var(--text)',
                      }}
                    />
                  )}

                  {field.helpText && (
                    <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
                      {field.helpText}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 sticky bottom-6 z-10">
          <Button
            variant="primary"
            icon={running ? Loader : Play}
            onClick={handleRun}
            disabled={running}
            className="flex-1 shadow-lg"
          >
            {running ? (
              <span className="flex items-center gap-2">
                <Loader className="h-4 w-4 animate-spin" />
                Executing Automation...
              </span>
            ) : (
              'Run Automation'
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push('/catalog')}
            disabled={running}
          >
            Cancel
          </Button>
        </div>

        {/* Result Section */}
        {result && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Status Card */}
            <div
              className="rounded-lg p-6 shadow-md"
              style={{
                border: result.success ? '1px solid #22c55e' : '1px solid #ef4444',
                backgroundColor: result.success ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)'
              }}
            >
              <div className="flex items-start gap-4">
                {result.success ? (
                  <CheckCircle2 className="h-8 w-8 flex-shrink-0" style={{ color: '#22c55e' }} />
                ) : (
                  <XCircle className="h-8 w-8 flex-shrink-0" style={{ color: '#ef4444' }} />
                )}
                <div className="flex-1">
                  <h3
                    className="text-xl font-bold mb-2"
                    style={{ color: result.success ? '#15803d' : '#b91c1c' }}
                  >
                    {result.success ? 'Execution Successful' : 'Execution Failed'}
                  </h3>
                  <p
                    className="text-sm mb-4"
                    style={{ color: result.success ? '#16a34a' : '#dc2626' }}
                  >
                    {result.message}
                  </p>

                  {result.data?.uniqueId && (
                    <div
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                        Run ID:
                      </span>
                      <code className="text-sm font-mono" style={{ color: '#4C12A1' }}>
                        {result.data.uniqueId}
                      </code>
                      <button
                        onClick={() => handleCopy(result.data.uniqueId)}
                        className="p-1 rounded hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--muted)' }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {result.data?.awxJobId && (
                    <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
                      AWX Job ID: {result.data.awxJobId}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Parameters Used */}
            {result.success && result.data?.parameters && Object.keys(result.data.parameters).length > 0 && (
              <div className="rounded-lg p-6 shadow-sm" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <FileJson className="h-5 w-5" style={{ color: '#4C12A1' }} />
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Parameters Used</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(result.data.parameters).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-start gap-3 p-3 rounded-lg"
                      style={{ backgroundColor: 'var(--bg)' }}
                    >
                      <span className="text-sm font-semibold min-w-[140px]" style={{ color: 'var(--text)' }}>
                        {key}:
                      </span>
                      <code className="text-sm font-mono flex-1" style={{ color: 'var(--muted)' }}>
                        {typeof value === 'object' ? JSON.stringify(value) : value}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extra Variables */}
            {result.success && result.data?.extraVars && Object.keys(result.data.extraVars).length > 0 && (
              <div className="rounded-lg p-6 shadow-sm" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Settings2 className="h-5 w-5" style={{ color: '#4C12A1' }} />
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Extra Variables (AWX)</h3>
                </div>
                <pre
                  className="text-xs p-4 rounded-lg overflow-x-auto font-mono"
                  style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
                >
                  <code>{JSON.stringify(result.data.extraVars, null, 2)}</code>
                </pre>
              </div>
            )}

            {/* Curl Command */}
            {result.success && result.data?.curlCommand && (
              <div className="rounded-lg p-6 shadow-sm" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" style={{ color: '#4C12A1' }} />
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Command Executed</h3>
                  </div>
                  <button
                    onClick={() => handleCopy(result.data.curlCommand)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg transition-all hover:opacity-90 flex items-center gap-2"
                    style={{ backgroundColor: '#4C12A1', color: 'white' }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </div>
                <pre
                  className="text-xs p-4 rounded-lg overflow-x-auto font-mono"
                  style={{ backgroundColor: '#1e1e1e', color: '#22c55e' }}
                >
                  <code>{result.data.curlCommand}</code>
                </pre>
                <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
                  This is the equivalent curl command that was executed to trigger the automation in AWX.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
