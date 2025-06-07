'use client';

import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/login');
        return;
      }

      setUser(session.user);

      // Validar admin usando el endpoint seguro
      const res = await fetch('/api/validate-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.access_token }),
      });
      const { isAdmin } = await res.json();
      if (!isAdmin) {
        router.push('/dashboard');
        return;
      }

      setLoading(false);
    }

    checkAdmin();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 via-blue-50 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg flex flex-col items-center">
          <svg
            className="animate-spin h-8 w-8 text-blue-600 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            ></path>
          </svg>
          <p className="text-lg text-center">
            Cargando panel de administrador...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 via-blue-50 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-white p-8">
      <div className="w-full max-w-2xl flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 mx-auto">
        <button
          onClick={() => router.push('/dashboard/taller')}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md text-sm font-semibold shadow hover:bg-gray-300 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition w-full sm:w-auto"
        >
          Ir al panel de taller
        </button>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-200 text-red-700 rounded-md text-sm font-semibold shadow hover:bg-red-300 transition w-full sm:w-auto"
        >
          Cerrar sesión
        </button>
      </div>
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-10 flex flex-col items-center">
        {/* No se usa el logo PNG aquí */}
        <h1 className="text-4xl font-extrabold mb-4 text-blue-700 dark:text-blue-300 text-center drop-shadow">
          Panel de Administrador
        </h1>
        <div className="w-20 h-1 bg-blue-600 rounded-full mb-8 mx-auto" />
        <p className="mb-8 text-lg text-gray-700 dark:text-gray-200 text-center">
          ¡Hola{' '}
          <span className="font-semibold text-blue-700 dark:text-blue-300">
            {user?.email}
          </span>
          !
          <br />
          Gestiona los usuarios y roles de la plataforma desde aquí.
        </p>
        <div className="flex flex-col gap-4 w-full justify-center mb-4">
          { [
            {
              href: '/dashboard/admin/usuarios',
              label: 'Administrar usuarios y roles',
            },
            {
              href: '/dashboard/admin/statusregistro',
              label: 'Permitir Registro',
            },
            {
              href: '/dashboard/admin/gestionarEquipos',
              label: 'Gestionar Equipos',
            },
            {
              href: '/dashboard/admin/unidadNegocio',
              label: 'Administrar unidades de negocio',
            },
          ]
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="w-full px-6 py-3 bg-blue-700 text-white rounded-lg font-semibold text-center shadow hover:bg-blue-800 transition text-lg"
              >
                {item.label}
              </a>
            ))}
        </div>
      </div>
    </main>
  );
}
