import { useRef, useState } from 'react'
import Modal from './Modal.jsx'
import CameraCapture from './CameraCapture.jsx'
import api from '../api.js'

export default function ProductModal({ mode, initialProduct, onCancel, onSave }) {
  const isEdit = mode === 'edit'
  const [name, setName] = useState(initialProduct?.name || '')
  const [price, setPrice] = useState(initialProduct?.price ?? '')
  const [stockQty, setStockQty] = useState(initialProduct?.stockQty ?? '')
  const [available, setAvailable] = useState(initialProduct?.available ?? true)
  const [saving, setSaving] = useState(false)

  const [recognizing, setRecognizing] = useState(false)
  const [recognizeNote, setRecognizeNote] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const fileInputRef = useRef(null)

  // Sends a photo (from the live camera capture or the file picker) to the
  // backend for AI recognition, and drops the suggested name into the
  // editable Product Name field.
  async function recognizePhoto(file) {
    setRecognizing(true)
    setRecognizeNote('')
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('/seller/products/image-recognize', formData)
      if (res.data.recognized) {
        setName(res.data.productName)
        setRecognizeNote(`🪄 Recognized as "${res.data.productName}" - edit if that's not quite right.`)
      } else {
        setRecognizeNote(res.data.message || "Couldn't identify that product - try a clearer photo or type it in.")
      }
    } catch (err) {
      const detail = err?.response?.data?.error
      setRecognizeNote(detail || 'Could not process that photo. Try again.')
    } finally {
      setRecognizing(false)
    }
  }

  function handlePhotoSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow selecting the same file again later
    if (!file) return
    recognizePhoto(file)
  }

  function handleCameraCapture(file) {
    setShowCamera(false)
    recognizePhoto(file)
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        price: price === '' ? 0 : parseFloat(price),
        stockQty: stockQty === '' ? 0 : parseInt(stockQty, 10),
        available,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onCancel}>
      <div className="modal-header">
        <h3>{isEdit ? 'Edit Product' : 'Add Product'}</h3>
        <button className="modal-close" onClick={onCancel}>×</button>
      </div>

      <div className="modal-field">
        <label>Product Name</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ flex: 1 }}
            placeholder="Enter Product Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowCamera(true)}
            disabled={recognizing}
            title="Take a photo to auto-fill the name"
          >
            {recognizing ? '…' : '📷'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={recognizing}
            title="Upload a photo from your device"
          >
            {recognizing ? '…' : '🖼️'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoSelected}
          />
        </div>
        <p className="muted" style={{ marginTop: 6, fontSize: 12 }}>📷 Take a photo &nbsp;·&nbsp; 🖼️ Upload from device</p>
        {recognizeNote && <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>{recognizeNote}</p>}
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
          onFallbackToFile={() => {
            setShowCamera(false)
            fileInputRef.current?.click()
          }}
        />
      )}

      <div className="modal-row">
        <div className="modal-field">
          <label>Price (₹)</label>
          <input type="number" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="modal-field">
          <label>Stock Qty</label>
          <input type="number" placeholder="0" value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
        </div>
      </div>

      <label style={{ fontSize: 12, color: '#666', fontWeight: 600, display: 'block', marginBottom: 8 }}>
        Availability
      </label>
      <div className="availability-toggle">
        <div className="availability-option" onClick={() => setAvailable(true)}>
          <span className={`availability-dot ${available ? 'selected-available' : ''}`} />
          Available
        </div>
        <div className="availability-option" onClick={() => setAvailable(false)}>
          <span className={`availability-dot ${!available ? 'selected-unavailable' : ''}`} />
          Out of Stock
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button className="btn-save" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? 'Saving…' : isEdit ? 'Update Product' : 'Save Product'}
        </button>
      </div>
    </Modal>
  )
}