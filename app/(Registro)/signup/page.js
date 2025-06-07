'use client';

import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Verifica si el registro está habilitado
  useEffect(() => {
    const checkRegistro = async () => {
      const res = await fetch('/api/registro-habilitado');
      const data = await res.json();
      if (!data.habilitado) {
        router.replace('/registronohabilitado');
      } else {
        setLoading(false);
      }
    };
    checkRegistro();
  }, [router]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Registro exitoso, revisa tu correo para confirmar.');
    setTimeout(() => {
      router.push('/dashboard');
    }, 1500);
  };

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 via-blue-50 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <p className="text-lg">Verificando disponibilidad de registro...</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 via-blue-50 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-white p-8">
      <h1 className="text-3xl font-bold mb-4 text-center drop-shadow">Registro</h1>
      <div className="w-20 h-1 bg-blue-600 rounded-full mb-8 mx-auto" />
      <div className="mb-8 flex items-center justify-center">
        <Image
          src="/CEE-MARCA.png"
          alt="CEE Logo"
          width={120}
          height={120}
          className="transition-all duration-300 dark:invert"
          priority
        />
      </div>
      <form onSubmit={handleSignup} className="w-full max-w-sm bg-white dark:bg-gray-800 p-6 rounded shadow flex flex-col gap-4">
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition font-semibold text-base"
        >
          Registrarse
        </button>
      </form>
      {message && <p className="mt-4 text-center">{message}</p>}
      <button
        onClick={() => router.push('/')}
        className="mt-4 text-blue-600 underline hover:text-blue-800"
        type="button"
      >
        Volver al inicio
      </button>
    </main>
  );
}
