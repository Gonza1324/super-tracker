export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; is_admin: boolean; created_at: string }
        Insert: { id: string; display_name?: string | null; is_admin?: boolean; created_at?: string }
        Update: { id?: string; display_name?: string | null; is_admin?: boolean; created_at?: string }
        Relationships: []
      }
      groups: {
        Row: { id: string; name: string; created_by: string; created_at: string }
        Insert: { id?: string; name: string; created_by: string; created_at?: string }
        Update: { id?: string; name?: string; created_by?: string; created_at?: string }
        Relationships: []
      }
      group_members: {
        Row: { group_id: string; user_id: string; role: 'owner' | 'member'; joined_at: string }
        Insert: { group_id: string; user_id: string; role?: 'owner' | 'member'; joined_at?: string }
        Update: { group_id?: string; user_id?: string; role?: 'owner' | 'member'; joined_at?: string }
        Relationships: [
          { foreignKeyName: "group_members_group_id_fkey"; columns: ["group_id"]; isOneToOne: false; referencedRelation: "groups"; referencedColumns: ["id"] }
        ]
      }
      categories: {
        Row: { id: string; group_id: string | null; name: string; icon: string | null; color: string | null; sort_order: number }
        Insert: { id?: string; group_id?: string | null; name: string; icon?: string | null; color?: string | null; sort_order?: number }
        Update: { id?: string; group_id?: string | null; name?: string; icon?: string | null; color?: string | null; sort_order?: number }
        Relationships: []
      }
      products: {
        Row: { id: string; group_id: string | null; name: string; brand: string | null; category_id: string | null; default_unit: string; barcode: string | null; notes: string | null; created_at: string; created_by: string | null }
        Insert: { id?: string; group_id?: string | null; name: string; brand?: string | null; category_id?: string | null; default_unit?: string; barcode?: string | null; notes?: string | null; created_at?: string; created_by?: string | null }
        Update: { id?: string; group_id?: string | null; name?: string; brand?: string | null; category_id?: string | null; default_unit?: string; barcode?: string | null; notes?: string | null; created_at?: string; created_by?: string | null }
        Relationships: [
          { foreignKeyName: "products_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "categories"; referencedColumns: ["id"] }
        ]
      }
      stores: {
        Row: { id: string; group_id: string; name: string; type: 'supermercado' | 'verduleria' | 'carniceria' | 'mayorista' | 'chino' | 'online' | 'otro'; created_at: string }
        Insert: { id?: string; group_id: string; name: string; type?: 'supermercado' | 'verduleria' | 'carniceria' | 'mayorista' | 'chino' | 'online' | 'otro'; created_at?: string }
        Update: { id?: string; group_id?: string; name?: string; type?: 'supermercado' | 'verduleria' | 'carniceria' | 'mayorista' | 'chino' | 'online' | 'otro'; created_at?: string }
        Relationships: []
      }
      purchases: {
        Row: { id: string; group_id: string; store_id: string | null; purchase_date: string; total: number; receipt_photo_url: string | null; notes: string | null; created_at: string; created_by: string | null }
        Insert: { id?: string; group_id: string; store_id?: string | null; purchase_date?: string; total?: number; receipt_photo_url?: string | null; notes?: string | null; created_at?: string; created_by?: string | null }
        Update: { id?: string; group_id?: string; store_id?: string | null; purchase_date?: string; total?: number; receipt_photo_url?: string | null; notes?: string | null; created_at?: string; created_by?: string | null }
        Relationships: [
          { foreignKeyName: "purchases_store_id_fkey"; columns: ["store_id"]; isOneToOne: false; referencedRelation: "stores"; referencedColumns: ["id"] }
        ]
      }
      purchase_items: {
        Row: { id: string; purchase_id: string; product_id: string; quantity: number; unit: string; unit_price: number; total: number; created_at: string }
        Insert: { id?: string; purchase_id: string; product_id: string; quantity: number; unit?: string; unit_price: number; total: number; created_at?: string }
        Update: { id?: string; purchase_id?: string; product_id?: string; quantity?: number; unit?: string; unit_price?: number; total?: number; created_at?: string }
        Relationships: [
          { foreignKeyName: "purchase_items_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
          { foreignKeyName: "purchase_items_purchase_id_fkey"; columns: ["purchase_id"]; isOneToOne: false; referencedRelation: "purchases"; referencedColumns: ["id"] }
        ]
      }
      stock_items: {
        Row: { id: string; group_id: string; product_id: string; quantity: number; unit: string; min_quantity: number | null; updated_at: string }
        Insert: { id?: string; group_id: string; product_id: string; quantity?: number; unit?: string; min_quantity?: number | null; updated_at?: string }
        Update: { id?: string; group_id?: string; product_id?: string; quantity?: number; unit?: string; min_quantity?: number | null; updated_at?: string }
        Relationships: [
          { foreignKeyName: "stock_items_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] }
        ]
      }
      stock_movements: {
        Row: { id: string; group_id: string; product_id: string; type: 'purchase' | 'manual_add' | 'manual_remove' | 'recipe_consumed' | 'cooked_meal' | 'waste'; quantity_delta: number; unit: string; ref_table: string | null; ref_id: string | null; notes: string | null; created_at: string; created_by: string | null }
        Insert: { id?: string; group_id: string; product_id: string; type: 'purchase' | 'manual_add' | 'manual_remove' | 'recipe_consumed' | 'cooked_meal' | 'waste'; quantity_delta: number; unit: string; ref_table?: string | null; ref_id?: string | null; notes?: string | null; created_at?: string; created_by?: string | null }
        Update: { id?: string; group_id?: string; product_id?: string; type?: 'purchase' | 'manual_add' | 'manual_remove' | 'recipe_consumed' | 'cooked_meal' | 'waste'; quantity_delta?: number; unit?: string; ref_table?: string | null; ref_id?: string | null; notes?: string | null; created_at?: string; created_by?: string | null }
        Relationships: []
      }
      budgets: {
        Row: { id: string; group_id: string; month: string; amount: number; alert_threshold: number; created_at: string }
        Insert: { id?: string; group_id: string; month: string; amount: number; alert_threshold?: number; created_at?: string }
        Update: { id?: string; group_id?: string; month?: string; amount?: number; alert_threshold?: number; created_at?: string }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      is_group_member: {
        Args: { p_group_id: string }
        Returns: boolean
      }
      create_group: {
        Args: { group_name: string }
        Returns: Database['public']['Tables']['groups']['Row']
      }
      join_group: {
        Args: { p_group_id: string }
        Returns: Database['public']['Tables']['groups']['Row']
      }
      leave_group: {
        Args: { p_group_id: string }
        Returns: void
      }
      delete_group: {
        Args: { p_group_id: string }
        Returns: void
      }
      create_global_product: {
        Args: {
          p_name: string
          p_brand: string | null
          p_category_id: string | null
          p_default_unit: string
          p_barcode: string | null
        }
        Returns: Database['public']['Tables']['products']['Row']
      }
      delete_global_product: {
        Args: { p_product_id: string }
        Returns: void
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
