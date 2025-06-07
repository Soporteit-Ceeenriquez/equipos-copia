'use client';

import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function StatusRegistroPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Protección: solo admin puede acceder
  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/login');
        return;
      }
      // Validar admin usando el endpoint seguro
      const res = await fetch('/api/validate-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.access_token }),
      });
      const { isAdmin } = await res.json();
      if (!isAdmin) {
        router.replace('/dashboard');
        return;
      }
      setCheckingAccess(false);
    };
    checkAdmin();
  }, [router]);

  // Traer el último registro
  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);
      setMessage('');
      const { data, error } = await supabase
        .from('user_registration_status')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        setMessage('Error al obtener el estado.');
        setStatus(null);
      } else {
        setStatus(data);
      }
      setLoading(false);
    };
    fetchStatus();
  }, []);

  // Actualizar el registro
  const handleUpdate = async (newValue) => {
    if (!status) return;
    setSaving(true);
    setMessage('');
    const { error } = await supabase
      .from('user_registration_status')
      .update({ is_registration_open: newValue, updated_at: new Date().toISOString() })
      .eq('user_id', status.user_id);

    if (error) {
      setMessage('Error al actualizar el estado.');
    } else {
      setMessage('Estado actualizado correctamente.');
      setStatus((prev) => ({
        ...prev,
        is_registration_open: newValue,
        updated_at: new Date().toISOString(),
      }));
    }
    setSaving(false);
  };

  // No mostrar nada hasta terminar la validación
  if (checkingAccess) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-200">Verificando acceso...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-8 text-gray-900 dark:text-white">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 flex flex-col items-center">
        <button
          onClick={() => router.push('/dashboard/admin')}
          className="self-start mb-6 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold mb-6 text-center">Estado de Registro de Usuarios</h1>
        {loading ? (
          <p className="mb-4">Cargando estado...</p>
        ) : status ? (
          <>
            <p className="mb-4 text-lg">
              <span className="font-semibold">Registro abierto:</span>{' '}
              <span className={status.is_registration_open ? 'text-green-600' : 'text-red-600'}>
                {status.is_registration_open ? 'Sí' : 'No'}
              </span>
            </p>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              Última actualización: {new Date(status.updated_at).toLocaleString()}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleUpdate(true)}
                disabled={saving || status.is_registration_open}
                className={`px-6 py-2 rounded font-semibold shadow transition ${
                  status.is_registration_open
                    ? 'bg-green-400 text-white cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                Abrir registro
              </button>
              <button
                onClick={() => handleUpdate(false)}
                disabled={saving || !status.is_registration_open}
                className={`px-6 py-2 rounded font-semibold shadow transition ${
                  !status.is_registration_open
                    ? 'bg-red-400 text-white cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                Cerrar registro
              </button>
            </div>
          </>
        ) : (
          <p>No hay registros encontrados.</p>
        )}
        {message && (
          <p className="mt-6 text-center text-sm text-blue-600">{message}</p>
        )}
      </div>
    </main>
  );
}
