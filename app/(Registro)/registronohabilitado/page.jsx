'use client';

import { useRouter } from 'next/navigation';

export default function RegistroNoHabilitado() {
  const router = useRouter();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 flex flex-col items-center max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-red-600 text-center">
          Registro no habilitado
        </h1>
        <p className="text-lg text-center mb-6">
          El registro de nuevos usuarios no se encuentra habilitado en este momento.<br />
          Si necesitás acceso, solicitá autorización al <span className="font-semibold">Taller de CE</span>.
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-semibold"
        >
          Volver al inicio
        </button>
      </div>
    </main>
  );
}
