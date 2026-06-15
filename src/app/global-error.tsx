'use client'

export default function GlobalError({
 error,
 unstable_retry,
}: {
 error: Error & { digest?: string };
 unstable_retry: () => void;
}) {
 return (
 <html>
 <body className="min-h-screen bg-sand flex items-center justify-center p-4">
 <div className="text-center max-w-md">
 <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
 <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
 </svg>
 </div>
 <h2 className="text-2xl font-bold text-ink mb-2">
 Une erreur critique est survenue
 </h2>
 <p className="text-muted mb-6">
 Veuillez réessayer ou contacter le support.
 </p>
 <button
 onClick={() => unstable_retry()}
 className="px-6 py-2.5 bg-forest text-white rounded-lg hover:bg-forest-light transition-colors font-medium"
 >
 Réessayer
 </button>
 </div>
 </body>
 </html>
 );
}
