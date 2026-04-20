import { useMemo, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { FileDown, Loader2, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { formatQuantity } from '@/lib/format'
import { StockPDFDocument } from '@/features/stock/StockPDF'
import type { StockItemWithProduct } from '@/features/stock/stockService'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: StockItemWithProduct[]
  groupName: string
}

const NO_CATEGORY_ID = '__none__'
const NO_CATEGORY_LABEL = 'Sin categoría'
const NO_CATEGORY_ICON = '📦'

interface Group {
  id: string
  name: string
  icon: string
  items: StockItemWithProduct[]
}

function groupByCategory(items: StockItemWithProduct[]): Group[] {
  const map = new Map<string, Group>()
  for (const item of items) {
    const cat = item.products?.categories
    const id = cat?.id ?? NO_CATEGORY_ID
    if (!map.has(id)) {
      map.set(id, {
        id,
        name: cat?.name ?? NO_CATEGORY_LABEL,
        icon: cat?.icon ?? NO_CATEGORY_ICON,
        items: [],
      })
    }
    map.get(id)!.items.push(item)
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.id === NO_CATEGORY_ID) return 1
    if (b.id === NO_CATEGORY_ID) return -1
    return a.name.localeCompare(b.name)
  })
}

function itemQuantityLabel(item: StockItemWithProduct): string {
  if (item.quantity === 0) return 'sin stock'
  return `${formatQuantity(item.quantity)} ${item.unit}`
}

function buildShareText(groups: Group[], groupName: string): string {
  const date = format(new Date(), "d 'de' MMMM yyyy", { locale: es })
  const lines = [`Lista de compras — ${groupName}`, date, '']
  for (const g of groups) {
    lines.push(`${g.icon} ${g.name}`)
    for (const item of g.items) {
      const name = item.products?.name ?? 'Producto'
      const brand = item.products?.brand ? ` (${item.products.brand})` : ''
      lines.push(`- ${name}${brand} · ${itemQuantityLabel(item)}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

export function ShoppingListDialog({ open, onOpenChange, items, groupName }: Props) {
  const [exporting, setExporting] = useState(false)
  const [sharing, setSharing] = useState(false)

  const groups = useMemo(() => groupByCategory(items), [items])

  async function handleShare() {
    if (groups.length === 0) return
    setSharing(true)
    try {
      const text = buildShareText(groups, groupName)
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Lista de compras', text })
          return
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return
        }
      }
      await navigator.clipboard.writeText(text)
      toast.success('Lista copiada al portapapeles')
    } catch {
      toast.error('No se pudo compartir')
    } finally {
      setSharing(false)
    }
  }

  async function handleExportPDF() {
    if (items.length === 0) return
    setExporting(true)
    try {
      const blob = await pdf(
        <StockPDFDocument items={items} groupName={groupName} />
      ).toBlob()
      saveAs(blob, `lista-compras-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('PDF descargado')
    } catch {
      toast.error('Error al generar el PDF')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Lista de compras</DialogTitle>
          <DialogDescription>
            {items.length === 0
              ? 'No hay productos por reponer.'
              : `${items.length} producto${items.length !== 1 ? 's' : ''} por reponer`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-4">
          {groups.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Todo está bien abastecido.
            </p>
          )}

          {groups.map(g => (
            <div key={g.id} className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span className="text-base leading-none">{g.icon}</span>
                <span>{g.name}</span>
                <span className="text-[10px] text-muted-foreground/70">· {g.items.length}</span>
              </div>
              <ul className="space-y-1">
                {g.items.map(item => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {item.products?.name ?? 'Producto'}
                        {item.products?.brand && (
                          <span className="font-normal text-muted-foreground text-xs"> — {item.products.brand}</span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`text-xs tabular-nums shrink-0 ${
                        item.quantity === 0 ? 'text-destructive font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      {itemQuantityLabel(item)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="flex gap-2 pt-2 border-t -mx-6 px-6 mt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleShare}
              disabled={sharing}
            >
              {sharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
              Compartir
            </Button>
            <Button
              type="button"
              className="flex-1 gap-2"
              onClick={handleExportPDF}
              disabled={exporting}
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
              Exportar PDF
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
