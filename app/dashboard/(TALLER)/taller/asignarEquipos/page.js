'use client';

import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

// --- COMPONENTES REUTILIZABLES ---
function DetalleSolicitud({ solicitud, formatearFechaArg }) {
  if (!solicitud) return null;
  return (
    <div className="mt-4 p-4 rounded bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 shadow">
      <div className="mb-2">
        <span className="font-semibold text-gray-700 dark:text-gray-100">Unidad de negocio: </span>
        <span className="text-gray-800 dark:text-gray-200">{solicitud.unidad_de_negocio}</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold text-gray-700 dark:text-gray-100">Tipo de equipo solicitado: </span>
        <span className="text-gray-800 dark:text-gray-200">{solicitud.tipo}</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold text-gray-700 dark:text-gray-100">Capacidad informada: </span>
        <span className="text-gray-800 dark:text-gray-200">{solicitud.capacidad}</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold text-gray-700 dark:text-gray-100">Desde - Hasta: </span>
        <span className="text-gray-800 dark:text-gray-200">
          {formatearFechaArg(solicitud.fecha_desde)} - {formatearFechaArg(solicitud.fecha_hasta)}
        </span>
      </div>
      <div>
        <span className="font-semibold text-gray-700 dark:text-gray-100">Observaciones: </span>
        <span className="text-gray-800 dark:text-gray-200">
          {solicitud.observaciones || <span className="italic text-gray-400">Sin observaciones</span>}
        </span>
      </div>
    </div>
  );
}

function DetalleAsignacion({ asignacion, solicitud, formatearFechaArg }) {
  if (!asignacion || !solicitud) return null;

  // Criterio: si la asignación no tiene fecha_fin_asignacion, mostrar la fecha_hasta de la solicitud
  const fechaHastaMostrar = asignacion.fecha_fin_asignacion
    ? asignacion.fecha_fin_asignacion
    : solicitud.fecha_hasta;

  return (
    <div className="mt-4 p-4 rounded bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 shadow">
      <div className="mb-2">
        <span className="font-semibold text-gray-700 dark:text-gray-100">Unidad de negocio: </span>
        <span className="text-gray-800 dark:text-gray-200">{solicitud.unidad_de_negocio}</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold text-gray-700 dark:text-gray-100">Tipo de equipo solicitado: </span>
        <span className="text-gray-800 dark:text-gray-200">{solicitud.tipo}</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold text-gray-700 dark:text-gray-100">Capacidad informada: </span>
        <span className="text-gray-800 dark:text-gray-200">{solicitud.capacidad}</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold text-gray-700 dark:text-gray-100">Desde - Hasta: </span>
        <span className="text-gray-800 dark:text-gray-200">
          {formatearFechaArg(asignacion.fecha_inicio_asignacion)} - {formatearFechaArg(fechaHastaMostrar)}
        </span>
      </div>
      <div>
        <span className="font-semibold text-gray-700 dark:text-gray-100">Observaciones: </span>
        <span className="text-gray-800 dark:text-gray-200">
          {solicitud.observaciones || <span className="italic text-gray-400">Sin observaciones</span>}
        </span>
      </div>
      <div className="mt-2">
        <span className="font-semibold text-gray-700 dark:text-gray-100">Equipo asignado actual: </span>
        <span className="text-gray-800 dark:text-gray-200">{asignacion.codigo_equipo}</span>
      </div>
      <div>
        <span className="font-semibold text-gray-700 dark:text-gray-100">Fecha de asignación actual: </span>
        <span className="text-gray-800 dark:text-gray-200">{formatearFechaArg(asignacion.fecha_inicio_asignacion)}</span>
      </div>
    </div>
  );
}

function ModalRetiroEquipo({ open, onClose, onConfirm, fechaMin, fechaMax }) {
  const [fechaRetiro, setFechaRetiro] = useState('');
  const [touched, setTouched] = useState(false);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.60)',
        backdropFilter: 'blur(6px)'
      }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-sm relative">
        <button
          className="absolute top-2 right-2 text-xl px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold transition"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
        <h3 className="text-lg font-bold mb-4 text-red-700 dark:text-red-200">Retirar equipo de la solicitud</h3>
        <label className="font-semibold mb-2 block">Fecha de retiro</label>
        <input
          type="date"
          className="p-2 rounded border w-full"
          value={fechaRetiro}
          min={fechaMin}
          max={fechaMax}
          onChange={e => {
            setFechaRetiro(e.target.value);
            setTouched(true);
          }}
          onBlur={() => setTouched(true)}
        />
        {touched && !fechaRetiro && (
          <span className="text-xs text-red-600 mt-1 block">La fecha de retiro es obligatoria.</span>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <button
            className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700 transition"
            onClick={() => fechaRetiro && onConfirm(fechaRetiro)}
            disabled={!fechaRetiro}
          >
            Quitar equipo
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalEditarFecha({ open, onClose, fechaActual, fechaMin, fechaMax, onConfirm }) {
  const [nuevaFecha, setNuevaFecha] = useState(fechaActual || '');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setNuevaFecha(fechaActual || '');
    setTouched(false);
  }, [open, fechaActual]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.60)',
        backdropFilter: 'blur(6px)'
      }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-sm relative">
        <button
          className="absolute top-2 right-2 text-xl px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold transition"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
        <h3 className="text-lg font-bold mb-4 text-blue-700 dark:text-blue-200">Editar fecha de inicio</h3>
        <label className="font-semibold mb-2 block">Nueva fecha de inicio</label>
        <input
          type="date"
          className="p-2 rounded border w-full"
          value={nuevaFecha}
          min={fechaMin}
          max={fechaMax}
          onChange={e => {
            setNuevaFecha(e.target.value);
            setTouched(true);
          }}
          onBlur={() => setTouched(true)}
        />
        {touched && !nuevaFecha && (
          <span className="text-xs text-red-600 mt-1 block">La fecha es obligatoria.</span>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <button
            className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-700 text-white font-semibold hover:bg-blue-800 transition"
            onClick={() => nuevaFecha && onConfirm(nuevaFecha)}
            disabled={!nuevaFecha}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AsignarEquiposPage() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [solicitudes, setSolicitudes] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState(null);
  const [equiposCompatibles, setEquiposCompatibles] = useState([]);
  const [motivoReemplazo, setMotivoReemplazo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [unidadFiltro, setUnidadFiltro] = useState('');
  const [fechaReemplazo, setFechaReemplazo] = useState('');
  const [fechaReemplazoTouched, setFechaReemplazoTouched] = useState(false);
  const [tab, setTab] = useState('asignar');
  const [modalRetiroOpen, setModalRetiroOpen] = useState(false);
  const [modalFechaOpen, setModalFechaOpen] = useState(false);
  const [solicitudEditando, setSolicitudEditando] = useState(null);

  // --- VALIDACIÓN DE ACCESO ---
  useEffect(() => {
    async function validarTaller() {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return router.replace('/login');
      const res = await fetch('/api/validate-taller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!data.isTaller) return router.replace('/dashboard');
      setCheckingAccess(false);
    }
    validarTaller();
  }, [router]);

  // --- FETCH DATA ---
  useEffect(() => {
    fetchSolicitudes();
    fetchEquipos();
    fetchAsignaciones();
  }, []);

  useEffect(() => {
    if (solicitudSeleccionada) filtrarEquiposDisponibles(solicitudSeleccionada);
  }, [solicitudSeleccionada, equipos, asignaciones]);

  useEffect(() => {
    if (asignacionSeleccionada) filtrarEquiposCompatibles(asignacionSeleccionada);
  }, [asignacionSeleccionada, equipos, asignaciones]);

  useEffect(() => {
    if (
      solicitudSeleccionada &&
      solicitudes.length > 0 &&
      !solicitudes.some(s => s.id_solicitud === solicitudSeleccionada.id_solicitud)
    ) {
      setSolicitudSeleccionada(null);
      setEquipoSeleccionado(null);
    } else if (
      solicitudSeleccionada &&
      solicitudes.length > 0
    ) {
      const actual = solicitudes.find(s => s.id_solicitud === solicitudSeleccionada.id_solicitud);
      if (actual && actual !== solicitudSeleccionada) setSolicitudSeleccionada(actual);
    }
  }, [solicitudes]);

  async function fetchSolicitudes() {
    const { data, error } = await supabase.from('solicitudes_equipos').select('*');
    if (!error) setSolicitudes(data);
  }
  async function fetchEquipos() {
    const { data, error } = await supabase.from('equipos').select('*');
    if (!error) setEquipos(data);
  }
  async function fetchAsignaciones() {
    const { data, error } = await supabase.from('asignaciones').select('*');
    if (!error) setAsignaciones(data);
  }

  // --- FILTROS Y DERIVADOS ---
  const unidadesNegocio = useMemo(
    () => Array.from(new Set(solicitudes.map(s => s.unidad_de_negocio))).filter(Boolean),
    [solicitudes]
  );

  const solicitudesFiltradas = useMemo(
    () => unidadFiltro
      ? solicitudes.filter(s => s.unidad_de_negocio === unidadFiltro)
      : solicitudes,
    [solicitudes, unidadFiltro]
  );

  const asignacionesFiltradas = useMemo(
    () => unidadFiltro
      ? asignaciones.filter(a => {
          const solicitud = solicitudes.find(s => s.id_solicitud === a.id_solicitud);
          return solicitud && solicitud.unidad_de_negocio === unidadFiltro;
        })
      : asignaciones,
    [asignaciones, solicitudes, unidadFiltro]
  );

  // --- SOLO SOLICITUDES SIN EQUIPO ASIGNADO (NINGUNA ASIGNACIÓN ACTIVA EN LA FECHA ACTUAL) ---
  const hoy = new Date();

  const solicitudesSinAsignar = useMemo(
    () => solicitudesFiltradas.filter(s => {
      // Si la solicitud NO tiene ninguna asignación en la tabla, se muestra como activa
      const tieneAsignacion = asignaciones.some(a => a.id_solicitud === s.id_solicitud);
      return !tieneAsignacion;
    }),
    [solicitudesFiltradas, asignaciones]
  );

  // --- SOLO ÚLTIMA ASIGNACIÓN POR SOLICITUD (PARA EL MENÚ DE REEMPLAZO) ---
  const asignacionesUltimas = useMemo(() => {
    // Agrupa por id_solicitud y selecciona la asignación con la fecha_inicio_asignacion más reciente
    const porSolicitud = {};
    for (const asg of asignacionesFiltradas) {
      const actual = porSolicitud[asg.id_solicitud];
      const inicio = new Date(asg.fecha_inicio_asignacion);
      if (
        !actual ||
        inicio > new Date(actual.fecha_inicio_asignacion)
      ) {
        porSolicitud[asg.id_solicitud] = asg;
      }
    }
    return Object.values(porSolicitud);
  }, [asignacionesFiltradas]);

  // --- FILTRAR EQUIPOS DISPONIBLES ---
  function filtrarEquiposDisponibles(solicitud) {
    const equiposFiltrados = equipos.filter(eq => eq.tipo_de_equipos === solicitud.tipo);
    const desde = new Date(solicitud.fecha_desde);
    const hasta = new Date(solicitud.fecha_hasta);

    const disponibles = equiposFiltrados.filter(eq => {
      const asignacionesEquipo = asignaciones.filter(asg => asg.codigo_equipo === eq.codigo);
      // El equipo está disponible si NO tiene ninguna asignación que se cruce con el rango solicitado
      return !asignacionesEquipo.some(asg => {
        const asigInicio = new Date(asg.fecha_inicio_asignacion);
        const asigFin = asg.fecha_fin_asignacion ? new Date(asg.fecha_fin_asignacion) : null;
        // Si la asignación termina antes o justo en el "desde", no hay conflicto
        if (asigFin && asigFin <= desde) return false;
        // Si la asignación empieza después o justo en el "hasta", no hay conflicto
        if (asigInicio >= hasta) return false;
        // Si se solapan, hay conflicto
        return true;
      });
    });
    setEquiposDisponibles(disponibles);
  }

  // --- FILTRAR EQUIPOS COMPATIBLES ---
  function filtrarEquiposCompatibles(asignacion) {
    const solicitud = solicitudes.find(s => s.id_solicitud === asignacion.id_solicitud);
    if (!solicitud) return setEquiposCompatibles([]);
    // Si la asignación aún no tiene fecha_inicio_asignacion, usar la fecha_desde de la solicitud
    const minDesde = asignacion.fecha_inicio_asignacion
      ? new Date(asignacion.fecha_inicio_asignacion)
      : new Date(solicitud.fecha_desde);
    const hasta = new Date(solicitud.fecha_hasta);

    // Si el usuario seleccionó una fecha válida, úsala, si no, usa minDesde
    const desde = fechaReemplazo && new Date(fechaReemplazo) >= minDesde ? new Date(fechaReemplazo) : minDesde;

    const compatibles = equipos.filter(
      eq => eq.tipo_de_equipos === solicitud.tipo && eq.codigo !== asignacion.codigo_equipo
    );
    const disponibles = compatibles.filter(eq => {
      const asignacionesEquipo = asignaciones.filter(asg => asg.codigo_equipo === eq.codigo);
      // El equipo está disponible si NO tiene ninguna asignación que se cruce con el nuevo rango
      return !asignacionesEquipo.some(asg => {
        const asigInicio = new Date(asg.fecha_inicio_asignacion);
        const asigFin = asg.fecha_fin_asignacion ? new Date(asg.fecha_fin_asignacion) : null;
        // Si la asignación termina antes del nuevo "desde", no hay conflicto
        if (asigFin && asigFin <= desde) return false;
        // Si la asignación empieza después del nuevo "hasta", no hay conflicto
        if (asigInicio >= hasta) return false;
        // Si se solapan, hay conflicto
        return true;
      });
    });
    setEquiposCompatibles(disponibles);
  }

  // --- FORMATEAR FECHA ---
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

  // --- ASIGNAR EQUIPO ---
  async function handleAsignarEquipo() {
    if (!solicitudSeleccionada || !equipoSeleccionado) return;
    setLoading(true);
    setMensaje('');
    const yaAsignado = asignaciones.some(
      asg =>
        asg.id_solicitud === solicitudSeleccionada.id_solicitud &&
        asg.codigo_equipo === equipoSeleccionado.codigo &&
        !asg.fecha_fin_asignacion
    );
    if (yaAsignado) {
      setMensaje('Ya existe una asignación activa para este equipo y solicitud.');
      setLoading(false);
      return;
    }
    const insertData = {
      codigo_equipo: equipoSeleccionado.codigo,
      id_solicitud: solicitudSeleccionada.id_solicitud,
      fecha_inicio_asignacion: solicitudSeleccionada.fecha_desde,
      fecha_fin_asignacion: solicitudSeleccionada.fecha_hasta,
      es_reemplazo: false,
      usuario_que_asigno: 'usuario_actual',
      fecha_asignacion: new Date().toISOString(),
    };
    const { error } = await supabase.from('asignaciones').insert([insertData]);
    if (error) {
      setMensaje('Error al asignar equipo: ' + error.message);
      setLoading(false);
      return;
    }
    await supabase
      .from('equipos')
      .update({ unidad_negocio_actual: solicitudSeleccionada.unidad_de_negocio })
      .eq('codigo', equipoSeleccionado.codigo);
    setMensaje('Equipo asignado correctamente.');
    fetchAsignaciones();
    fetchEquipos();
    setSolicitudSeleccionada(null);
    setEquipoSeleccionado(null);
    setLoading(false);
  }

  // --- REEMPLAZAR EQUIPO ---
  async function handleReemplazarEquipo() {
    if (!asignacionSeleccionada || !equipoSeleccionado || !motivoReemplazo || !fechaReemplazo) return;
    setLoading(true);
    setMensaje('');
    // Cierra la asignación anterior
    const { error: errorUpdate } = await supabase
      .from('asignaciones')
      .update({ fecha_fin_asignacion: fechaReemplazo })
      .eq('id_asignacion', asignacionSeleccionada.id_asignacion);
    if (errorUpdate) {
      setMensaje('Error al cerrar la asignación anterior.');
      setLoading(false);
      return;
    }
    const solicitud = solicitudes.find(s => s.id_solicitud === asignacionSeleccionada.id_solicitud);
    // Inserta la nueva asignación
    const { error } = await supabase.from('asignaciones').insert([{
      codigo_equipo: equipoSeleccionado.codigo,
      id_solicitud: asignacionSeleccionada.id_solicitud,
      fecha_inicio_asignacion: fechaReemplazo,
      fecha_fin_asignacion: solicitud?.fecha_hasta || null, // <-- SIEMPRE el hasta de la solicitud
      es_reemplazo: true,
      id_asignacion_reemplazada: asignacionSeleccionada.id_asignacion,
      motivo_reemplazo: motivoReemplazo,
      usuario_que_asigno: 'usuario_actual',
      fecha_asignacion: new Date().toISOString(),
    }]);
    if (!error) {
      await supabase
        .from('equipos')
        .update({ unidad_negocio_actual: solicitud?.unidad_de_negocio || null })
        .eq('codigo', equipoSeleccionado.codigo);
      setMensaje('Equipo reemplazado correctamente.');
      fetchAsignaciones();
      fetchEquipos();
      setAsignacionSeleccionada(null);
      setEquipoSeleccionado(null);
      setMotivoReemplazo('');
      setFechaReemplazo('');
    } else {
      setMensaje('Error al reemplazar equipo.');
    }
    setLoading(false);
  }

  // --- QUITAR EQUIPO ---
  async function handleQuitarEquipo(fechaRetiro) {
    if (!asignacionSeleccionada || !fechaRetiro) return;
    setLoading(true);
    setMensaje('');
    // Cierra la asignación anterior
    await supabase
      .from('asignaciones')
      .update({ fecha_fin_asignacion: fechaRetiro })
      .eq('id_asignacion', asignacionSeleccionada.id_asignacion);

    // Edita la solicitud: fecha_hasta = fechaRetiro
    await supabase
      .from('solicitudes_equipos')
      .update({ fecha_hasta: fechaRetiro })
      .eq('id_solicitud', asignacionSeleccionada.id_solicitud);

    // Busca la solicitud original
    const solicitud = solicitudes.find(s => s.id_solicitud === asignacionSeleccionada.id_solicitud);
    if (!solicitud) {
      setMensaje('No se encontró la solicitud original.');
      setLoading(false);
      setModalRetiroOpen(false);
      return;
    }

    // Crea la nueva solicitud (solo los campos válidos)
    const nuevaSolicitud = {
      unidad_de_negocio: solicitud.unidad_de_negocio,
      tipo: solicitud.tipo,
      capacidad: solicitud.capacidad,
      unidades_necesarias: solicitud.unidades_necesarias,
      fecha_desde: fechaRetiro,
      fecha_hasta: solicitud.fecha_hasta,
      observaciones: `Esta solicitud reemplaza a la ${solicitud.id_solicitud}`,
      correo_creador: solicitud.correo_creador
    };

    const { error: errorNuevaSolicitud } = await supabase
      .from('solicitudes_equipos')
      .insert([nuevaSolicitud]);

    if (errorNuevaSolicitud) {
      setMensaje('Error al crear la nueva solicitud.');
      setLoading(false);
      setModalRetiroOpen(false);
      return;
    }

    setMensaje('Equipo retirado y nueva solicitud generada.');
    fetchSolicitudes();
    fetchAsignaciones();
    setAsignacionSeleccionada(null);
    setEquipoSeleccionado(null);
    setMotivoReemplazo('');
    setFechaReemplazo('');
    setLoading(false);
    setModalRetiroOpen(false);
  }

  const handleEditarFechaInicio = async (nuevaFecha) => {
    if (!solicitudEditando || !nuevaFecha) return;
    setLoading(true);
    setMensaje('');
    const { error } = await supabase
      .from('solicitudes_equipos')
      .update({ fecha_desde: nuevaFecha })
      .eq('id_solicitud', solicitudEditando.id_solicitud);
    if (error) {
      setMensaje('Error al actualizar la fecha: ' + error.message);
    } else {
      setMensaje('Fecha de inicio actualizada.');
      fetchSolicitudes();
    }
    setModalFechaOpen(false);
    setSolicitudEditando(null);
    setLoading(false);
  };

  // Cerrar sesión
  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
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
    <main className="min-h-screen flex flex-col gap-10 items-center justify-start bg-gradient-to-br from-gray-100 via-blue-50 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="w-full max-w-4xl flex justify-between items-center mb-2">
        <button
          className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-semibold shadow hover:bg-gray-400 dark:hover:bg-gray-600 transition"
          onClick={() => router.back()}
        >
          ← Volver
        </button>
        <button
          className="px-4 py-2 bg-red-600 text-white rounded font-semibold shadow hover:bg-red-700 transition"
          onClick={handleLogout}
        >
          Cerrar sesión
        </button>
      </div>
      <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-4">Gestión de Asignaciones de Equipos</h1>
      {mensaje && (
        <div className="mb-4 px-4 py-2 rounded bg-blue-100 text-blue-800 font-semibold shadow">{mensaje}</div>
      )}

      {/* Tabs */}
      <div className="w-full max-w-4xl flex mb-6">
        <button
          className={`flex-1 py-2 rounded-tl-lg rounded-tr-none rounded-bl-lg rounded-br-none font-semibold transition
            ${tab === 'asignar'
              ? 'bg-blue-700 text-white shadow'
              : 'bg-blue-100 dark:bg-gray-700 text-blue-700 dark:text-gray-200 hover:bg-blue-200 dark:hover:bg-gray-600'}`}
          onClick={() => setTab('asignar')}
        >
          Asignar equipos a solicitudes
        </button>
        <button
          className={`flex-1 py-2 rounded-tr-lg rounded-tl-none rounded-br-lg rounded-bl-none font-semibold transition
            ${tab === 'reemplazar'
              ? 'bg-yellow-600 text-white shadow'
              : 'bg-yellow-100 dark:bg-gray-700 text-yellow-700 dark:text-gray-200 hover:bg-yellow-200 dark:hover:bg-gray-600'}`}
          onClick={() => setTab('reemplazar')}
        >
          Reemplazar equipo asignado
        </button>
      </div>

      {/* Filtro de unidad de negocio */}
      <div className="w-full max-w-4xl mb-4">
        <label className="font-semibold mr-2">Filtrar por unidad de negocio:</label>
        <select
          className="p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          value={unidadFiltro}
          onChange={e => {
            setUnidadFiltro(e.target.value);
            setSolicitudSeleccionada(null);
            setEquipoSeleccionado(null);
            setAsignacionSeleccionada(null);
          }}
        >
          <option value="">Todas</option>
          {unidadesNegocio.map(un => (
            <option key={un} value={un}>{un}</option>
          ))}
        </select>
      </div>

      {/* Contenido de pestañas */}
      {tab === 'asignar' && (
        <section className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200">Asignar equipos a solicitudes</h2>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="font-semibold">Solicitudes activas:</label>
              <select
                className="w-full p-2 rounded border mt-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                value={solicitudSeleccionada?.id_solicitud || ''}
                onChange={e => {
                  const id = e.target.value;
                  setSolicitudSeleccionada(solicitudesSinAsignar.find(s => String(s.id_solicitud) === id) || null);
                  setEquipoSeleccionado(null);
                }}
              >
                <option value="">Seleccione una solicitud</option>
                {solicitudesSinAsignar.map(s => (
                  <option
                    key={s.id_solicitud}
                    value={String(s.id_solicitud)}
                  >
                    {`${s.tipo} - ${s.capacidad} (${s.unidades_necesarias}u) [${s.fecha_desde} a ${s.fecha_hasta}]`}
                  </option>
                ))}
              </select>
              <DetalleSolicitud solicitud={solicitudSeleccionada} formatearFechaArg={formatearFechaArg} />
            </div>
            <div className="flex-1">
              <label className="font-semibold">Equipos disponibles:</label>
              <select
                className="w-full p-2 rounded border mt-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                value={equipoSeleccionado?.codigo || ''}
                onChange={e => {
                  const codigo = e.target.value;
                  setEquipoSeleccionado(equiposDisponibles.find(eq => eq.codigo === codigo) || null);
                }}
                disabled={!solicitudSeleccionada}
              >
                <option value="">Seleccione un equipo</option>
                {equiposDisponibles.map(eq => (
                  <option key={eq.codigo} value={eq.codigo}>
                    {`${eq.codigo} - ${eq.tipo_de_equipos} - ${eq.capacidad_informada}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 mt-6">
            <button
              className="px-6 py-2 bg-blue-700 text-white rounded-lg font-semibold shadow hover:bg-blue-800 transition"
              onClick={handleAsignarEquipo}
              disabled={!solicitudSeleccionada || !equipoSeleccionado || loading}
            >
              Asignar equipo
            </button>
            <button
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition"
              style={{ marginLeft: 0 }}
              onClick={() => {
                setSolicitudEditando(solicitudSeleccionada);
                setModalFechaOpen(true);
              }}
              disabled={!solicitudSeleccionada}
            >
              Editar fecha de inicio
            </button>
          </div>
        </section>
      )}

      {tab === 'reemplazar' && (
        <section className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200">Reemplazar equipo asignado</h2>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="font-semibold">Asignaciones activas:</label>
              <select
                className="w-full p-2 rounded border mt-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                value={asignacionSeleccionada?.id_asignacion || ''}
                onChange={e => {
                  const id = e.target.value;
                  setAsignacionSeleccionada(asignacionesUltimas.find(a => String(a.id_asignacion) === id) || null);
                  setEquipoSeleccionado(null);
                }}
              >
                <option value="">Seleccione una asignación</option>
                {asignacionesUltimas.map(a => (
                  <option key={a.id_asignacion} value={String(a.id_asignacion)}>
                    {`Equipo: ${a.codigo_equipo} | Solicitud: ${a.id_solicitud} | Desde: ${a.fecha_inicio_asignacion}`}
                  </option>
                ))}
              </select>
              <DetalleAsignacion
                asignacion={asignacionSeleccionada}
                solicitud={asignacionSeleccionada && solicitudes.find(s => s.id_solicitud === asignacionSeleccionada.id_solicitud)}
                formatearFechaArg={formatearFechaArg}
              />
            </div>
            <div className="flex-1">
              <label className="font-semibold">Equipos compatibles para reemplazo:</label>
              <select
                className="w-full p-2 rounded border mt-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
                value={equipoSeleccionado?.codigo || ''}
                onChange={e => {
                  const codigo = e.target.value;
                  setEquipoSeleccionado(equiposCompatibles.find(eq => eq.codigo === codigo) || null);
                }}
                disabled={!asignacionSeleccionada}
              >
                <option value="">Seleccione un equipo</option>
                {equiposCompatibles.map(eq => (
                  <option key={eq.codigo} value={eq.codigo}>
                    {`${eq.codigo} - ${eq.tipo_de_equipos} - ${eq.capacidad_informada}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-row gap-4 items-end justify-center">
            <div className="flex flex-col max-w-xs w-full">
              <label className="font-semibold mb-1 text-gray-700 dark:text-gray-100">
                Fecha de reemplazo
              </label>
              <input
                type="date"
                className={`p-2 rounded border ${fechaReemplazoTouched && !fechaReemplazo ? 'border-red-500' : ''}`}
                placeholder="Fecha de reemplazo"
                value={fechaReemplazo}
                min={
                  asignacionSeleccionada
                    ? (
                        asignacionSeleccionada.fecha_inicio_asignacion
                          ? asignacionSeleccionada.fecha_inicio_asignacion
                          : solicitudes.find(s => s.id_solicitud === asignacionSeleccionada.id_solicitud)?.fecha_desde
                      )
                    : ''
                }
                max={
                  asignacionSeleccionada
                    ? solicitudes.find(s => s.id_solicitud === asignacionSeleccionada.id_solicitud)?.fecha_hasta
                    : ''
                }
                onChange={e => {
                  setFechaReemplazo(e.target.value);
                  setFechaReemplazoTouched(true);
                  if (asignacionSeleccionada) filtrarEquiposCompatibles(asignacionSeleccionada);
                }}
                onBlur={() => setFechaReemplazoTouched(true)}
                disabled={!asignacionSeleccionada}
                required
              />
              {fechaReemplazoTouched && !fechaReemplazo && (
                <span className="text-xs text-red-600 mt-1">La fecha de reemplazo es obligatoria.</span>
              )}
            </div>
            <div className="flex flex-col max-w-xs w-full">
              <div className="mb-1">&nbsp;</div>
              <input
                type="text"
                className={`p-2 rounded border ${fechaReemplazoTouched && !motivoReemplazo ? 'border-red-500' : ''}`}
                placeholder="Motivo del reemplazo"
                value={motivoReemplazo}
                onChange={e => setMotivoReemplazo(e.target.value)}
                // Ahora siempre habilitado, aunque no haya equipo seleccionado
                disabled={!asignacionSeleccionada}
                required
              />
              {fechaReemplazoTouched && !motivoReemplazo && (
                <span className="text-xs text-red-600 mt-1">El motivo es obligatorio.</span>
              )}
            </div>
            <button
              className={`px-6 py-2 rounded-lg font-semibold shadow max-w-xs w-full transition
                ${(!asignacionSeleccionada || !equipoSeleccionado || !motivoReemplazo || !fechaReemplazo || loading)
                  ? 'bg-yellow-200 text-yellow-700 cursor-not-allowed opacity-60'
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'}`}
              onClick={() => {
                setFechaReemplazoTouched(true);
                if (!equipoSeleccionado) {
                  setMensaje('Debe seleccionar un equipo para reemplazar.');
                  return;
                }
                if (
                  asignacionSeleccionada &&
                  equipoSeleccionado &&
                  motivoReemplazo &&
                  fechaReemplazo &&
                  !loading
                ) {
                  handleReemplazarEquipo();
                }
              }}
              // El botón nunca está disabled, solo visualmente desactivado
            >
              Reemplazar equipo
            </button>
          </div>
          <button
            className={`mt-8 px-6 py-2 rounded-lg font-semibold shadow max-w-xs w-full transition
              ${(!asignacionSeleccionada || loading)
                ? 'bg-red-200 text-red-700 cursor-not-allowed opacity-60'
                : 'bg-red-600 text-white hover:bg-red-700'}`}
            onClick={() => setModalRetiroOpen(true)}
            disabled={!asignacionSeleccionada || loading}
          >
            Quitar equipo de solicitud
          </button>
        </section>
      )}

      <ModalRetiroEquipo
        open={modalRetiroOpen}
        onClose={() => setModalRetiroOpen(false)}
        onConfirm={handleQuitarEquipo}
        fechaMin={
          asignacionSeleccionada
            ? (
                asignacionSeleccionada.fecha_inicio_asignacion
                  ? asignacionSeleccionada.fecha_inicio_asignacion
                  : solicitudes.find(s => s.id_solicitud === asignacionSeleccionada.id_solicitud)?.fecha_desde
              )
            : ''
        }
        fechaMax={
          asignacionSeleccionada
            ? solicitudes.find(s => s.id_solicitud === asignacionSeleccionada.id_solicitud)?.fecha_hasta
            : ''
        }
      />
      <ModalEditarFecha
        open={modalFechaOpen}
        onClose={() => setModalFechaOpen(false)}
        fechaActual={solicitudEditando?.fecha_desde}
        fechaMin="2020-01-01"
        fechaMax={solicitudEditando?.fecha_hasta}
        onConfirm={handleEditarFechaInicio}
      />
    </main>
  );
}
