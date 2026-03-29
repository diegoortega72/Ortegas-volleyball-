import { useState } from 'react'
import { COLORS } from '../lib/supabase'

export default function RegisterPage({ t, onBack, onSubmit }) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [cap, setCap] = useState('')
  const [phone, setPhone] = useState('')
  const [players, setPlayers] = useState(4)
  const [roster, setRoster] = useState(Array(6).fill({ name: '', ranking: '' }))
  const [pay, setPay] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const fee = players * (t?.entry_fee || 25)

  const updateRoster = (i, field, val) => {
    const r = [...roster]
    r[i] = { ...r[i], [field]: val }
    setRoster(r)
  }

  const go = async () => {
    setSaving(true)
    const rosterData = roster.slice(0, players).filter(r => r.name)
    const ok = await onSubmit({
      name, captain: cap, phone, players, paid: pay,
      roster: JSON.stringify(rosterData),
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    })
    setSaving(false)
    if (ok !== false) setDone(true)
  }

  if (done) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
      <div style={{ textAlign: 'center', maxWidth: 380, width: '100%' }}>
        <div style={{ width: 72, height: 72, background: '#E8FF00', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 24px' }}>✓</div>
        <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '3rem', fontWeight: 900, fontStyle: 'italic', color: '#E8FF00', lineHeight: .88, textTransform: 'uppercase', marginBottom: 10 }}>YOU'RE IN.</div>
        <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginBottom: 24 }}>{name}</div>
        <div style={{ background: '#111', borderRadius: 16, padding: 20, marginBottom: 24, textAlign: 'left' }}>
          {[['Date', t?.date], ['Venue', t?.venue], ['Check-in', (t?.captains_meeting || '8:30 AM') + " — Don't be late"], ['Entry', '$' + fee], ['Payment', pay ? 'Online ✓' : 'Pay at check-in']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #1C1C1E', fontSize: '.82rem' }}>
              <span style={{ color: '#555' }}>{k}</span>
              <span style={{ color: '#fff', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
            </div>
          ))}
        </div>
        <button onClick={onBack} style={{ width: '100%', padding: 15, background: '#E8FF00', color: '#0A0A0A', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '.9rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>
          Back to Tournament
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F7' }}>
      {/* Header */}
      <div style={{ background: '#0A0A0A', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1, padding: 4 }}>←</button>
        <div style={{ flex: 1, display: 'flex', gap: 6 }}>
          {['Team', 'Players', 'Roster', 'Payment'].map((s, i) => (
            <div key={i} style={{ flex: 1, height: 3, background: step > i + 1 ? '#E8FF00' : step === i + 1 ? '#555' : '#1C1C1E', borderRadius: 2, transition: 'background .3s' }} />
          ))}
        </div>
        <div style={{ fontSize: '.75rem', color: '#555', fontWeight: 600 }}>{step} of 4</div>
      </div>

      <div style={{ maxWidth: 460, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* STEP 1 - Team Info */}
        {step === 1 && (
          <div>
            <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '2rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', marginBottom: 6 }}>Team Info</div>
            <div style={{ color: '#8E8E93', fontSize: '.86rem', marginBottom: 28 }}>Tell us about your team</div>
            {[
              { label: 'Team Name', val: name, set: setName, placeholder: 'e.g. Sand Devils' },
              { label: "Captain's Name", val: cap, set: setCap, placeholder: 'e.g. John Ortega' },
              { label: "Captain's Phone", val: phone, set: setPhone, placeholder: '214-555-0123', type: 'tel' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: '#8E8E93', marginBottom: 8 }}>{f.label}</div>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} type={f.type || 'text'}
                  style={{ width: '100%', padding: '14px 16px', border: '1.5px solid #E5E5E5', borderRadius: 10, fontSize: '.9rem', fontFamily: 'Inter,sans-serif', background: '#fff', color: '#0A0A0A', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <button disabled={!name || !cap || !phone} onClick={() => setStep(2)}
              style={{ width: '100%', padding: 16, background: !name || !cap || !phone ? '#C7C7CC' : '#0A0A0A', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '.9rem', cursor: !name || !cap || !phone ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Inter,sans-serif' }}>
              Continue →
            </button>
          </div>
        )}

        {/* STEP 2 - Players */}
        {step === 2 && (
          <div>
            <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '2rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', marginBottom: 6 }}>Your Squad</div>
            <div style={{ color: '#8E8E93', fontSize: '.86rem', marginBottom: 28 }}>How many players?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 32 }}>
              {[4, 5, 6].map(n => (
                <button key={n} onClick={() => setPlayers(n)}
                  style={{ padding: '24px 12px', background: players === n ? '#0A0A0A' : '#fff', color: players === n ? '#fff' : '#0A0A0A', border: `2px solid ${players === n ? '#0A0A0A' : '#E5E5E5'}`, borderRadius: 14, cursor: 'pointer', textAlign: 'center', fontFamily: 'Inter,sans-serif', display: 'block', width: '100%' }}>
                  <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '2.5rem', fontWeight: 900, fontStyle: 'italic', lineHeight: 1 }}>{n}</div>
                  <div style={{ fontSize: '.8rem', fontWeight: 600, marginTop: 6 }}>players</div>
                  <div style={{ fontSize: '.9rem', fontWeight: 700, marginTop: 8, color: players === n ? '#E8FF00' : '#8E8E93' }}>${n * (t?.entry_fee || 25)}</div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} className="btn btn-outline" style={{ padding: 15, flex: '0 0 70px' }}>←</button>
              <button onClick={() => setStep(3)} className="btn btn-dark" style={{ flex: 1, padding: 15 }}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 3 - Roster */}
        {step === 3 && (
          <div>
            <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '2rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', marginBottom: 6 }}>Roster</div>
            <div style={{ color: '#8E8E93', fontSize: '.86rem', marginBottom: 28 }}>Add your {players} players and their ranking</div>
            {Array.from({ length: players }).map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 12, border: '1.5px solid #E5E5E5' }}>
                <div style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: '#8E8E93', marginBottom: 10 }}>
                  Player {i + 1}{i === 0 ? ' (Captain)' : ''}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: '.65rem', color: '#8E8E93', marginBottom: 4 }}>Full Name</div>
                    <input value={roster[i]?.name || ''} onChange={e => updateRoster(i, 'name', e.target.value)}
                      placeholder="Player name"
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E5E5', borderRadius: 8, fontSize: '.86rem', fontFamily: 'Inter,sans-serif', background: '#F7F7F7', color: '#0A0A0A', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '.65rem', color: '#8E8E93', marginBottom: 4 }}>Ranking</div>
                    <input value={roster[i]?.ranking || ''} onChange={e => updateRoster(i, 'ranking', e.target.value)}
                      placeholder="e.g. A, B, C"
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E5E5', borderRadius: 8, fontSize: '.86rem', fontFamily: 'Inter,sans-serif', background: '#F7F7F7', color: '#0A0A0A', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setStep(2)} className="btn btn-outline" style={{ padding: 15, flex: '0 0 70px' }}>←</button>
              <button onClick={() => setStep(4)} className="btn btn-dark" style={{ flex: 1, padding: 15 }}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 4 - Payment */}
        {step === 4 && (
          <div>
            <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '2rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', marginBottom: 6 }}>Payment</div>
            <div style={{ color: '#8E8E93', fontSize: '.86rem', marginBottom: 20 }}>How will you pay?</div>
            <div style={{ background: '#0A0A0A', borderRadius: 16, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#555', fontSize: '.8rem' }}>{name} · {players} players</div>
              <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '2.8rem', fontWeight: 900, fontStyle: 'italic', color: '#E8FF00' }}>${fee}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {[
                t?.show_checkin !== false && { v: false, icon: '💵', title: t?.checkin_label || 'Pay at Check-in', desc: t?.checkin_desc || 'Cash or Venmo on game day' },
                t?.show_online !== false && { v: true, icon: '💳', title: t?.online_label || 'Pay Online', desc: t?.online_desc || 'Secure your spot now' },
              ].filter(Boolean).map(o => (
                <div key={o.title} onClick={() => setPay(o.v)}
                  style={{ background: '#fff', border: `2px solid ${pay === o.v ? '#0A0A0A' : '#E5E5E5'}`, borderRadius: 14, padding: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: '1.5rem' }}>{o.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 3 }}>{o.title}</div>
                    <div style={{ fontSize: '.78rem', color: '#8E8E93' }}>{o.desc}</div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${pay === o.v ? '#0A0A0A' : '#E5E5E5'}`, background: pay === o.v ? '#0A0A0A' : 'transparent', flexShrink: 0 }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(3)} className="btn btn-outline" style={{ padding: 15, flex: '0 0 70px' }}>←</button>
              <button disabled={saving} onClick={go} className="btn btn-dark" style={{ flex: 1, padding: 15 }}>
                {saving ? <span className="spinner" /> : 'Complete Registration →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}