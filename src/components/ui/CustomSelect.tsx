"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faLock } from '@fortawesome/free-solid-svg-icons';

type Option = {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  disabledReason?: string;
  separator?: boolean;
};

type CustomSelectProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

const DROPDOWN_MAX_HEIGHT = 256;
const OPTION_HEIGHT = 44;

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Sélectionner...",
  disabled = false,
  className = "",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [canScroll, setCanScroll] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const isSmallScreen = typeof window !== "undefined" && window.innerWidth < 375;

  function computePosition() {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const contentHeight = options.length * OPTION_HEIGHT + 16;
    const dropdownH = Math.min(contentHeight, DROPDOWN_MAX_HEIGHT);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    setOpenUp(spaceBelow < dropdownH && spaceAbove >= dropdownH);
    setCanScroll(contentHeight > DROPDOWN_MAX_HEIGHT);
    setDropdownPos({
      top: spaceBelow >= dropdownH || spaceBelow < dropdownH && spaceAbove < dropdownH
        ? rect.bottom + window.scrollY + 4
        : rect.top + window.scrollY - dropdownH - 4,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); return; }
      if (!listRef.current) return;
      const items = listRef.current.querySelectorAll<HTMLElement>("[role='option']:not([data-disabled='true'])");
      if (!items.length) return;
      const currentIndex = Array.from(items).findIndex((el) => el.dataset.focused === "true");
      let nextIndex = currentIndex;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        nextIndex = Math.min(currentIndex + 1, items.length - 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        nextIndex = Math.max(currentIndex - 1, 0);
      } else if (e.key === "Enter" && currentIndex >= 0) {
        e.preventDefault();
        items[currentIndex].click();
        return;
      }
      if (nextIndex !== currentIndex) {
        items.forEach((el) => el.dataset.focused = "false");
        items[nextIndex].dataset.focused = "true";
        items[nextIndex].scrollIntoView({ block: "nearest" });
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open && listRef.current && value) {
      const selectedEl = listRef.current.querySelector<HTMLElement>(`[role='option'][data-selected="true"]`);
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [open, value]);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    if (isSmallScreen) {
      setSearchMode(true);
    } else {
      computePosition();
      setOpen((prev) => !prev);
    }
  }, [disabled, isSmallScreen]);

  const handleSelect = useCallback((val: string) => {
    onChange(val);
    setOpen(false);
    setSearchMode(false);
  }, [onChange]);

  if (searchMode) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black/40 animate-fade-in sm:hidden" onClick={() => setSearchMode(false)}>
        <div className="mt-auto bg-white rounded-t-2xl max-h-[70vh] flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <p className="text-sm font-semibold text-ink">{placeholder}</p>
            <button onClick={() => setSearchMode(false)} className="w-8 h-8 flex items-center justify-center text-muted hover:text-ink rounded-lg hover:bg-sand transition-colors">
              <FontAwesomeIcon icon={faChevronDown} className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 py-2">
              {options.length === 0 ? (
                <div className="px-5 py-4 text-sm text-muted text-center">Aucune option</div>
              ) : (
                options.map((opt) =>
                  opt.separator ? (
                    <div
                      key={opt.value}
                      role="separator"
                      aria-label={opt.label || "Separator"}
                      className="flex items-center gap-2 px-5 py-2"
                    >
                      {opt.label && (
                        <span className="text-[10px] font-semibold text-muted uppercase tracking-wider whitespace-nowrap">
                          {opt.label}
                        </span>
                      )}
                      <span className="flex-1 h-px bg-border" />
                    </div>
                  ) : (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      disabled={opt.disabled}
                      onClick={() => !opt.disabled && handleSelect(opt.value)}
                      className={`w-full text-left px-5 py-3.5 text-sm transition-colors min-h-[48px] ${
                        opt.disabled
                          ? "text-muted cursor-not-allowed"
                          : opt.value === value
                            ? "bg-ochre-light text-ochre font-medium"
                            : "text-ink hover:bg-sand hover:text-forest"
                      }`}
                      title={opt.disabled ? (opt.disabledReason || "Option non disponible") : undefined}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {opt.icon && <img src={opt.icon} alt="" className="w-5 h-5 rounded-sm object-cover shrink-0" />}
                        <span className={`truncate ${opt.disabled ? "opacity-50" : ""}`}>{opt.label}</span>
                      </span>
                      {opt.disabled && (
                        <span className="flex items-center gap-1 text-[10px] text-muted shrink-0">
                          <FontAwesomeIcon icon={faLock} className="w-3 h-3" />
                          {opt.disabledReason || "Premium"}
                        </span>
                      )}
                  </button>
                )
              )
            )}
        </div>
      </div>
    </div>
    );
  }

  const dropdownContent = open && dropdownPos ? (
    <div
      className="fixed bg-white border border-border rounded-xl shadow-lg overflow-hidden animate-fade-in"
      style={{
        top: openUp ? "auto" : dropdownPos.top,
        bottom: openUp ? `calc(100vh - ${dropdownPos.top}px)` : "auto",
        left: dropdownPos.left,
        width: dropdownPos.width,
        maxHeight: `${DROPDOWN_MAX_HEIGHT}px`,
        zIndex: 100,
      }}
    >
      <div
        ref={listRef}
        className="overflow-y-auto custom-select-scrollbar"
        style={{
          maxHeight: `${DROPDOWN_MAX_HEIGHT}px`,
          overscrollBehavior: "contain",
          scrollbarWidth: "thin",
          scrollbarColor: "#d4d0c8 #f5f3f0",
        }}
      >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted">Aucune option</div>
          ) : (
            options.map((opt, i) =>
              opt.separator ? (
                <div
                  key={opt.value}
                  role="separator"
                  aria-label={opt.label || "Separator"}
                  className="flex items-center gap-2 px-4 py-2"
                >
                  {opt.label && (
                    <span className="text-[10px] font-semibold text-muted uppercase tracking-wider whitespace-nowrap">
                      {opt.label}
                    </span>
                  )}
                  <span className="flex-1 h-px bg-border" />
                </div>
              ) : (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  data-focused={i === selectedIndex ? "true" : "false"}
                  data-selected={opt.value === value ? "true" : "false"}
                  data-disabled={opt.disabled ? "true" : "false"}
                  disabled={opt.disabled}
                  onClick={() => !opt.disabled && handleSelect(opt.value)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors min-h-[44px] sm:min-h-[48px] ${
                    opt.disabled
                      ? "text-muted cursor-not-allowed"
                      : opt.value === value
                        ? "bg-ochre-light text-ochre font-medium"
                        : "text-ink hover:bg-sand hover:text-forest"
                  }`}
                  title={opt.disabled ? (opt.disabledReason || "Option non disponible") : undefined}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {opt.icon && <img src={opt.icon} alt="" className="w-5 h-5 rounded-sm object-cover shrink-0" />}
                    <span className={`truncate ${opt.disabled ? "opacity-50" : ""}`}>{opt.label}</span>
                  </span>
                  {opt.disabled && (
                    <span className="flex items-center gap-1 text-[10px] text-muted shrink-0">
                      <FontAwesomeIcon icon={faLock} className="w-3 h-3" />
                      {opt.disabledReason || "Premium"}
                    </span>
                  )}
                </button>
              )
            )
          )}
      </div>
      {canScroll && (
        <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
      )}
    </div>
  ) : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`input-field flex items-center justify-between gap-2 w-full text-left ${
          !selected ? "text-muted" : "text-ink"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className="truncate flex items-center gap-2 min-w-0">
          {selected?.icon && <img src={selected.icon} alt="" className="w-5 h-5 rounded-sm object-cover shrink-0" />}
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`w-3.5 h-3.5 text-muted transition-transform duration-200 shrink-0 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {typeof document !== "undefined" && createPortal(dropdownContent, document.body)}
    </div>
  );
}
