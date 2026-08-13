import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { geocodeAddress, getCurrentPosition } from '../geocode.js'
import LocationPicker from '../components/LocationPicker.jsx'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi',
]

export default function SellerAuthPage({ onBack }) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [locationStatus, setLocationStatus] = useState('') // '', 'checking', 'found', 'not-found'

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    shopName: '', addressLine1: '', areaLocality: '', city: '', state: '', pinCode: '',
    latitude: '', longitude: '',
  })

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    if (['addressLine1', 'areaLocality', 'city', 'state', 'pinCode'].includes(field)) {
      setLocationStatus('')
    }
  }

  function buildCombinedAddress() {
    return [form.addressLine1, form.areaLocality, form.city, form.state, form.pinCode]
      .filter((p) => p && p.trim()).join(', ')
  }

  async function findLocation() {
    const combined = buildCombinedAddress()
    if (!combined) {
      setError('Enter your shop address first.')
      return
    }
    setLocationStatus('checking')
    setError('')
    const result = await geocodeAddress(combined)
    if (!result) {
      setLocationStatus('not-found')
      return
    }
    update('latitude', result.lat.toFixed(6))
    update('longitude', result.lng.toFixed(6))
    setLocationStatus('found')
  }

  async function useMyLocation() {
    try {
      const { lat, lng } = await getCurrentPosition()
      update('latitude', lat.toFixed(6))
      update('longitude', lng.toFixed(6))
      setLocationStatus('found')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
    } catch (err) {
      setError(err?.response?.data || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!form.latitude || !form.longitude) {
      setError('Set your shop location using "Find location" or GPS before creating your account.')
      return
    }

    setLoading(true)
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: 'SELLER',
        shopName: form.shopName,
        addressLine1: form.addressLine1,
        areaLocality: form.areaLocality,
        city: form.city,
        state: form.state,
        pinCode: form.pinCode,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
      })
    } catch (err) {
      setError(err?.response?.data || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'login') {
    return (
      <div className="auth-split">
        <div className="auth-split-left">
          <div className="brand"><img src="/images/shop-icon.png" alt="" className="brand-icon-img" /> Shop Spot</div>
          <h1>MANAGE YOUR SHOP<span className="accent">WITH EASE.</span></h1>
          <p>Update products, track availability and connect with nearby customers.</p>
          <img src="/images/cart-illustration.png" alt="" className="auth-illustration" />
        </div>
        <div className="auth-split-right">
          <div className="auth-card">
            <div className="auth-card-icon">👤</div>
            <h2>Welcome Back!</h2>
            <p className="subtitle">sign in to manage your shop and update your products.</p>

            {error && <div className="auth-error">{String(error)}</div>}

            <form onSubmit={handleLogin}>
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Email Address</label>
                <input type="email" placeholder="Enter your email" value={form.email}
                  onChange={(e) => update('email', e.target.value)} required />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" placeholder="Enter your password" value={form.password}
                  onChange={(e) => update('password', e.target.value)} required />
              </div>
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Signing in…' : '→ Sign in'}
              </button>
            </form>

            <div className="auth-switch">
              Don't have an Account?{' '}
              <button onClick={() => { setMode('signup'); setError('') }}>Create Account</button>
            </div>
            {onBack && (
              <div className="auth-switch">
                <button onClick={onBack}>← Back to home</button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-split">
      <div className="auth-split-left">
        <div className="brand"><img src="/images/shop-icon.png" alt="" className="brand-icon-img" /> Shop Spot</div>
        <h1>START YOUR SHOP<span className="accent">JOURNEY TODAY.</span></h1>
        <p>Join ShopSpot to showcase your products, reach nearby customers, and grow your local business.</p>
        <img src="/images/grocery-bag-illustration.png" alt="" className="auth-illustration" />
      </div>
      <div className="auth-split-right">
        <div className="auth-card" style={{ maxWidth: 560 }}>
          <div className="auth-card-icon">👤</div>
          <h2>Create Your Account</h2>
          <p className="subtitle">Register your shop and start managing your products.</p>

          {error && <div className="auth-error">{String(error)}</div>}

          <form onSubmit={handleSignup}>
            <p className="auth-card .section-divider" style={{ textAlign: 'center', fontSize: 12, textTransform: 'uppercase', color: 'var(--teal)', fontWeight: 700, margin: '4px 0 12px' }}>Personal info</p>
            <div className="auth-form-grid">
              <div className="field">
                <label>Owner Name</label>
                <input placeholder="Enter your name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
              </div>
              <div className="field">
                <label>Email Address</label>
                <input type="email" placeholder="Enter your email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" placeholder="Enter your password" value={form.password} onChange={(e) => update('password', e.target.value)} required />
              </div>
              <div className="field">
                <label>Confirm Password</label>
                <input type="password" placeholder="Enter your password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} required />
              </div>
            </div>

            <p style={{ textAlign: 'center', fontSize: 12, textTransform: 'uppercase', color: 'var(--teal)', fontWeight: 700, margin: '20px 0 12px' }}>Shop info</p>
            <div className="auth-form-grid">
              <div className="field">
                <label>Shop Name</label>
                <input placeholder="Enter shop name" value={form.shopName} onChange={(e) => update('shopName', e.target.value)} required />
              </div>
              <div className="field">
                <label>Address Line 1</label>
                <input placeholder="e.g. 25 Gandhi Road" value={form.addressLine1} onChange={(e) => update('addressLine1', e.target.value)} />
              </div>
              <div className="field">
                <label>Area / Locality</label>
                <input placeholder="Enter your area or locality" value={form.areaLocality} onChange={(e) => update('areaLocality', e.target.value)} />
              </div>
              <div className="field">
                <label>City</label>
                <input placeholder="Enter City" value={form.city} onChange={(e) => update('city', e.target.value)} />
              </div>
              <div className="field">
                <label>State</label>
                <select value={form.state} onChange={(e) => update('state', e.target.value)}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>PIN Code</label>
                <input placeholder="Enter 6-digit PIN code" value={form.pinCode} onChange={(e) => update('pinCode', e.target.value)} />
              </div>

              <div className="field location-finder">
                <label>Shop location</label>
                <div className="location-finder-row">
                  <button type="button" onClick={findLocation}>Find location from address</button>
                  <button type="button" onClick={useMyLocation}>Use my GPS</button>
                </div>
                {locationStatus === 'checking' && <p className="location-status">Looking up your address…</p>}
                {locationStatus === 'found' && (
                  <p className="location-status ok">✓ Location set ({parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)})</p>
                )}
                {locationStatus === 'not-found' && (
                  <p className="location-status error">Couldn't find that address — try GPS instead.</p>
                )}
                <p className="muted" style={{ margin: '10px 0 6px' }}>
                  Not quite right? Drag the pin (or tap the map) to your exact spot:
                </p>
                <LocationPicker
                  lat={form.latitude ? parseFloat(form.latitude) : null}
                  lng={form.longitude ? parseFloat(form.longitude) : null}
                  onChange={(newLat, newLng) => {
                    update('latitude', newLat.toFixed(6))
                    update('longitude', newLng.toFixed(6))
                    setLocationStatus('found')
                  }}
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Creating account…' : '👤 Create Account'}
            </button>
          </form>

          <div className="auth-switch">
            Already have an account?{' '}
            <button onClick={() => { setMode('login'); setError('') }}>Sign in</button>
          </div>
          {onBack && (
            <div className="auth-switch">
              <button onClick={onBack}>← Back to home</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
