import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { Camera, Loader2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDetected: (code: string) => void
}

const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
]

type ScannerStatus = 'idle' | 'starting' | 'scanning'

export function BarcodeScannerDialog({ open, onOpenChange, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const activeRef = useRef(false)
  const onDetectedRef = useRef(onDetected)
  const onOpenChangeRef = useRef(onOpenChange)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<ScannerStatus>('idle')

  useEffect(() => {
    onDetectedRef.current = onDetected
    onOpenChangeRef.current = onOpenChange
  }, [onDetected, onOpenChange])

  const stopScanner = useCallback(() => {
    activeRef.current = false
    controlsRef.current?.stop()
    controlsRef.current = null

    const video = videoRef.current
    const stream = streamRef.current ?? (video?.srcObject as MediaStream | null)
    stream?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (video) video.srcObject = null
  }, [])

  const startScanner = useCallback(async () => {
    const video = videoRef.current
    if (!video || status === 'starting' || status === 'scanning') return

    stopScanner()
    activeRef.current = true
    setError(null)
    setStatus('starting')

    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS)
    const reader = new BrowserMultiFormatReader(hints, { tryPlayVideoTimeout: 1000 })

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Tu navegador no permite usar la cámara desde esta página. Probá abrirla con HTTPS o localhost.')
      }

      let timedOut = false
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        }).then(stream => {
          if (timedOut || !activeRef.current) {
            stream.getTracks().forEach(t => t.stop())
          }
          return stream
        }),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => {
            timedOut = true
            reject(new Error('La cámara no respondió. Revisá que el navegador no esté bloqueando el permiso.'))
          }, 8000)
        }),
      ])

      if (!activeRef.current) {
        stream.getTracks().forEach(t => t.stop())
        return
      }

      streamRef.current = stream
      video.srcObject = stream
      await video.play().catch(() => undefined)
      if (!activeRef.current) return

      setStatus('scanning')

      const controls = await reader.decodeFromVideoElement(
        video,
        (result, _err, c) => {
          if (!activeRef.current) {
            c.stop()
            return
          }
          if (result) {
            onDetectedRef.current(result.getText())
            c.stop()
            stopScanner()
            setError(null)
            setStatus('idle')
            onOpenChangeRef.current(false)
          }
        },
      )
      if (!activeRef.current) {
        controls.stop()
        return
      }
      controlsRef.current = controls
    } catch (err: unknown) {
      if (!activeRef.current) return
      const name = err instanceof Error ? err.name : ''
      const msg = err instanceof Error ? err.message : 'No se pudo acceder a la cámara'
      if (name === 'NotAllowedError' || msg.includes('Permission')) {
        setError('Permiso de cámara denegado')
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setError('No se encontró una cámara compatible')
      } else {
        setError(msg)
      }
      stopScanner()
      setStatus('idle')
    }
  }, [status, stopScanner])

  useEffect(() => {
    if (!open) {
      stopScanner()
    }
  }, [open, stopScanner])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      stopScanner()
      setError(null)
      setStatus('idle')
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2 flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base">Escanear código</DialogTitle>
          <DialogDescription className="sr-only">
            Apuntá la cámara al código de barras del producto
          </DialogDescription>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-md hover:bg-accent transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </DialogHeader>
        <div className="relative aspect-square bg-black">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            playsInline
            muted
          />
          {/* Reticle */}
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-24 border-2 border-white/80 rounded-lg pointer-events-none" />
          {status === 'idle' && !error && (
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <button
                type="button"
                onClick={startScanner}
                className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90"
              >
                <Camera size={16} />
                Activar cámara
              </button>
            </div>
          )}
          {status === 'starting' && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm gap-2">
              <Loader2 size={16} className="animate-spin" />
              Iniciando cámara...
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white text-sm text-center px-6">
              <span>{error}</span>
              <button
                type="button"
                onClick={startScanner}
                className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-white/90"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center py-3 px-4">
          Apuntá el código dentro del recuadro
        </p>
      </DialogContent>
    </Dialog>
  )
}
