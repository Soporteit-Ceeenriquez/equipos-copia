'use client';

import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function TallerPage() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    async function validarTaller() {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        router.replace('/login');
        return;
      }
      setUserEmail(session.user.email);
      const res = await fetch('/api/validate-taller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!data.isTaller) {
        router.replace('/dashboard');
        return;
      }
      if (data.isAdmin) {
        setIsAdmin(true);
      }
      setCheckingAccess(false);
    }
    validarTaller();
  }, [router]);

  if (checkingAccess) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-200">
          Verificando acceso...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 relative p-8">
      <div className="w-full max-w-lg flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 mx-auto">
        {isAdmin && (
          <button
            onClick={() => router.push('/dashboard/admin')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md text-sm font-semibold shadow hover:bg-gray-300 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition w-full sm:w-auto"
          >
            Ir al panel de administrador
          </button>
        )}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push('/login');
          }}
          className="px-4 py-2 bg-red-200 text-red-700 rounded-md text-sm font-semibold shadow hover:bg-red-300 transition w-full sm:w-auto"
        >
          Cerrar sesión
        </button>
      </div>
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-10 flex flex-col items-center">
        <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-300 mb-4 text-center">
          Módulo de Taller
        </h1>
        <p className="mb-8 text-lg text-gray-700 dark:text-gray-200 text-center">
          ¡Hola{' '}
          <span className="font-semibold text-blue-700 dark:text-blue-300">
            {userEmail}
          </span>
          !<br />
          Bienvenido al módulo de taller.
        </p>
        <button
          onClick={() => router.push('/dashboard/taller/asignarEquipos')}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition mb-4"
        >
          Asignar Equipos a Solicitudes
        </button>
        <button
          onClick={() => router.push('/dashboard/taller/gestionarAsignaciones')}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition"
        >
          Gestión de Equipos Asignados
        </button>
      </div>
    </main>
  );
}
