'use client';

import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

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

// Utilidad para mes actual en formato YYYY-MM
function getMesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Utilidad para saber si un rango de fechas solapa con un mes
function rangoSolapaConMes(fechaDesde, fechaHasta, filtroMes) {
  // filtroMes: 'YYYY-MM'
  const [anio, mes] = filtroMes.split('-');
  const inicioMes = new Date(`${anio}-${mes}-01`);
  const finMes = new Date(inicioMes);
  finMes.setMonth(finMes.getMonth() + 1);
  finMes.setDate(0); // último día del mes

  // Normaliza fechas (soporta dd/mm/yyyy y yyyy-mm-dd)
  function parseFecha(f) {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(f)) {
      const [d, m, y] = f.split('/');
      return new Date(`${y}-${m}-${d}`);
    }
    return new Date(f);
  }

  const desde = parseFecha(fechaDesde);
  const hasta = parseFecha(fechaHasta);

  // ¿Hay solapamiento?
  return desde <= finMes && hasta >= inicioMes;
}

export default function AsignarEquiposPage() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [solicitudes, setSolicitudes] = useState([]);
  const [asignandoId, setAsignandoId] = useState(null);
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);
  const [showEquiposModal, setShowEquiposModal] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [showFechaHastaModal, setShowFechaHastaModal] = useState(false);
  const [nuevoEquipo, setNuevoEquipo] = useState(null);
  const [quitandoAsignacion, setQuitandoAsignacion] = useState(false);
  const fechaHastaRef = useRef();
  const [equiposAsignados, setEquiposAsignados] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [showReiniciarModal, setShowReiniciarModal] = useState(false);
  const [reiniciarId, setReiniciarId] = useState(null);
  const [showEliminarAsignacionModal, setShowEliminarAsignacionModal] = useState(false);
  const [asignacionAEliminar, setAsignacionAEliminar] = useState(null);

  // Filtros
  const [filtroUnidad, setFiltroUnidad] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAsignado, setFiltroAsignado] = useState('todos');

  // Eliminar solicitud
  const [showEliminarSolicitudModal, setShowEliminarSolicitudModal] = useState(false);
  const [solicitudAEliminar, setSolicitudAEliminar] = useState(null);

  // Paginación
  const [pagina, setPagina] = useState(1);
  const [paginaModal, setPaginaModal] = useState(1); // <-- al inicio del componente
  const [paginaEquipos, setPaginaEquipos] = useState(1); // <-- al inicio del componente
  const registrosPorPagina = 6;

  // Al inicio del componente:
  const [equipos, setEquipos] = useState([]);

  useEffect(() => {
    async function validarTaller() {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        router.replace('/login');
        return;
      }
      const res = await fetch('/api/validate-taller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!data.isTaller) {
        router.replace('/dashboard');
        return;
      }
      setCheckingAccess(false);
    }
    validarTaller();
  }, [router]);

  useEffect(() => {
    if (!checkingAccess) {
      fetchSolicitudes();
      fetchEquiposAsignados();
      fetchAsignaciones();
    }
  }, [checkingAccess]);

  // Al cargar el componente, trae todos los equipos:
  useEffect(() => {
    async function fetchEquipos() {
      const { data } = await supabase
        .from('equipos')
        .select('codigo, tipo_de_equipos');
      setEquipos(data || []);
    }
    fetchEquipos();
  }, []);

  async function fetchSolicitudes() {
    const { data, error } = await supabase
      .from('solicitudes_equipos')
      .select('id, unidad_de_negocio, tipo, capacidad, fecha_desde, fecha_hasta, observaciones, equipo_asignado, editadoportaller, fechadesdeeditada');
    if (!error) setSolicitudes(data || []);
  }

  async function fetchEquiposAsignados() {
    const { data, error } = await supabase
      .from('asignaciones_por_unidad_de_negocio')
      .select('equipo, unidad_de_negocio')
      .not('asignado_hasta', 'is', null);
    if (!error) setEquiposAsignados(data || []);
  }

  async function fetchAsignaciones() {
    const { data, error } = await supabase
      .from('asignaciones_por_unidad_de_negocio')
      .select('equipo, unidad_de_negocio, asignado_desde, asignado_hasta');
    if (!error) setAsignaciones(data || []);
  }

  async function handleAsignarEquipo(solicitud) {
    setAsignandoId(solicitud.id);
    setSolicitudSeleccionada(solicitud);
    setPaginaModal(1);
    setPaginaEquipos(1); // <-- resetea aquí

    const { data: equipos } = await supabase
      .from('equipos')
      .select('codigo, tipo_de_equipos, capacidad_informada, detalle_planilla_mpt, detalles');

    const equiposDelTipo = (equipos || []).filter(eq => eq.tipo_de_equipos === solicitud.tipo);

    const { data: asignaciones } = await supabase
      .from('asignaciones_por_unidad_de_negocio')
      .select('equipo, asignado_desde, asignado_hasta');

    const desdeValidar = solicitud.editadoportaller && solicitud.fechadesdeeditada
      ? solicitud.fechadesdeeditada
      : solicitud.fecha_desde;
    const hastaValidar = solicitud.fecha_hasta;

    function fechasSeSolapan(desdeA, hastaA, desdeB, hastaB) {
      return (
        new Date(desdeA) <= new Date(hastaB) &&
        new Date(desdeB) <= new Date(hastaA)
      );
    }

    const disponibles = equiposDelTipo.filter(eq => {
      const asignadoEnPeriodo = (asignaciones || []).some(asig =>
        asig.equipo === eq.codigo &&
        fechasSeSolapan(
          asig.asignado_desde,
          asig.asignado_hasta,
          desdeValidar,
          hastaValidar
        )
      );
      if (solicitud.equipo_asignado && eq.codigo === solicitud.equipo_asignado) return false;
      return !asignadoEnPeriodo;
    });

    setEquiposDisponibles(disponibles);
    setShowEquiposModal(true);
    setAsignandoId(null);
  }

  async function asignarEquipoAlaSolicitud(equipoCodigo) {
    if (!solicitudSeleccionada) return;
    setMensaje('');

    if (solicitudSeleccionada.equipo_asignado) {
      setNuevoEquipo(equipoCodigo);
      setShowFechaHastaModal(true);
      return;
    }

    const desdeAsignar = solicitudSeleccionada.editadoportaller && solicitudSeleccionada.fechadesdeeditada
      ? solicitudSeleccionada.fechadesdeeditada
      : solicitudSeleccionada.fecha_desde;

    await supabase
      .from('asignaciones_por_unidad_de_negocio')
      .insert([{
        equipo: equipoCodigo,
        asignado_desde: desdeAsignar,
        asignado_hasta: solicitudSeleccionada.fecha_hasta,
        fecha_de_asignacion: new Date().toISOString(),
        unidad_de_negocio: solicitudSeleccionada.unidad_de_negocio,
      }]);

    const { error } = await supabase
      .from('solicitudes_equipos')
      .update({
        equipo_asignado: equipoCodigo,
        fecha_asignacion: new Date().toISOString(),
      })
      .eq('id', solicitudSeleccionada.id);

    if (!error) {
      setMensaje('Equipo asignado correctamente.');
      setShowEquiposModal(false);
      fetchSolicitudes();
      fetchEquiposAsignados(); // <--- agrega esta línea
      fetchAsignaciones();     // <--- y esta si quieres refrescar también las asignaciones
    } else {
      setMensaje('Error al asignar equipo.');
    }
  }

  async function confirmarReasignacion() {
    const fechaHasta = fechaHastaRef.current.value;
    if (!fechaHasta || !/^\d{4}-\d{2}-\d{2}$/.test(fechaHasta)) {
      setMensaje('Por favor, selecciona una fecha válida.');
      return;
    }

    await supabase
      .from('asignaciones_por_unidad_de_negocio')
      .update({ asignado_hasta: fechaHasta })
      .eq('equipo', solicitudSeleccionada.equipo_asignado)
      .eq('asignado_desde', solicitudSeleccionada.fecha_desde);

    await supabase
      .from('asignaciones_por_unidad_de_negocio')
      .insert([{
        equipo: nuevoEquipo,
        asignado_desde: fechaHasta,
        asignado_hasta: solicitudSeleccionada.fecha_hasta,
        fecha_de_asignacion: new Date().toISOString(),
        unidad_de_negocio: solicitudSeleccionada.unidad_de_negocio,
      }]);

    const { error } = await supabase
      .from('solicitudes_equipos')
      .update({
        equipo_asignado: nuevoEquipo,
        fecha_asignacion: new Date().toISOString(),
      })
      .eq('id', solicitudSeleccionada.id);

    setShowFechaHastaModal(false);
    setNuevoEquipo(null);

    if (!error) {
      setMensaje('Equipo reasignado correctamente.');
      setShowEquiposModal(false);
      fetchSolicitudes();
    } else {
      setMensaje('Error al reasignar equipo.');
    }
  }

  async function reiniciarSolicitud(id) {
    await supabase
      .from('solicitudes_equipos')
      .update({
        editadoportaller: false,
        fechadesdeeditada: null,
      })
      .eq('id', id);
    setShowReiniciarModal(false);
    setReiniciarId(null);
    setMensaje('Solicitud reiniciada correctamente.');
    fetchSolicitudes();
  }

  // Filtrado
  const solicitudesFiltradas = solicitudes.filter(s => {
    let pasa = true;
    if (filtroUnidad && s.unidad_de_negocio !== filtroUnidad) pasa = false;
    if (filtroMes) {
      if (!rangoSolapaConMes(s.fecha_desde, s.fecha_hasta, filtroMes)) pasa = false;
    }
    if (filtroAsignado === 'si' && !s.equipo_asignado) pasa = false;
    if (filtroAsignado === 'no' && s.equipo_asignado) pasa = false;
    return pasa;
  });

  // Paginación de resultados
  const totalPaginas = Math.ceil(solicitudesFiltradas.length / registrosPorPagina);
  const solicitudesPagina = solicitudesFiltradas.slice(
    (pagina - 1) * registrosPorPagina,
    pagina * registrosPorPagina
  );

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
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 via-blue-50 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-7xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 flex flex-col items-center">
        <div className="w-full flex justify-start mb-4">
          <button
            onClick={() => router.push('/dashboard/taller')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md text-sm font-semibold shadow hover:bg-gray-300 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition"
          >
            ← Volver
          </button>
        </div>
        <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-300 mb-2 text-center drop-shadow">
          Asignar Equipos a Solicitud
        </h1>
        <div className="w-20 h-1 bg-blue-600 rounded-full mb-8 mx-auto" />
        {/* Filtros debajo del título y arriba de la tabla */}
        <div className="w-full flex flex-wrap gap-4 mb-6 items-end justify-center">
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-200">Unidad de Negocio</label>
            <select
              value={filtroUnidad}
              onChange={e => setFiltroUnidad(e.target.value)}
              className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            >
              <option value="">Todas</option>
              {Array.from(new Set(solicitudes.map(s => s.unidad_de_negocio).filter(Boolean))).map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-200">Mes</label>
            <input
              type="month"
              value={filtroMes}
              onChange={e => setFiltroMes(e.target.value)}
              className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-200">¿Asignado?</label>
            <select
              value={filtroAsignado}
              onChange={e => setFiltroAsignado(e.target.value)}
              className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            >
              <option value="todos">Todos</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <th className="px-2 py-2 text-center">Unidad de Negocio</th>
                <th className="px-2 py-2 text-center">Tipo</th>
                <th className="px-2 py-2 text-center">Capacidad</th>
                <th className="px-2 py-2 text-center">Fecha desde</th>
                <th className="px-2 py-2 text-center">Fecha hasta</th>
                <th className="px-2 py-2 text-center">Observaciones</th>
                <th className="px-2 py-2 text-center">Equipo asignado</th>
                <th className="px-2 py-2 text-center">Acción</th>
                <th className="px-2 py-2 text-center">Editado por taller</th>
                <th className="px-2 py-2 text-center">Fecha de fin - ultima asignación</th>
                <th className="px-2 py-2 text-center">Reiniciar Ediciones Taller</th>
                <th className="px-2 py-2 text-center">Eliminar</th>
              </tr>
            </thead>
            <tbody>
              {solicitudesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No hay solicitudes para mostrar.
                  </td>
                </tr>
              ) : (
                solicitudesPagina.map(s => (
                  <tr key={s.id} className="border-b last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-900">
                    <td className="px-2 py-1 text-center">{s.unidad_de_negocio || '-'}</td>
                    <td className="px-2 py-1 text-center">{s.tipo}</td>
                    <td className="px-2 py-1 text-center">{s.capacidad}</td>
                    <td className="px-2 py-1 text-center">{formatearFechaArg(s.fecha_desde)}</td>
                    <td className="px-2 py-1 text-center">{formatearFechaArg(s.fecha_hasta)}</td>
                    <td className="px-2 py-1 text-center">{s.observaciones || '-'}</td>
                    <td className="px-2 py-1 text-center">
                      {s.equipo_asignado ? (
                        <span className="text-green-700 dark:text-green-400 font-semibold text-xs">
                          {s.equipo_asignado}
                        </span>
                      ) : (
                        <span className="text-yellow-700 dark:text-yellow-400 font-semibold text-xs">
                          Sin asignar
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => handleAsignarEquipo(s)}
                        disabled={asignandoId === s.id}
                        className={`px-3 py-1 rounded font-semibold shadow transition text-xs
                          ${asignandoId === s.id
                            ? 'bg-gray-400 text-white'
                            : 'bg-gray-700 dark:bg-gray-600 text-white hover:bg-gray-800 dark:hover:bg-gray-500'
                          }`}
                      >
                        {asignandoId === s.id
                          ? 'Buscando...'
                          : s.equipo_asignado
                            ? 'Editar asignación'
                            : 'Asignar equipo'}
                      </button>
                    </td>
                    <td className="px-2 py-1 text-center">
                      {s.editadoportaller
                        ? <span className="text-blue-700 dark:text-blue-300 font-semibold text-xs">Sí</span>
                        : <span className="text-gray-400 dark:text-gray-500 text-xs">No</span>
                      }
                    </td>
                    <td className="px-2 py-1 text-center">
                      {s.fechadesdeeditada
                        ? formatearFechaArg(s.fechadesdeeditada)
                        : <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                      }
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => {
                          setReiniciarId(s.id);
                          setShowReiniciarModal(true);
                        }}
                        className="px-3 py-1 bg-gray-500 text-white rounded font-semibold shadow hover:bg-gray-600 transition text-xs"
                      >
                        Reiniciar
                      </button>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => {
                          if (s.equipo_asignado) {
                            setMensaje('Primero quite la asignación del equipo antes de eliminar la solicitud.');
                            return;
                          }
                          setSolicitudAEliminar(s);
                          setShowEliminarSolicitudModal(true);
                        }}
                        className="px-3 py-1 bg-red-600 text-white rounded font-semibold shadow hover:bg-red-700 transition text-xs"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Paginación de resultados */}
        {totalPaginas > 1 && (
          <div className="flex flex-wrap justify-center items-center gap-2 mt-4">
            <button
              onClick={() => setPagina(1)}
              disabled={pagina === 1}
              className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
            >
              ⏮
            </button>
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
            >
              Anterior
            </button>
            {/* Números de página */}
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => (
              <button
                key={num}
                onClick={() => setPagina(num)}
                className={`px-3 py-1 rounded font-semibold border ${
                  pagina === num
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-blue-200 dark:hover:bg-blue-900'
                }`}
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
            >
              Siguiente
            </button>
            <button
              onClick={() => setPagina(totalPaginas)}
              disabled={pagina === totalPaginas}
              className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
            >
              ⏭
            </button>
            <span className="ml-4 text-sm text-gray-700 dark:text-gray-200">
              Página {pagina} de {totalPaginas}
            </span>
          </div>
        )}
        {/* Modal eliminar solicitud */}
        {showEliminarSolicitudModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 w-full max-w-md flex flex-col items-center border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100 text-center">
                ¿Está seguro que desea eliminar esta solicitud?
              </h2>
              <p className="mb-4 text-gray-700 dark:text-gray-200 text-center">
                Unidad de negocio: <span className="font-semibold">{solicitudAEliminar?.unidad_de_negocio}</span><br />
                Tipo: <span className="font-semibold">{solicitudAEliminar?.tipo}</span><br />
                Desde: <span className="font-semibold">{formatearFechaArg(solicitudAEliminar?.fecha_desde)}</span><br />
                Hasta: <span className="font-semibold">{formatearFechaArg(solicitudAEliminar?.fecha_hasta)}</span>
              </p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setShowEliminarSolicitudModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await supabase
                      .from('solicitudes_equipos')
                      .delete()
                      .eq('id', solicitudAEliminar.id);
                    setShowEliminarSolicitudModal(false);
                    setSolicitudAEliminar(null);
                    setMensaje('Solicitud eliminada correctamente.');
                    fetchSolicitudes();
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showEquiposModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 w-full max-w-4xl flex flex-col items-center border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100 text-center">
              Selecciona un equipo disponible
            </h2>
            {equiposDisponibles.length === 0 ? (
              <p className="text-red-600 dark:text-red-400 text-center mb-4">
                No hay equipos disponibles para este tipo.
              </p>
            ) : (
              <div className="overflow-x-auto w-full mb-4">
                {(() => {
                  const filasPorPaginaEquipos = 5;
                  const totalPaginasEquipos = Math.ceil(equiposDisponibles.length / filasPorPaginaEquipos);
                  const equiposPagina = equiposDisponibles.slice(
                    (paginaEquipos - 1) * filasPorPaginaEquipos,
                    paginaEquipos * filasPorPaginaEquipos
                  );
                  return (
                    <>
                      <table className="min-w-[800px] w-full text-sm text-left">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                            <th className="px-2 py-2">Código</th>
                            <th className="px-2 py-2">Capacidad</th>
                            <th className="px-2 py-2">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {equiposPagina.map(eq => (
                            <tr key={eq.codigo} className="border-b last:border-b-0 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-2 py-1 font-semibold text-gray-700 dark:text-gray-100">{eq.codigo}</td>
                              <td className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300">
                                {eq.capacidad_informada || '-'}
                              </td>
                              <td className="px-2 py-1">
                                <button
                                  onClick={() => asignarEquipoAlaSolicitud(eq.codigo)}
                                  className="px-3 py-1 bg-gray-700 dark:bg-gray-600 text-white rounded font-semibold shadow hover:bg-gray-800 dark:hover:bg-gray-500 transition text-xs"
                                >
                                  Asignar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {totalPaginasEquipos > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-2">
                          <button
                            onClick={() => setPaginaEquipos(1)}
                            disabled={paginaEquipos === 1}
                            className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
                          >
                            ⏮
                          </button>
                          <button
                            onClick={() => setPaginaEquipos(p => Math.max(1, p - 1))}
                            disabled={paginaEquipos === 1}
                            className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
                          >
                            Anterior
                          </button>
                          <span className="text-xs text-gray-700 dark:text-gray-200">
                            Página {paginaEquipos} de {totalPaginasEquipos}
                          </span>
                          <button
                            onClick={() => setPaginaEquipos(p => Math.min(totalPaginasEquipos, p + 1))}
                            disabled={paginaEquipos === totalPaginasEquipos}
                            className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
                          >
                            Siguiente
                          </button>
                          <button
                            onClick={() => setPaginaEquipos(totalPaginasEquipos)}
                            disabled={paginaEquipos === totalPaginasEquipos}
                            className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
                          >
                            ⏭
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            <div className="w-full mt-4">
              <h3 className="text-base font-semibold mb-2 text-gray-700 dark:text-gray-200">
                Equipos actualmente asignados en este rango
              </h3>
              {(() => {
                const desdeValidar = solicitudSeleccionada?.editadoportaller && solicitudSeleccionada?.fechadesdeeditada
                  ? solicitudSeleccionada.fechadesdeeditada
                  : solicitudSeleccionada?.fecha_desde;
                const hastaValidar = solicitudSeleccionada?.fecha_hasta;

                function fechasSeSolapan(desdeA, hastaA, desdeB, hastaB) {
                  return (
                    new Date(desdeA) <= new Date(hastaB) &&
                    new Date(desdeB) <= new Date(hastaA)
                  );
                }

                // Antes del return, crea un mapa de código de equipo a tipo:
                const equipoTipoMap = {};
                (equipos || []).forEach(eq => {
                  equipoTipoMap[eq.codigo] = eq.tipo_de_equipos;
                });

                // ...en el render del modal, reemplaza el filtro de solapadas por esto:
                const solapadas = asignaciones
                  ?.filter(asig =>
                    asig &&
                    asig.asignado_desde &&
                    asig.asignado_hasta &&
                    asig.equipo &&
                    equipoTipoMap[asig.equipo] === solicitudSeleccionada?.tipo && // <-- ahora sí compara bien
                    fechasSeSolapan(
                      asig.asignado_desde,
                      asig.asignado_hasta,
                      desdeValidar,
                      hastaValidar
                    )
                  ) || [];

                const filasPorPaginaModal = 5;
                const totalPaginasModal = Math.ceil(solapadas.length / filasPorPaginaModal);
                const solapadasPagina = solapadas.slice(
                  (paginaModal - 1) * filasPorPaginaModal,
                  paginaModal * filasPorPaginaModal
                );

                if (!solapadas || solapadas.length === 0) {
                  return (
                    <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
                      No hay equipos asignados en este rango.
                    </p>
                  );
                }

                return (
                  <div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                          <th className="px-2 py-1 text-center">Código de equipo</th>
                          <th className="px-2 py-1 text-center">Unidad de negocio</th>
                          <th className="px-2 py-1 text-center">Desde</th>
                          <th className="px-2 py-1 text-center">Hasta</th>
                          <th className="px-2 py-1 text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {solapadasPagina.map((asig, idx) => (
                          <tr key={asig.equipo + '-' + asig.unidad_de_negocio + '-' + idx} className="border-b last:border-b-0">
                            <td className="px-2 py-1 text-center">{asig.equipo}</td>
                            <td className="px-2 py-1 text-center">{asig.unidad_de_negocio}</td>
                            <td className="px-2 py-1 text-center">{formatearFechaArg(asig.asignado_desde)}</td>
                            <td className="px-2 py-1 text-center">{formatearFechaArg(asig.asignado_hasta)}</td>
                            <td className="px-2 py-1 text-center">
                              <button
                                onClick={() => {
                                  setAsignacionAEliminar(asig);
                                  setShowEliminarAsignacionModal(true);
                                }}
                                className="px-3 py-1 bg-gray-500 text-white rounded font-semibold shadow hover:bg-gray-600 transition text-xs"
                              >
                                Quitar asignación
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {totalPaginasModal > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-2">
                        <button
                          onClick={() => setPaginaModal(1)}
                          disabled={paginaModal === 1}
                          className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
                        >
                          ⏮
                        </button>
                        <button
                          onClick={() => setPaginaModal(p => Math.max(1, p - 1))}
                          disabled={paginaModal === 1}
                          className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
                        >
                          Anterior
                        </button>
                        <span className="text-xs text-gray-700 dark:text-gray-200">
                          Página {paginaModal} de {totalPaginasModal}
                        </span>
                        <button
                          onClick={() => setPaginaModal(p => Math.min(totalPaginasModal, p + 1))}
                          disabled={paginaModal === totalPaginasModal}
                          className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
                        >
                          Siguiente
                        </button>
                        <button
                          onClick={() => setPaginaModal(totalPaginasModal)}
                          disabled={paginaModal === totalPaginasModal}
                          className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
                        >
                          ⏭
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {solicitudSeleccionada?.equipo_asignado && (
              <button
                onClick={() => {
                  setQuitandoAsignacion(true);
                  setShowEquiposModal(false);
                  setShowFechaHastaModal(true);
                  setNuevoEquipo(null);
                }}
                className="mb-2 mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition border border-gray-300 dark:border-gray-600"
              >
                Quitar asignación
              </button>
            )}
            <button
              onClick={() => setShowEquiposModal(false)}
              className="mt-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showFechaHastaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 w-full max-w-lg flex flex-col items-center border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100 text-center">
              ¿Hasta cuándo trabajó este equipo?
            </h2>
            <p className="mb-2 text-gray-700 dark:text-gray-200 text-center">
              Selecciona la fecha hasta la cual el equipo <span className="font-semibold">{solicitudSeleccionada?.equipo_asignado}</span> estuvo asignado.
            </p>
            <input
              ref={fechaHastaRef}
              type="date"
              className="mb-4 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded w-full text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-800"
              min={solicitudSeleccionada?.fecha_desde}
              max={solicitudSeleccionada?.fecha_hasta}
              defaultValue={solicitudSeleccionada?.fecha_hasta}
            />
            <div className="flex gap-2 w-full">
              <button
                onClick={async () => {
                  const fechaHasta = fechaHastaRef.current.value;
                  if (!fechaHasta || !/^\d{4}-\d{2}-\d{2}$/.test(fechaHasta)) {
                    setMensaje('Por favor, selecciona una fecha válida.');
                    return;
                  }

                  if (quitandoAsignacion) {
                    let updateFields = {
                      equipo_asignado: null,
                      editadoportaller: true,
                      fechadesdeeditada: fechaHasta,
                    };

                    await supabase
                      .from('asignaciones_por_unidad_de_negocio')
                      .update({ asignado_hasta: fechaHasta })
                      .eq('equipo', solicitudSeleccionada.equipo_asignado)
                      .eq('asignado_desde', solicitudSeleccionada.fecha_desde);

                    await supabase
                      .from('solicitudes_equipos')
                      .update(updateFields)
                      .eq('id', solicitudSeleccionada.id);

                    setShowFechaHastaModal(false);
                    setQuitandoAsignacion(false);
                    setMensaje('Asignación eliminada correctamente.');
                    fetchSolicitudes();
                    return;
                  }

                  await supabase
                    .from('asignaciones_por_unidad_de_negocio')
                    .update({ asignado_hasta: fechaHasta })
                    .eq('equipo', solicitudSeleccionada.equipo_asignado)
                    .eq('asignado_desde', solicitudSeleccionada.fecha_desde);

                  await supabase
                    .from('asignaciones_por_unidad_de_negocio')
                    .insert([{
                      equipo: nuevoEquipo,
                      asignado_desde: fechaHasta,
                      asignado_hasta: solicitudSeleccionada.fecha_hasta,
                      fecha_de_asignacion: new Date().toISOString(),
                      unidad_de_negocio: solicitudSeleccionada.unidad_de_negocio,
                    }]);

                  const { error } = await supabase
                    .from('solicitudes_equipos')
                    .update({
                      equipo_asignado: nuevoEquipo,
                      fecha_asignacion: new Date().toISOString(),
                    })
                    .eq('id', solicitudSeleccionada.id);

                  setShowFechaHastaModal(false);
                  setNuevoEquipo(null);

                  if (!error) {
                    setMensaje('Equipo reasignado correctamente.');
                    setShowEquiposModal(false);
                    fetchSolicitudes();
                  } else {
                    setMensaje('Error al reasignar equipo.');
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-700 dark:bg-blue-600 text-white rounded font-semibold hover:bg-blue-800 dark:hover:bg-blue-700 transition"
              >
                Confirmar
              </button>
              <button
                onClick={() => {
                  setShowFechaHastaModal(false);
                  setNuevoEquipo(null);
                  setQuitandoAsignacion(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const desdeAsignacion =
                    solicitudSeleccionada.editadoportaller && solicitudSeleccionada.fechadesdeeditada
                      ? solicitudSeleccionada.fechadesdeeditada
                      : solicitudSeleccionada.fecha_desde;

                  await supabase
                    .from('asignaciones_por_unidad_de_negocio')
                    .delete()
                    .eq('equipo', solicitudSeleccionada.equipo_asignado)
                    .eq('asignado_desde', desdeAsignacion);

                  await supabase
                    .from('solicitudes_equipos')
                    .update({ equipo_asignado: null })
                    .eq('id', solicitudSeleccionada.id);

                  setShowFechaHastaModal(false);
                  setQuitandoAsignacion(false);
                  setMensaje('Asignación eliminada correctamente.');
                  fetchSolicitudes();
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition"
              >
                El equipo no trabajó
              </button>
            </div>
          </div>
        </div>
      )}

      {showReiniciarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 w-full max-w-md flex flex-col items-center border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100 text-center">
              ¿Está seguro que desea reiniciar la solicitud?
            </h2>
            <p className="mb-4 text-gray-700 dark:text-gray-200 text-center">
              Esta acción quitará el estado de edición por taller y la fecha editada.
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setShowReiniciarModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => reiniciarSolicitud(reiniciarId)}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded font-semibold hover:bg-gray-600 transition"
              >
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}

      {showEliminarAsignacionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 w-full max-w-md flex flex-col items-center border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100 text-center">
              ¿Está seguro que desea quitar esta asignación?
            </h2>
            <p className="mb-4 text-gray-700 dark:text-gray-200 text-center">
              Equipo: <span className="font-semibold">{asignacionAEliminar?.equipo}</span><br />
              Unidad de negocio: <span className="font-semibold">{asignacionAEliminar?.unidad_de_negocio}</span><br />
              Desde: <span className="font-semibold">{formatearFechaArg(asignacionAEliminar?.asignado_desde)}</span><br />
              Hasta: <span className="font-semibold">{formatearFechaArg(asignacionAEliminar?.asignado_hasta)}</span>
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setShowEliminarAsignacionModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await supabase
                    .from('asignaciones_por_unidad_de_negocio')
                    .delete()
                    .eq('equipo', asignacionAEliminar.equipo)
                    .eq('asignado_desde', asignacionAEliminar.asignado_desde);

                  // Si hay una solicitud relacionada, actualiza equipo_asignado a null
                  await supabase
                    .from('solicitudes_equipos')
                    .update({ equipo_asignado: null })
                    .eq('equipo_asignado', asignacionAEliminar.equipo)
                    .eq('fecha_desde', asignacionAEliminar.asignado_desde);

                  setShowEliminarAsignacionModal(false);
                  setAsignacionAEliminar(null);
                  setMensaje('Asignación eliminada correctamente.');
                  fetchAsignaciones();
                  fetchSolicitudes();
                }}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded font-semibold hover:bg-gray-600 transition"
              >
                Quitar asignación
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
