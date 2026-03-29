import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

export default function TournamentHome() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', date: '', venue: '', city: '', entry_fee: 25, max_teams: 15, host_password: '', slug: '' })
  const up = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    sb.from('tournaments').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setTournaments(data); setLoading(false) })
  }, [])

  const create = async () => {
    if (!form.name || !form.slug || !form.host_password) return
    setSaving(true)
    const { error } = await sb.from('tournaments').insert({ ...form, entry_fee: +form.entry_fee, max_teams: +form.max_teams })
    setSaving(false)
    if (error) { alert('Error: ' + error.message); return }
    window.location.href = '/' + form.slug
  }

  if (creating) return (
    <div style={{ minHeight: '100vh', background: '#F7F7F7' }}>
      <div style={{ background: '#0A0A0A', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => setCreating(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.2rem' }}>←</button>
        <div style={{ fontFamily: 'Barlow,sans-serif', color: '#E8FF00', fontWeight: 900, fontSize: '1rem', letterSpacing: 2, fontStyle: 'italic' }}>NEW TOURNAMENT</div>
      </div>
      <div style={{ maxWidth: 460, margin: '0 auto', padding: '24px 20px' }}>
        {[
          { k: 'name', l: 'Tournament Name', p: 'e.g. Spring Grass Tournament' },
          { k: 'slug', l: 'URL Slug (no spaces)', p: 'e.g. spring-grass-2026' },
          { k: 'date', l: 'Date', p: 'e.g. April 12, 2026' },
          { k: 'venue', l: 'Venue', p: 'e.g. Katelyn Rose Park' },
          { k: 'city', l: 'City, State', p: 'e.g. Mansfield, TX' },
          { k: 'host_password', l: 'Host Password', p: 'Set a password' },
        ].map(x => (
          <div key={x.k} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: '#8E8E93', marginBottom: 6 }}>{x.l}</div>
            <input className="inp" value={form[x.k]} onChange={e => up(x.k, e.target.value)} placeholder={x.p} />
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[{ k: 'entry_fee', l: 'Entry Fee ($)' }, { k: 'max_teams', l: 'Max Teams' }].map(x => (
            <div key={x.k}>
              <div style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: '#8E8E93', marginBottom: 6 }}>{x.l}</div>
              <input className="inp" type="number" value={form[x.k]} onChange={e => up(x.k, e.target.value)} />
            </div>
          ))}
        </div>
        <button disabled={!form.name || !form.slug || !form.host_password || saving} onClick={create}
          style={{ width: '100%', padding: '16px', background: !form.name || !form.slug || !form.host_password ? '#C7C7CC' : '#0A0A0A', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '.9rem', cursor: 'pointer', fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: 1 }}>
          {saving ? 'Creating...' : 'Create Tournament →'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A' }}>
      <div style={{ padding: '28px 20px 16px', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ fontFamily: 'Barlow,sans-serif', color: '#E8FF00', fontWeight: 900, fontSize: '1.4rem', letterSpacing: 3, fontStyle: 'italic', marginBottom: 4 }}>TOURNEY FLOW</div>
        <div style={{ color: '#444', fontSize: '.82rem' }}>Tournament management platform</div>
      </div>
      <div style={{ padding: '16px 20px' }}>
        {loading ? <div style={{ textAlign: 'center', padding: '40px 0', color: '#444' }}>Loading...</div>
          : tournaments.length === 0 ? <div style={{ textAlign: 'center', padding: '40px 0', color: '#444' }}>No tournaments yet</div>
            : tournaments.map(t => (
              <div key={t.id} onClick={() => window.location.href = '/' + t.slug}
                style={{ background: '#111', borderRadius: 14, padding: '16px 18px', marginBottom: 10, cursor: 'pointer', border: '1.5px solid #1a1a1a' }}>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '.96rem', marginBottom: 4 }}>{t.name}</div>
                <div style={{ color: '#555', fontSize: '.78rem' }}>{t.date} · {t.city}</div>
                <div style={{ marginTop: 8 }}>
                  <span style={{ background: '#1a1a1a', color: '#555', padding: '3px 8px', borderRadius: 4, fontSize: '.65rem', fontWeight: 700 }}>{t.slug}</span>
                </div>
              </div>
            ))}
      </div>
    </div>
    <button
          onClick={() => setCreating(true)}
          style={{ width: '100%', padding: '16px', background: '#E8FF00', color: '#0A0A0A', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '.9rem', cursor: 'pointer', fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>
          + Create New Tournament
        </button>
  )
}