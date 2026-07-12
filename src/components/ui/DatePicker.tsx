'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS = ['Lu','Ma','Me','Je','Ve','Sa','Di'];

function toUTCDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day));
}

function formatDate(year: number, month: number, day: number) {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

interface DatePickerProps {
  value?: string;
  onChange: (val: string) => void;
  className?: string;
  min?: string;
  placeholder?: string;
}

export default function DatePicker({ value, onChange, className = '', min, placeholder = 'Choisir une date' }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(0);
  const [viewMonth, setViewMonth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);

  const parsed = value ? new Date(value + 'T00:00:00Z') : null;
  const isValid = parsed && !isNaN(parsed.getTime());
  const selectedYear = isValid ? parsed.getUTCFullYear() : undefined;
  const selectedMonth = isValid ? parsed.getUTCMonth() : undefined;
  const selectedDay = isValid ? parsed.getUTCDate() : undefined;

  const CALENDAR_HEIGHT = 310;

  function initView() {
    if (isValid) {
      setViewYear(parsed.getUTCFullYear());
      setViewMonth(parsed.getUTCMonth());
    } else {
      const now = new Date();
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
    }
  }

  function computePosition() {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < CALENDAR_HEIGHT && spaceAbove > spaceBelow;
    setPos({
      top: openUp
        ? rect.top - CALENDAR_HEIGHT - 4
        : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      openUp,
    });
  }

  function handleOpen() {
    initView();
    computePosition();
    setOpen(true);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (document.getElementById('date-picker-portal')?.contains(target)) return;
      setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  function daysInMonth(y: number, m: number) {
    return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  }

  function firstDayOfMonth(y: number, m: number) {
    return new Date(Date.UTC(y, m, 1)).getUTCDay();
  }

  function handleSelect(day: number) {
    const val = formatDate(viewYear, viewMonth, day);
    onChange(val);
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else { setViewMonth(viewMonth - 1); }
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else { setViewMonth(viewMonth + 1); }
  }

  const dim = daysInMonth(viewYear, viewMonth);
  const start = firstDayOfMonth(viewYear, viewMonth);
  const startIdx = start === 0 ? 6 : start - 1;

  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  const minParsed = min ? new Date(min + 'T00:00:00Z') : null;

  function isDisabled(day: number) {
    if (!minParsed) return false;
    const d = toUTCDate(viewYear, viewMonth, day);
    return d < minParsed;
  }

  const displayValue = isValid ? (
    <span>{selectedDay}/{selectedMonth! + 1}/{selectedYear}</span>
  ) : (
    <span style={{ color: 'var(--color-placeholder)' }}>{placeholder}</span>
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className={`input-field text-left cursor-pointer ${className}`}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        {displayValue}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-muted)', flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>
      {open && pos && createPortal(
        <div
          id="date-picker-portal"
          className="fixed z-[100] rounded-xl shadow-lg animate-fade-in"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', width: '280px', padding: '14px', top: pos.top, left: pos.left }}
        >
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors" style={{ color: 'var(--color-muted)' }}>
              <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" />
            </button>
            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-ink)' }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors" style={{ color: 'var(--color-muted)' }}>
              <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3" />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: 'var(--color-muted)' }}>{d}</div>
            ))}
            {Array.from({ length: startIdx }).map((_, i) => (
              <div key={`e${i}`} />
            ))}
            {Array.from({ length: dim }).map((_, i) => {
              const day = i + 1;
              const disabled = isDisabled(day);
              const selected = selectedYear === viewYear && selectedMonth === viewMonth && selectedDay === day;
              const isToday = formatDate(viewYear, viewMonth, day) === todayStr;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelect(day)}
                  className="text-center text-sm rounded-lg transition-colors"
                  style={{
                    padding: '5px 0',
                    fontWeight: selected ? 700 : isToday ? 600 : 400,
                    background: selected ? 'var(--color-gold)' : isToday ? 'rgba(201,168,76,0.12)' : 'transparent',
                    color: selected ? '#fff' : disabled ? 'var(--color-muted)' : 'var(--color-ink)',
                    opacity: disabled ? 0.35 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled && !selected) (e.target as HTMLElement).style.background = 'rgba(0,0,0,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) (e.target as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between mt-3 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            <button
              type="button"
              onClick={() => {
                const n = new Date();
                const val = formatDate(n.getFullYear(), n.getMonth(), n.getDate());
                onChange(val);
                setOpen(false);
              }}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--color-brand)', background: 'rgba(28,58,47,0.07)' }}
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--color-muted)' }}
            >
              Fermer
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
