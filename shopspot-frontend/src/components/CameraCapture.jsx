import { useEffect, useRef, useState } from 'react'
import Modal from './Modal.jsx'

/**
 * Opens the device camera (front/back on mobile, webcam on desktop) with a
 * live preview, lets the shopkeeper snap a photo and retake if needed, then
 * hands the final image back as a File via onCapture(file). Falls back to a
 * clear error + "upload instead" path if camera access is denied/unavailable
 * (common on desktop without a webcam, or if the browser blocks permission).
 */
export default function CameraCapture({ onCapture, onClose, onFallbackToFile }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [facingMode, setFacingMode] = useState('environment') // 'environment' = back camera, 'user' = front
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState(null) // data URL of the captured shot, null while live
  const [starting, setStarting] = useState(true)

  useEffect(() => {
    let cancelled = false
    startCamera(facingMode, () => cancelled)
    return () => {
      cancelled = true
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode])

  async function startCamera(mode, isCancelled) {
    setError('')
    setStarting(true)
    try {
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode } },
          audio: false,
        })
      } catch (err) {
        // Desktop webcams usually don't support facingMode (no back camera),
        // so retry with no facing constraint at all before giving up.
        if (err?.name === 'OverconstrainedError' || err?.name === 'NotFoundError') {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          })
        } else {
          throw err
        }
      }

      // This effect run was cleaned up (e.g. React StrictMode's double-invoke
      // in dev, or facingMode changed again) before the stream was ready —
      // discard it instead of touching state/DOM tied to the old run.
      if (isCancelled()) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        try {
          await videoRef.current.play()
        } catch (playErr) {
          // Benign: happens when a newer load request (StrictMode remount,
          // camera switch, or unmount) superseded this one mid-flight.
          if (playErr?.name !== 'AbortError') throw playErr
        }
      }
    } catch (err) {
      if (isCancelled() || err?.name === 'AbortError') return
      console.error('Camera access failed:', err)
      setError(
        err?.name === 'NotAllowedError'
          ? 'Camera access was denied. Allow camera permission in your browser, or upload a photo instead.'
          : err?.name === 'NotFoundError'
          ? 'No camera was found on this device. Try uploading a photo instead.'
          : `Could not access the camera (${err?.name || 'unknown error'}). Try uploading a photo instead.`
      )
    } finally {
      if (!isCancelled()) setStarting(false)
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  function handleCapture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    setPhoto(canvas.toDataURL('image/jpeg', 0.92))
  }

  function handleRetake() {
    setPhoto(null)
  }

  function handleUsePhoto() {
    const canvas = canvasRef.current
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `product-photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
        stopCamera()
        onCapture(file)
      },
      'image/jpeg',
      0.92
    )
  }

  function handleClose() {
    stopCamera()
    onClose()
  }

  function toggleFacing() {
    setPhoto(null)
    setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))
  }

  return (
    <Modal onClose={handleClose}>
      <div className="modal-header">
        <h3>Take a Photo</h3>
        <button className="modal-close" onClick={handleClose}>×</button>
      </div>

      <div className="camera-viewport">
        {error ? (
          <div className="camera-error">
            <p>{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="camera-video"
              style={{ display: photo ? 'none' : 'block' }}
              playsInline
              muted
            />
            {photo && <img src={photo} alt="Captured product" className="camera-video" />}
            {starting && !photo && <div className="camera-loading">Starting camera…</div>}
          </>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <div className="modal-actions" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        {error ? (
          <>
            <button className="btn-cancel" onClick={handleClose}>Cancel</button>
            <button
              className="btn-save"
              onClick={() => {
                stopCamera()
                onFallbackToFile()
              }}
            >
              Upload Photo Instead
            </button>
          </>
        ) : photo ? (
          <>
            <button className="btn-cancel" onClick={handleRetake}>Retake</button>
            <button className="btn-save" onClick={handleUsePhoto}>Use This Photo</button>
          </>
        ) : (
          <>
            <button className="btn-secondary" onClick={toggleFacing} disabled={starting}>
              🔄 Switch Camera
            </button>
            <button className="btn-save" onClick={handleCapture} disabled={starting}>
              📸 Capture
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}