import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (for API routes)
export const createServerClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  })
}

// Database types
export interface Database {
  public: {
    Tables: {
      campaigns: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          status: 'active' | 'paused' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          status?: 'active' | 'paused' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          status?: 'active' | 'paused' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      characters: {
        Row: {
          id: string
          user_id: string
          campaign_id: string | null
          name: string
          class: string | null
          level: number
          race: string | null
          background: string | null
          ability_scores: any | null
          skills: any | null
          spells: any | null
          equipment: any | null
          inventory: any | null
          conditions: any | null
          experience_points: number
          hit_points: number | null
          max_hit_points: number | null
          armor_class: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          campaign_id?: string | null
          name: string
          class?: string | null
          level?: number
          race?: string | null
          background?: string | null
          ability_scores?: any | null
          skills?: any | null
          spells?: any | null
          equipment?: any | null
          inventory?: any | null
          conditions?: any | null
          experience_points?: number
          hit_points?: number | null
          max_hit_points?: number | null
          armor_class?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          campaign_id?: string | null
          name?: string
          class?: string | null
          level?: number
          race?: string | null
          background?: string | null
          ability_scores?: any | null
          skills?: any | null
          spells?: any | null
          equipment?: any | null
          inventory?: any | null
          conditions?: any | null
          experience_points?: number
          hit_points?: number | null
          max_hit_points?: number | null
          armor_class?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          campaign_id: string | null
          character_id: string | null
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          campaign_id?: string | null
          character_id?: string | null
          title?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          campaign_id?: string | null
          character_id?: string | null
          title?: string
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata: any | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          metadata?: any | null
          created_at?: string
        }
      }
    }
  }
} 