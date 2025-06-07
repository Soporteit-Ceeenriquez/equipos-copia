'use client';

import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function UnidadNegocioPage() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);

  // CRUD States
  const [unidades, setUnidades] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUnidad, setEditUnidad] = useState(null);
  const [form, setForm] = useState({
    unidad_de_negocio: '',
    usuarios_habilitados: [],
  });
  const [message, setMessage] = useState('');

  // Protección: solo admin puede acceder
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/login');
        return;
      }
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

  // Traer unidades y usuarios (solo solicitantes)
  useEffect(() => {
    if (checkingAccess) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: unidadesData } = await supabase
        .from('unidades_de_negocio')
        .select('*')
        .order('unidad_de_negocio');
      setUnidades(unidadesData || []);

      // Traer usuarios con rol 'solicitante' usando join
      const { data: usuariosData } = await supabase
        .from('public_users')
        .select('id, email, user_roles(role)')
        .in('id', (
          await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'solicitante')
        ).data?.map(u => u.user_id) || []);
      setUsuarios(
        (usuariosData || []).filter(u =>
          u.user_roles?.some(r => r.role === 'solicitante')
        )
      );
      setLoading(false);
    };
    fetchData();
  }, [checkingAccess]);

  // Abrir modal para crear/editar
  const openModal = (unidad = null) => {
    if (unidad) {
      setEditUnidad(unidad.unidad_de_negocio);
      setForm({
        unidad_de_negocio: unidad.unidad_de_negocio,
        usuarios_habilitados: unidad.usuarios_habilitados
          ? unidad.usuarios_habilitados.split(',').map(u => u.trim()).filter(Boolean)
          : [],
      });
    } else {
      setEditUnidad(null);
      setForm({
        unidad_de_negocio: '',
        usuarios_habilitados: [],
      });
    }
    setMessage('');
    setModalOpen(true);
  };

  // Guardar unidad (crear o editar)
  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!form.unidad_de_negocio) {
      setMessage('El nombre de la unidad es obligatorio.');
      return;
    }
    const usuariosHabilitadosStr = form.usuarios_habilitados.join(',');
    let error;
    if (editUnidad) {
      // Editar
      ({ error } = await supabase
        .from('unidades_de_negocio')
        .update({
          unidad_de_negocio: form.unidad_de_negocio,
          usuarios_habilitados: usuariosHabilitadosStr,
        })
        .eq('unidad_de_negocio', editUnidad));
    } else {
      // Crear
      ({ error } = await supabase
        .from('unidades_de_negocio')
        .insert([{
          unidad_de_negocio: form.unidad_de_negocio,
          usuarios_habilitados: usuariosHabilitadosStr,
        }]));
    }
    if (error) {
      setMessage('Error al guardar la unidad.');
    } else {
      setModalOpen(false);
      setEditUnidad(null);
      setForm({
        unidad_de_negocio: '',
        usuarios_habilitados: [],
      });
      // Refrescar lista
      const { data: unidadesData } = await supabase
        .from('unidades_de_negocio')
        .select('*')
        .order('unidad_de_negocio');
      setUnidades(unidadesData || []);
    }
  };

  // Borrar unidad
  const handleDelete = async (unidad) => {
    if (!window.confirm('¿Seguro que deseas borrar esta unidad de negocio?')) return;
    const { error } = await supabase
      .from('unidades_de_negocio')
      .delete()
      .eq('unidad_de_negocio', unidad);
    if (error) {
      setMessage('Error al borrar la unidad.');
    } else {
      setUnidades(unidades.filter(u => u.unidad_de_negocio !== unidad));
    }
  };

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
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-gray-100 via-blue-50 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-10">
        {/* Botón volver */}
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-semibold shadow hover:bg-gray-300 transition text-sm"
          >
            ← Volver
          </button>
        </div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-300 drop-shadow">
            Unidades de negocio
          </h1>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded font-semibold shadow hover:bg-blue-700 transition"
          >
            + Nueva unidad
          </button>
        </div>
        {loading ? (
          <p className="text-center text-gray-500">Cargando...</p>
        ) : (
          <>
            {/* Botón global para bloquear sin permisos */}
            <div className="mb-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={async () => {
                  // Para cada unidad, si no tiene "Bloqueado", lo agrega
                  await Promise.all(
                    unidades.map(async (unidad) => {
                      const usuarios = unidad.usuarios_habilitados
                        ? unidad.usuarios_habilitados.split(',').map(u => u.trim()).filter(Boolean)
                        : [];
                      if (!usuarios.includes('Bloqueado')) {
                        const nuevos = [...usuarios, 'Bloqueado'];
                        await supabase
                          .from('unidades_de_negocio')
                          .update({ usuarios_habilitados: nuevos.join(',') })
                          .eq('unidad_de_negocio', unidad.unidad_de_negocio);
                      }
                    })
                  );
                  // Refresca la lista
                  const { data: unidadesData } = await supabase
                    .from('unidades_de_negocio')
                    .select('*')
                    .order('unidad_de_negocio');
                  setUnidades(unidadesData || []);
                  setMessage('Se bloqueó sin permisos a todas las unidades.');
                  setTimeout(() => setMessage(''), 4000);
                }}
                className="px-4 py-2 bg-red-400 text-white rounded font-semibold shadow hover:bg-red-500 transition text-sm"
              >
                Bloquear sin Permisos a todas
              </button>
              <button
                type="button"
                onClick={async () => {
                  // Para cada unidad, si tiene "Bloqueado", lo quita
                  await Promise.all(
                    unidades.map(async (unidad) => {
                      const usuarios = unidad.usuarios_habilitados
                        ? unidad.usuarios_habilitados.split(',').map(u => u.trim()).filter(Boolean)
                        : [];
                      if (usuarios.includes('Bloqueado')) {
                        const nuevos = usuarios.filter(u => u !== 'Bloqueado');
                        await supabase
                          .from('unidades_de_negocio')
                          .update({ usuarios_habilitados: nuevos.join(',') })
                          .eq('unidad_de_negocio', unidad.unidad_de_negocio);
                      }
                    })
                  );
                  // Refresca la lista
                  const { data: unidadesData } = await supabase
                    .from('unidades_de_negocio')
                    .select('*')
                    .order('unidad_de_negocio');
                  setUnidades(unidadesData || []);
                  setMessage('Se habilitaron todas las unidades.');
                  setTimeout(() => setMessage(''), 4000);
                }}
                className="px-4 py-2 bg-green-700 text-white rounded font-semibold shadow hover:bg-green-800 transition text-sm"
              >
                Habilitar a todas
              </button>
            </div>
            <table className="min-w-full text-sm text-left mb-6">
              <thead>
                <tr className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <th className="px-2 py-2">Unidad</th>
                  <th className="px-2 py-2">Usuarios habilitados</th>
                  <th className="px-2 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {unidades.map((u) => (
                  <tr key={u.unidad_de_negocio} className="border-b last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <td className="px-2 py-1">{u.unidad_de_negocio}</td>
                    <td className="px-2 py-1">
                      {u.usuarios_habilitados
                        ? u.usuarios_habilitados.split(',').map(email => (
                            <span key={email} className="inline-block bg-gray-200 dark:bg-gray-600 text-xs rounded px-2 py-1 mr-1 mb-1">{email}</span>
                          ))
                        : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-2 py-1 flex gap-2">
                      <button
                        onClick={() => openModal(u)}
                        className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(u.unidad_de_negocio)}
                        className="px-3 py-1 bg-red-400 text-white rounded hover:bg-red-500 transition text-xs"
                      >
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
                {unidades.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-gray-500">
                      No hay unidades registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
        {message && (
          <p className="mb-4 text-center text-red-600">{message}</p>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editUnidad ? 'Editar unidad' : 'Nueva unidad'}
            </h2>
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Nombre de la unidad"
                value={form.unidad_de_negocio}
                onChange={e => setForm({ ...form, unidad_de_negocio: e.target.value })}
                required
                disabled={!!editUnidad}
                className="p-2 border rounded"
              />

              {/* Usuarios habilitados */}
              <label className="font-semibold">Usuarios habilitados</label>
              <div className="flex gap-2">
                <select
                  value=""
                  onChange={e => {
                    const email = e.target.value;
                    if (
                      email &&
                      !form.usuarios_habilitados.includes(email)
                    ) {
                      setForm({
                        ...form,
                        usuarios_habilitados: [...form.usuarios_habilitados, email],
                      });
                    }
                    e.target.value = "";
                  }}
                  className="flex-1 p-2 border rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Agregar usuario...</option>
                  {usuarios
                    .filter(
                      u =>
                        !form.usuarios_habilitados.includes(u.email)
                    )
                    .map(u => (
                      <option key={u.id} value={u.email}>
                        {u.email}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!form.usuarios_habilitados.includes('Bloqueado')) {
                      setForm({
                        ...form,
                        usuarios_habilitados: [...form.usuarios_habilitados, 'Bloqueado'],
                      });
                    }
                  }}
                  className="px-3 py-1 bg-red-400 text-white rounded font-semibold hover:bg-red-500 transition text-xs"
                >
                  Bloquear sin Permisos
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {form.usuarios_habilitados.length === 0 && (
                  <span className="text-gray-400 text-sm">No hay usuarios agregados</span>
                )}
                {form.usuarios_habilitados.map(email => (
                  <span
                    key={email}
                    className="inline-flex items-center bg-gray-200 dark:bg-gray-600 text-xs rounded px-2 py-1"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          usuarios_habilitados: form.usuarios_habilitados.filter(u => u !== email),
                        })
                      }
                      className="ml-2 text-red-600 hover:text-red-800 font-bold"
                      title="Quitar"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-700 text-white rounded font-semibold hover:bg-blue-800 transition"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded font-semibold hover:bg-gray-400 transition"
                >
                  Cancelar
                </button>
              </div>
              {message && (
                <p className="mt-2 text-center text-red-600">{message}</p>
              )}
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
