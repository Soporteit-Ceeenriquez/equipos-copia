"use client";
import { supabase } from "@/utils/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function formatFecha(fecha) {
  if (!fecha) return "-";
  // Si es yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
  }
  // Si es dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
    return fecha;
  }
  // Si es Date o ISO
  const d = new Date(fecha);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

export default function GestionAsignaciones() {
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [asignaciones, setAsignaciones] = useState([]);
  const [unidadFiltro, setUnidadFiltro] = useState("");
  const [codigoFiltro, setCodigoFiltro] = useState("");
  const [unidadesNegocio, setUnidadesNegocio] = useState([]);
  const [codigosEquipo, setCodigosEquipo] = useState([]);
  const [solicitudesMap, setSolicitudesMap] = useState({});
  const [pagina, setPagina] = useState(1);
  const filasPorPagina = 8;
  const [filtroMes, setFiltroMes] = useState("");
  const router = useRouter();

  // NUEVO: Estados para modal y asignación a eliminar
  const [mostrarModal, setMostrarModal] = useState(false);
  const [asignacionAEliminar, setAsignacionAEliminar] = useState(null);

  useEffect(() => {
    const validar = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        router.replace("/login");
        return;
      }
      const res = await fetch("/api/validate-taller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!(data.isTaller || data.isAdmin)) {
        router.replace("/dashboard");
        return;
      }
      setCheckingAccess(false);
    };
    validar();
  }, [router]);

  useEffect(() => {
    if (!checkingAccess) fetchAsignaciones();
    // eslint-disable-next-line
  }, [checkingAccess, unidadFiltro, codigoFiltro]);

  useEffect(() => {
    setPagina(1);
  }, [unidadFiltro, codigoFiltro, filtroMes]);

  async function fetchAsignaciones() {
    // 1. Traer asignaciones
    let query = supabase
      .from("asignaciones")
      .select(`
        codigo_equipo,
        id_solicitud,
        fecha_inicio_asignacion,
        fecha_fin_asignacion,
        es_reemplazo,
        motivo_reemplazo,
        fecha_asignacion
      `);

    if (codigoFiltro) {
      query = query.eq("codigo_equipo", codigoFiltro);
    }

    const { data: asignacionesData, error } = await query;
    if (error) return;

    // 2. Traer solicitudes relacionadas
    const ids = [...new Set((asignacionesData || []).map(a => a.id_solicitud).filter(Boolean))];
    let solicitudesMap = {};
    let unidades = [];
    if (ids.length > 0) {
      const { data: solicitudes } = await supabase
        .from("solicitudes_equipos")
        .select("id_solicitud, unidad_de_negocio")
        .in("id_solicitud", ids);

      solicitudesMap = {};
      if (solicitudes) {
        solicitudes.forEach(s => {
          solicitudesMap[s.id_solicitud] = s.unidad_de_negocio;
        });
        unidades = [...new Set(solicitudes.map(s => s.unidad_de_negocio).filter(Boolean))];
      }
    }

    // 3. Filtrar por unidad de negocio si corresponde
    let filtradas = asignacionesData;
    if (unidadFiltro) {
      filtradas = filtradas.filter(a => solicitudesMap[a.id_solicitud] === unidadFiltro);
    }

    setAsignaciones(filtradas || []);
    setSolicitudesMap(solicitudesMap);
    setUnidadesNegocio(unidades);

    // Codigos de equipo únicos, filtrados por unidad de negocio seleccionada
    let asignacionesParaCodigos = asignacionesData;
    if (unidadFiltro) {
      asignacionesParaCodigos = asignacionesData.filter(a => solicitudesMap[a.id_solicitud] === unidadFiltro);
    }
    const codigos = [
      ...new Set(
        (asignacionesParaCodigos || [])
          .map((a) => a.codigo_equipo)
          .filter(Boolean)
      ),
    ];
    setCodigosEquipo(codigos);
  }

  // Eliminar asignación con confirmación
  async function eliminarAsignacion(asignacion) {
    if (!asignacion) return;
    await supabase
      .from("asignaciones")
      .delete()
      .match({
        codigo_equipo: asignacion.codigo_equipo,
        id_solicitud: asignacion.id_solicitud,
        fecha_asignacion: asignacion.fecha_asignacion,
      });
    setMostrarModal(false);
    setAsignacionAEliminar(null);
    fetchAsignaciones();
  }

  function cerrarSesion() {
    supabase.auth.signOut();
    router.replace("/login");
  }

  if (checkingAccess) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-200">
          Verificando acceso...
        </p>
      </main>
    );
  }

  // Filtrado por mes (igual que en solicitarEquipos)
  const asignacionesFiltradas = asignaciones.filter(a => {
    if (!filtroMes) return true;
    if (!a.fecha_inicio_asignacion || !a.fecha_fin_asignacion) return false;
    const desde = new Date(a.fecha_inicio_asignacion);
    const hasta = new Date(a.fecha_fin_asignacion);
    const [anio, mes] = filtroMes.split('-');
    const primerDiaMes = new Date(Number(anio), Number(mes) - 1, 1);
    const ultimoDiaMes = new Date(Number(anio), Number(mes), 0);
    return hasta >= primerDiaMes && desde <= ultimoDiaMes;
  });

  // Datos paginados
  const asignacionesPaginadas = asignacionesFiltradas.slice(
    (pagina - 1) * filasPorPagina,
    pagina * filasPorPagina
  );
  const totalPaginas = Math.max(1, Math.ceil(asignacionesFiltradas.length / filasPorPagina));

  return (
    <main className="min-h-screen flex flex-col items-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="w-full max-w-6xl flex justify-between items-center mb-4">
        <button
          className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-semibold shadow hover:bg-gray-400 dark:hover:bg-gray-600 transition"
          onClick={() => router.push("/dashboard/taller")}
        >
          ← Volver
        </button>
        <button
          className="px-4 py-2 bg-red-600 text-white rounded font-semibold shadow hover:bg-red-700 transition"
          onClick={cerrarSesion}
        >
          Cerrar sesión
        </button>
      </div>
      <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-6">
        Asignaciones de Equipos
      </h1>
      <div className="w-full max-w-6xl mb-4 flex items-center gap-4">
        <label className="font-semibold">Filtrar por unidad de negocio:</label>
        <select
          className="p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          value={unidadFiltro}
          onChange={(e) => setUnidadFiltro(e.target.value)}
        >
          <option value="">Todas</option>
          {unidadesNegocio.map((un) => (
            <option key={un} value={un}>
              {un}
            </option>
          ))}
        </select>
      </div>
      <div className="w-full max-w-6xl mb-4 flex items-center gap-4">
        <label className="font-semibold">Filtrar por código de equipo:</label>
        <select
          className="p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          value={codigoFiltro}
          onChange={(e) => setCodigoFiltro(e.target.value)}
        >
          <option value="">Todos</option>
          {codigosEquipo.map((codigo) => (
            <option key={codigo} value={codigo}>
              {codigo}
            </option>
          ))}
        </select>
        {/* FILTRO POR MES */}
        <label className="font-semibold ml-4">Filtrar por mes:</label>
        <input
          type="month"
          value={filtroMes}
          onChange={e => setFiltroMes(e.target.value)}
          className="p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          placeholder="Filtrar por mes"
        />
      </div>
      <div className="w-full max-w-7xl overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-blue-100 dark:bg-blue-900/30 text-center">
              <th className="px-4 py-2 text-center">ID Solicitud</th>
              <th className="px-4 py-2 text-center">Código Equipo</th>
              <th className="px-4 py-2 text-center">Unidad de Negocio</th>
              <th className="px-4 py-2 text-center">Fecha Inicio</th>
              <th className="px-4 py-2 text-center">Fecha Fin</th>
              <th className="px-4 py-2 text-center">Es Reemplazo</th>
              <th className="px-4 py-2 text-center">Motivo Reemplazo</th>
              <th className="px-4 py-2 text-center">Fecha Asignación</th>
              <th className="px-4 py-2 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {asignacionesPaginadas.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-4 text-gray-500">
                  No hay asignaciones para mostrar.
                </td>
              </tr>
            )}
            {asignacionesPaginadas.map((a, idx) => (
              <tr key={idx} className="border-b last:border-b-0 text-center">
                <td className="px-4 py-2">{a.id_solicitud}</td>
                <td className="px-4 py-2">{a.codigo_equipo}</td>
                <td className="px-4 py-2">{solicitudesMap[a.id_solicitud] || "-"}</td>
                <td className="px-4 py-2">{formatFecha(a.fecha_inicio_asignacion)}</td>
                <td className="px-4 py-2">{formatFecha(a.fecha_fin_asignacion)}</td>
                <td className="px-4 py-2">{a.es_reemplazo ? "Sí" : "No"}</td>
                <td className="px-4 py-2">{a.motivo_reemplazo || "-"}</td>
                <td className="px-4 py-2">{formatFecha(a.fecha_asignacion)}</td>
                <td className="px-4 py-2">
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded"
                    onClick={() => {
                      setAsignacionAEliminar(a);
                      setMostrarModal(true);
                    }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Paginación */}
        <div className="flex justify-center items-center gap-4 mt-4">
          <button
            className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
          >
            Anterior
          </button>
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            Página {pagina} de {totalPaginas}
          </span>
          <button
            className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-sm w-full">
            <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100">
              ¿Eliminar asignación?
            </h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              ¿Estás seguro de que deseas eliminar esta asignación?
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-700"
                onClick={() => setMostrarModal(false)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={() => eliminarAsignacion(asignacionAEliminar)}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
