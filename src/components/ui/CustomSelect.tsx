"use client";

import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

type Option = { value: string; label: string };

type CustomSelectProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

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
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const isSmallScreen = typeof window !== "undefined" && window.innerWidth < 375;

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
      const items = listRef.current.querySelectorAll<HTMLElement>("[role='option']");
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
    if (open && dropdownRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownH = Math.min(options.length * 48 + 16, isSmallScreen ? window.innerHeight * 0.6 : 320);
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      setOpenUp(spaceBelow < dropdownH && spaceAbove >= dropdownH);
    }
  }, [open, options.length, isSmallScreen]);

  useEffect(() => {
    if (open && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [open]);

  function handleOpen() {
    if (disabled) return;
    if (isSmallScreen) {
      setSearchMode(true);
    } else {
      setOpen(!open);
    }
  }

  function handleSelect(val: string) {
    onChange(val);
    setOpen(false);
    setSearchMode(false);
  }

  const selectedIndex = options.findIndex((o) => o.value === value);

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
              options.map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-5 py-3.5 text-sm transition-colors min-h-[48px] ${
                    opt.value === value
                      ? "bg-ochre-light text-ochre font-medium"
                      : "text-ink hover:bg-sand hover:text-forest"
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        ref={selectedRef}
        className={`input-field flex items-center justify-between gap-2 w-full text-left ${
          !selected ? "text-muted" : "text-ink"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`w-3.5 h-3.5 text-muted transition-transform duration-200 shrink-0 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 left-0 right-0 bg-white border border-border rounded-xl shadow-lg overflow-hidden animate-fade-in ${
            openUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
          style={{ maxHeight: isSmallScreen ? "60vh" : "320px" }}
        >
          <div ref={listRef} className="overflow-y-auto h-full custom-scrollbar">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted">Aucune option</div>
            ) : (
              options.map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  data-focused={i === selectedIndex ? "true" : "false"}
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors min-h-[44px] sm:min-h-[48px] ${
                    opt.value === value
                      ? "bg-ochre-light text-ochre font-medium"
                      : "text-ink hover:bg-sand hover:text-forest"
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
          {options.length > 4 && (
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white/90 to-transparent pointer-events-none" />
          )}
        </div>
      )}
    </div>
  );
}
