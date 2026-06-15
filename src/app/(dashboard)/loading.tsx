export default function DashboardLoading() {
 return (
 <div className="flex items-center justify-center min-h-[60vh]">
 <div className="flex flex-col items-center gap-3">
 <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
 <p className="text-muted text-sm">Chargement du tableau de bord…</p>
 </div>
 </div>
 );
}
