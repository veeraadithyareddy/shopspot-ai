import { useState } from 'react'
import Modal from './Modal.jsx'

export default function ProductModal({ mode, initialProduct, onCancel, onSave }) {
  const isEdit = mode === 'edit'
  const [name, setName] = useState(initialProduct?.name || '')
  const [price, setPrice] = useState(initialProduct?.price ?? '')
  const [stockQty, setStockQty] = useState(initialProduct?.stockQty ?? '')
  const [available, setAvailable] = useState(initialProduct?.available ?? true)
  const [saving, setSaving] = useState(false)

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
        <input
          placeholder="Enter Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

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
