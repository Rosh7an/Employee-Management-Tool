import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { format, endOfWeek, endOfMonth, startOfToday } from 'date-fns';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { ErrorBanner } from '../../components/ErrorBanner';
import { leaveApi } from './leave.api';
import { extractApiError } from '../../lib/axios';

interface Props { onSuccess: () => void; }

const LEAVE_TYPES = ['sick', 'casual', 'earned'];
type SelectionMode = 'today' | 'week' | 'month' | 'custom';

export function LeaveForm({ onSuccess }: Props) {
  const [type, setType] = useState('sick');
  const [mode, setMode] = useState<SelectionMode>('today');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const todayDate = startOfToday();

  function getRange(): { start: Date; end: Date } | null {
    const now = new Date();
    switch (mode) {
      case 'today':
        return { start: now, end: now };
      case 'week':
        return { start: now, end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'month':
        return { start: now, end: endOfMonth(now) };
      case 'custom':
        if (customRange?.from && customRange?.to) return { start: customRange.from, end: customRange.to };
        if (customRange?.from) return { start: customRange.from, end: customRange.from };
        return null;
    }
  }

  const activeRange = getRange();
  const canSubmit = !!activeRange;

  const mutation = useMutation({
    mutationFn: () => {
      if (!activeRange) throw new Error('Please select a date range.');
      return leaveApi.create({
        type,
        startDate: format(activeRange.start, 'yyyy-MM-dd'),
        endDate: format(activeRange.end, 'yyyy-MM-dd'),
        reason: reason.trim() || undefined,
      });
    },
    onSuccess,
    onError: (e: unknown) => setError(extractApiError(e, 'Submit failed.').message),
  });

  return (
    <div className="form">
      {error && <ErrorBanner error={null} message={error} />}

      <div className="input-group">
        <label className="input-label">Leave Type</label>
        <select className="input" style={{ maxWidth: 240 }} value={type} onChange={(e) => setType(e.target.value)}>
          {LEAVE_TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="input-group" style={{ width: '100%' }}>
        <label className="input-label">Select Period</label>

        {/* Preset selector */}
        <div style={{
          display: 'flex', border: '1.5px solid var(--s3)', borderRadius: 'var(--r-sm)',
          overflow: 'hidden', width: '100%', marginBottom: 'var(--sp-3)',
        }}>
          {(['today', 'week', 'month', 'custom'] as SelectionMode[]).map((m, i, arr) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: 'var(--sp-2) 0',
                background: mode === m ? 'var(--t1)' : 'var(--s0)',
                color: mode === m ? 'var(--s0)' : 'var(--t2)',
                border: 'none',
                borderRight: i < arr.length - 1 ? '1.5px solid var(--s3)' : 'none',
                fontSize: '12.5px', fontWeight: 600, textTransform: 'capitalize',
                cursor: 'pointer', transition: 'background var(--t-fast)',
              }}
            >
              {m === 'today' ? 'Today' : m === 'week' ? 'This Week' : m === 'month' ? 'This Month' : 'Custom'}
            </button>
          ))}
        </div>

        {/* Summary for preset modes */}
        {mode !== 'custom' && activeRange && (
          <div style={{
            padding: 'var(--sp-4)', background: 'var(--s1)',
            border: '1.5px solid var(--s3)', borderRadius: 'var(--r-sm)',
          }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600, color: 'var(--t3)', marginBottom: 4 }}>
              Selected Range
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)' }}>
              {format(activeRange.start, 'EEEE, MMMM d, yyyy')}
              {mode !== 'today' && (
                <span style={{ fontWeight: 400, color: 'var(--t2)' }}>
                  {' '}to {format(activeRange.end, 'EEEE, MMMM d, yyyy')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Calendar for custom mode */}
        {mode === 'custom' && (
          <div style={{
            border: '1.5px solid var(--s3)', borderRadius: 'var(--r-sm)',
            padding: 'var(--sp-3)', background: 'var(--s0)', display: 'inline-block',
          }}>
            <DayPicker
              mode="range"
              selected={customRange}
              onSelect={setCustomRange}
              disabled={{ before: todayDate }}
              defaultMonth={todayDate}
            />
            {customRange?.from && (
              <div style={{ fontSize: 12.5, color: 'var(--t2)', padding: 'var(--sp-2) var(--sp-1) 0', fontWeight: 500 }}>
                {customRange.from && !customRange.to
                  ? format(customRange.from, 'MMM d') + ' — select end date'
                  : `${format(customRange.from, 'MMM d')} – ${format(customRange.to!, 'MMM d, yyyy')}`}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="input-group">
        <label className="input-label">
          Reason <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(Optional)</span>
        </label>
        <textarea
          className="input"
          rows={3}
          style={{ resize: 'vertical' }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional notes about this leave request…"
        />
      </div>

      <button
        className="form-btn"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !canSubmit}
      >
        {mutation.isPending ? <span className="spinner" /> : 'Submit Request'}
      </button>
    </div>
  );
}
