'use client';

import { supabase } from '@/utils/supabase'; // Usa tu instancia de supabase
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function validateRole() {
      // Obtén la sesión y el token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/login');
        return;
      }

      setUser(session.user);

      // Envía el token al backend para validar el rol
      const roleRes = await fetch('/api/validate-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.access_token }),
      });
      const { role } = await roleRes.json();

      if (role === 'admin') {
        router.push('/dashboard/admin');
        return;
      }
      if (role === 'solicitante') {
        router.push('/dashboard/solicitarEquipos');
        return;
      }
      if (role === 'taller') {
        router.push('/dashboard/taller');
        return;
      }

      // Si es visitante o no tiene rol, se queda en dashboard
      setLoading(false);
    }

    validateRole();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <p className="text-lg text-center">Cargando tu dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-4 text-blue-700 dark:text-blue-300 text-center">
          Bienvenido
        </h1>
        <p className="mb-8 text-center text-gray-600 dark:text-gray-400">
          Usted esta como visitante en este sitio, comuniquese con taller para solcitar se le asigne sus permisos.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-4">
          <button
            onClick={handleLogout}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold shadow hover:bg-red-700 transition"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  );
}
