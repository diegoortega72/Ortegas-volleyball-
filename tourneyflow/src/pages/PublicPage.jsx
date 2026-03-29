import { useState } from 'react'
import { POOLS } from '../lib/supabase'

function Countdown({ date }) {
  const [diff, setDiff] = useState(null)
  useState(() => {
    const calc = () => {
      const months = { January: 0, February: 1, March: 2, April: 3, May: 4, June: 5, July: 6, August: 7, September: 8, October: 9, November: 10, December: 11 }
      const parts = (date || '').split(' ')
      const month = months[parts[0]]
      const day = parseInt((parts[1] || '').replace(',', ''))
      const year = parseInt(parts[2] || new Date().getFullYear())
      if (isNaN(month) || isNaN(day) || isNaN(year)) return setDiff(null)
      const d = new Date(year, month, day, 8, 30, 0)
      const ms = d - new Date()
      if (ms <= 0) return setDiff(null)
      setDiff({ d: Math.floor(ms / 86400000), h: Math.floor((ms % 86400000) / 3600000), m: Math.floor((ms % 3600000) / 60000) })
    }
    calc()
    const iv = setInterval(calc, 30000)
    return () => clearInterval(iv)
  })
  if (!diff) return null
  return (
    <div style={{ background: 'linear-gradient(135deg,#0A0A0A 0%,#1a1a1a 100%)', borderRadius: 16, padding: '20px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
      <div>
        <div style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: 2, color: '#444', textTransform: 'uppercase', marginBottom: 4 }}>Tournament Starts In</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
          {[{ v: diff.d, l: 'Days' }, { v: diff.h, l: 'Hrs' }, { v: diff.m, l: 'Min' }].map(({ v, l }) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '2.4rem', fontWeight: 900, color: '#E8FF00', lineHeight: 1 }}>{String(v).padStart(2, '0')}</div>
              <div style={{ fontSize: '.58rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#E8FF00' }} className="pulse" />
    </div>
  )
}

function Standings({ teams, games }) {
  const hasData = teams.some(t => t.pool)
  if (!hasData) return null
  const stats = {}
  teams.forEach(t => { stats[t.id] = { name: t.name, color: t.color, pool: t.pool, w: 0, l: 0, pts: 0, pf: 0, pa: 0 } })
  games.filter(g => g.completed).forEach(g => {
    if (!stats[g.team1_id] || !stats[g.team2_id]) return
    const s1 = +g.score1, s2 = +g.score2
    stats[g.team1_id].pf += s1; stats[g.team1_id].pa += s2
    stats[g.team2_id].pf += s2; stats[g.team2_id].pa += s1
    if (s1 > s2) { stats[g.team1_id].w++; stats[g.team1_id].pts += 2; stats[g.team2_id].l++ }
    else { stats[g.team2_id].w++; stats[g.team2_id].pts += 2; stats[g.team1_id].l++ }
  })
  teams.forEach(t => {
    if ((t.manual_w || t.manual_l) && stats[t.id]) {
      stats[t.id].w = t.manual_w || stats[t.id].w
      stats[t.id].l = t.manual_l || stats[t.id].l
      stats[t.id].pts = stats[t.id].w * 2
    }
  })
  return (
    <div className="card" style={{ padding: 20, marginBottom: 16 }}>
      <div className="section-header">Pool Standings</div>
      {POOLS.map(p => {
        const pt = teams.filter(t => t.pool === p)
        if (!pt.length) return null
        const sorted = [...pt].sort((a, b) => (stats[b.id]?.pts || 0) - (stats[a.id]?.pts || 0))
        return (
          <div key={p} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8E8E93', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              Pool {p}<div style={{ flex: 1, height: 1, background: '#E5E5E5' }} />
            </div>
            {sorted.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < sorted.length - 1 ? '1px solid #E5E5E5' : 'none' }}>
                <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '1rem', fontWeight: 900, color: i === 0 ? '#E8FF00' : '#C7C7CC', minWidth: 20, textAlign: 'center' }}>{i + 1}</div>
                <div style={{ width: 8, height: 8, background: t.color || '#0A0A0A', borderRadius: 2, flexShrink: 0 }} />
                <span style={{ flex: 1, fontWeight: 600, fontSize: '.84rem' }}>{t.name}</span>
                <div style={{ display: 'flex', gap: 12, fontSize: '.75rem' }}>
                  <span style={{ color: '#34C759', fontWeight: 700 }}>{stats[t.id]?.w || 0}W</span>
                  <span style={{ color: '#FF3B30', fontWeight: 700 }}>{stats[t.id]?.l || 0}L</span>
                  <span style={{ fontWeight: 800, minWidth: 20, textAlign: 'right' }}>{stats[t.id]?.pts || 0}pts</span>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default function PublicPage({ t, teams, games, onReg, onHost }) {
  const [activeTab, setActiveTab] = useState('info')
  if (!t) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontFamily: 'Barlow,sans-serif', color: '#E8FF00', fontWeight: 900, fontSize: '1.3rem', letterSpacing: 3, fontStyle: 'italic' }}>TOURNEY FLOW</div>
      <span className="spinner" />
    </div>
  )

  const spots = t.max_teams - teams.length
  const pct = Math.round((teams.length / t.max_teams) * 100)
  const tabs = [{ id: 'info', lb: 'Info' }, { id: 'teams', lb: `Teams (${teams.length})` }, { id: 'schedule', lb: 'Schedule' }, { id: 'standings', lb: 'Standings' }]
  const tName = id => teams.find(x => x.id === id)?.name || 'TBD'
  const tColor = id => teams.find(x => x.id === id)?.color || '#ccc'
  const accentColor = t.accent_color || '#E8FF00'
  const heroColor = t.hero_color || '#0A0A0A'
  const accentText = accentColor === '#E8FF00' || accentColor === '#ffffff' ? '#0A0A0A' : '#fff'

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F7' }}>
      {/* Header */}
      <div style={{ background: heroColor, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {t.logo_url
              ? <img src={t.logo_url} alt="logo" style={{ height: 32, width: 32, objectFit: 'contain', borderRadius: 6 }} />
              : <div style={{ fontFamily: 'Barlow,sans-serif', color: accentColor, fontWeight: 900, fontSize: '1rem', letterSpacing: 2, fontStyle: 'italic' }}>TOURNEY FLOW</div>
            }
          </div>
          <button onClick={onHost} style={{ background: 'transparent', border: '1px solid #2C2C2E', color: '#8E8E93', padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '.72rem', fontWeight: 700, fontFamily: 'Inter,sans-serif' }}>Host</button>
        </div>
        <div style={{ display: 'flex', borderTop: '1px solid #1C1C1E', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ flex: 1, minWidth: 70, padding: '10px 4px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? accentColor : 'transparent'}`, color: activeTab === tab.id ? '#fff' : '#555', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .8, whiteSpace: 'nowrap', fontFamily: 'Inter,sans-serif' }}>
              {tab.lb}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 14px 120px' }}>
        {t.announcement && (
          <div style={{ background: '#FFF9E8', border: '1px solid #FFE066', borderRadius: 12, padding: '13px 16px', marginBottom: 14, display: 'flex', gap: 10 }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>📢</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.8rem', marginBottom: 2 }}>Announcement</div>
              <div style={{ fontSize: '.83rem', color: '#555', lineHeight: 1.5 }}>{t.announcement}</div>
            </div>
          </div>
        )}

        {/* INFO TAB */}
        {activeTab === 'info' && (
          <div className="fade-up">
            <div style={{ background: heroColor, borderRadius: 20, padding: '28px 22px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(232,255,0,.1)', border: '1px solid rgba(232,255,0,.2)', borderRadius: 20, padding: '3px 12px', marginBottom: 16 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: accentColor }} className="pulse" />
                  <span style={{ color: accentColor, fontSize: '.65rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>{t.city} · {t.date}</span>
                </div>
                <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 'clamp(1.8rem,6vw,3rem)', fontWeight: 900, fontStyle: 'italic', color: '#fff', lineHeight: .92, textTransform: 'uppercase', marginBottom: 16 }}>{t.name}</div>
                <div style={{ color: '#555', fontSize: '.82rem', marginBottom: 20 }}>{t.venue}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {spots > 0
                    ? <button onClick={onReg} style={{ padding: '13px 28px', fontSize: '.84rem', background: accentColor, color: accentText, border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: .8 }}>Register Now →</button>
                    : <div style={{ background: '#FF3B30', color: '#fff', padding: '12px 22px', borderRadius: 12, fontWeight: 700, fontSize: '.8rem' }}>Tournament Full</div>
                  }
                  <a href={`https://maps.google.com/?q=${encodeURIComponent((t.venue || '') + ' ' + (t.city || ''))}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    <button style={{ padding: '13px 20px', fontSize: '.82rem', background: 'transparent', border: '1px solid #2C2C2E', color: '#888', borderRadius: 12, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>📍 Map</button>
                  </a>
                </div>
              </div>
            </div>

            {/* Spots progress */}
            <div className="card" style={{ padding: '16px 18px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{teams.length} of {t.max_teams} teams registered</div>
                <span className={`badge ${spots <= 3 ? 'badge-red' : spots <= 6 ? 'badge-yellow' : 'badge-green'}`}>{spots > 0 ? `${spots} left` : 'Full'}</span>
              </div>
              <div style={{ height: 6, background: '#E5E5E5', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: spots <= 3 ? '#FF3B30' : spots <= 6 ? '#FF9500' : '#34C759', width: `${pct}%`, transition: 'width .5s ease', borderRadius: 3 }} />
              </div>
              {spots > 0 && spots <= 5 && <div style={{ fontSize: '.74rem', color: '#FF3B30', fontWeight: 600, marginTop: 8 }}>⚡ Only {spots} spot{spots > 1 ? 's' : ''} remaining</div>}
            </div>

            <Countdown date={t.date} />

            {/* Schedule */}
            <div className="card" style={{ padding: '16px 18px', marginBottom: 14 }}>
              <div className="section-header">Day Of Schedule</div>
              {[
                { t: t.captains_meeting || '8:30 AM', e: 'Captains Meeting', i: '📋' },
                { t: t.games_start || '9:00 AM', e: 'Pool Play', i: '🏐' },
                { t: t.bracket_start || '~1:00 PM', e: 'Bracket Play', i: '🏆' },
                { t: t.finals_start || '~3:00 PM', e: 'Finals', i: '🥇' },
              ].map((s, i, arr) => (
                <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < arr.length - 1 ? 14 : 0, marginBottom: i < arr.length - 1 ? 14 : 0, borderBottom: i < arr.length - 1 ? '1px solid #E5E5E5' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '1.2rem', marginTop: 2 }}>{s.i}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '.86rem' }}>{s.t}</div>
                    <div style={{ color: '#8E8E93', fontSize: '.78rem', marginTop: 2 }}>{s.e}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Format + Fee */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div className="card" style={{ padding: '16px 18px' }}>
                <div className="section-header">Format</div>
                {[
                  ['Scoring', t.scoring || 'Rally to 21'],
                  ['Surface', t.surface || 'Grass'],
                  ['Roster', `${t.min_players || 4}–${t.max_players || 6} players`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #E5E5E5', fontSize: '.76rem', gap: 6 }}>
                    <span style={{ color: '#8E8E93', flexShrink: 0 }}>{k}</span>
                    <span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: '#0A0A0A', borderRadius: 16, padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div className="section-header" style={{ color: '#444' }}>Entry Fee</div>
                  <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '2.8rem', fontWeight: 900, fontStyle: 'italic', color: accentColor, lineHeight: 1 }}>${t.entry_fee}</div>
                  <div style={{ color: '#555', fontSize: '.74rem', marginTop: 3 }}>per player</div>
                </div>
                <div style={{ color: '#3a3a3a', fontSize: '.68rem', marginTop: 12, lineHeight: 1.5 }}>{t.payment_info || 'Cash/Venmo at check-in'}</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
              <div style={{ fontSize: '.58rem', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#C7C7CC', marginBottom: 4 }}>Powered by</div>
              <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '1.2rem', fontWeight: 900, fontStyle: 'italic', letterSpacing: 2, color: '#0A0A0A' }}>TOURNEY FLOW</div>
            </div>
          </div>
        )}

        {/* TEAMS TAB */}
        {activeTab === 'teams' && (
          <div className="fade-up">
            <div className="card" style={{ overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E5E5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700 }}>{teams.length} Teams Registered</div>
                {spots > 0 && <button onClick={onReg} style={{ padding: '8px 14px', background: accentColor, color: accentText, border: 'none', borderRadius: 8, fontWeight: 800, fontSize: '.72rem', cursor: 'pointer', fontFamily: 'Inter,sans-serif', textTransform: 'uppercase' }}>+ Register</button>}
              </div>
              {teams.length === 0
                ? <div style={{ padding: 32, textAlign: 'center', color: '#8E8E93', fontSize: '.86rem' }}>No teams yet 🏐</div>
                : teams.map((tm, i) => (
                  <div key={tm.id} style={{ padding: '13px 18px', borderBottom: i < teams.length - 1 ? '1px solid #E5E5E5' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '.9rem', fontWeight: 900, color: '#E5E5E5', minWidth: 22 }}>{String(i + 1).padStart(2, '0')}</div>
                    <div style={{ width: 10, height: 10, background: tm.color || '#0A0A0A', borderRadius: 3, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '.86rem' }}>{tm.name}</div>
                      <div style={{ fontSize: '.72rem', color: '#8E8E93', marginTop: 1 }}>{tm.players} players{tm.pool ? ` · Pool ${tm.pool}` : ''}</div>
                    </div>
                    <span className={`badge ${tm.paid ? 'badge-green' : 'badge-yellow'}`}>{tm.paid ? 'Paid' : 'Pending'}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <div className="fade-up">
            {games.length === 0
              ? <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>📅</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Schedule Coming Soon</div>
                <div style={{ color: '#8E8E93', fontSize: '.84rem' }}>The host will publish the schedule before game day.</div>
              </div>
              : POOLS.map(p => {
                const pg = games.filter(g => g.pool === p)
                if (!pg.length) return null
                const rounds = [...new Set(pg.map(g => g.time))]
                return (
                  <div key={p} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ background: '#0A0A0A', color: accentColor, padding: '3px 10px', borderRadius: 6, fontSize: '.65rem', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>Pool {p}</div>
                      <div style={{ flex: 1, height: 1, background: '#E5E5E5' }} />
                    </div>
                    {rounds.map(rnd => (
                      <div key={rnd} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#8E8E93', marginBottom: 8, paddingLeft: 4 }}>{rnd}</div>
                        {pg.filter(g => g.time === rnd).map((g, gi) => (
                          <div key={gi} className="card" style={{ padding: '13px 16px', marginBottom: 8, borderLeft: `3px solid ${g.completed ? '#34C759' : '#E5E5E5'}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <span className="badge badge-gray">{g.court || 'Court'}</span>
                              {g.completed && <span className="badge badge-green">Final</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                                  <div style={{ width: 8, height: 8, background: tColor(g.team1_id), borderRadius: 2, flexShrink: 0 }} />
                                  <span style={{ fontWeight: g.completed && g.score1 > g.score2 ? 800 : 600, fontSize: '.86rem', color: g.completed && g.score1 < g.score2 ? '#8E8E93' : '#0A0A0A' }}>{tName(g.team1_id)}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                  <div style={{ width: 8, height: 8, background: tColor(g.team2_id), borderRadius: 2, flexShrink: 0 }} />
                                  <span style={{ fontWeight: g.completed && g.score2 > g.score1 ? 800 : 600, fontSize: '.86rem', color: g.completed && g.score2 < g.score1 ? '#8E8E93' : '#0A0A0A' }}>{tName(g.team2_id)}</span>
                                </div>
                              </div>
                              {g.completed && (
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '1.4rem', fontWeight: 900, lineHeight: 1.1, color: +g.score1 > +g.score2 ? '#34C759' : '#8E8E93' }}>{g.score1}</div>
                                  <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '1.4rem', fontWeight: 900, lineHeight: 1.1, color: +g.score2 > +g.score1 ? '#34C759' : '#8E8E93' }}>{g.score2}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )
              })}
          </div>
        )}

        {/* STANDINGS TAB */}
        {activeTab === 'standings' && (
          <div className="fade-up">
            <Standings teams={teams} games={games} />
            {games.filter(g => g.completed).length === 0 && (
              <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>🏆</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Standings Update Live</div>
                <div style={{ color: '#8E8E93', fontSize: '.84rem' }}>Standings appear here as scores are entered.</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky register button */}
      {spots > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'rgba(247,247,247,.95)', backdropFilter: 'blur(10px)', borderTop: '1px solid #E5E5E5', zIndex: 40 }}>
          <button onClick={onReg} style={{ width: '100%', padding: 15, fontSize: '.86rem', background: accentColor, color: accentText, border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: .8 }}>
            Register Your Team — ${t.entry_fee}/player →
          </button>
        </div>
      )}
    </div>
  )
}