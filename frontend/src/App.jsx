import React, { useEffect, useState } from 'react'
import {
  Check,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  KeyRound,
  Laptop,
  LoaderCircle,
  LogOut,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

const API_URL = 'http://127.0.0.1:8000/api/incidencias/'
const AUTH_URL = 'http://127.0.0.1:8000/api/auth/'
const FORMULARIO_VACIO = {
  titulo: '',
  descripcion: '',
  categoria: 'hardware',
  prioridad: 'media',
  estado: 'pendiente',
  responsable: '',
  ubicacion: '',
  fecha_limite: '',
}

const ESTADOS = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
}

const CATEGORIAS = {
  hardware: 'Hardware',
  software: 'Software',
  red: 'Red / Internet',
}

async function obtenerMensajeError(respuesta) {
  try {
    const datos = await respuesta.json()
    if (datos.detail) return datos.detail
    return Object.values(datos).flat().join(' ')
  } catch {
    return 'No se pudo completar la solicitud.'
  }
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('labdesk_token') || '')
  const [usuario, setUsuario] = useState(() => localStorage.getItem('labdesk_user') || '')
  const [credenciales, setCredenciales] = useState({ username: '', password: '' })
  const [entrando, setEntrando] = useState(false)
  const [errorAcceso, setErrorAcceso] = useState('')
  const [incidencias, setIncidencias] = useState([])
  const [recarga, setRecarga] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState('todas')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [incidenciaComentarios, setIncidenciaComentarios] = useState(null)
  const [comentarios, setComentarios] = useState([])
  const [comentarioNuevo, setComentarioNuevo] = useState('')
  const [errorComentarios, setErrorComentarios] = useState('')
  const [cargandoComentarios, setCargandoComentarios] = useState(false)
  const [guardandoComentario, setGuardandoComentario] = useState(false)

  useEffect(() => {
    if (!token) {
      setCargando(false)
      return undefined
    }

    let activa = true

    async function cargarIncidencias() {
      setCargando(true)
      setError('')
      try {
        const respuesta = await fetch(API_URL, {
          headers: { Authorization: `Token ${token}` },
        })
        if (respuesta.status === 401) {
          localStorage.removeItem('labdesk_token')
          localStorage.removeItem('labdesk_user')
          if (activa) {
            setToken('')
            setUsuario('')
          }
          return
        }
        if (!respuesta.ok) throw new Error(await obtenerMensajeError(respuesta))
        const datos = await respuesta.json()
        if (activa) setIncidencias(datos)
      } catch {
        if (activa) setError('No se pudo conectar con Django. Comprueba que el servidor esté activo en el puerto 8000.')
      } finally {
        if (activa) setCargando(false)
      }
    }

    cargarIncidencias()
    return () => { activa = false }
  }, [recarga, token])

  const incidenciasFiltradas = incidencias.filter((incidencia) => {
    const termino = busqueda.trim().toLocaleLowerCase('es')
    const coincideTexto = !termino || `${incidencia.titulo} ${incidencia.descripcion}`.toLocaleLowerCase('es').includes(termino)
    const coincideEstado = filtroEstado === 'todos' || incidencia.estado === filtroEstado
    const coincidePrioridad = filtroPrioridad === 'todas' || incidencia.prioridad === filtroPrioridad
    const coincideCategoria = filtroCategoria === 'todas' || incidencia.categoria === filtroCategoria
    return coincideTexto && coincideEstado && coincidePrioridad && coincideCategoria
  })

  const contadores = {
    total: incidencias.length,
    pendiente: incidencias.filter((item) => item.estado === 'pendiente').length,
    proceso: incidencias.filter((item) => item.estado === 'en_proceso').length,
    resuelto: incidencias.filter((item) => item.estado === 'resuelto').length,
    vencidas: incidencias.filter((item) => item.vencida).length,
    proximas: incidencias.filter((item) => item.proxima_a_vencer).length,
  }
  const porcentajeResolucion = contadores.total
    ? Math.round((contadores.resuelto / contadores.total) * 100)
    : 0
  const distribucionPrioridad = {
    alta: incidencias.filter((item) => item.prioridad === 'alta').length,
    media: incidencias.filter((item) => item.prioridad === 'media').length,
    baja: incidencias.filter((item) => item.prioridad === 'baja').length,
  }
  const alertasVencimiento = incidencias.filter((item) => item.vencida || item.proxima_a_vencer)

  async function iniciarSesion(evento) {
    evento.preventDefault()
    setEntrando(true)
    setErrorAcceso('')
    try {
      const respuesta = await fetch(`${AUTH_URL}token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credenciales),
      })
      if (!respuesta.ok) throw new Error('Usuario o contraseña incorrectos.')
      const datos = await respuesta.json()
      localStorage.setItem('labdesk_token', datos.token)
      localStorage.setItem('labdesk_user', credenciales.username)
      setUsuario(credenciales.username)
      setToken(datos.token)
      setCredenciales({ username: '', password: '' })
    } catch (loginError) {
      setErrorAcceso(loginError.message || 'No se pudo iniciar sesión. Comprueba que Django esté activo.')
    } finally {
      setEntrando(false)
    }
  }

  async function cerrarSesion() {
    try {
      await fetch(`${AUTH_URL}logout/`, {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
      })
    } catch {
      setErrorAcceso('La sesión se cerró en este navegador, pero Django no respondió para revocar el token.')
    } finally {
      localStorage.removeItem('labdesk_token')
      localStorage.removeItem('labdesk_user')
      setToken('')
      setUsuario('')
      setIncidencias([])
    }
  }

  function abrirNueva() {
    setEditando(null)
    setFormulario(FORMULARIO_VACIO)
    setModalAbierto(true)
  }

  function abrirEdicion(incidencia) {
    setEditando(incidencia.id)
    setFormulario({
      titulo: incidencia.titulo,
      descripcion: incidencia.descripcion,
      categoria: incidencia.categoria,
      prioridad: incidencia.prioridad,
      estado: incidencia.estado,
      responsable: incidencia.responsable || '',
      ubicacion: incidencia.ubicacion || '',
      fecha_limite: incidencia.fecha_limite || '',
    })
    setModalAbierto(true)
  }

  async function guardarIncidencia(evento) {
    evento.preventDefault()
    setGuardando(true)
    setError('')
    try {
      const url = editando ? `${API_URL}${editando}/` : API_URL
      const respuesta = await fetch(url, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ ...formulario, fecha_limite: formulario.fecha_limite || null }),
      })
      if (!respuesta.ok) throw new Error(await obtenerMensajeError(respuesta))
      setModalAbierto(false)
      setRecarga((valor) => valor + 1)
    } catch (solicitudError) {
      setError(solicitudError.message || 'No se pudo guardar la incidencia.')
    } finally {
      setGuardando(false)
    }
  }

  async function cambiarEstado(incidencia, estado) {
    setError('')
    try {
      const respuesta = await fetch(`${API_URL}${incidencia.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ estado }),
      })
      if (!respuesta.ok) throw new Error(await obtenerMensajeError(respuesta))
      setRecarga((valor) => valor + 1)
    } catch (solicitudError) {
      setError(solicitudError.message || 'No se pudo actualizar el estado.')
    }
  }

  async function eliminarIncidencia(incidencia) {
    if (!window.confirm(`¿Eliminar la incidencia «${incidencia.titulo}»?`)) return
    setError('')
    try {
      const respuesta = await fetch(`${API_URL}${incidencia.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Token ${token}` },
      })
      if (!respuesta.ok) throw new Error(await obtenerMensajeError(respuesta))
      setRecarga((valor) => valor + 1)
    } catch (solicitudError) {
      setError(solicitudError.message || 'No se pudo eliminar la incidencia.')
    }
  }

  async function abrirComentarios(incidencia) {
    setIncidenciaComentarios(incidencia)
    setComentarios([])
    setComentarioNuevo('')
    setErrorComentarios('')
    setCargandoComentarios(true)
    try {
      const respuesta = await fetch(`${API_URL}${incidencia.id}/comentarios/`, {
        headers: { Authorization: `Token ${token}` },
      })
      if (!respuesta.ok) throw new Error(await obtenerMensajeError(respuesta))
      setComentarios(await respuesta.json())
    } catch (solicitudError) {
      setErrorComentarios(solicitudError.message || 'No se pudieron cargar los comentarios.')
    } finally {
      setCargandoComentarios(false)
    }
  }

  async function guardarComentario(evento) {
    evento.preventDefault()
    const contenido = comentarioNuevo.trim()
    if (!contenido || !incidenciaComentarios) return

    setGuardandoComentario(true)
    setErrorComentarios('')
    try {
      const respuesta = await fetch(`${API_URL}${incidenciaComentarios.id}/comentarios/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ contenido }),
      })
      if (!respuesta.ok) throw new Error(await obtenerMensajeError(respuesta))
      const comentario = await respuesta.json()
      setComentarios((actuales) => [...actuales, comentario])
      setComentarioNuevo('')
    } catch (solicitudError) {
      setErrorComentarios(solicitudError.message || 'No se pudo guardar el comentario.')
    } finally {
      setGuardandoComentario(false)
    }
  }

  function cambiarCampo(evento) {
    setFormulario((actual) => ({ ...actual, [evento.target.name]: evento.target.value }))
  }

  if (!token) {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <a className="brand login-brand" href="#acceso" aria-label="LabDesk">
            <span className="brand-mark"><Laptop size={19} strokeWidth={2.2} /></span>
            <span>lab<span>desk</span></span>
          </a>
          <div className="login-title">
            <span className="login-icon"><KeyRound size={20} /></span>
            <p className="eyebrow">PORTAL DE SOPORTE</p>
            <h1>Qué bueno verte.</h1>
            <p>Inicia sesión con tu cuenta de LabDesk para continuar.</p>
          </div>
          {errorAcceso && <div className="error-banner login-error" role="alert"><CircleAlert size={17} /><span>{errorAcceso}</span></div>}
          <form className="login-form" onSubmit={iniciarSesion}>
            <label className="field-label">Usuario
              <input autoComplete="username" autoFocus required value={credenciales.username} onChange={(evento) => setCredenciales((actual) => ({ ...actual, username: evento.target.value }))} placeholder="Tu nombre de usuario" />
            </label>
            <label className="field-label">Contraseña
              <input type="password" autoComplete="current-password" required value={credenciales.password} onChange={(evento) => setCredenciales((actual) => ({ ...actual, password: evento.target.value }))} placeholder="Tu contraseña" />
            </label>
            <button type="submit" className="button button-primary login-submit" disabled={entrando}>
              {entrando ? <LoaderCircle className="spin" size={17} /> : null}
              {entrando ? 'Entrando...' : 'Iniciar sesión'}
              {!entrando && <span aria-hidden="true">→</span>}
            </button>
          </form>
          <div className="login-foot"><span className="connection-dot" /> Conexión segura con LabDesk</div>
        </section>
        <div className="login-side">
          <div className="side-grid" />
          <div className="side-content">
            <span className="side-kicker">LABDESK <i /> MESA DE AYUDA</span>
            <p>Un espacio claro para dar seguimiento a cada solicitud.</p>
            <span className="side-bottom">SOPORTE TÉCNICO <b>·</b> INCIDENTES <b>·</b> SOLUCIONES</span>
          </div>
          <span className="side-number">01 <i /> 03</span>
        </div>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="LabDesk inicio">
          <span className="brand-mark"><Laptop size={19} strokeWidth={2.2} /></span>
          <span>lab<span>desk</span></span>
        </a>
        <div className="topbar-meta">
          <span className="connection"><span className="connection-dot" /> API local</span>
          <span className="topbar-divider" />
          <span className="topbar-label">{usuario}</span>
          <button className="logout-button" onClick={cerrarSesion} title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut size={16} /><span>Salir</span></button>
        </div>
      </header>

      <main id="inicio" className="main-content">
        <section className="page-heading">
          <div>
            <p className="eyebrow">CENTRO DE SOPORTE <span>/</span> INCIDENCIAS</p>
            <h1>Incidencias</h1>
            <p className="subtitle">Seguimiento de solicitudes técnicas del equipo.</p>
          </div>
          <button className="button button-primary" onClick={abrirNueva}>
            <Plus size={17} /> Nueva incidencia
          </button>
        </section>

        <section className="stats-grid" aria-label="Resumen de incidencias">
          <article className="stat stat-total">
            <div className="stat-top"><span>Total registradas</span><ClipboardList size={17} /></div>
            <strong>{contadores.total}</strong>
            <span className="stat-foot">en el sistema</span>
          </article>
          <article className="stat stat-pending">
            <div className="stat-top"><span>Pendientes</span><CircleAlert size={17} /></div>
            <strong>{contadores.pendiente}</strong>
            <span className="stat-foot">requieren atención</span>
          </article>
          <article className="stat stat-progress">
            <div className="stat-top"><span>En proceso</span><LoaderCircle size={17} /></div>
            <strong>{contadores.proceso}</strong>
            <span className="stat-foot">en seguimiento</span>
          </article>
          <article className="stat stat-resolved">
            <div className="stat-top"><span>Resueltas</span><ShieldCheck size={17} /></div>
            <strong>{contadores.resuelto}</strong>
            <span className="stat-foot">trabajo completado</span>
          </article>
          <article className="stat stat-overdue">
            <div className="stat-top"><span>Vencidas</span><CircleAlert size={17} /></div>
            <strong>{contadores.vencidas}</strong>
            <span className="stat-foot">{contadores.proximas} próximas a vencer</span>
          </article>
          <article className="stat stat-resolution">
            <div className="stat-top"><span>Resolución</span><Check size={17} /></div>
            <strong>{porcentajeResolucion}%</strong>
            <span className="stat-foot">incidencias resueltas</span>
          </article>
          <article className="stat stat-priorities">
            <div className="stat-top"><span>Por prioridad</span><CircleAlert size={17} /></div>
            <strong>{distribucionPrioridad.alta} / {distribucionPrioridad.media} / {distribucionPrioridad.baja}</strong>
            <span className="stat-foot">alta / media / baja</span>
          </article>
        </section>

        {alertasVencimiento.length > 0 && (
          <section className="due-alerts" aria-label="Alertas de vencimiento">
            <div className="due-alerts-heading">
              <CircleAlert size={18} />
              <div><strong>Alertas de vencimiento</strong><span>{contadores.vencidas} vencidas · {contadores.proximas} próximas</span></div>
            </div>
            <div className="due-alerts-list">
              {alertasVencimiento.map((incidencia) => (
                <div className={`due-alert ${incidencia.vencida ? 'due-alert-overdue' : 'due-alert-soon'}`} key={incidencia.id}>
                  <strong>{incidencia.titulo}</strong>
                  <span>{incidencia.vencida ? 'Vencida' : 'Próxima a vencer'} · {incidencia.fecha_limite}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="work-area">
          <div className="list-heading">
            <div>
              <h2>Registro de incidencias</h2>
              <span className="result-count">{incidenciasFiltradas.length} {incidenciasFiltradas.length === 1 ? 'resultado' : 'resultados'}</span>
            </div>
            <div className="filters" aria-label="Filtros de incidencias">
              <label className="search-box">
                <Search size={16} aria-hidden="true" />
                <input value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar incidencia..." aria-label="Buscar por texto" />
                {busqueda && <button className="clear-search" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda"><X size={14} /></button>}
              </label>
              <label className="select-wrap">
                <select value={filtroEstado} onChange={(evento) => setFiltroEstado(evento.target.value)} aria-label="Filtrar por estado">
                  <option value="todos">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En proceso</option>
                  <option value="resuelto">Resuelto</option>
                </select><ChevronDown size={14} />
              </label>
              <label className="select-wrap filter-priority">
                <select value={filtroPrioridad} onChange={(evento) => setFiltroPrioridad(evento.target.value)} aria-label="Filtrar por prioridad">
                  <option value="todas">Toda prioridad</option>
                  <option value="alta">Prioridad alta</option>
                  <option value="media">Prioridad media</option>
                  <option value="baja">Prioridad baja</option>
                </select><ChevronDown size={14} />
              </label>
              <label className="select-wrap filter-category">
                <select value={filtroCategoria} onChange={(evento) => setFiltroCategoria(evento.target.value)} aria-label="Filtrar por categoría">
                  <option value="todas">Toda categoría</option>
                  <option value="hardware">Hardware</option>
                  <option value="software">Software</option>
                  <option value="red">Red</option>
                </select><ChevronDown size={14} />
              </label>
            </div>
          </div>

          {error && <div className="error-banner" role="alert"><CircleAlert size={17} /><span>{error}</span><button onClick={() => setError('')} aria-label="Cerrar error"><X size={16} /></button></div>}

          <div className="incident-table">
            <div className="table-head">
              <span>Incidencia</span><span>Categoría</span><span>Prioridad</span><span>Estado</span><span className="actions-heading">Acciones</span>
            </div>
            {cargando ? (
              <div className="empty-state"><LoaderCircle className="spin" size={22} /><p>Cargando incidencias...</p></div>
            ) : incidenciasFiltradas.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon"><ClipboardList size={22} /></span>
                <strong>{incidencias.length ? 'Sin coincidencias' : 'Aún no hay incidencias'}</strong>
                <p>{incidencias.length ? 'Prueba con otros filtros de búsqueda.' : 'Registra la primera solicitud para comenzar.'}</p>
                {!incidencias.length && <button className="button button-outline" onClick={abrirNueva}><Plus size={16} /> Crear incidencia</button>}
              </div>
            ) : incidenciasFiltradas.map((incidencia) => (
              <article className="incident-row" key={incidencia.id}>
                <div className="incident-main">
                  <span className={`category-icon category-${incidencia.categoria}`}><Laptop size={17} /></span>
                  <div className="incident-copy">
                    <strong>{incidencia.titulo}</strong>
                    <span>{incidencia.descripcion}</span>
                    <span className="incident-meta">
                      <UserRound size={12} /> {incidencia.responsable || 'Sin responsable'}
                      <MapPin size={12} /> {incidencia.ubicacion || 'Sin ubicación'}
                      {incidencia.fecha_limite && <span className={`due-badge ${incidencia.vencida ? 'due-badge-overdue' : incidencia.proxima_a_vencer ? 'due-badge-soon' : ''}`}>
                        {incidencia.fecha_limite}{incidencia.vencida ? ' · Vencida' : incidencia.proxima_a_vencer ? ' · Próxima' : ''}
                      </span>}
                    </span>
                  </div>
                </div>
                <span className="category-name">{CATEGORIAS[incidencia.categoria] || incidencia.categoria}</span>
                <span><span className={`priority priority-${incidencia.prioridad}`}><i />{incidencia.prioridad}</span></span>
                <label className="status-select-wrap">
                  <select className={`status-select status-${incidencia.estado}`} value={incidencia.estado} onChange={(evento) => cambiarEstado(incidencia, evento.target.value)} aria-label={`Estado de ${incidencia.titulo}`}>
                    {Object.entries(ESTADOS).map(([valor, etiqueta]) => <option value={valor} key={valor}>{etiqueta}</option>)}
                  </select><ChevronDown size={13} />
                </label>
                <div className="row-actions">
                  <button className="icon-button" onClick={() => abrirComentarios(incidencia)} aria-label={`Ver comentarios de ${incidencia.titulo}`} title="Comentarios"><MessageSquare size={16} /></button>
                  <button className="icon-button" onClick={() => abrirEdicion(incidencia)} aria-label={`Editar ${incidencia.titulo}`} title="Editar"><Pencil size={16} /></button>
                  <button className="icon-button icon-danger" onClick={() => eliminarIncidencia(incidencia)} aria-label={`Eliminar ${incidencia.titulo}`} title="Eliminar"><Trash2 size={16} /></button>
                </div>
              </article>
            ))}
          </div>
          <footer className="list-footer"><span><span className="footer-dot" /> Datos guardados en SQLite</span><span>LabDesk <b>·</b> API Django REST</span></footer>
        </section>
      </main>

      {modalAbierto && (
        <div className="modal-backdrop" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setModalAbierto(false) }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading">
              <div><p className="eyebrow">GESTIÓN DE SOPORTE</p><h2 id="modal-title">{editando ? 'Editar incidencia' : 'Nueva incidencia'}</h2></div>
              <button className="icon-button modal-close" onClick={() => setModalAbierto(false)} aria-label="Cerrar"><X size={19} /></button>
            </div>
            <form onSubmit={guardarIncidencia} className="incident-form">
              <label className="field-label">Título <span>*</span>
                <input name="titulo" value={formulario.titulo} onChange={cambiarCampo} maxLength={120} required placeholder="Ej. El equipo no enciende" />
              </label>
              <label className="field-label">Descripción <span>*</span>
                <textarea name="descripcion" value={formulario.descripcion} onChange={cambiarCampo} required rows={4} placeholder="Describe el problema y cuándo comenzó..." />
              </label>
              <div className="form-grid">
                <label className="field-label">Categoría
                  <span className="form-select"><select name="categoria" value={formulario.categoria} onChange={cambiarCampo}><option value="hardware">Hardware</option><option value="software">Software</option><option value="red">Red / Internet</option></select><ChevronDown size={15} /></span>
                </label>
                <label className="field-label">Prioridad
                  <span className="form-select"><select name="prioridad" value={formulario.prioridad} onChange={cambiarCampo}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select><ChevronDown size={15} /></span>
                </label>
              </div>
              <label className="field-label">Estado
                <span className="form-select"><select name="estado" value={formulario.estado} onChange={cambiarCampo}><option value="pendiente">Pendiente</option><option value="en_proceso">En proceso</option><option value="resuelto">Resuelto</option></select><ChevronDown size={15} /></span>
              </label>
              <div className="form-grid">
                <label className="field-label">Responsable
                  <input name="responsable" value={formulario.responsable} onChange={cambiarCampo} maxLength={100} placeholder="Persona asignada" />
                </label>
                <label className="field-label">Ubicación
                  <input name="ubicacion" value={formulario.ubicacion} onChange={cambiarCampo} maxLength={120} placeholder="Edificio, aula o área" />
                </label>
              </div>
              <label className="field-label">Fecha límite
                <input type="date" name="fecha_limite" value={formulario.fecha_limite} onChange={cambiarCampo} />
              </label>
              <div className="form-actions">
                <button type="button" className="button button-quiet" onClick={() => setModalAbierto(false)}>Cancelar</button>
                <button type="submit" className="button button-primary" disabled={guardando}>
                  {guardando ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                  {editando ? 'Guardar cambios' : 'Crear incidencia'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {incidenciaComentarios && (
        <div className="modal-backdrop" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setIncidenciaComentarios(null) }}>
          <section className="modal comments-modal" role="dialog" aria-modal="true" aria-labelledby="comments-title">
            <div className="modal-heading">
              <div><p className="eyebrow">HISTORIAL DE ACTIVIDAD</p><h2 id="comments-title">{incidenciaComentarios.titulo}</h2></div>
              <button className="icon-button modal-close" onClick={() => setIncidenciaComentarios(null)} aria-label="Cerrar"><X size={19} /></button>
            </div>
            {errorComentarios && <div className="error-banner comment-error" role="alert"><CircleAlert size={17} /><span>{errorComentarios}</span></div>}
            <div className="comments-list">
              {cargandoComentarios ? (
                <div className="empty-state"><LoaderCircle className="spin" size={22} /><p>Cargando comentarios...</p></div>
              ) : comentarios.length ? comentarios.map((comentario) => (
                <article className="comment-item" key={comentario.id}>
                  <div><strong>{comentario.autor}</strong><time dateTime={comentario.creado_en}>{new Date(comentario.creado_en).toLocaleString('es-MX')}</time></div>
                  <p>{comentario.contenido}</p>
                </article>
              )) : <p className="comments-empty">Aún no hay comentarios para esta incidencia.</p>}
            </div>
            <form onSubmit={guardarComentario} className="comment-form">
              <label className="field-label">Agregar comentario
                <textarea value={comentarioNuevo} onChange={(evento) => setComentarioNuevo(evento.target.value)} maxLength={2000} required rows={3} placeholder="Escribe una actualización..." />
              </label>
              <button type="submit" className="button button-primary" disabled={guardandoComentario || !comentarioNuevo.trim()}>
                {guardandoComentario ? <LoaderCircle className="spin" size={16} /> : <MessageSquare size={16} />}
                {guardandoComentario ? 'Guardando...' : 'Comentar'}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default App