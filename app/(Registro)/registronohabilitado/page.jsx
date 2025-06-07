'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function RegistroNoHabilitado() {
  const router = useRouter();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-gray-100 via-blue-50 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-white">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 flex flex-col items-center max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-red-600 text-center drop-shadow">
          Registro no habilitado
        </h1>
        <div className="w-16 h-1 bg-blue-600 rounded-full mb-8 mx-auto" />
        <div className="mb-8 flex items-center justify-center">
          <Image
            src="/CEE-MARCA.png"
            alt="CEE Logo"
            width={90}
            height={90}
            className="transition-all duration-300 dark:invert"
            priority
          />
        </div>
        <p className="text-lg text-center mb-6">
          El registro de nuevos usuarios no se encuentra habilitado en este momento.<br />
          Si necesitás acceso, solicitá autorización al <span className="font-semibold">Taller de CE</span>.
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-semibold text-base"
        >
          Volver al inicio
        </button>
      </div>
    </main>
  );
}
