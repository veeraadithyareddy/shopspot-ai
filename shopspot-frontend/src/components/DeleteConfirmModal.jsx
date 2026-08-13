import { useState } from 'react'
import Modal from './Modal.jsx'

export default function DeleteConfirmModal({ productName, onCancel, onConfirm }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await onConfirm()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal onClose={onCancel}>
      <div className="delete-modal">
        <div className="icon-circle">🗑</div>
        <h3>Delete "{productName}"?</h3>
        <p>This action cannot be undone</p>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-save" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
