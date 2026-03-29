import { useState, useEffect, useCallback } from 'react'
import { sb } from './lib/supabase'
import TournamentHome from './pages/TournamentHome'
import PublicPage from './pages/PublicPage'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import HostDashboard from './pages/HostDashboard'

function Spinner() {
  return (
    <div style={{minHeight:'100vh',background:'#0A0A0A',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
      <div style={{fontFamily:'Barlow,sans-serif',color:'#E8FF00',fontWeight:900,fontSize:'1.3rem',letterSpacing:3,fontStyle:'italic'}}>TOURNEY FLOW</div>
      <span className="spinner"/>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState('public')
  const [tournament, setTournament] = useState(null)
  const [teams, setTeams] = useState([])
  const [games, setGames] = useState([])
  const [bracketGames, setBracketGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [tid, setTid] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => setToast({ msg, type, key: Date.now() })
  const isAuthed = () => sessionStorage.getItem('tf_host') === '1'
  const setAuthed = () => sessionStorage.setItem('tf_host', '1')

  const getSlug = () => window.location.pathname.replace(/^\/+/, '')

  const load = useCallback(async () => {
    const slug = getSlug()
    if (!slug) { setLoading(false); return }
    const { data: t } = await sb.from('tournaments').select('*').eq('slug', slug).single()
    if (!t) { setLoading(false); return }
    setTid(t.id)
    const [{ data: tm }, { data: gm }, { data: bg }] = await Promise.all([
      sb.from('teams').select('*').eq('tournament_id', t.id).order('created_at'),
      sb.from('games').select('*').eq('tournament_id', t.id).order('pool').order('id'),
      sb.from('bracket_games').select('*').eq('tournament_id', t.id).order('round').order('id'),
    ])
    setTournament(t)
    if (tm) setTeams(tm)
    if (gm) setGames(gm)
    if (bg) setBracketGames(bg)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!tid) return
    const ch = sb.channel('rt-' + tid)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `tournament_id=eq.${tid}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments', filter: `id=eq.${tid}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `tournament_id=eq.${tid}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bracket_games', filter: `tournament_id=eq.${tid}` }, load)
      .subscribe()
    return () => sb.removeChannel(ch)
  }, [tid, load])

  const addTeam = async (team) => {
    const { error } = await sb.from('teams').insert({ ...team, tournament_id: tid })
    if (error) { showToast('Registration failed', 'error'); return false }
    await load(); return true
  }

  const slug = getSlug()

  if (loading) return <Spinner />
  if (!slug || !tournament) return <TournamentHome />

  const props = { t: tournament, teams, games, bracketGames, onRefresh: load, showToast }

  return (
    <>
      {toast && <Toast key={toast.key} {...toast} onClose={() => setToast(null)} />}
      {view === 'public' && <PublicPage {...props} onReg={() => setView('reg')} onHost={() => isAuthed() ? setView('host') : setView('login')} />}
      {view === 'reg' && <RegisterPage {...props} onBack={() => setView('public')} onSubmit={addTeam} />}
      {view === 'login' && <LoginPage {...props} onBack={() => setView('public')} onSuccess={() => { setAuthed(); setView('host') }} />}
      {view === 'host' && <HostDashboard {...props} onBack={() => setView('public')} />}
    </>
  )
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 2800); return () => clearTimeout(t) }, [])
  const styles = {
    success: { bg: '#E8FFF0', b: '#A3E4B8', t: '#1A6B35' },
    warn: { bg: '#FFF9E8', b: '#FFE066', t: '#7A5C00' },
    error: { bg: '#FFF0F0', b: '#FFB3B3', t: '#CC0000' },
    info: { bg: '#EEF5FF', b: '#A8C8F8', t: '#0055CC' },
  }
  const s = styles[type] || styles.success
  return (
    <div className="slide-in" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: s.bg, border: `1px solid ${s.b}`, color: s.t, padding: '11px 20px', fontSize: '.84rem', fontWeight: 600, zIndex: 9999, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.12)', whiteSpace: 'nowrap', maxWidth: '90vw' }}>
      {msg}
    </div>
  )
}