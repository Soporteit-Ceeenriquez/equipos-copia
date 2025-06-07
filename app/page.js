'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.replace('/dashboard');
      }
    };
    checkSession();
  }, [router]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <h1 className="text-4xl font-bold mb-8">Gestión de equipos</h1>
      <div className="flex gap-6">
        <a
          href="/login"
          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Iniciar sesión
        </a>
        <a
          href="/signup"
          className="px-6 py-3 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-gray-800 transition"
        >
          Registrarse
        </a>
      </div>
    </main>
  );
}
