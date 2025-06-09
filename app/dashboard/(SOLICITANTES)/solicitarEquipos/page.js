'use client';

import { supabase } from '@/utils/supabase';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function formatearFechaArg(fecha) {
  if (!fecha) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }
  const d = new Date(fecha);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

// --- MODAL DE HISTORIAL DE ASIGNACIONES ---
function ModalHistorial({ open, onClose, movimientos, formatearFechaArg }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.60)', // Más difuminado
        backdropFilter: 'blur(6px)'     // Más blur
      }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-lg sm:max-w-2xl relative">
        <button
          className="absolute top-2 right-2 text-xl px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold transition"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
        <h3 className="text-lg font-bold mb-4 text-blue-700 dark:text-blue-200">Historial de movimientos de la solicitud</h3>
        {movimientos.length === 0 ? (
          <div className="text-gray-600 dark:text-gray-300">No hay movimientos registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300 dark:border-gray-700">
                  <th className="py-1 px-2 text-left">Equipo</th>
                  <th className="py-1 px-2 text-left">Desde</th>
                  <th className="py-1 px-2 text-left">Hasta</th>
                  <th className="py-1 px-2 text-left">Motivo reemplazo</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map(mov => (
                  <tr key={mov.id_asignacion} className="border-b border-gray-200 dark:border-gray-800">
                    <td className="py-1 px-2">{mov.codigo_equipo}</td>
                    <td className="py-1 px-2">{formatearFechaArg(mov.fecha_inicio_asignacion)}</td>
                    <td className="py-1 px-2">{formatearFechaArg(mov.fecha_fin_asignacion)}</td>
                    <td className="py-1 px-2">{mov.motivo_reemplazo || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const [tipos, setTipos] = useState([]);
  const [capacidades, setCapacidades] = useState([]);
  const [unidadesNegocio, setUnidadesNegocio] = useState([]);
  const [form, setForm] = useState({
    unidad_de_negocio: '',
    tipo: '',
    capacidad: '',
    unidades: 1,
    fechaDesde: '',
    fechaHasta: '',
    observaciones: '',
  });
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [solicitudes, setSolicitudes] = useState([]);
  const [eliminarLoading, setEliminarLoading] = useState(null);
  const [pagina, setPagina] = useState(1);
  const equiposPorPagina = 10;
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroMes, setFiltroMes] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [fechaError, setFechaError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  const [modalEliminar, setModalEliminar] = useState({ open: false, id: null, equipo_asignado: null });
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [asignaciones, setAsignaciones] = useState([]);
  const [modalHistorialOpen, setModalHistorialOpen] = useState(false);
  const [historialMovimientos, setHistorialMovimientos] = useState([]);

  // Cargar tipos y capacidades
  useEffect(() => {
    async function fetchEquipos() {
      const { data, error } = await supabase.from('equipos').select('tipo_de_equipos, capacidad_informada');
      if (error) return;
      const tiposUnicos = [...new Set(data.map(e => e.tipo_de_equipos))];
      setTipos(tiposUnicos);
      if (form.tipo) {
        setCapacidades([...new Set(data.filter(e => e.tipo_de_equipos === form.tipo).map(e => e.capacidad_informada))]);
      }
    }
    fetchEquipos();
  }, [form.tipo]);

  // Obtener email del usuario autenticado y cargar solicitudes y unidades de negocio
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const email = data?.user?.email || '';
      setUserEmail(email);
      if (email) {
        fetchSolicitudes(email);

        // Traer unidades de negocio y filtrar por usuario habilitado
        const { data: unidadesData } = await supabase
          .from('unidades_de_negocio')
          .select('unidad_de_negocio, usuarios_habilitados');
        const unidadesFiltradas = (unidadesData || []).filter(u => {
          if (!u.usuarios_habilitados || u.usuarios_habilitados.trim() === '') return true;
          const lista = u.usuarios_habilitados.split(',').map(e => e.trim().toLowerCase());
          return lista.includes(email.toLowerCase());
        });
        setUnidadesNegocio(unidadesFiltradas.map(u => u.unidad_de_negocio));
      }
    });
  }, []);

  // Traer solicitudes del usuario (cambiar id → id_solicitud)
  const fetchSolicitudes = async (email) => {
    const { data, error } = await supabase
      .from('solicitudes_equipos')
      .select('*')
      .eq('correo_creador', email)
      .order('id_solicitud', { ascending: false }); // Cambiado id → id_solicitud
    if (!error) setSolicitudes(data);
  };

  // Cambia el handleChange para soportar unidad_de_negocio
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    // Validación en tiempo real de fechas
    if (name === 'fechaDesde' || name === 'fechaHasta') {
      const nuevaFechaDesde = name === 'fechaDesde' ? value : form.fechaDesde;
      const nuevaFechaHasta = name === 'fechaHasta' ? value : form.fechaHasta;
      if (nuevaFechaDesde && nuevaFechaHasta) {
        if (nuevaFechaDesde > nuevaFechaHasta) {
          setFechaError('La fecha "Desde" no puede ser mayor que la fecha "Hasta".');
        } else {
          setFechaError('');
        }
      } else {
        setFechaError('');
      }
    }
    if (name === 'tipo') setForm(prev => ({ ...prev, capacidad: '' }));
  };

  // Cambia el handleSubmit para usar los nuevos campos
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    const { unidad_de_negocio, tipo, capacidad, unidades, fechaDesde, fechaHasta, observaciones } = form;

    if (!unidad_de_negocio) {
      setLoading(false);
      setMensajeError('Debe seleccionar una unidad de negocio.');
      setTimeout(() => setMensajeError(''), 7000);
      return;
    }
    if (!fechaDesde || !fechaHasta) {
      setLoading(false);
      setMensajeError('Debe ingresar ambas fechas.');
      setTimeout(() => setMensajeError(''), 7000);
      return;
    }
    if (fechaDesde > fechaHasta) {
      setLoading(false);
      setFechaError('La fecha "Desde" no puede ser mayor que la fecha "Hasta".');
      setMensajeError('No se puede enviar la solicitud: la fecha "Desde" no puede ser mayor que la fecha "Hasta".');
      setTimeout(() => setMensajeError(''), 7000);
      return;
    }
    if (fechaError) {
      setLoading(false);
      setMensajeError('No se puede enviar la solicitud: revise las fechas ingresadas.');
      setTimeout(() => setMensajeError(''), 7000);
      return;
    }

    const solicitudes = Array.from({ length: Number(unidades) }).map(() => ({
      tipo,
      capacidad,
      unidades_necesarias: 1,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      observaciones,
      correo_creador: userEmail,
      unidad_de_negocio: unidad_de_negocio || null,
    }));

    const { error } = await supabase.from('solicitudes_equipos').insert(solicitudes);
    setLoading(false);
    if (!error) {
      setMensajeExito('¡Solicitud enviada correctamente!');
      setForm({
        unidad_de_negocio: '',
        tipo: '',
        capacidad: '',
        unidades: 1,
        fechaDesde: '',
        fechaHasta: '',
        observaciones: '',
      });
      fetchSolicitudes(userEmail);
      router.refresh();
      setTimeout(() => setMensajeExito(''), 3500);
    } else {
      setMensajeError('Error al enviar la solicitud');
      setTimeout(() => setMensajeError(''), 7000);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Modal de confirmación para eliminar (cambiar id → id_solicitud)
  const handleEliminar = (id_solicitud, equipo_asignado) => {
    if (equipo_asignado) {
      alert('No se puede eliminar: ya tiene equipo asignado. Solicitar a taller.');
      return;
    }
    setModalEliminar({ open: true, id: id_solicitud, equipo_asignado });
  };

  const confirmarEliminar = async () => {
    setEliminarLoading(modalEliminar.id);
    const { error } = await supabase.from('solicitudes_equipos').delete().eq('id_solicitud', modalEliminar.id);
    setEliminarLoading(null);
    setModalEliminar({ open: false, id: null, equipo_asignado: null });
    if (!error) {
      setSolicitudes(solicitudes.filter(s => s.id_solicitud !== modalEliminar.id));
    } else {
      alert('Error al eliminar la solicitud');
    }
  };

  // --- FILTRADO ---
  const solicitudesFiltradas = solicitudes.filter(s => {
    const coincideTipo = !filtroTipo || s.tipo === filtroTipo;

    // Si no hay filtro de mes, mostrar todas
    if (!filtroMes) return coincideTipo;

    if (!s.fecha_desde || !s.fecha_hasta) return false;
    const desde = new Date(s.fecha_desde);
    const hasta = new Date(s.fecha_hasta);

    // Primer y último día del mes filtrado
    const [anio, mes] = filtroMes.split('-');
    const primerDiaMes = new Date(Number(anio), Number(mes) - 1, 1);
    const ultimoDiaMes = new Date(Number(anio), Number(mes), 0);

    // Hay cruce si el rango de la solicitud se solapa con el mes filtrado
    const coincideMes = hasta >= primerDiaMes && desde <= ultimoDiaMes;

    return coincideTipo && coincideMes;
  });

  // Paginación
  const totalPaginas = Math.ceil(solicitudesFiltradas.length / equiposPorPagina);
  const solicitudesPagina = solicitudesFiltradas.slice(
    (pagina - 1) * equiposPorPagina,
    pagina * equiposPorPagina
  );

  useEffect(() => {
    setPagina(1);
  }, [filtroTipo, filtroMes]);

  // Validar rol
  useEffect(() => {
    async function validarSolicitante() {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        router.replace('/login');
        return;
      }
      const res = await fetch('/api/validate-solicitante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!data.isSolicitante) {
        router.replace('/dashboard');
        return;
      }
      setCheckingAccess(false);
    }
    validarSolicitante();
  }, [router]);

  // Traer asignaciones del usuario
  useEffect(() => {
    async function fetchAsignaciones() {
      // Solo traemos asignaciones de las solicitudes de este usuario
      const { data, error } = await supabase
        .from('asignaciones')
        .select('*');
      if (!error) setAsignaciones(data);
    }
    fetchAsignaciones();
  }, []);

  // --- FUNCIÓN PARA ABRIR EL MODAL Y TRAER MOVIMIENTOS ---
  async function abrirHistorialAsignaciones(idSolicitud) {
    const { data, error } = await supabase
      .from('asignaciones')
      .select('*')
      .eq('id_solicitud', idSolicitud)
      .order('fecha_inicio_asignacion', { ascending: true });
    if (!error) {
      setHistorialMovimientos(data);
      setModalHistorialOpen(true);
    }
  }

  if (checkingAccess) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 via-blue-50 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-200">
          Verificando acceso...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row items-start justify-center bg-gradient-to-br from-gray-100 via-blue-50 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative p-4">
      {/* Barra superior con mensaje y botón */}
      <div className="w-full flex items-center justify-between px-8 py-3 bg-white dark:bg-gray-800 rounded-xl shadow mb-6 absolute top-2 left-1/2 -translate-x-1/2 max-w-5xl z-10 border border-gray-200 dark:border-gray-700">
        <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">
          Bienvenido{userEmail ? `, ${userEmail}` : ''}
        </span>
        <button
          onClick={handleLogout}
          className="px-4 py-1 bg-red-200 text-red-700 rounded-md text-sm font-semibold shadow hover:bg-red-300 transition"
        >
          Cerrar sesión
        </button>
      </div>
      {/* Formulario de solicitud */}
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 flex flex-col items-center mt-28 md:mt-28">
        <Image
          src="/CEE-MARCA.png"
          alt="CEE Logo"
          width={80}
          height={80}
          className="mb-4 transition-all duration-300 dark:invert"
          priority
        />
        <h1 className="text-2xl font-bold mb-2 text-blue-700 dark:text-blue-300 text-center">
          Solicitar equipos
        </h1>
        <div className="w-16 h-1 bg-blue-600 rounded-full mb-6 mx-auto" />
        {mensajeExito && (
          <div className="mb-4 w-full flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-100 border border-green-300 text-green-800 shadow animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="white"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2l4-4" />
              </svg>
              <span className="font-semibold">{mensajeExito}</span>
            </div>
          </div>
        )}
        {mensajeError && (
          <div className="mb-4 w-full flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-100 border border-red-300 text-red-800 shadow animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="white"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9l-6 6M9 9l6 6" />
              </svg>
              <span className="font-semibold">{mensajeError}</span>
            </div>
          </div>
        )}
        <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* UNIDAD DE NEGOCIO */}
          <label className="font-semibold">Unidad de negocio</label>
          {unidadesNegocio.length === 1 ? (
            <div
              className="w-full p-2 rounded border border-gray-300 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold"
              style={{
                cursor: 'default',
                opacity: 1,
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                minHeight: '2.5rem',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {unidadesNegocio[0]}
            </div>
          ) : (
            <div className="relative w-full">
              <select
                name="unidad_de_negocio"
                value={form.unidad_de_negocio}
                onChange={handleChange}
                required
                className="p-2 rounded border border-gray-300 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 transition w-full"
                style={{
                  minHeight: '2.5rem',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  paddingRight: '2rem',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}
              >
                <option value="">Seleccione una unidad</option>
                {unidadesNegocio.map(un => (
                  <option
                    key={un}
                    value={un}
                    title={un}
                    style={{
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word'
                    }}
                  >
                    {un}
                  </option>
                ))}
              </select>
              {/* Si el texto seleccionado es muy largo, lo mostramos debajo */}
              {form.unidad_de_negocio && form.unidad_de_negocio.length > 40 && (
                <div
                  className="mt-1 text-gray-900 dark:text-gray-100 font-semibold break-words text-xs bg-gray-50 dark:bg-gray-900 rounded p-2 border border-gray-200 dark:border-gray-700 shadow"
                  style={{
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    maxWidth: '100%'
                  }}
                >
                  {form.unidad_de_negocio}
                </div>
              )}
            </div>
          )}
          {/* Si solo hay una unidad, seleccionarla automáticamente */}
          {unidadesNegocio.length === 1 && form.unidad_de_negocio !== unidadesNegocio[0] && (
            setForm(prev => ({ ...prev, unidad_de_negocio: unidadesNegocio[0] }))
          )}

          <label className="font-semibold">Tipo de equipo</label>
          <select
            name="tipo"
            value={form.tipo}
            onChange={handleChange}
            required
            className="p-2 rounded border border-gray-300 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
          >
            <option value="">Seleccione un tipo</option>
            {tipos.map(tipo => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>

          <label className="font-semibold">Capacidad</label>
          <select
            name="capacidad"
            value={form.capacidad}
            onChange={handleChange}
            required
            className="p-2 rounded border border-gray-300 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
            disabled={!form.tipo}
          >
            <option value="">Seleccione capacidad</option>
            {capacidades.map(cap => (
              <option key={cap} value={cap}>{cap}</option>
            ))}
          </select>

          <label className="font-semibold">Unidades necesarias</label>
          <input
            type="number"
            name="unidades"
            min={1}
            value={form.unidades}
            onChange={handleChange}
            required
            className="p-2 rounded border"
          />

          <label className="font-semibold">Fecha desde</label>
          <input
            type="date"
            name="fechaDesde"
            value={form.fechaDesde}
            onChange={handleChange}
            required
            className={`p-2 rounded border ${fechaError ? 'border-red-500' : 'border-gray-300'}`}
          />

          <label className="font-semibold">Fecha hasta</label>
          <input
            type="date"
            name="fechaHasta"
            value={form.fechaHasta}
            onChange={handleChange}
            required
            className={`p-2 rounded border ${fechaError ? 'border-red-500' : 'border-gray-300'}`}
          />

          {fechaError && (
            <div className="text-red-600 text-xs font-semibold mt-[-12px] mb-2">
              {fechaError}
            </div>
          )}

          <label className="font-semibold">Observaciones</label>
          <textarea
            name="observaciones"
            value={form.observaciones}
            onChange={handleChange}
            className="p-2 rounded border"
            rows={2}
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-4 px-6 py-2 bg-blue-700 text-white rounded-lg font-semibold shadow hover:bg-blue-800 transition"
          >
            {loading ? 'Enviando...' : 'Solicitar'}
          </button>
        </form>
      </div>
      {/* Lista de solicitudes a la derecha */}
      <div className="w-full max-w-6xl mt-8 md:mt-28 md:ml-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200 text-center">
          Mis solicitudes
        </h2>
        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4 mb-4 justify-center items-center">
          <div>
            <label className="mr-2 font-semibold text-gray-700 dark:text-gray-200">Filtrar por tipo:</label>
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              className="p-2 rounded border border-gray-300 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
            >
              <option value="">Todos</option>
              {tipos.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mr-2 font-semibold text-gray-700 dark:text-gray-200">Filtrar por mes:</label>
            <input
              type="month"
              value={filtroMes}
              onChange={e => setFiltroMes(e.target.value)}
              className="p-2 rounded border border-gray-300 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
            />
          </div>
        </div>
        {solicitudesFiltradas.length === 0 ? (
          <p className="text-center text-gray-500">No tienes solicitudes registradas.</p>
        ) : (
          <>
            <table className="min-w-full text-sm text-left table-fixed">
              <colgroup>
                <col style={{ width: '5%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead>
                <tr className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <th className="px-2 py-2">ID</th>
                  <th className="px-2 py-2">Tipo</th>
                  <th className="px-2 py-2">Capacidad</th>
                  <th className="px-2 py-2">Unidades</th>
                  <th className="px-2 py-2">Fecha desde</th>
                  <th className="px-2 py-2">Fecha hasta</th>
                  <th className="px-2 py-2">Obs.</th>
                  <th className="px-2 py-2">Equipo asignado</th>
                  <th className="px-2 py-2">Acción</th>
                  <th className="px-2 py-2">Seguimiento</th>
                </tr>
              </thead>
              <tbody>
                {solicitudesPagina.map(s => {
                  // Buscar el último equipo asignado por fecha_inicio_asignacion
                  // Debes tener el array de asignaciones disponible en este componente
                  // Si no lo tienes, deberás traerlo con un fetch similar a como traes las solicitudes
                  const asignacionesSolicitud = (asignaciones || []).filter(a => a.id_solicitud === s.id_solicitud);
                  let ultimoEquipo = null;
                  if (asignacionesSolicitud.length > 0) {
                    // Ordena por fecha_inicio_asignacion descendente y toma el primero
                    asignacionesSolicitud.sort((a, b) => new Date(b.fecha_inicio_asignacion) - new Date(a.fecha_inicio_asignacion));
                    ultimoEquipo = asignacionesSolicitud[0].codigo_equipo;
                  }

                  return (
                    <tr key={s.id_solicitud} className="border-b last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <td className="px-2 py-1">{s.id_solicitud}</td>
                      <td className="px-2 py-1">{s.tipo}</td>
                      <td className="px-2 py-1">{s.capacidad}</td>
                      <td className="px-2 py-1">{s.unidades_necesarias}</td>
                      <td className="px-2 py-1">{formatearFechaArg(s.fecha_desde)}</td>
                      <td className="px-2 py-1">{formatearFechaArg(s.fecha_hasta)}</td>
                      <td className="px-2 py-1">{s.observaciones || '-'}</td>
                      <td className="px-2 py-1">
                        {ultimoEquipo ? (
                          <span className="text-green-700 dark:text-green-400 font-semibold text-xs">
                            {ultimoEquipo}
                          </span>
                        ) : (
                          <span className="text-yellow-700 dark:text-yellow-400 font-semibold text-xs">
                            Sin asignar
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        {ultimoEquipo ? (
                          <div className="relative group inline-block">
                            <button
                              disabled
                              className="px-3 py-1 rounded text-xs font-semibold shadow bg-gray-300 text-gray-500 cursor-not-allowed"
                            >
                              No se puede eliminar
                            </button>
                            <div
                              className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-red-600 text-white text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20"
                              style={{ bottom: '-2.5rem', whiteSpace: 'normal' }}
                            >
                              No puede eliminar: ya tiene equipo asignado. Solicitar a taller.
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEliminar(s.id_solicitud, ultimoEquipo)}
                            disabled={eliminarLoading === s.id_solicitud}
                            className={`px-3 py-1 rounded text-xs font-semibold shadow transition
                              bg-red-500 text-white hover:bg-red-600`}
                          >
                            {eliminarLoading === s.id_solicitud ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <button
                          className="px-3 py-1 rounded text-xs font-semibold shadow bg-blue-500 text-white hover:bg-blue-600 transition"
                          onClick={() => abrirHistorialAsignaciones(s.id_solicitud)}
                        >
                          Ver historial
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Paginador */}
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="mx-2 text-sm">
                Página {pagina} de {totalPaginas}
              </span>
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </>
        )}
      </div>
      {/* Modal de confirmación de eliminación */}
      {modalEliminar.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-xs flex flex-col items-center">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100 text-center">
              ¿Seguro que deseas eliminar esta solicitud?
            </h3>
            <div className="flex gap-4 mt-2">
              <button
                onClick={confirmarEliminar}
                disabled={eliminarLoading === modalEliminar.id}
                className="px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition"
              >
                {eliminarLoading === modalEliminar.id ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button
                onClick={() => setModalEliminar({ open: false, id: null, equipo_asignado: null })}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded font-semibold hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      <ModalHistorial
        open={modalHistorialOpen}
        onClose={() => setModalHistorialOpen(false)}
        movimientos={historialMovimientos}
        formatearFechaArg={formatearFechaArg}
      />
    </main>
  );
}
