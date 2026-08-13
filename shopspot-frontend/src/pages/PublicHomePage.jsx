import { useState } from 'react'
import { geocodeAddress, getCurrentPosition, reverseGeocode } from '../geocode.js'

export default function PublicHomePage({ onSearch, onRecipeSearch, onSellerSignIn }) {
  const [mode, setMode] = useState('product') // 'product' | 'recipe'
  const [locationText, setLocationText] = useState('')
  const [queryText, setQueryText] = useState('')
  const [error, setError] = useState('')
  const [locating, setLocating] = useState(false)

  async function handleUseGps() {
    setLocating(true)
    setError('')
    try {
      const { lat, lng } = await getCurrentPosition()
      const address = await reverseGeocode(lat, lng)
      setLocationText(address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLocating(false)
    }
  }

  async function resolveLocation() {
    if (locationText.trim()) {
      const result = await geocodeAddress(locationText.trim())
      if (!result) {
        setError('Could not find that location. Try a more specific address, or use GPS.')
        return null
      }
      return { lat: result.lat, lng: result.lng }
    }
    try {
      return await getCurrentPosition()
    } catch (err) {
      setError('Enter a location above, or allow GPS access, to search nearby shops.')
      return null
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!queryText.trim()) {
      setError(mode === 'recipe' ? 'Tell me what you have or feel like eating.' : "Enter something you're looking for.")
      return
    }
    setError('')

    const location = await resolveLocation()
    if (!location) return

    if (mode === 'recipe') {
      onRecipeSearch({ query: queryText.trim(), location })
    } else {
      onSearch({ query: queryText.trim(), location })
    }
  }

  return (
    <div className="landing-page">
      <header className="landing-topbar">
        <div className="brand"><img src="/images/shop-icon.png" alt="" className="brand-icon-img" /> Shop Spot</div>
        <div className="landing-topbar-actions">
          <button className="ghost" type="button">About us</button>
          <button onClick={onSellerSignIn} type="button">Seller sign in</button>
        </div>
      </header>

      <div className="landing-hero">
        <img src="/images/grocery-bag-illustration.png" alt="" className="hero-illustration hero-illustration-left" />
        <img src="/images/cart-illustration.png" alt="" className="hero-illustration hero-illustration-right" />

        <h1>FIND THE NEAREST SHOPS.<br />SAVE TIME, <span className="accent">SHOP SMART.</span></h1>

        <div className="mode-toggle">
          <button
            type="button"
            className={mode === 'product' ? 'active' : ''}
            onClick={() => { setMode('product'); setError('') }}
          >
            🔍 Find a product
          </button>
          <button
            type="button"
            className={mode === 'recipe' ? 'active' : ''}
            onClick={() => { setMode('recipe'); setError('') }}
          >
            🍳 What can I cook?
          </button>
        </div>

        {error && <div className="auth-error" style={{ maxWidth: 600, marginBottom: 12 }}>{error}</div>}

        <form className="landing-search" onSubmit={handleSubmit}>
          <div className="landing-search-field">
            <span className="icon">📍</span>
            <input
              placeholder="Enter your location"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
            />
            <button type="button" className="link-btn" onClick={handleUseGps} disabled={locating}>
              {locating ? '…' : '⌖'}
            </button>
          </div>
          <div className="landing-search-field">
            <span className="icon">{mode === 'recipe' ? '🍳' : '🔍'}</span>
            <input
              placeholder={mode === 'recipe' ? 'e.g. "I only have rice, what can I make?"' : 'Search for grocery, item or more'}
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
            />
          </div>
          <button type="submit" className="landing-search-submit">
            {mode === 'recipe' ? 'Get recipe ideas' : 'Search'}
          </button>
        </form>

        <div className="landing-about">
          <h3>about us:</h3>
          <p>
            <span className="accent">ShopSpot</span> is a smart product discovery platform that connects customers
            with nearby local shops. Our goal is to make finding everyday products faster, easier, and more convenient.
          </p>
        </div>
      </div>
    </div>
  )
}
