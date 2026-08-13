import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { useEffect, useRef } from 'react'
import L from 'leaflet'

const pinIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function ClickToMove({ onChange }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function RecenterOnChange({ lat, lng }) {
  const map = useMap()
  const didInitialCenter = useRef(false)
  useEffect(() => {
    if (lat != null && lng != null && !didInitialCenter.current) {
      map.setView([lat, lng], 16)
      didInitialCenter.current = true
    }
  }, [lat, lng, map])
  return null
}

// Default fallback center if no coordinates are set yet (Chennai)
const DEFAULT_CENTER = [13.0827, 80.2707]

export default function LocationPicker({ lat, lng, onChange, height = 220 }) {
  const hasPosition = lat != null && lng != null
  const center = hasPosition ? [lat, lng] : DEFAULT_CENTER

  return (
    <div style={{ height, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)' }}>
      <MapContainer center={center} zoom={hasPosition ? 16 : 12} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToMove onChange={onChange} />
        <RecenterOnChange lat={lat} lng={lng} />
        {hasPosition && (
          <Marker
            position={[lat, lng]}
            icon={pinIcon}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const pos = e.target.getLatLng()
                onChange(pos.lat, pos.lng)
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}
