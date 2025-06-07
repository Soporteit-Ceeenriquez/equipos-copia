'use client';

import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'solicitante', label: 'Solicitante' },
  { value: 'visitante', label: 'Visitante' },
  { value: 'taller', label: 'Taller' }, // Nuevo rol agregado
];

export default function UsuariosAdminPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingRoles, setEditingRoles] = useState({});
  const [saving, setSaving] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const confirmButtonRef = useRef();
  const router = useRouter();

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

  useEffect(() => {
    if (checkingAccess) return;
    const fetchUsuarios = async () => {
      setLoading(true);
      setMessage('');

      // Traer usuarios desde la vista pública
      const { data: users, error: usersError } = await supabase
        .from('public_users')
        .select('id, email');

      if (usersError) {
        setMessage('Error al obtener usuarios');
        setLoading(false);
        return;
      }

      // Traer roles de user_roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        setMessage('Error al obtener roles');
        setLoading(false);
        return;
      }

      // Unir usuarios con sus roles (puede ser vacío)
      const usuariosConRoles = users.map((user) => ({
        ...user,
        role: roles.find((r) => r.user_id === user.id)?.role || 'visitante', // Por defecto visitante
      }));

      setUsuarios(usuariosConRoles);
      setEditingRoles(
        Object.fromEntries(usuariosConRoles.map((u) => [u.id, u.role]))
      );
      setLoading(false);
    };

    fetchUsuarios();
  }, [checkingAccess]);

  const handleRoleChange = (userId, newRole) => {
    setEditingRoles((prev) => ({
      ...prev,
      [userId]: newRole,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    for (const user of usuarios) {
      const newRole = editingRoles[user.id];
      if (user.role !== newRole) {
        // Eliminar rol anterior
        await supabase.from('user_roles').delete().eq('user_id', user.id);
        // Insertar nuevo rol
        await supabase.from('user_roles').insert([
          { user_id: user.id, role: newRole },
        ]);
      }
    }

    setMessage('Cambios guardados correctamente');
    setSaving(false);

    // Refrescar usuarios y roles
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    setUsuarios((prev) =>
      prev.map((u) => ({
        ...u,
        role: roles.find((r) => r.user_id === u.id)?.role || 'visitante',
      }))
    );
  };

  const handleBack = () => {
    router.push('/dashboard/admin');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (checkingAccess || loading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
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
          <p className="text-lg text-center">Cargando usuarios...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="w-full max-w-3xl mx-auto flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition w-full sm:w-auto"
        >
          <span aria-hidden="true">←</span> Volver
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 border border-red-300 transition w-full sm:w-auto"
        >
          <span aria-hidden="true">⎋</span> Cerrar sesión
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-8 text-center text-blue-800 dark:text-blue-200">
        Administrar usuarios y roles
      </h1>
      <div className="w-full max-w-3xl mx-auto overflow-x-auto">
        <table className="min-w-full text-sm text-left mb-6 border rounded-lg overflow-hidden shadow bg-white dark:bg-gray-800">
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Rol</th>
              <th className="px-2 py-2">Acción</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((user) => (
              <tr
                key={user.id}
                className="border-b last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <td className="px-2 py-1">{user.email}</td>
                <td className="px-2 py-1">
                  <select
                    value={editingRoles[user.id]}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="border rounded px-2 py-1 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                    disabled={saving}
                  >
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <button
                    onClick={() => {
                      setUserToDelete(user);
                      setShowConfirm(true);
                    }}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 border border-red-300 transition text-xs"
                    disabled={saving}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-4 text-gray-500">
                  No hay usuarios registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 border border-blue-300 transition disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
      {message && (
        <div className="mt-6 flex justify-center">
          <span
            className={`px-4 py-2 rounded font-semibold shadow text-center
              ${message.includes('eliminado') || message.includes('guardados')
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-red-100 text-red-700 border border-red-300'}
            `}
          >
            {message}
          </span>
        </div>
      )}
      {showConfirm && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-sm flex flex-col items-center">
            <svg className="w-12 h-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="white"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9l-6 6M9 9l6 6" />
            </svg>
            <h2 className="text-lg font-bold mb-2 text-red-700 dark:text-red-400">¿Eliminar usuario?</h2>
            <p className="mb-4 text-center text-gray-700 dark:text-gray-200">
              ¿Seguro que deseas eliminar el usuario <span className="font-semibold">{userToDelete.email}</span>?<br />
              Esta acción es <span className="font-bold text-red-600">irreversible</span>.
            </p>
            <div className="flex gap-4 w-full">
              <button
                ref={confirmButtonRef}
                onClick={async () => {
                  setShowConfirm(false);
                  setSaving(true);
                  setMessage('');
                  const res = await fetch('/api/delete-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userToDelete.id }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    setUsuarios((prev) => prev.filter((u) => u.id !== userToDelete.id));
                    setMessage('Usuario eliminado correctamente');
                    setTimeout(() => setMessage(''), 5000); // Oculta el mensaje después de 5 segundos
                  } else {
                    setMessage('Error al eliminar usuario: ' + (data.error || ''));
                  }
                  setSaving(false);
                  setUserToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded font-semibold hover:bg-red-600 transition"
              >
                Sí, eliminar
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setUserToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded font-semibold hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
