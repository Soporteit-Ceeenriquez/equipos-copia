'use client';

import { supabase } from '@/utils/supabase';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 via-blue-50 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-white p-8">
      <h1 className="text-4xl font-bold mb-4 text-center drop-shadow">
        Gestión de equipos
      </h1>
      <div className="w-24 h-1 bg-blue-600 rounded-full mb-8 mx-auto" />
      <div className="mb-8 flex items-center justify-center">
        <Image
          src="/CEE-MARCA.png"
          alt="CEE Logo"
          width={180}
          height={180}
          className="transition-all duration-300 dark:invert"
          priority
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <a
          href="/login"
          className="px-4 py-1.5 bg-blue-600 text-white rounded shadow hover:bg-blue-700 hover:scale-105 transition-all font-semibold text-base text-center"
        >
          Iniciar sesión
        </a>
        <a
          href="/signup"
          className="px-4 py-1.5 border border-blue-600 text-blue-600 rounded shadow hover:bg-blue-50 dark:hover:bg-gray-800 hover:scale-105 transition-all font-semibold text-base text-center"
        >
          Registrarse
        </a>
      </div>
      <footer className="mt-8 text-xs text-gray-400 text-center">
        © {new Date().getFullYear()} Taller - CEE Enriquez.
      </footer>
    </main>
  );
}
