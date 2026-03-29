import { useState, useCallback } from 'react'
import { sb, POOLS, COLORS } from '../lib/supabase'

function Spinner({ dark }) {
  return <span className={`spinner ${dark ? 'spinner-dark' : ''}`} />
}

function Badge({ children, type = 'badge-gray' }) {
  return <span className={`badge ${type}`}>{children}</span>
}

export default function HostDashboard({ t, teams, games, bracketGames, onBack, onRefresh, showToast }) {
  const [tab, setTab] = useState('home')
  const [saving, setSaving] = useState(false)
  const [edit, setEdit] = useState({ ...t })
  const [genning, setGenning] = useState(false)
  const [numCourts, setNumCourts] = useState(3)
  const [scoreEdit, setScoreEdit] = useState({})
  const [editTeam, setEditTeam] = useState(null)
  const [teamForm, setTeamForm] = useState({})
  const [bracketScoreEdit, setBracketScoreEdit] = useState({})
  const [bracketType, setBracketType] = useState('single')
  const [seedMethod, setSeedMethod] = useState('standard')

  const npaid = teams.filter(x => x.paid).length
  const unp = teams.filter(x => !x.paid).length
  const checkedIn = teams.filter(x => x.checked_in).length

  const getStandings = () => {
    const stats = {}
    teams.forEach(tm => { stats[tm.id] = { ...tm, w: 0, l: 0, pts: 0, pf: 0, pa: 0 } })
    games.filter(g => g.completed).forEach(g => {
      if (!stats[g.team1_id] || !stats[g.team2_id]) return
      const s1 = +g.score1, s2 = +g.score2
      stats[g.team1_id].pf += s1; stats[g.team1_id].pa += s2
      stats[g.team2_id].pf += s2; stats[g.team2_id].pa += s1
      if (s1 > s2) { stats[g.team1_id].w++; stats[g.team1_id].pts += 2; stats[g.team2_id].l++ }
      else if (s2 > s1) { stats[g.team2_id].w++; stats[g.team2_id].pts += 2; stats[g.team1_id].l++ }
      else { stats[g.team1_id].pts++; stats[g.team2_id].pts++ }
    })
    teams.forEach(tm => {
      if ((tm.manual_w || tm.manual_l) && stats[tm.id]) {
        stats[tm.id].w = tm.manual_w || stats[tm.id].w
        stats[tm.id].l = tm.manual_l || stats[tm.id].l
        stats[tm.id].pts = stats[tm.id].w * 2
      }
    })
    return Object.values(stats).filter(x => x.pool).sort((a, b) => b.pts - a.pts || (b.pf - b.pa) - (a.pf - a.pa))
  }

  const save = async () => {
    setSaving(true)
    const { error } = await sb.from('tournaments').update({
      name: edit.name, date: edit.date, venue: edit.venue, city: edit.city,
      entry_fee: +edit.entry_fee, max_teams: +edit.max_teams, host_password: edit.host_password,
      scoring: edit.scoring, num_pools: edit.num_pools, bracket_type: edit.bracket_type,
      surface: edit.surface, min_players: edit.min_players, max_players: edit.max_players,
      captains_meeting: edit.captains_meeting, games_start: edit.games_start,
      bracket_start: edit.bracket_start, finals_start: edit.finals_start,
      payment_info: edit.payment_info, announcement: edit.announcement,
      logo_url: edit.logo_url, hero_color: edit.hero_color, accent_color: edit.accent_color,
      show_checkin: edit.show_checkin !== false, show_online: edit.show_online !== false,
      checkin_label: edit.checkin_label, checkin_desc: edit.checkin_desc,
      online_label: edit.online_label, online_desc: edit.online_desc,
    }).eq('id', t.id)
    setSaving(false)
    error ? showToast('Error: ' + error.message, 'error') : (showToast('Saved ✓'), onRefresh())
  }

  const markPaid = async (id) => {
    const tm = teams.find(x => x.id === id)
    await sb.from('teams').update({ paid: true, amount_paid: tm.players * (t.entry_fee || 25) }).eq('id', id)
    showToast('Marked paid ✓'); onRefresh()
  }

  const checkIn = async (id) => {
    await sb.from('teams').update({ checked_in: true }).eq('id', id)
    showToast('Checked in ✓'); onRefresh()
  }

  const assignPool = async (id, p) => {
    await sb.from('teams').update({ pool: p }).eq('id', id)
    showToast(`Pool ${p} ✓`); onRefresh()
  }

  const removeTeam = async (id) => {
    if (!window.confirm('Remove this team?')) return
    await sb.from('teams').delete().eq('id', id)
    showToast('Removed', 'warn'); onRefresh()
  }

  const saveTeamEdit = async () => {
    const { error } = await sb.from('teams').update({
      name: teamForm.name, captain: teamForm.captain, phone: teamForm.phone,
      players: +teamForm.players, paid: teamForm.paid, pool: teamForm.pool || null
    }).eq('id', editTeam.id)
    error ? showToast('Error', 'error') : (showToast('Updated ✓'), setEditTeam(null), onRefresh())
  }

  const saveScore = async (g) => {
    const sc = scoreEdit[g.id]
    if (!sc?.s1 || !sc?.s2) return showToast('Enter both scores', 'warn')
    const { error } = await sb.from('games').update({ score1: +sc.s1, score2: +sc.s2, completed: true }).eq('id', g.id)
    error ? showToast('Error', 'error') : (showToast('Score saved ✓'), setScoreEdit(p => ({ ...p, [g.id]: undefined })), onRefresh())
  }

  const generateSchedule = async () => {
    setGenning(true)
    await sb.from('games').delete().eq('tournament_id', t.id)
    const allCourts = ['Court A', 'Court B', 'Court C']
    const courts = allCourts.slice(0, numCourts)
    const allMatchups = []
    for (const pool of POOLS) {
      const pt = teams.filter(x => x.pool === pool)
      if (pt.length < 2) continue
      for (let i = 0; i < pt.length; i++)
        for (let j = i + 1; j < pt.length; j++)
          allMatchups.push({ pool, team1_id: pt[i].id, team2_id: pt[j].id })
    }
    for (let i = allMatchups.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allMatchups[i], allMatchups[j]] = [allMatchups[j], allMatchups[i]]
    }
    const slots = []; const remaining = [...allMatchups]
    while (remaining.length > 0) {
      const slot = []; const usedTeams = new Set()
      for (let i = 0; i < remaining.length && slot.length < courts.length; i++) {
        const g = remaining[i]
        if (!usedTeams.has(g.team1_id) && !usedTeams.has(g.team2_id)) {
          slot.push(g); usedTeams.add(g.team1_id); usedTeams.add(g.team2_id)
          remaining.splice(i, 1); i--
        }
      }
      if (slot.length === 0) break
      slots.push(slot)
    }
    const inserts = []
    slots.forEach((slot, si) => slot.forEach((g, gi) => inserts.push({
      tournament_id: t.id, pool: g.pool, time: `Round ${si + 1}`,
      court: courts[gi], team1_id: g.team1_id, team2_id: g.team2_id, completed: false
    })))
    if (inserts.length > 0) {
      const { error } = await sb.from('games').insert(inserts)
      error ? showToast('Error: ' + error.message, 'error') : (showToast(`${inserts.length} games generated ✓`), onRefresh())
    } else showToast('Assign teams to pools first', 'warn')
    setGenning(false)
  }

  const generateBracket = async () => {
    const standings = getStandings()
    if (standings.length < 2) { showToast('Complete pool play first', 'warn'); return }
    await sb.from('bracket_games').delete().eq('tournament_id', t.id)
    let seeded = []
    if (seedMethod === 'crosspools') {
      const byPool = {}
      POOLS.forEach(p => { byPool[p] = standings.filter(x => x.pool === p) })
      const activePools = POOLS.filter(p => byPool[p].length > 0)
      const maxLen = Math.max(...activePools.map(p => byPool[p].length))
      for (let i = 0; i < maxLen; i++) activePools.forEach(p => { if (byPool[p][i]) seeded.push(byPool[p][i]) })
    } else {
      seeded = [...standings]
    }
    const n = seeded.length
    const inserts = []
    for (let i = 0; i < Math.floor(n / 2); i++) {
      inserts.push({
        tournament_id: t.id, round: 1, match: i + 1, bracket: 'winners',
        elimination_type: bracketType,
        team1_id: seeded[i].id, team1_name: seeded[i].name, team1_seed: i + 1,
        team2_id: seeded[n - 1 - i].id, team2_name: seeded[n - 1 - i].name, team2_seed: n - i,
        score1: null, score2: null, completed: false, winner_id: null
      })
    }
    const { error } = await sb.from('bracket_games').insert(inserts)
    error ? showToast('Error: ' + error.message, 'error') : (showToast('Bracket generated! ✓'), onRefresh())
  }

  const saveBracketScore = async (bg) => {
    const sc = bracketScoreEdit[bg.id]
    if (!sc?.s1 || !sc?.s2) return showToast('Enter both scores', 'warn')
    const s1 = +sc.s1, s2 = +sc.s2
    const winner_id = s1 > s2 ? bg.team1_id : bg.team2_id
    const loser_id = s1 > s2 ? bg.team2_id : bg.team1_id
    const loser_name = loser_id === bg.team1_id ? bg.team1_name : bg.team2_name
    const loser_seed = loser_id === bg.team1_id ? bg.team1_seed : bg.team2_seed
    const { error } = await sb.from('bracket_games').update({ score1: s1, score2: s2, completed: true, winner_id }).eq('id', bg.id)
    if (error) { showToast('Error', 'error'); return }
    setBracketScoreEdit(p => ({ ...p, [bg.id]: undefined }))
    const updatedGames = [...bracketGames.map(g => g.id === bg.id ? { ...g, score1: s1, score2: s2, completed: true, winner_id } : g)]
    const bracket = bg.bracket || 'winners'
    if (bg.elimination_type === 'double' && bracket === 'winners') {
      await sb.from('bracket_games').insert({
        tournament_id: t.id, round: bg.round, match: bg.match, bracket: 'losers',
        elimination_type: 'double', team1_id: loser_id, team1_name: loser_name,
        team1_seed: loser_seed, team2_id: null, team2_name: 'TBD', team2_seed: null,
        score1: null, score2: null, completed: false, winner_id: null
      })
    }
    const sameRound = updatedGames.filter(g => g.round === bg.round && (g.bracket || 'winners') === bracket)
    if (sameRound.every(g => g.completed) && sameRound.length > 1) {
      const winners = sameRound.map(g => ({
        id: g.winner_id,
        name: g.winner_id === g.team1_id ? g.team1_name : g.team2_name,
        seed: g.winner_id === g.team1_id ? g.team1_seed : g.team2_seed,
      }))
      const nextInserts = []
      for (let i = 0; i < Math.floor(winners.length / 2); i++) {
        nextInserts.push({
          tournament_id: t.id, round: bg.round + 1, match: i + 1, bracket,
          elimination_type: bg.elimination_type,
          team1_id: winners[i].id, team1_name: winners[i].name, team1_seed: winners[i].seed,
          team2_id: winners[winners.length - 1 - i].id, team2_name: winners[winners.length - 1 - i].name, team2_seed: winners[winners.length - 1 - i].seed,
          score1: null, score2: null, completed: false, winner_id: null
        })
      }
      if (nextInserts.length > 0) { await sb.from('bracket_games').insert(nextInserts); showToast(`Round ${bg.round + 1} ready ✓`) }
      else showToast('🏆 Tournament complete!', 'info')
    } else showToast('Score saved ✓')
    onRefresh()
  }

  const tName = id => teams.find(x => x.id === id)?.name || 'TBD'
  const tColor = id => teams.find(x => x.id === id)?.color || '#ccc'

  const NAV_DESK = [
    { id: 'home', ic: '⊡', lb: 'Home' },
    { id: 'teams', ic: '👥', lb: 'Teams' },
    { id: 'pools', ic: '🏐', lb: 'Pools' },
    { id: 'schedule', ic: '📅', lb: 'Schedule' },
    { id: 'bracket', ic: '🏆', lb: 'Bracket' },
    { id: 'payments', ic: '💵', lb: 'Payments' },
    { id: 'announce', ic: '📣', lb: 'Announce' },
    { id: 'settings', ic: '⚙️', lb: 'Settings' },
  ]
  const NAV_MOB = [
    { id: 'home', ic: '⊡', lb: 'Home' },
    { id: 'schedule', ic: '📅', lb: 'Scores' },
    { id: 'bracket', ic: '🏆', lb: 'Bracket' },
    { id: 'payments', ic: '💵', lb: 'Pay' },
    { id: 'settings', ic: '⚙️', lb: 'More' },
  ]
   return (
    <div style={{ display: 'flex', height: '100vh', background: '#F7F7F7', overflow: 'hidden', fontFamily: 'Inter,sans-serif' }}>
      {/* Sidebar */}
      <div className="sidebar desktop-only" style={{ width: 210, background: '#fff', borderRight: '1px solid #E5E5E5', display: 'flex', flexDirection: 'column', flexShrink: 0, padding: '0 10px' }}>
        <div style={{ padding: '18px 8px 14px', borderBottom: '1px solid #E5E5E5', marginBottom: 10 }}>
          <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '.9rem', fontWeight: 900, fontStyle: 'italic', letterSpacing: 2 }}>TOURNEY FLOW</div>
          <div style={{ fontSize: '.58rem', color: '#8E8E93', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Host Dashboard</div>
        </div>
        <div style={{ background: '#F7F7F7', borderRadius: 12, padding: '12px 14px', margin: '0 0 12px' }}>
          <div style={{ fontSize: '.6rem', fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>Active</div>
          <div style={{ fontWeight: 700, fontSize: '.84rem', lineHeight: 1.3, marginBottom: 3 }}>{t.name}</div>
          <div style={{ fontSize: '.68rem', color: '#8E8E93' }}>{t.date}</div>
        </div>
        <nav style={{ flex: 1 }}>
          {NAV_DESK.map(n => (
            <button key={n.id} className={`nav-item ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>
              <span>{n.ic}</span><span>{n.lb}</span>
              {n.id === 'payments' && unp > 0 && <span style={{ marginLeft: 'auto', background: '#FF3B30', color: '#fff', padding: '1px 7px', fontSize: '.6rem', fontWeight: 800, borderRadius: 10 }}>{unp}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: '10px 0', borderTop: '1px solid #E5E5E5' }}>
          <button className="nav-item" onClick={onBack}><span>👀</span><span>Public View</span></button>
          <button className="nav-item" onClick={() => window.location.href = '/'}><span>🏠</span><span>All Tournaments</span></button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #E5E5E5', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="mobile-only btn btn-outline btn-sm" onClick={onBack}>← Public</button>
            <div className="desktop-only" style={{ fontFamily: 'Barlow,sans-serif', fontSize: '.95rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{NAV_DESK.find(n => n.id === tab)?.lb}</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onRefresh}>↻ Refresh</button>
        </div>

        <div className="main-content" style={{ flex: 1, overflow: 'auto', padding: 16 }}>

          {/* HOME */}
          {tab === 'home' && (
            <div className="fade-up">
              {unp > 0 && (
                <div style={{ background: '#FFF9E8', border: '1px solid #FFE066', borderRadius: 12, padding: '13px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: '.84rem', color: '#7A5C00' }}>💵 {unp} team{unp > 1 ? 's' : ''} haven't paid</div>
                  <button className="btn btn-dark btn-sm" onClick={() => setTab('payments')}>View →</button>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 14 }}>
                {[
                  { v: teams.length, s: `of ${t.max_teams}`, l: 'Teams', c: '#0A0A0A', ic: '👥' },
                  { v: npaid, s: `${unp} unpaid`, l: 'Paid', c: '#34C759', ic: '💵' },
                  { v: checkedIn, s: `${teams.length - checkedIn} not in`, l: 'Checked In', c: '#007AFF', ic: '✅' },
                  { v: t.max_teams - teams.length, s: 'open', l: 'Available', c: '#8E8E93', ic: '🏐' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: '16px 18px' }}>
                    <div style={{ fontSize: '1rem', marginBottom: 6 }}>{s.ic}</div>
                    <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '2rem', fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.v}</div>
                    <div style={{ fontSize: '.7rem', color: '#8E8E93', marginTop: 3 }}>{s.s}</div>
                    <div style={{ fontSize: '.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#C7C7CC', marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: '16px 18px' }}>
                <div className="section-header">Quick Actions</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                  {[
                    { lb: 'Check Teams In', ic: '✅', fn: () => setTab('teams') },
                    { lb: 'Enter Scores', ic: '📊', fn: () => setTab('schedule') },
                    { lb: 'Mark Payments', ic: '💵', fn: () => setTab('payments') },
                    { lb: 'Post Announcement', ic: '📣', fn: () => setTab('announce') },
                  ].map((a, i) => (
                    <button key={i} onClick={a.fn} style={{ background: '#F7F7F7', border: '1.5px solid #E5E5E5', borderRadius: 12, padding: '14px 12px', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: '1.3rem' }}>{a.ic}</span>
                      <span style={{ fontSize: '.76rem', fontWeight: 700, color: '#0A0A0A', lineHeight: 1.3 }}>{a.lb}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TEAMS */}
          {tab === 'teams' && (
            <div className="fade-up">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 700 }}>{teams.length} Teams</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Badge type="badge-green">{npaid} paid</Badge>
                  <Badge type="badge-yellow">{unp} pending</Badge>
                </div>
              </div>
              {teams.length === 0
                ? <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: '#8E8E93' }}>No teams yet.</div>
                : teams.map(tm => (
                  <div key={tm.id} className="card" style={{ padding: '14px 16px', marginBottom: 9, borderLeft: `3px solid ${tm.color || '#0A0A0A'}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, marginBottom: 3 }}>{tm.name}</div>
                        <div style={{ fontSize: '.73rem', color: '#8E8E93', lineHeight: 1.5 }}>{tm.captain} · {tm.phone}<br />{tm.players} players{tm.pool ? ` · Pool ${tm.pool}` : ''}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          <Badge type={tm.paid ? 'badge-green' : 'badge-yellow'}>{tm.paid ? 'Paid ✓' : 'Pending'}</Badge>
                          <Badge type={tm.checked_in ? 'badge-green' : 'badge-gray'}>{tm.checked_in ? 'Here ✓' : 'Not in'}</Badge>
                        </div>
                        {tm.roster && (() => {
                          try {
                            const r = JSON.parse(tm.roster)
                            return r.length > 0 ? (
                              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {r.map((p, i) => (
                                  <span key={i} style={{ background: '#F7F7F7', border: '1px solid #E5E5E5', borderRadius: 6, padding: '2px 8px', fontSize: '.68rem', fontWeight: 600 }}>
                                    {p.name}{p.ranking ? ` (${p.ranking})` : ''}
                                  </span>
                                ))}
                              </div>
                            ) : null
                          } catch { return null }
                        })()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                        {!tm.checked_in && <button className="btn btn-accent btn-xs" onClick={() => checkIn(tm.id)}>Check In</button>}
                        {!tm.paid && <button className="btn btn-dark btn-xs" onClick={() => markPaid(tm.id)}>Mark Paid</button>}
                        <button className="btn btn-outline btn-xs" onClick={() => { setEditTeam(tm); setTeamForm({ ...tm }) }}>Edit</button>
                        <button className="btn btn-outline btn-xs" style={{ color: '#FF3B30', borderColor: '#FF3B30' }} onClick={() => removeTeam(tm.id)}>Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* POOLS */}
          {tab === 'pools' && (
            <div className="fade-up">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                {POOLS.map(p => {
                  const pt = teams.filter(x => x.pool === p)
                  return (
                    <div key={p} className="card" style={{ padding: '13px 12px' }}>
                      <div style={{ fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8E8E93', marginBottom: 10 }}>Pool {p} ({pt.length})</div>
                      {pt.length === 0
                        ? <div style={{ color: '#C7C7CC', fontSize: '.74rem', fontStyle: 'italic' }}>Empty</div>
                        : pt.map(tm => (
                          <div key={tm.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid #E5E5E5', fontSize: '.76rem' }}>
                            <div style={{ width: 6, height: 6, background: tm.color || '#0A0A0A', borderRadius: 1, flexShrink: 0 }} />
                            <span style={{ flex: 1, fontWeight: 600 }}>{tm.name}</span>
                            <div style={{ display: 'flex', gap: 3 }}>
                              {POOLS.filter(x => x !== p).map(op => (
                                <button key={op} className="btn btn-dark btn-xs" onClick={() => assignPool(tm.id, op)}>→{op}</button>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )
                })}
              </div>
              {teams.filter(x => !x.pool).length > 0 && (
                <>
                  <div className="section-header">Unassigned ({teams.filter(x => !x.pool).length})</div>
                  {teams.filter(x => !x.pool).map(tm => (
                    <div key={tm.id} className="card" style={{ padding: '13px 16px', marginBottom: 9, borderLeft: `3px solid ${tm.color || '#0A0A0A'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 700, fontSize: '.86rem' }}>{tm.name}</div>
                        <div style={{ display: 'flex', gap: 7 }}>
                          {POOLS.map(p => <button key={p} className="btn btn-dark btn-sm" onClick={() => assignPool(tm.id, p)}>Pool {p}</button>)}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {teams.filter(x => !x.pool).length === 0 && teams.length > 0 && (
                <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                  <div style={{ color: '#34C759', fontWeight: 700, marginBottom: 8 }}>All teams assigned ✓</div>
                  <button className="btn btn-dark btn-sm" onClick={() => setTab('schedule')}>Generate Schedule →</button>
                </div>
              )}
              {teams.some(x => x.pool) && (
                <div className="card" style={{ padding: 20, marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div className="section-header" style={{ marginBottom: 0 }}>Manual W/L Override</div>
                    <div style={{ fontSize: '.7rem', color: '#8E8E93' }}>Edit if scores are wrong</div>
                  </div>
                  {teams.filter(x => x.pool).map(tm => (
                    <div key={tm.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #E5E5E5', flexWrap: 'wrap' }}>
                      <div style={{ width: 8, height: 8, background: tm.color || '#0A0A0A', borderRadius: 2, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '.84rem', minWidth: 100 }}>{tm.name}</span>
                      <span style={{ fontSize: '.68rem', color: '#8E8E93' }}>W:</span>
                      <input type="number" min="0" defaultValue={tm.manual_w || 0}
                        style={{ width: 44, padding: '4px 6px', border: '1.5px solid #E5E5E5', borderRadius: 6, fontSize: '.84rem', textAlign: 'center' }}
                        onBlur={async e => { await sb.from('teams').update({ manual_w: +e.target.value }).eq('id', tm.id); showToast('Updated ✓'); onRefresh() }} />
                      <span style={{ fontSize: '.68rem', color: '#8E8E93' }}>L:</span>
                      <input type="number" min="0" defaultValue={tm.manual_l || 0}
                        style={{ width: 44, padding: '4px 6px', border: '1.5px solid #E5E5E5', borderRadius: 6, fontSize: '.84rem', textAlign: 'center' }}
                        onBlur={async e => { await sb.from('teams').update({ manual_l: +e.target.value }).eq('id', tm.id); showToast('Updated ✓'); onRefresh() }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SCHEDULE */}
          {tab === 'schedule' && (
            <div className="fade-up">
              <div style={{ background: '#F7F7F7', borderRadius: 12, padding: '14px 16px', marginBottom: 16, border: '1.5px solid #E5E5E5' }}>
                <div style={{ fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: '#8E8E93', marginBottom: 10 }}>Courts Available</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {[1, 2, 3].map(n => (
                    <button key={n} onClick={() => setNumCourts(n)}
                      style={{ flex: 1, padding: '12px 8px', background: numCourts === n ? '#0A0A0A' : '#fff', color: numCourts === n ? '#fff' : '#0A0A0A', border: `2px solid ${numCourts === n ? '#0A0A0A' : '#E5E5E5'}`, borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '.9rem', fontFamily: 'Inter,sans-serif' }}>
                      {n} {n === 1 ? 'Court' : 'Courts'}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-accent" style={{ flex: 1, padding: 12 }} onClick={generateSchedule} disabled={genning}>
                    {genning ? <Spinner dark /> : games.length > 0 ? '⚡ Regenerate' : '⚡ Generate'}
                  </button>
                  {games.length > 0 && (
                    <button className="btn btn-outline btn-sm" style={{ color: '#FF3B30', borderColor: '#FF3B30' }}
                      onClick={async () => { await sb.from('games').delete().eq('tournament_id', t.id); onRefresh(); showToast('Cleared', 'warn') }}>
                      Clear
                    </button>
                  )}
                </div>
              </div>
              {games.length === 0
                ? <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 10 }}>📅</div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>No Schedule Yet</div>
                  <div style={{ color: '#8E8E93', fontSize: '.84rem', marginBottom: 16 }}>Assign teams to pools first.</div>
                  <button className="btn btn-dark btn-sm" onClick={() => setTab('pools')}>Assign Pools →</button>
                </div>
                : POOLS.map(p => {
                  const pg = games.filter(g => g.pool === p)
                  if (!pg.length) return null
                  const rounds = [...new Set(pg.map(g => g.time))]
                  return (
                    <div key={p} style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ background: '#0A0A0A', color: '#E8FF00', padding: '3px 10px', borderRadius: 6, fontSize: '.65rem', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>Pool {p}</div>
                        <div style={{ flex: 1, height: 1, background: '#E5E5E5' }} />
                        <span style={{ fontSize: '.7rem', color: '#8E8E93' }}>{pg.filter(x => x.completed).length}/{pg.length}</span>
                      </div>
                      {rounds.map(rnd => (
                        <div key={rnd} style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#8E8E93', marginBottom: 8, paddingLeft: 2 }}>{rnd}</div>
                          {pg.filter(g => g.time === rnd).map((g, gi) => {
                            const sc = scoreEdit[g.id] || {}
                            return (
                              <div key={gi} className="card" style={{ padding: '14px 16px', marginBottom: 8, borderLeft: `3px solid ${g.completed ? '#34C759' : '#E8FF00'}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                                  <Badge type="badge-gray">{g.court || 'Court'}</Badge>
                                  {g.completed ? <Badge type="badge-green">Final</Badge> : <Badge type="badge-yellow">Pending</Badge>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                      <div style={{ width: 10, height: 10, background: tColor(g.team1_id), borderRadius: 3, flexShrink: 0 }} />
                                      <span style={{ fontWeight: 700, fontSize: '.86rem' }}>{tName(g.team1_id)}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div style={{ width: 10, height: 10, background: tColor(g.team2_id), borderRadius: 3, flexShrink: 0 }} />
                                      <span style={{ fontWeight: 700, fontSize: '.86rem' }}>{tName(g.team2_id)}</span>
                                    </div>
                                  </div>
                                  {g.completed && !scoreEdit[g.id] ? (
                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                      <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '1.6rem', fontWeight: 900, color: +g.score1 > +g.score2 ? '#34C759' : '#8E8E93', lineHeight: 1.1 }}>{g.score1}</div>
                                      <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '1.6rem', fontWeight: 900, color: +g.score2 > +g.score1 ? '#34C759' : '#8E8E93', lineHeight: 1.1 }}>{g.score2}</div>
                                      <button onClick={e => { e.stopPropagation(); setScoreEdit(p => ({ ...p, [g.id]: { s1: String(g.score1), s2: String(g.score2) } })) }}
                                        style={{ fontSize: '.72rem', fontWeight: 700, background: '#F7F7F7', border: '1.5px solid #E5E5E5', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', color: '#0A0A0A', fontFamily: 'Inter,sans-serif', marginTop: 4 }}>
                                        ✏️ Edit
                                      </button>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <input className="score-input" style={{ width: 60, fontSize: '1.4rem', padding: '8px 0' }} type="number" placeholder="0"
                                          value={sc.s1 || ''} onChange={e => setScoreEdit(p => ({ ...p, [g.id]: { ...sc, s1: e.target.value } }))} />
                                        <span style={{ color: '#8E8E93', fontWeight: 700 }}>–</span>
                                        <input className="score-input" style={{ width: 60, fontSize: '1.4rem', padding: '8px 0' }} type="number" placeholder="0"
                                          value={sc.s2 || ''} onChange={e => setScoreEdit(p => ({ ...p, [g.id]: { ...sc, s2: e.target.value } }))} />
                                      </div>
                                      <button className="btn btn-dark btn-sm" style={{ width: '100%' }} disabled={!sc.s1 || !sc.s2} onClick={() => saveScore(g)}>Save ✓</button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  )
                })}
            </div>
          )}

          {/* BRACKET */}
          {tab === 'bracket' && (
            <div className="fade-up">
              <div style={{ background: '#0A0A0A', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
                <div style={{ fontSize: '.6rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Elimination Type</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {[{ v: 'single', l: 'Single', d: 'Lose once = out' }, { v: 'double', l: 'Double', d: 'Two losses = out' }].map(o => (
                    <div key={o.v} onClick={() => setBracketType(o.v)}
                      style={{ flex: 1, padding: '10px 8px', background: bracketType === o.v ? '#E8FF00' : '#1a1a1a', border: `2px solid ${bracketType === o.v ? '#E8FF00' : '#333'}`, borderRadius: 10, cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '.8rem', color: bracketType === o.v ? '#0A0A0A' : '#fff', marginBottom: 2 }}>{o.l}</div>
                      <div style={{ fontSize: '.65rem', color: bracketType === o.v ? '#444' : '#555' }}>{o.d}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '.6rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>Seeding Method</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  {[
                    { v: 'standard', l: 'Standard', d: 'Seed 1 vs last, 2 vs second-to-last' },
                    { v: 'crosspools', l: 'Cross-Pool', d: 'Best from each pool face off — more even matchups' },
                  ].map(o => (
                    <div key={o.v} onClick={() => setSeedMethod(o.v)}
                      style={{ padding: '10px 12px', background: seedMethod === o.v ? '#E8FF00' : '#1a1a1a', border: `2px solid ${seedMethod === o.v ? '#E8FF00' : '#333'}`, borderRadius: 10, cursor: 'pointer' }}>
                      <div style={{ fontWeight: 700, fontSize: '.8rem', color: seedMethod === o.v ? '#0A0A0A' : '#fff', marginBottom: 2 }}>{o.l}</div>
                      <div style={{ fontSize: '.65rem', color: seedMethod === o.v ? '#444' : '#555' }}>{o.d}</div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-accent" style={{ width: '100%', padding: 12 }} onClick={generateBracket}>
                  ⚡ {bracketGames.length > 0 ? 'Regenerate' : 'Generate Bracket'}
                </button>
              </div>
              {bracketGames.length === 0
                ? <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 10 }}>🏆</div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>No Bracket Yet</div>
                  <div style={{ color: '#8E8E93', fontSize: '.84rem' }}>Complete pool play first, then generate.</div>
                </div>
                : [...new Set(bracketGames.map(g => g.round))].map(round => (
                  <div key={round} style={{ marginBottom: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ background: '#0A0A0A', color: '#E8FF00', padding: '3px 10px', borderRadius: 6, fontSize: '.65rem', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
                        {round === 1 ? 'Round 1' : round === 2 ? 'Semifinals' : round === 3 ? 'Finals' : 'Round ' + round}
                      </div>
                      <div style={{ flex: 1, height: 1, background: '#E5E5E5' }} />
                    </div>
                    {bracketGames.filter(g => g.round === round).map((bg, i) => {
                      const bsc = bracketScoreEdit[bg.id] || {}
                      return (
                        <div key={i} className="card" style={{ padding: '14px 16px', marginBottom: 8, borderLeft: `3px solid ${bg.completed ? '#34C759' : '#E8FF00'}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <Badge type="badge-gray">Game {bg.match}</Badge>
                            {bg.completed && <Badge type="badge-green">Final</Badge>}
                            {bg.bracket === 'losers' && <Badge type="badge-red">Losers</Badge>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                              {[{ id: bg.team1_id, name: bg.team1_name, seed: bg.team1_seed, winner: bg.winner_id === bg.team1_id },
                              { id: bg.team2_id, name: bg.team2_name, seed: bg.team2_seed, winner: bg.winner_id === bg.team2_id }].map((team, ti) => (
                                <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: ti === 0 ? 8 : 0 }}>
                                  <div style={{ width: 18, height: 18, background: team.winner ? '#E8FF00' : '#F7F7F7', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', fontWeight: 800, flexShrink: 0 }}>{team.seed}</div>
                                  <span style={{ fontWeight: team.winner ? 800 : 600, fontSize: '.88rem', color: bg.completed && !team.winner ? '#8E8E93' : '#0A0A0A' }}>{team.name || 'TBD'}</span>
                                </div>
                              ))}
                            </div>
                            {bg.completed && !bracketScoreEdit[bg.id] ? (
                              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '1.6rem', fontWeight: 900, color: bg.winner_id === bg.team1_id ? '#34C759' : '#8E8E93', lineHeight: 1.1 }}>{bg.score1}</div>
                                <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '1.6rem', fontWeight: 900, color: bg.winner_id === bg.team2_id ? '#34C759' : '#8E8E93', lineHeight: 1.1 }}>{bg.score2}</div>
                                <button onClick={e => { e.stopPropagation(); setBracketScoreEdit(p => ({ ...p, [bg.id]: { s1: String(bg.score1), s2: String(bg.score2) } })) }}
                                  style={{ fontSize: '.72rem', fontWeight: 700, background: '#F7F7F7', border: '1.5px solid #E5E5E5', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', color: '#0A0A0A', fontFamily: 'Inter,sans-serif', marginTop: 4 }}>
                                  ✏️ Edit
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <input className="score-input" style={{ width: 60, fontSize: '1.4rem', padding: '8px 0' }} type="number" placeholder="0"
                                    value={bsc.s1 || ''} onChange={e => setBracketScoreEdit(p => ({ ...p, [bg.id]: { ...bsc, s1: e.target.value } }))} />
                                  <span style={{ color: '#8E8E93', fontWeight: 700 }}>–</span>
                                  <input className="score-input" style={{ width: 60, fontSize: '1.4rem', padding: '8px 0' }} type="number" placeholder="0"
                                    value={bsc.s2 || ''} onChange={e => setBracketScoreEdit(p => ({ ...p, [bg.id]: { ...bsc, s2: e.target.value } }))} />
                                </div>
                                <button className="btn btn-dark btn-sm" style={{ width: '100%' }} disabled={!bsc.s1 || !bsc.s2} onClick={() => saveBracketScore(bg)}>Save ✓</button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
            </div>
          )}

          {/* PAYMENTS */}
          {tab === 'payments' && (
            <div className="fade-up">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                {[
                  { l: 'Collected', v: `$${teams.reduce((a, tm) => a + (tm.amount_paid || 0) + (tm.paid ? (tm.players * (t.entry_fee || 25)) - (tm.amount_paid || 0) : 0), 0)}`, c: '#34C759' },
                  { l: 'Outstanding', v: `$${teams.filter(x => !x.paid).reduce((a, tm) => a + (tm.players * (t.entry_fee || 25)) - (tm.amount_paid || 0), 0)}`, c: '#FF3B30' },
                  { l: 'Teams', v: `${teams.length}/${t.max_teams}`, c: '#0A0A0A' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: '14px 12px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '1.4rem', fontWeight: 900, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: '.62rem', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              {teams.map(tm => (
                <div key={tm.id} className="card" style={{ padding: '13px 16px', marginBottom: 8, borderLeft: `3px solid ${tm.color || '#0A0A0A'}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '.86rem', marginBottom: 2 }}>{tm.name}</div>
                      <div style={{ fontSize: '.72rem', color: '#8E8E93', marginTop: 2 }}>{tm.players} players · ${tm.players * (t.entry_fee || 25)} total</div>
                      {!tm.paid && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                          <span style={{ fontSize: '.7rem', color: '#8E8E93' }}>Paid $</span>
                          <input type="number" min="0" max={tm.players * (t.entry_fee || 25)} defaultValue={tm.amount_paid || 0}
                            style={{ width: 64, padding: '4px 6px', border: '1.5px solid #E5E5E5', borderRadius: 6, fontSize: '.84rem', textAlign: 'center' }}
                            onBlur={async e => {
                              const amt = Math.min(+e.target.value, tm.players * (t.entry_fee || 25))
                              const fullyPaid = amt >= (tm.players * (t.entry_fee || 25))
                              await sb.from('teams').update({ amount_paid: amt, paid: fullyPaid }).eq('id', tm.id)
                              showToast(fullyPaid ? 'Fully paid ✓' : 'Partial saved'); onRefresh()
                            }} />
                          <span style={{ fontSize: '.7rem', color: '#8E8E93' }}>of ${tm.players * (t.entry_fee || 25)}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexShrink: 0 }}>
                      {tm.paid ? <Badge type="badge-green">Paid ✓</Badge>
                        : tm.amount_paid > 0 ? <Badge type="badge-blue">${tm.amount_paid} paid</Badge>
                          : <Badge type="badge-red">Owes ${tm.players * (t.entry_fee || 25)}</Badge>}
                      {!tm.paid && <button className="btn btn-dark btn-xs" onClick={() => markPaid(tm.id)}>Full ✓</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ANNOUNCE */}
          {tab === 'announce' && (
            <div className="fade-up" style={{ maxWidth: 500 }}>
              <div className="card" style={{ padding: 20 }}>
                <div className="section-header">Post Announcement</div>
                <div style={{ fontSize: '.8rem', color: '#8E8E93', marginBottom: 14, lineHeight: 1.6 }}>Appears as a banner on the public page instantly.</div>
                <textarea className="inp" rows={4} placeholder="e.g. Court B is delayed 15 min..."
                  value={edit.announcement || ''} onChange={e => setEdit(p => ({ ...p, announcement: e.target.value }))}
                  style={{ resize: 'vertical', fontFamily: 'Inter,sans-serif', marginBottom: 12 }} />
                {edit.announcement && (
                  <div style={{ background: '#FFF9E8', border: '1px solid #FFE066', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                    <div style={{ fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#8C6D00', marginBottom: 4 }}>Preview</div>
                    <div style={{ fontSize: '.83rem', color: '#555', lineHeight: 1.5 }}>📢 {edit.announcement}</div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                  <button className="btn btn-outline" onClick={() => setEdit(p => ({ ...p, announcement: '' }))}>Clear</button>
                  <button className="btn btn-dark" style={{ padding: 13 }} disabled={saving} onClick={save}>{saving ? <Spinner /> : 'Post ✓'}</button>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {tab === 'settings' && (
            <div className="fade-up" style={{ maxWidth: 500 }}>
              {[
                {
                  title: 'Tournament Info',
                  fields: [
                    { k: 'name', l: 'Name' }, { k: 'date', l: 'Date', p: 'e.g. April 12, 2026' },
                    { k: 'venue', l: 'Venue' }, { k: 'city', l: 'City, State' },
                    { k: 'entry_fee', l: 'Entry Fee ($)', tp: 'number' }, { k: 'max_teams', l: 'Max Teams', tp: 'number' },
                    { k: 'host_password', l: 'Host Password' }, { k: 'payment_info', l: 'Payment Instructions' },
                  ]
                },
                {
                  title: 'Schedule Times',
                  fields: [
                    { k: 'captains_meeting', l: 'Captains Meeting', p: '8:30 AM' },
                    { k: 'games_start', l: 'Pool Play Starts', p: '9:00 AM' },
                    { k: 'bracket_start', l: 'Bracket Starts', p: '~1:00 PM' },
                    { k: 'finals_start', l: 'Finals', p: '~3:00 PM' },
                  ]
                },
                {
                  title: 'Game Format',
                  fields: [
                    { k: 'scoring', l: 'Scoring', p: 'e.g. Rally to 21' },
                    { k: 'num_pools', l: 'Number of Pools', p: 'e.g. 2' },
                    { k: 'bracket_type', l: 'Bracket Type', p: 'e.g. Single Elimination' },
                    { k: 'surface', l: 'Surface', p: 'e.g. Grass' },
                    { k: 'min_players', l: 'Min Players', p: 'e.g. 4' },
                    { k: 'max_players', l: 'Max Players', p: 'e.g. 6' },
                  ]
                },
              ].map(section => (
                <div key={section.title} className="card" style={{ padding: 20, marginBottom: 14 }}>
                  <div className="section-header">{section.title}</div>
                  {section.fields.map(x => (
                    <div key={x.k} style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: '.68rem', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: .5, color: '#8E8E93' }}>{x.l}</label>
                      <input className="inp" type={x.tp || 'text'} placeholder={x.p || ''} value={edit[x.k] || ''} onChange={e => setEdit(p => ({ ...p, [x.k]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              ))}

              {/* Logo */}
              <div className="card" style={{ padding: 20, marginBottom: 14 }}>
                <div className="section-header">Logo & Branding</div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: '.68rem', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: .5, color: '#8E8E93' }}>Logo URL</label>
                  <input className="inp" placeholder="https://your-logo-url.com/logo.png" value={edit.logo_url || ''} onChange={e => setEdit(p => ({ ...p, logo_url: e.target.value }))} />
                  <div style={{ fontSize: '.7rem', color: '#8E8E93', marginTop: 6 }}>Paste a direct image URL. Shows at the top of the public page. If blank, shows "TOURNEY FLOW" text.</div>
                  {edit.logo_url && <img src={edit.logo_url} alt="preview" style={{ height: 48, marginTop: 10, borderRadius: 8, objectFit: 'contain' }} />}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '.68rem', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5, color: '#8E8E93' }}>Hero Background</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    {['#0A0A0A', '#1a1a2e', '#0f3460', '#1a472a', '#4a0e0e', '#2C3E50'].map(c => (
                      <div key={c} onClick={() => setEdit(p => ({ ...p, hero_color: c }))}
                        style={{ width: 32, height: 32, background: c, borderRadius: 8, cursor: 'pointer', border: `3px solid ${edit.hero_color === c ? '#E8FF00' : 'transparent'}` }} />
                    ))}
                    <input type="color" value={edit.hero_color || '#0A0A0A'} onChange={e => setEdit(p => ({ ...p, hero_color: e.target.value }))}
                      style={{ width: 32, height: 32, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 8 }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.68rem', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5, color: '#8E8E93' }}>Accent Color</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['#E8FF00', '#FF3B30', '#007AFF', '#34C759', '#FF9500', '#AF52DE', '#ffffff'].map(c => (
                      <div key={c} onClick={() => setEdit(p => ({ ...p, accent_color: c }))}
                        style={{ width: 32, height: 32, background: c, borderRadius: 8, cursor: 'pointer', border: `3px solid ${edit.accent_color === c ? '#0A0A0A' : 'transparent'}`, boxShadow: '0 1px 3px rgba(0,0,0,.15)' }} />
                    ))}
                    <input type="color" value={edit.accent_color || '#E8FF00'} onChange={e => setEdit(p => ({ ...p, accent_color: e.target.value }))}
                      style={{ width: 32, height: 32, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 8 }} />
                  </div>
                </div>
              </div>

              {/* Payment Options */}
              <div className="card" style={{ padding: 20, marginBottom: 14 }}>
                <div className="section-header">Payment Options</div>
                {[{ k: 'show_checkin', l: '💵 Pay at Check-in' }, { k: 'show_online', l: '💳 Pay Online' }].map(opt => (
                  <div key={opt.k} onClick={() => setEdit(p => ({ ...p, [opt.k]: p[opt.k] === false ? true : false }))}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#F7F7F7', borderRadius: 10, marginBottom: 8, cursor: 'pointer' }}>
                    <span style={{ fontWeight: 600, fontSize: '.86rem' }}>{opt.l}</span>
                    <div style={{ width: 44, height: 24, borderRadius: 12, background: edit[opt.k] !== false ? '#0A0A0A' : '#C7C7CC', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: 2, left: edit[opt.k] !== false ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn btn-dark" style={{ width: '100%', padding: 15, marginBottom: 20 }} disabled={saving} onClick={save}>
                {saving ? <Spinner /> : 'Save All Changes ✓'}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        {NAV_MOB.map(n => (
          <button key={n.id} className={`bottom-nav-item ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>
            <span className="bottom-nav-icon">{n.ic}</span>
            <span>{n.lb}{n.id === 'payments' && unp > 0 ? ` (${unp})` : ''}</span>
          </button>
        ))}
      </nav>

      {/* Edit Team Modal */}
      {editTeam && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setEditTeam(null) }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Edit Team</div>
              <button style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8E8E93' }} onClick={() => setEditTeam(null)}>✕</button>
            </div>
            {[{ k: 'name', l: 'Team Name' }, { k: 'captain', l: 'Captain' }, { k: 'phone', l: 'Phone' }].map(x => (
              <div key={x.k} style={{ marginBottom: 13 }}>
                <label style={{ display: 'block', fontSize: '.68rem', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: .5, color: '#8E8E93' }}>{x.l}</label>
                <input className="inp" value={teamForm[x.k] || ''} onChange={e => setTeamForm(p => ({ ...p, [x.k]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 13 }}>
              <div>
                <label style={{ display: 'block', fontSize: '.68rem', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: .5, color: '#8E8E93' }}>Players</label>
                <select className="inp" value={teamForm.players || 4} onChange={e => setTeamForm(p => ({ ...p, players: e.target.value }))}>
                  {[2, 3, 4, 5, 6].map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '.68rem', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: .5, color: '#8E8E93' }}>Pool</label>
                <select className="inp" value={teamForm.pool || ''} onChange={e => setTeamForm(p => ({ ...p, pool: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {POOLS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
              <button className="btn btn-outline" style={{ padding: 14 }} onClick={() => setEditTeam(null)}>Cancel</button>
              <button className="btn btn-dark" style={{ padding: 14 }} onClick={saveTeamEdit}>Save ✓</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}