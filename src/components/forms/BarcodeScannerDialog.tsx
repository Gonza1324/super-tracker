import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { Loader2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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

export function BarcodeScannerDialog({ open, onOpenChange, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const onDetectedRef = useRef(onDetected)
  const onOpenChangeRef = useRef(onOpenChange)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(true)

  onDetectedRef.current = onDetected
  onOpenChangeRef.current = onOpenChange

  useEffect(() => {
    if (!open) return

    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS)
    const reader = new BrowserMultiFormatReader(hints)
    const video = videoRef.current
    let active = true
    let controls: { stop: () => void } | null = null

    setError(null)
    setStarting(true)

    reader
      .decodeFromVideoDevice(undefined, video!, (result, _err, ctrl) => {
        if (!active) {
          ctrl.stop()
          return
        }
        controls = ctrl
        setStarting(false)
        if (result) {
          onDetectedRef.current(result.getText())
          ctrl.stop()
          onOpenChangeRef.current(false)
        }
      })
      .catch((err: unknown) => {
        if (!active) return
        const msg = err instanceof Error ? err.message : 'No se pudo acceder a la cámara'
        setError(msg.includes('Permission') ? 'Permiso de cámara denegado' : msg)
        setStarting(false)
      })

    return () => {
      active = false
      controls?.stop()
      const stream = video?.srcObject as MediaStream | null
      stream?.getTracks().forEach(t => t.stop())
      if (video) video.srcObject = null
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2 flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base">Escanear código</DialogTitle>
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
          {starting && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm gap-2">
              <Loader2 size={16} className="animate-spin" />
              Iniciando cámara...
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm text-center px-6">
              {error}
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
