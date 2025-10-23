'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
              <div className="text-6xl mb-4">💥</div>
              <h2 className="text-2xl font-bold text-black mb-4">Global Error</h2>
              <p className="text-gray-600 mb-6">
                {error.message || 'An unexpected error occurred'}
              </p>
              <button
                onClick={reset}
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
