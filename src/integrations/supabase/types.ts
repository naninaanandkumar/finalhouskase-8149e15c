export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string | null
          canonical_url: string | null
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          published_at: string
          slug: string
          sort_order: number
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          canonical_url?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string
          slug: string
          sort_order?: number
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          canonical_url?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string
          slug?: string
          sort_order?: number
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
          variation_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
          variation_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          banner_image: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          banner_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          banner_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          admin_id: string | null
          buyer_id: string
          created_at: string
          id: string
          is_active: boolean | null
          last_message_at: string | null
          subject: string | null
        }
        Insert: {
          admin_id?: string | null
          buyer_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          subject?: string | null
        }
        Update: {
          admin_id?: string | null
          buyer_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_inquiries: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          handled_at: string | null
          handled_by: string | null
          id: string
          ip_address: string | null
          message: string
          name: string
          phone: string | null
          status: string
          subject: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          ip_address?: string | null
          message: string
          name: string
          phone?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          ip_address?: string | null
          message?: string
          name?: string
          phone?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      coupon_apply_logs: {
        Row: {
          code: string
          created_at: string
          discount: number | null
          error_code: string | null
          error_message: string | null
          id: string
          status: string
          subtotal: number | null
          user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          status: string
          subtotal?: number | null
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          status?: string
          subtotal?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          auto_apply: boolean | null
          category_id: string | null
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_order_amount: number | null
          show_on_product: boolean | null
          starts_at: string | null
          title: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number | null
        }
        Insert: {
          auto_apply?: boolean | null
          category_id?: string | null
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          show_on_product?: boolean | null
          starts_at?: string | null
          title?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number | null
        }
        Update: {
          auto_apply?: boolean | null
          category_id?: string | null
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          show_on_product?: boolean | null
          starts_at?: string | null
          title?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_pincodes: {
        Row: {
          city: string | null
          created_at: string
          delivery_days: number
          id: string
          is_active: boolean | null
          is_cod_available: boolean | null
          pincode: string
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          delivery_days?: number
          id?: string
          is_active?: boolean | null
          is_cod_available?: boolean | null
          pincode: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          delivery_days?: number
          id?: string
          is_active?: boolean | null
          is_cod_available?: boolean | null
          pincode?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ekart_integration_logs: {
        Row: {
          action: string
          created_at: string
          endpoint: string | null
          error_message: string | null
          id: string
          order_id: string | null
          order_number: string | null
          request_payload: Json | null
          response_payload: Json | null
          status_code: number | null
          success: boolean
          tracking_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          endpoint?: string | null
          error_message?: string | null
          id?: string
          order_id?: string | null
          order_number?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
          success?: boolean
          tracking_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          endpoint?: string | null
          error_message?: string | null
          id?: string
          order_id?: string | null
          order_number?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
          success?: boolean
          tracking_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ekart_integration_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      family_testimonials: {
        Row: {
          age: string | null
          created_at: string
          heading: string
          id: string
          image_url: string | null
          is_active: boolean
          message: string
          name: string
          rating: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          age?: string | null
          created_at?: string
          heading: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          message: string
          name: string
          rating?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          age?: string | null
          created_at?: string
          heading?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          message?: string
          name?: string
          rating?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          aspect_ratio: string | null
          badge_label: string | null
          created_at: string
          cta_link: string | null
          cta_text: string | null
          desktop_height: number | null
          id: string
          image_url: string
          is_active: boolean | null
          mobile_height: number | null
          mobile_image_url: string | null
          object_fit: string
          overlay: Json
          show_buttons: boolean | null
          show_text: boolean | null
          sort_order: number | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          aspect_ratio?: string | null
          badge_label?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          desktop_height?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          mobile_height?: number | null
          mobile_image_url?: string | null
          object_fit?: string
          overlay?: Json
          show_buttons?: boolean | null
          show_text?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          aspect_ratio?: string | null
          badge_label?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          desktop_height?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          mobile_height?: number | null
          mobile_image_url?: string | null
          object_fit?: string
          overlay?: Json
          show_buttons?: boolean | null
          show_text?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          background_image: string | null
          category_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          product_limit: number | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          background_image?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          product_limit?: number | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          background_image?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          product_limit?: number | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_sections_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          order_id: string
          paid_at: string | null
          pdf_url: string | null
          status: string | null
          tax: number | null
          total: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          order_id: string
          paid_at?: string | null
          pdf_url?: string | null
          status?: string | null
          tax?: number | null
          total: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          order_id?: string
          paid_at?: string | null
          pdf_url?: string | null
          status?: string | null
          tax?: number | null
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_audit_log: {
        Row: {
          client_id: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          input_hash: string
          input_summary: Json | null
          status: string
          tool_name: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input_hash: string
          input_summary?: Json | null
          status?: string
          tool_name: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input_hash?: string
          input_summary?: Json | null
          status?: string
          tool_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
          variation_details: string | null
          variation_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
          variation_details?: string | null
          variation_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          variation_details?: string | null
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          buyer_type: Database["public"]["Enums"]["app_role"]
          created_at: string
          ekart_last_error: string | null
          ekart_shipment_id: string | null
          ekart_sync_status: string
          ekart_synced_at: string | null
          id: string
          notes: string | null
          order_number: string
          payment_failed_reason: string | null
          payment_method: string
          payment_status: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_refund_id: string | null
          razorpay_signature: string | null
          refund_amount: number | null
          refund_status: string | null
          refunded_at: string | null
          shipping: number | null
          shipping_address: Json | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          tax: number | null
          total: number
          tracking_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_address?: Json | null
          buyer_type: Database["public"]["Enums"]["app_role"]
          created_at?: string
          ekart_last_error?: string | null
          ekart_shipment_id?: string | null
          ekart_sync_status?: string
          ekart_synced_at?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_failed_reason?: string | null
          payment_method?: string
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_refund_id?: string | null
          razorpay_signature?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          refunded_at?: string | null
          shipping?: number | null
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          tax?: number | null
          total: number
          tracking_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_address?: Json | null
          buyer_type?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          ekart_last_error?: string | null
          ekart_shipment_id?: string | null
          ekart_sync_status?: string
          ekart_synced_at?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_failed_reason?: string | null
          payment_method?: string
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_refund_id?: string | null
          razorpay_signature?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          refunded_at?: string | null
          shipping?: number | null
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          tax?: number | null
          total?: number
          tracking_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_attribute_assignments: {
        Row: {
          attribute_id: string
          attribute_value_id: string
          created_at: string
          id: string
          product_id: string
          used_for_variations: boolean | null
          visible_on_product: boolean | null
        }
        Insert: {
          attribute_id: string
          attribute_value_id: string
          created_at?: string
          id?: string
          product_id: string
          used_for_variations?: boolean | null
          visible_on_product?: boolean | null
        }
        Update: {
          attribute_id?: string
          attribute_value_id?: string
          created_at?: string
          id?: string
          product_id?: string
          used_for_variations?: boolean | null
          visible_on_product?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_assignments_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_assignments_attribute_value_id_fkey"
            columns: ["attribute_value_id"]
            isOneToOne: false
            referencedRelation: "product_attribute_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attribute_values: {
        Row: {
          attribute_id: string
          created_at: string
          id: string
          value: string
        }
        Insert: {
          attribute_id: string
          created_at?: string
          id?: string
          value: string
        }
        Update: {
          attribute_id?: string
          created_at?: string
          id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attributes: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      product_custom_tabs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          product_id: string
          sort_order: number | null
          tab_content: string
          tab_title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          product_id: string
          sort_order?: number | null
          tab_content: string
          tab_title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          product_id?: string
          sort_order?: number | null
          tab_content?: string
          tab_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_custom_tabs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_offers: {
        Row: {
          badge_label: string
          category_id: string | null
          created_at: string
          description: string
          details_url: string | null
          discount_amount: number | null
          id: string
          is_active: boolean | null
          min_order_amount: number | null
          offer_type: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          badge_label: string
          category_id?: string | null
          created_at?: string
          description: string
          details_url?: string | null
          discount_amount?: number | null
          id?: string
          is_active?: boolean | null
          min_order_amount?: number | null
          offer_type: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          badge_label?: string
          category_id?: string | null
          created_at?: string
          description?: string
          details_url?: string | null
          discount_amount?: number | null
          id?: string
          is_active?: boolean | null
          min_order_amount?: number | null
          offer_type?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_offers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reels: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          is_active: boolean
          object_fit: string
          product_id: string
          show_on_home: boolean
          show_on_product: boolean
          sort_order: number
          title: string | null
          updated_at: string
          video_url: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          object_fit?: string
          product_id: string
          show_on_home?: boolean
          show_on_product?: boolean
          sort_order?: number
          title?: string | null
          updated_at?: string
          video_url: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          object_fit?: string
          product_id?: string
          show_on_home?: boolean
          show_on_product?: boolean
          sort_order?: number
          title?: string | null
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reels_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          created_at: string
          id: string
          is_approved: boolean | null
          is_verified: boolean | null
          photos: string[]
          product_id: string
          rating: number
          review_text: string | null
          review_title: string | null
          reviewer_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_approved?: boolean | null
          is_verified?: boolean | null
          photos?: string[]
          product_id: string
          rating: number
          review_text?: string | null
          review_title?: string | null
          reviewer_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_approved?: boolean | null
          is_verified?: boolean | null
          photos?: string[]
          product_id?: string
          rating?: number
          review_text?: string | null
          review_title?: string | null
          reviewer_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          color: string | null
          color_image: string | null
          created_at: string
          gallery_images: string[] | null
          guest_price: number
          id: string
          is_active: boolean | null
          product_id: string
          regular_price: number | null
          retail_moq: number | null
          retail_price: number
          retail_regular_price: number | null
          sale_end_date: string | null
          sale_start_date: string | null
          shop_moq: number | null
          shop_price: number
          shop_regular_price: number | null
          size: string | null
          sku: string | null
          stock_quantity: number | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          color?: string | null
          color_image?: string | null
          created_at?: string
          gallery_images?: string[] | null
          guest_price?: number
          id?: string
          is_active?: boolean | null
          product_id: string
          regular_price?: number | null
          retail_moq?: number | null
          retail_price: number
          retail_regular_price?: number | null
          sale_end_date?: string | null
          sale_start_date?: string | null
          shop_moq?: number | null
          shop_price: number
          shop_regular_price?: number | null
          size?: string | null
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          color?: string | null
          color_image?: string | null
          created_at?: string
          gallery_images?: string[] | null
          guest_price?: number
          id?: string
          is_active?: boolean | null
          product_id?: string
          regular_price?: number | null
          retail_moq?: number | null
          retail_price?: number
          retail_regular_price?: number | null
          sale_end_date?: string | null
          sale_start_date?: string | null
          shop_moq?: number | null
          shop_price?: number
          shop_regular_price?: number | null
          size?: string | null
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          banner_image: string | null
          brand_id: string | null
          category_id: string | null
          created_at: string
          description: string | null
          description_blocks: Json
          features: string[] | null
          gst_enabled: boolean
          gst_percentage: number | null
          gst_pricing_mode: string
          guest_price: number
          has_variations: boolean | null
          height: number | null
          hsn_code: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          length: number | null
          meta_description: string | null
          meta_title: string | null
          name: string
          regular_price: number
          retail_moq: number
          retail_price: number
          shipping_class: string | null
          shop_moq: number
          shop_price: number
          short_description: string | null
          sku: string | null
          slug: string
          stock_quantity: number | null
          tags: string[] | null
          tax_class: string | null
          updated_at: string
          weight: number | null
          width: number | null
        }
        Insert: {
          banner_image?: string | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          description_blocks?: Json
          features?: string[] | null
          gst_enabled?: boolean
          gst_percentage?: number | null
          gst_pricing_mode?: string
          guest_price?: number
          has_variations?: boolean | null
          height?: number | null
          hsn_code?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          length?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          regular_price?: number
          retail_moq?: number
          retail_price: number
          shipping_class?: string | null
          shop_moq?: number
          shop_price: number
          short_description?: string | null
          sku?: string | null
          slug: string
          stock_quantity?: number | null
          tags?: string[] | null
          tax_class?: string | null
          updated_at?: string
          weight?: number | null
          width?: number | null
        }
        Update: {
          banner_image?: string | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          description_blocks?: Json
          features?: string[] | null
          gst_enabled?: boolean
          gst_percentage?: number | null
          gst_pricing_mode?: string
          guest_price?: number
          has_variations?: boolean | null
          height?: number | null
          hsn_code?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          length?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          regular_price?: number
          retail_moq?: number
          retail_price?: number
          shipping_class?: string | null
          shop_moq?: number
          shop_price?: number
          short_description?: string | null
          sku?: string | null
          slug?: string
          stock_quantity?: number | null
          tags?: string[] | null
          tax_class?: string | null
          updated_at?: string
          weight?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          email: string
          full_name: string | null
          gst_number: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_banners: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean | null
          link: string | null
          mobile_image_url: string | null
          offer_text: string | null
          sort_order: number | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean | null
          link?: string | null
          mobile_image_url?: string | null
          offer_text?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean | null
          link?: string | null
          mobile_image_url?: string | null
          offer_text?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pwa_telemetry: {
        Row: {
          before_install_prompt_fired: boolean | null
          created_at: string
          event: string
          id: string
          is_standalone: boolean | null
          manifest_errors: string[] | null
          manifest_ok: boolean | null
          meta: Json | null
          outcome: string | null
          platform: string | null
          sw_registered: boolean | null
          sw_scope: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          before_install_prompt_fired?: boolean | null
          created_at?: string
          event: string
          id?: string
          is_standalone?: boolean | null
          manifest_errors?: string[] | null
          manifest_ok?: boolean | null
          meta?: Json | null
          outcome?: string | null
          platform?: string | null
          sw_registered?: boolean | null
          sw_scope?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          before_install_prompt_fired?: boolean | null
          created_at?: string
          event?: string
          id?: string
          is_standalone?: boolean | null
          manifest_errors?: string[] | null
          manifest_ok?: boolean | null
          meta?: Json | null
          outcome?: string | null
          platform?: string | null
          sw_registered?: boolean | null
          sw_scope?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      razorpay_events: {
        Row: {
          amount: number | null
          contact: string | null
          created_at: string
          currency: string | null
          email: string | null
          error_code: string | null
          error_description: string | null
          event_id: string | null
          event_type: string
          id: string
          method: string | null
          order_id: string | null
          payload: Json | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_refund_id: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          contact?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          error_code?: string | null
          error_description?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          method?: string | null
          order_id?: string | null
          payload?: Json | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_refund_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          contact?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          error_code?: string | null
          error_description?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          method?: string | null
          order_id?: string | null
          payload?: Json | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_refund_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "razorpay_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_cart_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          session_id: string | null
          updated_at: string
          user_id: string
          variation_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number
          session_id?: string | null
          updated_at?: string
          user_id: string
          variation_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          session_id?: string | null
          updated_at?: string
          user_id?: string
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_cart_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_image: string | null
          product_name: string
          quantity: number
          quoted_price: number | null
          rfq_id: string
          target_price: number | null
          variation_details: string | null
          variation_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_image?: string | null
          product_name: string
          quantity: number
          quoted_price?: number | null
          rfq_id: string
          target_price?: number | null
          variation_details?: string | null
          variation_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          quoted_price?: number | null
          rfq_id?: string
          target_price?: number | null
          variation_details?: string | null
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_items_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfq_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_requests: {
        Row: {
          admin_notes: string | null
          attachments: string[] | null
          bulk_discount: number | null
          buyer_type: Database["public"]["Enums"]["app_role"] | null
          category: string | null
          company_name: string | null
          created_at: string
          delivery_timeline: string | null
          email: string
          full_name: string
          gst_amount: number | null
          gst_number: string | null
          id: string
          message: string | null
          payment_terms: string | null
          phone: string | null
          product_id: string | null
          product_name: string
          quantity: number
          quotation_pdf_url: string | null
          quoted_at: string | null
          quoted_price: number | null
          rfq_number: string
          shipping_cost: number | null
          status: Database["public"]["Enums"]["rfq_status"] | null
          target_price: number | null
          total_amount: number | null
          unit_price: number | null
          updated_at: string
          user_id: string
          validity_days: number | null
        }
        Insert: {
          admin_notes?: string | null
          attachments?: string[] | null
          bulk_discount?: number | null
          buyer_type?: Database["public"]["Enums"]["app_role"] | null
          category?: string | null
          company_name?: string | null
          created_at?: string
          delivery_timeline?: string | null
          email: string
          full_name: string
          gst_amount?: number | null
          gst_number?: string | null
          id?: string
          message?: string | null
          payment_terms?: string | null
          phone?: string | null
          product_id?: string | null
          product_name: string
          quantity: number
          quotation_pdf_url?: string | null
          quoted_at?: string | null
          quoted_price?: number | null
          rfq_number: string
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["rfq_status"] | null
          target_price?: number | null
          total_amount?: number | null
          unit_price?: number | null
          updated_at?: string
          user_id: string
          validity_days?: number | null
        }
        Update: {
          admin_notes?: string | null
          attachments?: string[] | null
          bulk_discount?: number | null
          buyer_type?: Database["public"]["Enums"]["app_role"] | null
          category?: string | null
          company_name?: string | null
          created_at?: string
          delivery_timeline?: string | null
          email?: string
          full_name?: string
          gst_amount?: number | null
          gst_number?: string | null
          id?: string
          message?: string | null
          payment_terms?: string | null
          phone?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          quotation_pdf_url?: string | null
          quoted_at?: string | null
          quoted_price?: number | null
          rfq_number?: string
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["rfq_status"] | null
          target_price?: number | null
          total_amount?: number | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_otp_events: {
        Row: {
          created_at: string
          email: string
          error_message: string | null
          event_type: string
          id: string
          ip: string | null
          metadata: Json | null
          status: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          error_message?: string | null
          event_type: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          status: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          error_message?: string | null
          event_type?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          status?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      signup_otps: {
        Row: {
          attempts: number
          code_hash: string
          correlation_id: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string | null
          password: string | null
          password_encrypted: string | null
          resend_available_at: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          correlation_id?: string | null
          created_at?: string
          email: string
          expires_at: string
          full_name?: string | null
          password?: string | null
          password_encrypted?: string | null
          resend_available_at?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          correlation_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string | null
          password?: string | null
          password_encrypted?: string | null
          resend_available_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_product_image_signed_url: {
        Args: { _expires_in?: number; _url: string }
        Returns: string
      }
      create_product_image_signed_urls: {
        Args: { _expires_in?: number; _urls: string[] }
        Returns: string[]
      }
      get_auto_apply_coupon: {
        Args: { _subtotal: number }
        Returns: {
          code: string
          discount_type: string
          discount_value: number
          id: string
          max_discount_amount: number
          min_order_amount: number
        }[]
      }
      get_product_review_stats: {
        Args: { _product_id: string }
        Returns: {
          avg_rating: number
          review_count: number
        }[]
      }
      get_public_product_reviews: {
        Args: { _product_id: string }
        Returns: {
          created_at: string
          id: string
          is_verified: boolean
          photos: string[]
          product_id: string
          rating: number
          review_text: string
          review_title: string
          reviewer_name: string
        }[]
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      list_public_coupons: {
        Args: { _category_id?: string }
        Returns: {
          auto_apply: boolean
          category_id: string
          code: string
          description: string
          discount_type: string
          discount_value: number
          id: string
          min_order_amount: number
          show_on_product: boolean
          title: string
        }[]
      }
      list_users_with_roles: {
        Args: never
        Returns: {
          email: string
          full_name: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      mark_message_read: { Args: { _message_id: string }; Returns: undefined }
      mcp_check_rate_limit: {
        Args: { _tool: string; _user: string }
        Returns: Json
      }
      signup_otp_get_password: {
        Args: { _email: string; _key: string }
        Returns: string
      }
      signup_otp_set_password: {
        Args: { _email: string; _key: string; _password: string }
        Returns: undefined
      }
      storage_path_from_url: {
        Args: { _bucket?: string; _url: string }
        Returns: string
      }
      validate_coupon: {
        Args: { _code: string; _subtotal: number }
        Returns: {
          code: string
          discount_type: string
          discount_value: number
          error: string
          id: string
          max_discount_amount: number
          min_order_amount: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "shop" | "retail" | "super_admin"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      rfq_status: "pending" | "quoted" | "accepted" | "rejected" | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "shop", "retail", "super_admin"],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      rfq_status: ["pending", "quoted", "accepted", "rejected", "expired"],
    },
  },
} as const
