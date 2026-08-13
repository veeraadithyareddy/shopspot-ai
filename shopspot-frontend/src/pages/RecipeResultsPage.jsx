import { useEffect, useState } from 'react'
import api from '../api.js'

function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

export default function RecipeResultsPage({ query, location, onBack }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    runSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runSearch() {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/consumer/recipe-search', {
        params: { query, lat: location.lat, lng: location.lng, radiusKm: 10 },
      })
      setRecipes(res.data.recipes || [])
    } catch (err) {
      const detail = err?.response?.data?.error
      setError(detail || 'Could not get recipe ideas right now. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="results-page">
      <header className="results-topbar">
        <button className="results-back-btn" onClick={onBack}>← Home</button>
        <div style={{ color: 'white', fontWeight: 600 }}>🍳 "{query}"</div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        {loading && <p className="muted">Thinking of recipes and checking nearby shops…</p>}
        {error && <div className="banner banner-error">{error}</div>}

        {!loading && !error && recipes.length === 0 && (
          <p className="empty-state">No recipe ideas came back. Try rephrasing what you have.</p>
        )}

        {recipes.map((recipe, i) => (
          <div key={i} className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 4px' }}>{recipe.name}</h2>
            <p className="muted" style={{ marginBottom: 14 }}>
              Ingredients: {recipe.ingredients.join(', ')}
            </p>

            {recipe.shopMatches.length === 0 && (
              <p className="empty-state">No nearby shops stock any of these ingredients yet.</p>
            )}

            {recipe.shopMatches.map((match) => (
              <div
                key={match.shopId}
                style={{
                  border: `1px solid ${match.complete ? 'var(--success)' : 'var(--line)'}`,
                  borderRadius: 10, padding: 14, marginBottom: 10,
                  background: match.complete ? 'var(--success-bg)' : 'white',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong>{match.shopName}</strong>
                  <span className="muted">{formatDistance(match.distanceKm)}</span>
                </div>
                <div style={{ margin: '6px 0' }}>
                  {match.complete ? (
                    <span className="badge available">✓ Has everything for this recipe</span>
                  ) : (
                    <span className="badge unavailable">{match.matchedCount} of {match.totalCount} ingredients</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {match.items.map((item, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: 12, padding: '4px 10px', borderRadius: 999,
                        background: item.available ? '#eaf6ef' : '#f5f0e8',
                        color: item.available ? 'var(--success)' : '#999',
                        textDecoration: item.available ? 'none' : 'line-through',
                      }}
                    >
                      {item.ingredient}{item.available && item.price != null ? ` — ₹${item.price}` : ''}
                    </span>
                  ))}
                </div>
                <a
                  className="result-directions"
                  style={{ marginTop: 10, display: 'inline-block', maxWidth: 200 }}
                  href={match.directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Get directions →
                </a>
              </div>
            ))}

            {recipe.comboPlan && recipe.comboPlan.length > 0 && (
              <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px dashed var(--line)' }}>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>
                  🛍️ No single shop has everything — here's a plan across {recipe.comboPlan.length} shop{recipe.comboPlan.length === 1 ? '' : 's'}:
                </p>
                {recipe.comboPlan.map((match, idx) => (
                  <div
                    key={match.shopId}
                    style={{
                      border: '1px solid var(--teal-light)', borderRadius: 10, padding: 14, marginBottom: 10,
                      background: '#f0f7f5',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <strong>Stop {idx + 1}: {match.shopName}</strong>
                      <span className="muted">{formatDistance(match.distanceKm)}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {match.items.map((item, i2) => (
                        <span
                          key={i2}
                          style={{
                            fontSize: 12, padding: '4px 10px', borderRadius: 999,
                            background: '#dff0ea', color: 'var(--teal)',
                          }}
                        >
                          {item.ingredient}{item.price != null ? ` — ₹${item.price}` : ''}
                        </span>
                      ))}
                    </div>
                    <a
                      className="result-directions"
                      style={{ marginTop: 10, display: 'inline-block', maxWidth: 200 }}
                      href={match.directionsUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Get directions →
                    </a>
                  </div>
                ))}
                {recipe.unavailableIngredients && recipe.unavailableIngredients.length > 0 && (
                  <p className="muted" style={{ color: 'var(--danger)' }}>
                    Couldn't find nearby: {recipe.unavailableIngredients.join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
