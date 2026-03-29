import { useState, useEffect } from 'react'

export default function LoginPage({ t, onBack, onSuccess }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)
  const [loading, setLoading] = useState(false)

  const go = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    setLoading(false)
    if (pw === t?.host_password) { onSuccess() }
    else { setErr(true); setTimeout(() => setErr(false), 2000) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
      <div style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
        <div style={{ fontFamily: 'Barlow,sans-serif', color: '#E8FF00', fontWeight: 900, fontSize: '1.1rem', letterSpacing: 3, fontStyle: 'italic', marginBottom: 40 }}>TOURNEY FLOW</div>
        <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: '1.8rem', fontWeight: 900, fontStyle: 'italic', color: '#fff', textTransform: 'uppercase', marginBottom: 6 }}>Host Login</div>
        <div style={{ color: '#555', fontSize: '.82rem', marginBottom: 24 }}>Enter your password to manage this tournament</div>
        <input
          className="inp-dark"
          type="password"
          placeholder="Password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
          style={{ marginBottom: err ? 8 : 16, borderColor: err ? '#FF3B30' : 'transparent' }}
        />
        {err && <div style={{ color: '#FF3B30', fontSize: '.78rem', marginBottom: 12, fontWeight: 600 }}>Incorrect password</div>}
        <button className="btn btn-accent" style={{ width: '100%', padding: 15, marginBottom: 12 }} onClick={go} disabled={loading || !pw}>
          {loading ? <span className="spinner spinner-dark" /> : 'Enter Dashboard →'}
        </button>
        <button className="btn btn-outline" style={{ width: '100%', background: 'transparent', border: '1px solid #2C2C2E', color: '#555' }} onClick={onBack}>← Back</button>
      </div>
    </div>
  )
}