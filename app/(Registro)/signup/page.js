'use client';

import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
      <main className="flex flex-col items-center justify-center min-h-screen p-8">
        <p className="text-lg">Verificando disponibilidad de registro...</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Registro</h1>
      <form onSubmit={handleSignup} className="w-full max-w-sm">
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 border rounded mb-4"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full p-2 border rounded mb-4"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          Registrarse
        </button>
      </form>
      {message && <p className="mt-4 text-center">{message}</p>}
    </main>
  );
}
