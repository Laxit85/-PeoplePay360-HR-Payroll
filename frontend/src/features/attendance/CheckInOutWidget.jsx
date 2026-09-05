import React, { useState, useEffect, useRef } from 'react';
import { Clock, Play, Square } from 'lucide-react';
import { getAttendanceLogsApi, clockInOutApi } from '../../api';
import { useAuth } from '../../auth/useAuth';

export function CheckInOutWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [loading, setLoading] = useState(false);
  const widgetRef = useRef(null);

  const employeeId = user?.employeeId || 1;

  const checkStatus = async () => {
    try {
      const res = await getAttendanceLogsApi({ employee_id: employeeId });
      const records = res.data || res || [];
      const todaySession = records.find((r) => !r.check_out);
      if (todaySession) {
        setActiveSession({
          id: todaySession.id,
          checkIn: todaySession.check_in,
          checkOut: todaySession.check_out
        });
      } else {
        setActiveSession(null);
      }
    } catch {
      setActiveSession(null);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [employeeId]);

  // Click outside listener to automatically close/dismiss popover panel
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!activeSession?.checkIn) return;
    const interval = setInterval(() => {
      const start = new Date(activeSession.checkIn).getTime();
      const now = new Date().getTime();
      const diffMs = Math.max(0, now - start);
      const hours = String(Math.floor(diffMs / (1000 * 60 * 60))).padStart(2, '0');
      const mins = String(Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
      const secs = String(Math.floor((diffMs % (1000 * 60)) / 1000)).padStart(2, '0');
      setElapsedTime(`${hours}:${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await clockInOutApi({ employee_id: employeeId });
      await checkStatus();
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to toggle check-in/out', err);
    } finally {
      setLoading(false);
    }
  };

  const isCheckedIn = Boolean(activeSession && !activeSession.checkOut);

  return (
    <div className="relative" ref={widgetRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-pill text-xs font-bold border transition-all focus-visible:outline-none cursor-pointer ${
          isCheckedIn
            ? 'bg-primary-50 border-primary-600/40 text-primary-600 shadow-gold'
            : 'bg-surface-muted border-border text-ink-600 hover:bg-surface hover:text-ink-900'
        }`}
        title="Check-In/Out Quick Launcher"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isCheckedIn ? 'bg-primary-600 animate-pulse' : 'bg-ink-400'
          }`}
        />
        <Clock className="w-3.5 h-3.5" />
        <span>{isCheckedIn ? `In (${elapsedTime})` : 'Check In'}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-surface border border-border-strong rounded-[var(--radius-md)] shadow-modal p-4 z-50 animate-in fade-in duration-100">
          <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-600">
              Attendance Session
            </h4>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-pill ${
                isCheckedIn
                  ? 'bg-primary-50 text-primary-600 border border-primary-600/30'
                  : 'bg-surface-muted text-ink-600 border border-border'
              }`}
            >
              {isCheckedIn ? '● Checked In' : '● Checked Out'}
            </span>
          </div>

          {isCheckedIn ? (
            <div className="flex flex-col items-center py-2 gap-3">
              <div className="text-center">
                <span className="text-xs text-ink-400 font-medium">Elapsed Working Time</span>
                <div className="text-2xl font-extrabold font-display text-primary-600 tabular-nums">
                  {elapsedTime}
                </div>
              </div>
              <button
                disabled={loading}
                onClick={handleToggle}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-danger-600 text-white rounded-sm text-xs font-bold hover:bg-rose-700 transition-colors focus-visible:outline-none disabled:opacity-50 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Check Out Now</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-2 gap-3 text-center">
              <p className="text-xs text-ink-600">
                Ready to begin your work session? Click below to record check-in.
              </p>
              <button
                disabled={loading}
                onClick={handleToggle}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary-600 text-surface-sunken rounded-sm text-xs font-bold hover:bg-primary-700 transition-colors focus-visible:outline-none disabled:opacity-50 shadow-gold cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Check In Now</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
