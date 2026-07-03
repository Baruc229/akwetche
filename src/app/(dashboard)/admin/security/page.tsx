"use client";

import { useState, useEffect, useMemo } from "react";
import { useDashboard } from "../../layout";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShield, faTriangleExclamation, faTrash, faXmark, faEye, faSearch, faCheck, faTimes, faGlobe, faChevronLeft, faChevronRight, faClock } from '@fortawesome/free-solid-svg-icons';
import { formatDate } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";
import ConfirmModal from "@/components/ConfirmModal";
import type { LoginLog } from "@/types/admin";

const PAGE_SIZE = 30;

export default function AdminSecurity() {
  const { user } = useDashboard();
  const router = useRouter();
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSuccess, setFilterSuccess] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<LoginLog | null>(null);

  useEffect(() => {
    document.title = "Sécurité — Administration — Akwetche";
  }, []);

  useEffect(() => {
    if (user && user.role === "user") router.push("/dashboard");
  }, [user, router]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/login-logs").then(r => r.ok ? r.json() : { logs: [] }),
      fetch("/api/admin/stats").then(r => r.ok ? r.json() : {}),
    ]).then(([l, s]) => {
      setLogs(l.logs || []);
      setStats(s);
    }).finally(() => setLoading(false));
  }, []);

  async function clearLogs() {
    setClearConfirm(false);
    await fetch("/api/admin/login-logs", { method: "DELETE" });
    setLogs([]);
  }

  const filtered = useMemo(() => {
    let result = [...logs];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.ip.toLowerCase().includes(q) ||
        (l.user?.name || "").toLowerCase().includes(q) ||
        (l.user?.email || "").toLowerCase().includes(q) ||
        l.reason.toLowerCase().includes(q)
      );
    }
    if (filterSuccess !== "all") {
      result = result.filter(l => l.success === (filterSuccess === "success"));
    }
    return result;
  }, [logs, search, filterSuccess]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const successCount = logs.filter(l => l.success).length;
  const failCount = logs.filter(l => !l.success).length;

  if (!user || user.role === "user") return null;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-7 w-36 bg-stone/30 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="bg-bg-card rounded-2xl border border-border p-4 space-y-2"><div className="w-8 h-8 bg-stone/20 rounded-xl" /><div className="h-3 w-16 bg-stone/30 rounded-lg" /><div className="h-6 w-20 bg-stone/20 rounded-lg" /></div>)}</div>
        <div className="h-64 bg-bg-card rounded-[18px] border border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-1">Sécurité</h1>
          <p className="text-text-3 text-sm mt-0.5">{logs.length} tentatives de connexion</p>
        </div>
        <button
          onClick={() => setClearConfirm(true)}
          className="flex items-center gap-1.5 text-xs text-neg font-medium hover:opacity-80 px-3 py-2 rounded-xl border border-neg-border"
        >
          <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
          Effacer les logs
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-inset">
          <div className="w-9 h-9 rounded-xl bg-pos-bg flex items-center justify-center mb-3">
            <FontAwesomeIcon icon={faCheck} className="w-[18px] h-[18px] text-pos" />
          </div>
          <p className="text-label mb-1">Réussies</p>
          <p className="text-amount text-2xl text-ink">{successCount}</p>
        </div>
        <div className="card-inset">
          <div className="w-9 h-9 rounded-xl bg-neg-bg flex items-center justify-center mb-3">
            <FontAwesomeIcon icon={faTimes} className="w-[18px] h-[18px] text-neg" />
          </div>
          <p className="text-label mb-1">Échouées</p>
          <p className="text-amount text-2xl text-ink">{failCount}</p>
        </div>
        <div className="card-inset">
          <div className="w-9 h-9 rounded-xl bg-gold-light flex items-center justify-center mb-3">
            <FontAwesomeIcon icon={faTriangleExclamation} className="w-[18px] h-[18px] text-gold" />
          </div>
          <p className="text-label mb-1">Aujourd'hui</p>
          <p className="text-amount text-2xl text-ink">{stats?.failedLoginsToday ?? 0}<span className="text-sm font-normal text-text-3">/{stats?.loginAttemptsToday ?? 0}</span></p>
        </div>
      </div>

      {/* Login logs */}
      <div className="bg-bg-card rounded-[18px] border border-border p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Rechercher IP, email, raison..."
              className="input-field pl-10 text-sm"
            />
          </div>
          <div className="w-full sm:w-auto sm:min-w-[140px]">
            <CustomSelect
              options={[
                { value: "all", label: "Tous" },
                { value: "success", label: "Réussies" },
                { value: "failed", label: "Échouées" },
              ]}
              value={filterSuccess}
              onChange={(v) => { setFilterSuccess(v); setPage(0); }}
            />
          </div>
        </div>

        <div className="divide-y divide-border">
          {paged.map((log, i) => (
            <div key={log.id} className={`py-3 flex items-center gap-3 ${i % 2 === 1 ? "opacity-80" : ""}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${log.success ? "bg-pos-bg" : "bg-neg-bg"}`}>
                <FontAwesomeIcon icon={log.success ? faCheck : faTimes} className={`w-3.5 h-3.5 ${log.success ? "text-pos" : "text-neg"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap text-[13px]">
                  <span className="font-semibold text-text-1">{log.user?.name || "Inconnu"}</span>
                  {!log.success && log.reason && (
                    <span className="text-[10px] text-neg font-medium">{log.reason}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-text-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faGlobe} className="w-2.5 h-2.5" />
                    {log.ip}
                  </span>
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faClock} className="w-2.5 h-2.5" />
                    {formatDate(log.createdAt)}
                  </span>
                  {log.user?.email && (
                    <span className="text-muted">{log.user.email}</span>
                  )}
                </div>
              </div>
              {log.userAgent && (
                <button
                  onClick={() => setSelectedLog(log)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-text-3 hover:bg-sand transition-colors shrink-0"
                  title="Détails"
                >
                  <FontAwesomeIcon icon={faEye} className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {paged.length === 0 && (
            <p className="py-6 text-sm text-text-3 text-center">Aucun log trouvé</p>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-text-3">{filtered.length} résultat(s) — Page {page + 1}/{totalPages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-text-3 hover:bg-sand disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <FontAwesomeIcon icon={faChevronLeft} className="w-2.5 h-2.5" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-text-3 hover:bg-sand disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <FontAwesomeIcon icon={faChevronRight} className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log detail modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setSelectedLog(null)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div className="relative bg-white rounded-t-[20px] sm:rounded-2xl w-full sm:max-w-md shadow-xl animate-slide-up sm:animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-display font-semibold text-base text-text-1">Détails de la tentative</h3>
              <button onClick={() => setSelectedLog(null)} className="w-8 h-8 flex items-center justify-center text-text-3 hover:text-text-1 rounded-lg hover:bg-sand transition-colors">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg rounded-xl p-3">
                  <p className="text-xs text-text-3">Statut</p>
                  <p className={`text-sm font-semibold ${selectedLog.success ? "text-pos" : "text-neg"}`}>
                    {selectedLog.success ? "Réussie" : "Échouée"}
                  </p>
                </div>
                <div className="bg-bg rounded-xl p-3">
                  <p className="text-xs text-text-3">Date</p>
                  <p className="text-sm font-semibold text-text-1">{new Date(selectedLog.createdAt).toLocaleString("fr-FR")}</p>
                </div>
                <div className="bg-bg rounded-xl p-3">
                  <p className="text-xs text-text-3">IP</p>
                  <p className="text-sm font-semibold text-text-1 font-mono">{selectedLog.ip}</p>
                </div>
                <div className="bg-bg rounded-xl p-3">
                  <p className="text-xs text-text-3">Utilisateur</p>
                  <p className="text-sm font-semibold text-text-1">{selectedLog.user?.name || "Inconnu"}</p>
                </div>
              </div>
              {selectedLog.reason && (
                <div className="bg-neg-bg rounded-xl p-3">
                  <p className="text-xs text-text-3">Raison</p>
                  <p className="text-sm font-semibold text-neg">{selectedLog.reason}</p>
                </div>
              )}
              {selectedLog.userAgent && (
                <div className="bg-bg rounded-xl p-3">
                  <p className="text-xs text-text-3">User-Agent</p>
                  <p className="text-xs text-text-1 break-words font-mono mt-1">{selectedLog.userAgent}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clear confirm */}
      <ConfirmModal
        open={clearConfirm}
        title="Effacer tous les logs ?"
        message="Toutes les tentatives de connexion seront définitivement supprimées. Cette action est irréversible."
        confirmLabel="Oui, tout effacer"
        onConfirm={clearLogs}
        onCancel={() => setClearConfirm(false)}
      />
    </div>
  );
}
