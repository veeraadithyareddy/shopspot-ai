import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import ProductModal from '../components/ProductModal.jsx'
import DeleteConfirmModal from '../components/DeleteConfirmModal.jsx'
import EditShopModal from '../components/EditShopModal.jsx'
import api from '../api.js'

function formatDate(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SellerDashboard() {
  const { user, logout } = useAuth()
  const [shop, setShop] = useState(null)
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deletingProduct, setDeletingProduct] = useState(null)
  const [showEditShop, setShowEditShop] = useState(false)

  const [bulkText, setBulkText] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkSummary, setBulkSummary] = useState(null)
  const [bulkError, setBulkError] = useState('')

  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => {
    loadShop()
    loadProducts()
  }, [])

  async function loadShop() {
    try {
      const res = await api.get('/seller/shop')
      setShop(res.data)
    } catch (err) {
      const detail = err?.response?.data?.error
      setError(detail ? `Could not load your shop: ${detail}` : 'Could not load your shop. Make sure the backend is running.')
    }
  }

  async function loadProducts() {
    try {
      const res = await api.get('/seller/products')
      setProducts(res.data)
    } catch (err) {
      setError('Could not load products.')
    }
  }

  async function handleAddProduct(data) {
    await api.post('/seller/products', data)
    setShowAddModal(false)
    loadProducts()
  }

  async function handleUpdateProduct(data) {
    await api.put(`/seller/products/${editingProduct.id}`, data)
    setEditingProduct(null)
    loadProducts()
  }

  async function handleDeleteProduct() {
    await api.delete(`/seller/products/${deletingProduct.id}`)
    setDeletingProduct(null)
    loadProducts()
  }

  async function handleSaveShop(data) {
    const res = await api.put('/seller/shop', data)
    setShop(res.data)
    setShowEditShop(false)
  }

  async function handleBulkUpdate(e) {
    e.preventDefault()
    if (!bulkText.trim()) return
    setBulkBusy(true)
    setBulkError('')
    setBulkSummary(null)
    try {
      const res = await api.post('/seller/products/bulk-update', { text: bulkText.trim() })
      setBulkSummary(res.data.summary)
      setProducts(res.data.products)
      setBulkText('')
    } catch (err) {
      const detail = err?.response?.data?.error
      setBulkError(detail || 'Could not process that. Try again.')
    } finally {
      setBulkBusy(false)
    }
  }

  // --- Voice input for the "Quick Update with AI" box below ---
  // Speak in any language (Hindi, Tamil, Telugu, English, mixed) - Groq's
  // Whisper model transcribes it, then it lands in bulkText for review
  // before the seller hits Apply. Nothing is saved just from speaking.
  async function startRecording() {
    setBulkError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await sendForTranscription(audioBlob)
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch (err) {
      setBulkError('Could not access the microphone. Check your browser permissions.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  async function sendForTranscription(audioBlob) {
    setTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'voice_entry.webm')
      const res = await api.post('/seller/products/voice-transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      // Append rather than overwrite, in case they'd already typed something
      setBulkText((prev) => (prev.trim() ? prev.trim() + '. ' + res.data.text : res.data.text))
    } catch (err) {
      const detail = err?.response?.data?.error
      setBulkError(detail || 'Could not transcribe that recording. Try again.')
    } finally {
      setTranscribing(false)
    }
  }

  const hasLocation = shop && shop.latitude != null && shop.longitude != null
  const shopLocationLabel = shop
    ? [shop.areaLocality, shop.city].filter(Boolean).join(', ') || shop.address || 'Location not set'
    : ''

  return (
    <div className="seller-dashboard">
      <header className="seller-topbar">
        <div className="brand" style={{ color: 'var(--ink)' }}>
          <img src="/images/shop-icon.png" alt="" className="brand-icon-img" /> Shop Spot
        </div>
        {shop && (
          <div className="seller-topbar-right">
            <div className="seller-shop-badge">
              <img src="/images/shop-icon.png" alt="" className="seller-shop-badge-icon-img" />
              <div className="seller-shop-badge-text">
                <div className="name">{shop.name}</div>
                <div className="loc">📍 {shopLocationLabel}</div>
              </div>
            </div>
            <button className="logout-btn" onClick={logout}>Logout ⏻</button>
          </div>
        )}
        {!shop && <button className="logout-btn" onClick={logout}>Logout ⏻</button>}
      </header>

      {error && <div className="banner banner-error">{error}</div>}
      {shop && !hasLocation && (
        <div className="banner banner-error">
          Your shop has no location set — consumers searching for your products won't find you. Click "Edit Shop" and save your address to fix this.
        </div>
      )}

      <div className="seller-body">
        <div className="seller-welcome">
          <h1>Welcome back!</h1>
          <p>Manage your shop and update today's available products.</p>
        </div>

        {shop && (
          <div className="card shop-info-card">
            <div className="shop-info-left">
              <img src="/images/shop-icon.png" alt="" className="shop-info-icon-img" />
              <div>
                <div className="label">Shop information</div>
                <div className="name">{shop.name}</div>
                <div className="loc">📍 {shopLocationLabel}</div>
              </div>
            </div>
            <button className="btn-secondary" onClick={() => setShowEditShop(true)}>✏️ Edit Shop</button>
          </div>
        )}

        <div className="card">
          <div className="products-card-header">
            <div>
              <h2>✨ Quick Update with AI</h2>
              <p>Describe changes in plain English — e.g. "rice is out of stock, dal is now 140, add paneer at 90 rupees with 10 in stock"</p>
            </div>
          </div>
          <form onSubmit={handleBulkUpdate} style={{ display: 'flex', gap: 10 }}>
            <input
              style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 14 }}
              placeholder={transcribing ? 'Listening to your recording…' : 'Tell me what changed, or tap 🎤 to speak…'}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              disabled={bulkBusy || transcribing}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={recording ? stopRecording : startRecording}
              disabled={bulkBusy || transcribing}
              title={recording ? 'Stop recording' : 'Speak in any language'}
              style={recording ? { background: 'var(--danger)', color: '#fff' } : undefined}
            >
              {recording ? '⏹ Stop' : '🎤'}
            </button>
            <button className="btn-primary" type="submit" disabled={bulkBusy || transcribing || !bulkText.trim()}>
              {bulkBusy ? 'Thinking…' : 'Apply'}
            </button>
          </form>
          {recording && <p className="muted" style={{ marginTop: 8 }}>🔴 Recording… tap Stop when you're done speaking.</p>}
          {transcribing && <p className="muted" style={{ marginTop: 8 }}>Transcribing your recording…</p>}
          {bulkError && <p className="muted" style={{ color: 'var(--danger)', marginTop: 10 }}>{bulkError}</p>}
          {bulkSummary && (
            <ul style={{ marginTop: 12, paddingLeft: 20, fontSize: 14 }}>
              {bulkSummary.map((line, i) => <li key={i} style={{ marginBottom: 4 }}>{line}</li>)}
              {bulkSummary.length === 0 && <li className="muted">Nothing was changed — try rephrasing.</li>}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="products-card-header">
            <div>
              <h2>Your Products</h2>
              <p>Update the availability of your products</p>
            </div>
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Add Products</button>
          </div>

          <table className="product-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Price (₹)</th>
                <th>Stock</th>
                <th>Availability</th>
                <th>Last Update</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.price != null ? `₹${p.price}` : '—'}</td>
                  <td>{p.stockQty}</td>
                  <td>
                    <span className={`badge ${p.available ? 'available' : 'unavailable'}`}>
                      {p.available ? 'Available' : 'Out of Stock'}
                    </span>
                  </td>
                  <td className="muted">{formatDate(p.updatedAt)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-edit" onClick={() => setEditingProduct(p)}>✏️ Edit</button>
                      <button className="btn-delete" onClick={() => setDeletingProduct(p)}>🗑 Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan="6" className="muted">No products yet. Add your first one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <ProductModal
          mode="add"
          onCancel={() => setShowAddModal(false)}
          onSave={handleAddProduct}
        />
      )}

      {editingProduct && (
        <ProductModal
          mode="edit"
          initialProduct={editingProduct}
          onCancel={() => setEditingProduct(null)}
          onSave={handleUpdateProduct}
        />
      )}

      {deletingProduct && (
        <DeleteConfirmModal
          productName={deletingProduct.name}
          onCancel={() => setDeletingProduct(null)}
          onConfirm={handleDeleteProduct}
        />
      )}

      {showEditShop && shop && (
        <EditShopModal
          shop={shop}
          onCancel={() => setShowEditShop(false)}
          onSave={handleSaveShop}
        />
      )}
    </div>
  )
}