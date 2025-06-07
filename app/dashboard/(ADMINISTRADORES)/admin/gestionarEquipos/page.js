'use client';

import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';

export default function GestionarEquiposPage() {
  const router = useRouter();
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEquipo, setEditEquipo] = useState(null);
  const [form, setForm] = useState({
    codigo: '',
    tipo_de_equipos: '',
    capacidad_informada: '',
    detalle_planilla_mpt: '',
    detalles: '',
  });
  const [message, setMessage] = useState('');
  const [csvLoading, setCsvLoading] = useState(false);
  const fileInputRef = useRef();

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 9;

  // Protección: solo admin puede acceder
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Traer equipos
  useEffect(() => {
    const fetchEquipos = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('equipos').select('*').order('codigo');
      if (error) setMessage('Error al cargar equipos');
      else setEquipos(data);
      setLoading(false);
    };
    fetchEquipos();
  }, []);

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

  // Abrir modal para crear o editar
  const openModal = (equipo = null) => {
    setEditEquipo(equipo);
    setForm(
      equipo || {
        codigo: '',
        tipo_de_equipos: '',
        capacidad_informada: '',
        detalle_planilla_mpt: '',
        detalles: '',
      }
    );
    setModalOpen(true);
    setMessage('');
  };

  // Guardar equipo (crear o editar)
  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!form.codigo || !form.tipo_de_equipos) {
      setMessage('El código y el tipo de equipo son obligatorios.');
      return;
    }
    if (editEquipo) {
      // Editar
      const { error } = await supabase
        .from('equipos')
        .update(form)
        .eq('codigo', editEquipo.codigo);
      if (error) setMessage('Error al actualizar equipo');
      else {
        setEquipos((prev) =>
          prev.map((eq) => (eq.codigo === editEquipo.codigo ? form : eq))
        );
        setModalOpen(false);
      }
    } else {
      // Crear
      const { error } = await supabase.from('equipos').insert([form]);
      if (error) setMessage('Error al crear equipo');
      else {
        setEquipos((prev) => [...prev, form]);
        setModalOpen(false);
      }
    }
  };

  // Eliminar equipo
  const handleDelete = async (codigo) => {
    if (!window.confirm('¿Seguro que deseas eliminar este equipo?')) return;
    const { error } = await supabase.from('equipos').delete().eq('codigo', codigo);
    if (error) setMessage('Error al eliminar equipo');
    else setEquipos((prev) => prev.filter((eq) => eq.codigo !== codigo));
  };

  // Cargar CSV o Excel
  const handleFileUpload = async (e) => {
    setCsvLoading(true);
    setMessage('');
    const file = e.target.files[0];
    if (!file) {
      setCsvLoading(false);
      return;
    }

    let text = '';
    try {
      if (file.name.endsWith('.csv')) {
        text = await file.text();
      } else if (
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls')
      ) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        text = XLSX.utils.sheet_to_csv(worksheet);
      } else {
        setMessage('Formato no soportado. Solo .csv o .xlsx');
        setCsvLoading(false);
        fileInputRef.current.value = '';
        return;
      }
    } catch {
      setMessage('Error al leer el archivo. ¿Está dañado?');
      setCsvLoading(false);
      fileInputRef.current.value = '';
      return;
    }

    const res = await fetch('/api/equipos-csv', {
      method: 'POST',
      body: text,
      headers: { 'Content-Type': 'text/csv' },
    });
    const result = await res.json();
    if (res.ok) {
      setMessage('Equipos cargados correctamente');
      setEquipos(result.equipos);
    } else {
      setMessage(result.error || 'Error al cargar archivo. Asegúrate de que las columnas sean: codigo, tipo_de_equipos, capacidad_informada, detalle_planilla_mpt, detalles');
    }
    setCsvLoading(false);
    fileInputRef.current.value = '';
  };

  // Filtrado de equipos
  const equiposFiltrados = equipos.filter(eq => {
    const tipoOk = filtroTipo ? eq.tipo_de_equipos?.toLowerCase().includes(filtroTipo.toLowerCase()) : true;
    const codigoOk = filtroCodigo ? eq.codigo?.toLowerCase().includes(filtroCodigo.toLowerCase()) : true;
    return tipoOk && codigoOk;
  });

  // Paginación
  const totalPaginas = Math.ceil(equiposFiltrados.length / registrosPorPagina);
  const equiposPagina = equiposFiltrados.slice(
    (paginaActual - 1) * registrosPorPagina,
    paginaActual * registrosPorPagina
  );

  // Obtener tipos únicos para autocompletar filtro
  const tiposUnicos = Array.from(new Set(equipos.map(eq => eq.tipo_de_equipos))).filter(Boolean);

  if (checkingAccess) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 via-blue-50 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-200">Verificando acceso...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-gray-100 via-blue-50 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-white p-8">
      {/* Botón para volver atrás */}
      <div className="w-full max-w-6xl flex justify-start mb-4">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded font-semibold shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm"
        >
          ← Volver
        </button>
      </div>
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-4xl font-extrabold text-blue-700 dark:text-blue-300 text-center drop-shadow mb-2 sm:mb-0">
            Gestionar Equipos
          </h1>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => openModal()}
              className="px-4 py-2 bg-blue-700 text-white rounded font-semibold shadow hover:bg-blue-800 transition"
            >
              + Nuevo equipo
            </button>
            <label className="px-4 py-2 bg-green-700 text-white rounded font-semibold shadow hover:bg-green-800 transition cursor-pointer">
              {csvLoading ? 'Cargando...' : 'Cargar CSV/Excel'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
                onChange={handleFileUpload}
                disabled={csvLoading}
              />
            </label>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1">Tipo de equipo</label>
            <input
              type="text"
              list="tipos"
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              placeholder="Filtrar por tipo"
              className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
            />
            <datalist id="tipos">
              {tiposUnicos.map(tipo => (
                <option key={tipo} value={tipo} />
              ))}
            </datalist>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1">Código</label>
            <input
              type="text"
              value={filtroCodigo}
              onChange={e => setFiltroCodigo(e.target.value)}
              placeholder="Filtrar por código"
              className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setFiltroTipo('');
                setFiltroCodigo('');
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded font-semibold shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm"
              style={{ minWidth: 120 }}
            >
              Quitar filtros
            </button>
          </div>
        </div>

        {message && (
          <p className="mb-4 text-center text-sm text-blue-600">{message}</p>
        )}
        {loading ? (
          <div className="flex flex-col items-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <p className="text-lg text-center">Cargando equipos...</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow">
            <table className="min-w-full border rounded-lg overflow-hidden shadow bg-white dark:bg-gray-800">
              <thead className="bg-blue-100 dark:bg-gray-700">
                <tr>
                  <th className="border px-4 py-2">Código</th>
                  <th className="border px-4 py-2">Tipo</th>
                  <th className="border px-4 py-2">Capacidad</th>
                  <th className="border px-4 py-2">Planilla MPT</th>
                  <th className="border px-4 py-2">Detalles</th>
                  <th className="border px-4 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {equiposPagina.map((eq) => (
                  <tr key={eq.codigo} className="hover:bg-blue-50 dark:hover:bg-gray-700 transition">
                    <td className="border px-4 py-2 font-mono">{eq.codigo}</td>
                    <td className="border px-4 py-2">{eq.tipo_de_equipos}</td>
                    <td className="border px-4 py-2">{eq.capacidad_informada}</td>
                    <td className="border px-4 py-2">{eq.detalle_planilla_mpt}</td>
                    <td className="border px-4 py-2">{eq.detalles}</td>
                    <td className="border px-4 py-2 flex gap-2">
                      <button
                        onClick={() => openModal(eq)}
                        className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(eq.codigo)}
                        className="px-3 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition text-sm"
                      >
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
                {equiposPagina.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-500">
                      No hay equipos registrados o no hay coincidencias con el filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6 flex-wrap">
          <button
            onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm disabled:opacity-50"
          >
            Anterior
          </button>
          {/* Paginación resumida */}
          {Array.from({ length: totalPaginas }, (_, i) => i + 1)
            .filter(i =>
              i === 1 ||
              i === totalPaginas ||
              (i >= paginaActual - 1 && i <= paginaActual + 1)
            )
            .reduce((acc, page, idx, arr) => {
              if (idx > 0 && page - arr[idx - 1] > 1) acc.push('...');
              acc.push(page);
              return acc;
            }, [])
            .map((page, idx) =>
              page === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 select-none">…</span>
              ) : (
                <button
                  key={`page-${page}`}
                  onClick={() => setPaginaActual(page)}
                  className={`px-3 py-1 rounded shadow text-sm ${
                    paginaActual === page
                      ? 'bg-blue-700 text-white font-bold'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {page}
                </button>
              )
            )}
          <button
            onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual === totalPaginas}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      )}
      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editEquipo ? 'Editar equipo' : 'Nuevo equipo'}
            </h2>
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Código"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                required
                disabled={!!editEquipo}
                className="p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Tipo de equipo"
                value={form.tipo_de_equipos}
                onChange={(e) => setForm({ ...form, tipo_de_equipos: e.target.value })}
                required
                className="p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Capacidad informada"
                value={form.capacidad_informada}
                onChange={(e) => setForm({ ...form, capacidad_informada: e.target.value })}
                className="p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Detalle planilla MPT"
                value={form.detalle_planilla_mpt}
                onChange={(e) => setForm({ ...form, detalle_planilla_mpt: e.target.value })}
                className="p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Detalles"
                value={form.detalles}
                onChange={(e) => setForm({ ...form, detalles: e.target.value })}
                className="p-2 border rounded"
              />
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
