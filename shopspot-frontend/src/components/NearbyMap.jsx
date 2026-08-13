import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useEffect, useRef } from 'react'
import L from 'leaflet'

// Every marker below gets an explicit icon object - never rely on Leaflet's
// built-in default icon fallback, since that path breaks under Vite's
// bundling (icon URLs don't resolve, causing a hard crash on unmount/remount).

const consumerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'consumer-marker',
})

const shopIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// Selected shop gets a bigger, gold-tinted pin so it's obvious which one is active
const selectedShopIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [34, 52],
  iconAnchor: [17, 52],
  popupAnchor: [1, -44],
  shadowSize: [52, 52],
  className: 'selected-marker',
})

function FlyToSelected({ consumerLocation, selectedResult }) {
  const map = useMap()
  const hasFitOnce = useRef(false)

  useEffect(() => {
    if (selectedResult && selectedResult.shopLatitude && selectedResult.shopLongitude) {
      map.flyTo([selectedResult.shopLatitude, selectedResult.shopLongitude], 16, { duration: 0.6 })
    } else if (consumerLocation && !hasFitOnce.current) {
      map.setView([consumerLocation.lat, consumerLocation.lng], 14)
      hasFitOnce.current = true
    }
  }, [selectedResult, consumerLocation, map])

  return null
}

export default function NearbyMap({ consumerLocation, results, selectedResult, onSelect }) {
  if (!consumerLocation) {
    return <div className="map-placeholder">Waiting for your location…</div>
  }

  const { lat, lng } = consumerLocation

  return (
    <MapContainer center={[lat, lng]} zoom={14} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToSelected consumerLocation={consumerLocation} selectedResult={selectedResult} />

      <Marker position={[lat, lng]} icon={consumerIcon}>
        <Popup>You are here</Popup>
      </Marker>

      {results.map((r) => {
        const isSelected = selectedResult && selectedResult.productId === r.productId
        return (
          <Marker
            key={r.productId}
            position={[r.shopLatitude, r.shopLongitude]}
            icon={isSelected ? selectedShopIcon : shopIcon}
            eventHandlers={{ click: () => onSelect(r.productId) }}
          >
            <Popup>
              <strong>{r.shopName}</strong>
              <br />
              {r.productName} — ₹{r.price}
              <br />
              {(r.distanceKm * 1000).toFixed(0)} m away
              <br />
              <a href={r.directionsUrl} target="_blank" rel="noreferrer">Get directions →</a>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
