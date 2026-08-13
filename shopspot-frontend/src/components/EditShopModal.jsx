import { useState } from 'react'
import Modal from './Modal.jsx'
import { geocodeAddress, getCurrentPosition } from '../geocode.js'
import LocationPicker from './LocationPicker.jsx'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi',
]

export default function EditShopModal({ shop, onCancel, onSave }) {
  const [name, setName] = useState(shop.name || '')
  const [addressLine1, setAddressLine1] = useState(shop.addressLine1 || '')
  const [areaLocality, setAreaLocality] = useState(shop.areaLocality || '')
  const [city, setCity] = useState(shop.city || '')
  const [state, setState] = useState(shop.state || '')
  const [pinCode, setPinCode] = useState(shop.pinCode || '')
  const [latitude, setLatitude] = useState(shop.latitude ?? null)
  const [longitude, setLongitude] = useState(shop.longitude ?? null)
  const [saving, setSaving] = useState(false)
  const [locationStatus, setLocationStatus] = useState('')

  function buildCombinedAddress() {
    return [addressLine1, areaLocality, city, state, pinCode].filter((p) => p && p.trim()).join(', ')
  }

  async function findLocationFromAddress() {
    const combined = buildCombinedAddress()
    if (!combined) {
      setLocationStatus('Enter an address above first.')
      return
    }
    setLocationStatus('checking')
    const result = await geocodeAddress(combined)
    if (!result) {
      setLocationStatus('not-found')
      return
    }
    setLatitude(result.lat)
    setLongitude(result.lng)
    setLocationStatus('found')
  }

  async function useMyGps() {
    try {
      const { lat, lng } = await getCurrentPosition()
      setLatitude(lat)
      setLongitude(lng)
      setLocationStatus('found')
    } catch (err) {
      setLocationStatus(err.message)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        addressLine1: addressLine1.trim(),
        areaLocality: areaLocality.trim(),
        city: city.trim(),
        state,
        pinCode: pinCode.trim(),
        address: buildCombinedAddress(),
        latitude,
        longitude,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onCancel}>
      <div className="modal-header">
        <h3>Edit Shop Information</h3>
        <button className="modal-close" onClick={onCancel}>×</button>
      </div>

      <div className="modal-field">
        <label>Shop Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="modal-field">
        <label>Address Line 1</label>
        <input placeholder="e.g. 25 Gandhi Road" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
      </div>

      <div className="modal-row">
        <div className="modal-field">
          <label>Area / Locality</label>
          <input value={areaLocality} onChange={(e) => setAreaLocality(e.target.value)} />
        </div>
        <div className="modal-field">
          <label>PIN Code</label>
          <input value={pinCode} onChange={(e) => setPinCode(e.target.value)} />
        </div>
      </div>

      <div className="modal-row">
        <div className="modal-field">
          <label>City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="modal-field">
          <label>State</label>
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="modal-field">
        <label>Shop location</label>
        <div className="location-finder-row" style={{ marginBottom: 10 }}>
          <button type="button" onClick={findLocationFromAddress}>Find from address</button>
          <button type="button" onClick={useMyGps}>Use my GPS</button>
        </div>
        {locationStatus === 'checking' && <p className="location-status">Looking up address…</p>}
        {locationStatus === 'found' && (
          <p className="location-status ok">✓ {latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
        )}
        {locationStatus === 'not-found' && (
          <p className="location-status error">Couldn't find that address — try GPS or the map below.</p>
        )}
        <p className="muted" style={{ margin: '8px 0 6px' }}>
          Drag the pin (or tap the map) to your exact spot:
        </p>
        <LocationPicker
          lat={latitude}
          lng={longitude}
          onChange={(newLat, newLng) => {
            setLatitude(newLat)
            setLongitude(newLng)
            setLocationStatus('found')
          }}
        />
      </div>

      <div className="modal-actions">
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button className="btn-save" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  )
}
