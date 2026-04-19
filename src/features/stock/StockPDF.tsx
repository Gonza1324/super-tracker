import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { StockItemWithProduct } from './stockService'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, color: '#1a1a1a' },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#666', marginBottom: 24 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingVertical: 8, alignItems: 'center' },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingBottom: 6, marginBottom: 4 },
  colProduct: { flex: 1 },
  colQty: { width: 80, textAlign: 'right' },
  colMin: { width: 80, textAlign: 'right' },
  headerText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#666', textTransform: 'uppercase' },
  productName: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  productBrand: { fontSize: 9, color: '#888', marginTop: 1 },
  qtyText: { fontSize: 11 },
  emptyText: { fontSize: 11, color: '#888', marginTop: 16 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 9, color: '#aaa', flexDirection: 'row', justifyContent: 'space-between' },
  badge: { backgroundColor: '#fef3c7', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },
  badgeText: { fontSize: 8, color: '#92400e', fontFamily: 'Helvetica-Bold' },
})

interface Props {
  items: StockItemWithProduct[]
  groupName: string
}

export function StockPDFDocument({ items, groupName }: Props) {
  const now = format(new Date(), "d 'de' MMMM yyyy", { locale: es })
  const empty = items.filter(i => i.quantity === 0)
  const low = items.filter(i => i.quantity > 0 && i.min_quantity !== null && i.quantity <= i.min_quantity!)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Lista de compras</Text>
        <Text style={styles.subtitle}>{groupName} · {now}</Text>

        {empty.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Sin stock</Text>
            <View style={styles.headerRow}>
              <Text style={[styles.headerText, styles.colProduct]}>Producto</Text>
              <Text style={[styles.headerText, styles.colQty]}>Unidad</Text>
            </View>
            {empty.map(item => (
              <View key={item.id} style={styles.row}>
                <View style={styles.colProduct}>
                  <Text style={styles.productName}>{item.products?.name ?? 'Producto'}</Text>
                  {item.products?.brand && <Text style={styles.productBrand}>{item.products.brand}</Text>}
                </View>
                <Text style={[styles.qtyText, styles.colQty]}>{item.unit}</Text>
              </View>
            ))}
          </View>
        )}

        {low.length > 0 && (
          <View style={{ marginTop: empty.length > 0 ? 24 : 0 }}>
            <Text style={styles.sectionTitle}>Se está acabando</Text>
            <View style={styles.headerRow}>
              <Text style={[styles.headerText, styles.colProduct]}>Producto</Text>
              <Text style={[styles.headerText, styles.colQty]}>Stock actual</Text>
              <Text style={[styles.headerText, styles.colMin]}>Mínimo</Text>
            </View>
            {low.map(item => (
              <View key={item.id} style={styles.row}>
                <View style={styles.colProduct}>
                  <Text style={styles.productName}>{item.products?.name ?? 'Producto'}</Text>
                  {item.products?.brand && <Text style={styles.productBrand}>{item.products.brand}</Text>}
                </View>
                <Text style={[styles.qtyText, styles.colQty]}>{item.quantity} {item.unit}</Text>
                <Text style={[styles.qtyText, styles.colMin]}>{item.min_quantity} {item.unit}</Text>
              </View>
            ))}
          </View>
        )}

        {empty.length === 0 && low.length === 0 && (
          <Text style={styles.emptyText}>No hay productos sin stock ni por debajo del mínimo.</Text>
        )}

        <View style={styles.footer}>
          <Text>Super Tracker</Text>
          <Text>{empty.length + low.length} producto{empty.length + low.length !== 1 ? 's' : ''} para reponer</Text>
        </View>
      </Page>
    </Document>
  )
}
