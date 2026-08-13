const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

export async function geocodeAddress(address) {
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(address)}&format=json&limit=1`
  const res = await fetch(url)
  const data = await res.json()
  if (data.length === 0) return null
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name }
}

export async function reverseGeocode(lat, lng) {
  const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json`
  const res = await fetch(url)
  const data = await res.json()
  return data.display_name || null
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('Location access denied.'))
    )
  })
}
