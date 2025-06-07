'use client';

import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [resetting, setResetting] = useState(false);
  const router = useRouter();

  // Loader mientras verifica sesión
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/dashboard');
      } else {
        setLoading(false);
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setSigningIn(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else if (data && data.session) {
      setMessage('Iniciando sesión...');
      setTimeout(() => {
        router.replace('/dashboard');
      }, 1500); // Espera 1.5 segundos antes de redirigir
    } else {
      setMessage('No se pudo iniciar sesión. Intenta de nuevo.');
    }
    setSigningIn(false);
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setMessage('Por favor ingresa tu correo para recuperar la contraseña.');
      return;
    }
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Correo de recuperación enviado. Revisa tu bandeja de entrada.');
    }
    setResetting(false);
  };

  const goToSignup = () => router.push('/signup');
  const goToHome = () => router.push('/');

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg flex flex-col items-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <p className="text-lg text-center">Verificando sesión...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-4">Iniciar Sesión</h1>
      <form
        onSubmit={handleLogin}
        autoComplete="on"
        className="w-full max-w-sm bg-white dark:bg-gray-800 p-6 rounded shadow"
      >
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          className="w-full p-2 border border-gray-300 rounded mb-4 dark:bg-gray-700 dark:border-gray-600"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full p-2 border border-gray-300 rounded mb-4 dark:bg-gray-700 dark:border-gray-600"
        />
        <button
          type="submit"
          disabled={signingIn}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded transition font-semibold"
        >
          {signingIn ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <button
        onClick={handlePasswordReset}
        disabled={resetting}
        className="mt-4 text-blue-600 underline hover:text-blue-800"
      >
        {resetting ? 'Enviando...' : 'Olvidé mi contraseña'}
      </button>
      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        ¿No tienes cuenta?{' '}
        <button
          onClick={goToSignup}
          className="text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
          type="button"
        >
          Crea una
        </button>
      </p>
      <button
        onClick={goToHome}
        className="mt-2 text-gray-600 underline hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        type="button"
      >
        Ir a inicio
      </button>
      {message && (
        <p
          className={`mt-4 text-center ${
            message.toLowerCase().includes('error') || message.toLowerCase().includes('incorrecto')
              ? 'text-red-600'
              : 'text-green-600'
          }`}
        >
          {message}
        </p>
      )}
    </main>
  );
}
