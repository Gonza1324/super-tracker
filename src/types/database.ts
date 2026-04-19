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
        Row: {
          id: string
          display_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          created_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
        }
      }
      group_members: {
        Row: {
          group_id: string
          user_id: string
          role: 'owner' | 'member'
          joined_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          role?: 'owner' | 'member'
          joined_at?: string
        }
        Update: {
          group_id?: string
          user_id?: string
          role?: 'owner' | 'member'
          joined_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          group_id: string | null
          name: string
          icon: string | null
          color: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          group_id?: string | null
          name: string
          icon?: string | null
          color?: string | null
          sort_order?: number
        }
        Update: {
          id?: string
          group_id?: string | null
          name?: string
          icon?: string | null
          color?: string | null
          sort_order?: number
        }
      }
      products: {
        Row: {
          id: string
          group_id: string | null
          name: string
          brand: string | null
          category_id: string | null
          default_unit: string
          barcode: string | null
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          group_id?: string | null
          name: string
          brand?: string | null
          category_id?: string | null
          default_unit?: string
          barcode?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          group_id?: string | null
          name?: string
          brand?: string | null
          category_id?: string | null
          default_unit?: string
          barcode?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      stores: {
        Row: {
          id: string
          group_id: string
          name: string
          type: 'supermercado' | 'verduleria' | 'carniceria' | 'mayorista' | 'chino' | 'online' | 'otro'
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          name: string
          type?: 'supermercado' | 'verduleria' | 'carniceria' | 'mayorista' | 'chino' | 'online' | 'otro'
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          name?: string
          type?: 'supermercado' | 'verduleria' | 'carniceria' | 'mayorista' | 'chino' | 'online' | 'otro'
          created_at?: string
        }
      }
      purchases: {
        Row: {
          id: string
          group_id: string
          store_id: string | null
          purchase_date: string
          total: number
          receipt_photo_url: string | null
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          group_id: string
          store_id?: string | null
          purchase_date?: string
          total?: number
          receipt_photo_url?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          store_id?: string | null
          purchase_date?: string
          total?: number
          receipt_photo_url?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      purchase_items: {
        Row: {
          id: string
          purchase_id: string
          product_id: string
          quantity: number
          unit: string
          unit_price: number
          total: number
          created_at: string
        }
        Insert: {
          id?: string
          purchase_id: string
          product_id: string
          quantity: number
          unit?: string
          unit_price: number
          total: number
          created_at?: string
        }
        Update: {
          id?: string
          purchase_id?: string
          product_id?: string
          quantity?: number
          unit?: string
          unit_price?: number
          total?: number
          created_at?: string
        }
      }
      stock_items: {
        Row: {
          id: string
          group_id: string
          product_id: string
          quantity: number
          unit: string
          min_quantity: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          product_id: string
          quantity?: number
          unit?: string
          min_quantity?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          product_id?: string
          quantity?: number
          unit?: string
          min_quantity?: number | null
          updated_at?: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          group_id: string
          product_id: string
          type: 'purchase' | 'manual_add' | 'manual_remove' | 'recipe_consumed' | 'cooked_meal' | 'waste'
          quantity_delta: number
          unit: string
          ref_table: string | null
          ref_id: string | null
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          group_id: string
          product_id: string
          type: 'purchase' | 'manual_add' | 'manual_remove' | 'recipe_consumed' | 'cooked_meal' | 'waste'
          quantity_delta: number
          unit: string
          ref_table?: string | null
          ref_id?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          product_id?: string
          type?: 'purchase' | 'manual_add' | 'manual_remove' | 'recipe_consumed' | 'cooked_meal' | 'waste'
          quantity_delta?: number
          unit?: string
          ref_table?: string | null
          ref_id?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      budgets: {
        Row: {
          id: string
          group_id: string
          month: string
          amount: number
          alert_threshold: number
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          month: string
          amount: number
          alert_threshold?: number
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          month?: string
          amount?: number
          alert_threshold?: number
          created_at?: string
        }
      }
    }
    Functions: {
      is_group_member: {
        Args: { p_group_id: string }
        Returns: boolean
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
