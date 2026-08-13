import { useEffect, useState } from 'react'
import NearbyMap from '../components/NearbyMap.jsx'
import api from '../api.js'

function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

export default function SearchResultsPage({ initialQuery, initialLocation, onBack }) {
  const [query, setQuery] = useState(initialQuery)
  const [location] = useState(initialLocation)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedProductId, setSelectedProductId] = useState(null)
  const [aiNote, setAiNote] = useState(null)

  useEffect(() => {
    runSearch(initialQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runSearch(q) {
    if (!q.trim() || !location) return
    setLoading(true)
    setError('')
    setSelectedProductId(null)
    setAiNote(null)
    try {
      const res = await api.get('/consumer/smart-search', {
        params: { query: q.trim(), lat: location.lat, lng: location.lng, radiusKm: 300 },
      })
      const { results: data, interpretedKeywords, usedAi } = res.data
      setResults(data)
      if (data.length > 0) setSelectedProductId(data[0].productId)
      if (usedAi && interpretedKeywords?.length) {
        setAiNote(`Searched for: ${interpretedKeywords.join(', ')}`)
      }
    } catch (err) {
      setError('Search failed. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault()
    runSearch(query)
  }

  const selectedResult = results.find((r) => r.productId === selectedProductId) || null

  return (
    <div className="results-page">
      <header className="results-topbar">
        <button className="results-back-btn" onClick={onBack}>← Home</button>
        <form onSubmit={handleSearchSubmit}>
          <input
            placeholder="Search for grocery, item or more"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      </header>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="results-layout">
        <aside className="results-sidebar">
          <div className="results-sidebar-header">
            <h2>{loading ? 'Searching…' : `${results.length} shop${results.length === 1 ? '' : 's'} found — nearest first`}</h2>
            {aiNote && <p className="muted" style={{ marginTop: 4 }}>✨ {aiNote}</p>}
          </div>

          <ul className="results-list">
            {results.map((r) => (
              <li
                key={r.productId}
                className={`result-card ${selectedProductId === r.productId ? 'result-card--active' : ''}`}
                onClick={() => setSelectedProductId(r.productId)}
              >
                <div className="result-card-top">
                  <span className="result-name">{r.shopName}</span>
                  <span className="result-distance">{formatDistance(r.distanceKm)}</span>
                </div>
                <span className="result-category">{r.shopCategory}</span>
                <span className="result-detail">{r.productName} — ₹{r.price} · {r.stockQty} in stock</span>
                <span className="result-detail">{r.shopIsOpenNow ? '🟢 Open now' : '🔴 Closed'}</span>
                <a
                  className="result-directions"
                  href={r.directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  Get directions →
                </a>
              </li>
            ))}
            {!loading && results.length === 0 && (
              <p className="empty-state">No shops currently have "{query}" in stock. Try a different search term.</p>
            )}
          </ul>
        </aside>

        <section className="results-map-pane">
          <NearbyMap
            consumerLocation={location}
            results={results}
            selectedResult={selectedResult}
            onSelect={setSelectedProductId}
          />
        </section>
      </div>
    </div>
  )
}
