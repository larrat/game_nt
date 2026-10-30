// Generated from the current Kurokage Supabase project on 2026-10-30.
// Schema/type data only. No player records or API keys are included.
// Regenerate via Supabase's TypeScript types generator after schema migrations.
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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attributes: {
        Row: {
          field: string | null
          hero_bonus: number | null
          hero_max: number | null
          hero_min: number | null
          icon: string | null
          id: number
          label: string | null
        }
        Insert: {
          field?: string | null
          hero_bonus?: number | null
          hero_max?: number | null
          hero_min?: number | null
          icon?: string | null
          id: number
          label?: string | null
        }
        Update: {
          field?: string | null
          hero_bonus?: number | null
          hero_max?: number | null
          hero_min?: number | null
          icon?: string | null
          id?: number
          label?: string | null
        }
        Relationships: []
      }
      avatars: {
        Row: {
          character_id: string | null
          evolution_desc: string | null
          evolution_req_level: number | null
          evolution_target_id: string | null
          id: string
          is_base: boolean | null
          name: string
        }
        Insert: {
          character_id?: string | null
          evolution_desc?: string | null
          evolution_req_level?: number | null
          evolution_target_id?: string | null
          id: string
          is_base?: boolean | null
          name: string
        }
        Update: {
          character_id?: string | null
          evolution_desc?: string | null
          evolution_req_level?: number | null
          evolution_target_id?: string | null
          id?: string
          is_base?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "avatars_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_logs: {
        Row: {
          combat_log: Json | null
          created_at: string | null
          enemy_name: string
          id: number
          player_id: number
          result: string
          ryous_gained: number | null
          turn_count: number | null
          xp_gained: number | null
        }
        Insert: {
          combat_log?: Json | null
          created_at?: string | null
          enemy_name: string
          id?: number
          player_id: number
          result: string
          ryous_gained?: number | null
          turn_count?: number | null
          xp_gained?: number | null
        }
        Update: {
          combat_log?: Json | null
          created_at?: string | null
          enemy_name?: string
          id?: number
          player_id?: number
          result?: string
          ryous_gained?: number | null
          turn_count?: number | null
          xp_gained?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "battle_logs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          base_avatar_url: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          base_avatar_url: string
          description?: string | null
          id: string
          name: string
        }
        Update: {
          base_avatar_url?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      clan_skills: {
        Row: {
          clan_id: number | null
          description: string | null
          effect_type: string | null
          effect_value: number | null
          icon_url: string | null
          id: number
          name: string
          req_label: string | null
        }
        Insert: {
          clan_id?: number | null
          description?: string | null
          effect_type?: string | null
          effect_value?: number | null
          icon_url?: string | null
          id?: number
          name: string
          req_label?: string | null
        }
        Update: {
          clan_id?: number | null
          description?: string | null
          effect_type?: string | null
          effect_value?: number | null
          icon_url?: string | null
          id?: number
          name?: string
          req_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clan_skills_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      clans: {
        Row: {
          bonus_attr: string | null
          bonus_value: number | null
          created_at: string
          description: string | null
          id: number
          image_url: string | null
          name: string
          village_id: number | null
        }
        Insert: {
          bonus_attr?: string | null
          bonus_value?: number | null
          created_at?: string
          description?: string | null
          id?: number
          image_url?: string | null
          name: string
          village_id?: number | null
        }
        Update: {
          bonus_attr?: string | null
          bonus_value?: number | null
          created_at?: string
          description?: string | null
          id?: number
          image_url?: string | null
          name?: string
          village_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clans_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      consumables: {
        Row: {
          cost_coins: number
          cost_ryous: number
          created_at: string
          description: string | null
          icon: string | null
          id: number
          is_active: boolean | null
          name: string
          type: string
          value: number
        }
        Insert: {
          cost_coins?: number
          cost_ryous?: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          type: string
          value?: number
        }
        Update: {
          cost_coins?: number
          cost_ryous?: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          type?: string
          value?: number
        }
        Relationships: []
      }
      elements: {
        Row: {
          color_hex: string | null
          description: string | null
          icon: string | null
          id: number
          name: string | null
          name_id: string | null
          strong_against: string | null
          weak_against: string | null
        }
        Insert: {
          color_hex?: string | null
          description?: string | null
          icon?: string | null
          id: number
          name?: string | null
          name_id?: string | null
          strong_against?: string | null
          weak_against?: string | null
        }
        Update: {
          color_hex?: string | null
          description?: string | null
          icon?: string | null
          id?: number
          name?: string | null
          name_id?: string | null
          strong_against?: string | null
          weak_against?: string | null
        }
        Relationships: []
      }
      game_config: {
        Row: {
          key: string
          value: Json | null
        }
        Insert: {
          key: string
          value?: Json | null
        }
        Update: {
          key?: string
          value?: Json | null
        }
        Relationships: []
      }
      global_events: {
        Row: {
          boss_hp: number | null
          boss_max_hp: number | null
          created_at: string | null
          description: string | null
          ends_at: string | null
          id: number
          is_active: boolean | null
          is_world_boss: boolean | null
          name: string
        }
        Insert: {
          boss_hp?: number | null
          boss_max_hp?: number | null
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: number
          is_active?: boolean | null
          is_world_boss?: boolean | null
          name: string
        }
        Update: {
          boss_hp?: number | null
          boss_max_hp?: number | null
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: number
          is_active?: boolean | null
          is_world_boss?: boolean | null
          name?: string
        }
        Relationships: []
      }
      item_stat_types: {
        Row: {
          id: number
          is_percentage: boolean | null
          max_value: number | null
          min_value: number | null
          name: string | null
          stat_type: string | null
        }
        Insert: {
          id: number
          is_percentage?: boolean | null
          max_value?: number | null
          min_value?: number | null
          name?: string | null
          stat_type?: string | null
        }
        Update: {
          id?: number
          is_percentage?: boolean | null
          max_value?: number | null
          min_value?: number | null
          name?: string | null
          stat_type?: string | null
        }
        Relationships: []
      }
      items: {
        Row: {
          bonus_stats: Json
          created_at: string | null
          id: number
          image_url: string | null
          name: string
          price: number
          rarity: string
          req_level: number
          type: string
        }
        Insert: {
          bonus_stats?: Json
          created_at?: string | null
          id?: number
          image_url?: string | null
          name: string
          price?: number
          rarity?: string
          req_level?: number
          type: string
        }
        Update: {
          bonus_stats?: Json
          created_at?: string | null
          id?: number
          image_url?: string | null
          name?: string
          price?: number
          rarity?: string
          req_level?: number
          type?: string
        }
        Relationships: []
      }
      jutsu_effects: {
        Row: {
          apply_chance: number
          effect_id: number | null
          id: number
          jutsu_id: number | null
        }
        Insert: {
          apply_chance?: number
          effect_id?: number | null
          id?: number
          jutsu_id?: number | null
        }
        Update: {
          apply_chance?: number
          effect_id?: number | null
          id?: number
          jutsu_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jutsu_effects_effect_id_fkey"
            columns: ["effect_id"]
            isOneToOne: false
            referencedRelation: "status_effects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jutsu_effects_jutsu_id_fkey"
            columns: ["jutsu_id"]
            isOneToOne: false
            referencedRelation: "jutsus"
            referencedColumns: ["id"]
          },
        ]
      }
      jutsus: {
        Row: {
          accuracy: number | null
          category: string | null
          chakra_cost: number | null
          cooldown: number | null
          cost_ryous: number | null
          damage: number | null
          description: string | null
          element: string | null
          id: number
          is_active: boolean | null
          name: string
          req_attr_value: number | null
          req_clan: string | null
          req_class: string | null
          req_level: number | null
          req_rank: string | null
          req_seals: number | null
          type: string | null
        }
        Insert: {
          accuracy?: number | null
          category?: string | null
          chakra_cost?: number | null
          cooldown?: number | null
          cost_ryous?: number | null
          damage?: number | null
          description?: string | null
          element?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          req_attr_value?: number | null
          req_clan?: string | null
          req_class?: string | null
          req_level?: number | null
          req_rank?: string | null
          req_seals?: number | null
          type?: string | null
        }
        Update: {
          accuracy?: number | null
          category?: string | null
          chakra_cost?: number | null
          cooldown?: number | null
          cost_ryous?: number | null
          damage?: number | null
          description?: string | null
          element?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          req_attr_value?: number | null
          req_clan?: string | null
          req_class?: string | null
          req_level?: number | null
          req_rank?: string | null
          req_seals?: number | null
          type?: string | null
        }
        Relationships: []
      }
      loot_drop_rates: {
        Row: {
          common_chance: number | null
          epic_chance: number | null
          id: number
          legendary_chance: number | null
          rank_name: string | null
          rare_chance: number | null
        }
        Insert: {
          common_chance?: number | null
          epic_chance?: number | null
          id: number
          legendary_chance?: number | null
          rank_name?: string | null
          rare_chance?: number | null
        }
        Update: {
          common_chance?: number | null
          epic_chance?: number | null
          id?: number
          legendary_chance?: number | null
          rank_name?: string | null
          rare_chance?: number | null
        }
        Relationships: []
      }
      missions: {
        Row: {
          description: string | null
          id: number
          is_active: boolean | null
          mission_type: string | null
          req_level: number | null
          ryous: number | null
          time_seconds: number | null
          title: string | null
          xp: number | null
        }
        Insert: {
          description?: string | null
          id?: number
          is_active?: boolean | null
          mission_type?: string | null
          req_level?: number | null
          ryous?: number | null
          time_seconds?: number | null
          title?: string | null
          xp?: number | null
        }
        Update: {
          description?: string | null
          id?: number
          is_active?: boolean | null
          mission_type?: string | null
          req_level?: number | null
          ryous?: number | null
          time_seconds?: number | null
          title?: string | null
          xp?: number | null
        }
        Relationships: []
      }
      npcs: {
        Row: {
          atk: number
          avatar: string | null
          chakra: number
          created_at: string | null
          def: number
          description: string | null
          element: string | null
          exam_round: number | null
          hp: number
          id: number
          is_active: boolean | null
          is_bingo_book: boolean | null
          is_chunin_exam: boolean
          is_map_npc: boolean | null
          is_story_mode: boolean | null
          level: number
          map_x: number | null
          map_y: number | null
          name: string
          rank: string | null
          ryou_reward: number
          xp_reward: number
        }
        Insert: {
          atk?: number
          avatar?: string | null
          chakra?: number
          created_at?: string | null
          def?: number
          description?: string | null
          element?: string | null
          exam_round?: number | null
          hp?: number
          id?: number
          is_active?: boolean | null
          is_bingo_book?: boolean | null
          is_chunin_exam?: boolean
          is_map_npc?: boolean | null
          is_story_mode?: boolean | null
          level?: number
          map_x?: number | null
          map_y?: number | null
          name: string
          rank?: string | null
          ryou_reward?: number
          xp_reward?: number
        }
        Update: {
          atk?: number
          avatar?: string | null
          chakra?: number
          created_at?: string | null
          def?: number
          description?: string | null
          element?: string | null
          exam_round?: number | null
          hp?: number
          id?: number
          is_active?: boolean | null
          is_bingo_book?: boolean | null
          is_chunin_exam?: boolean
          is_map_npc?: boolean | null
          is_story_mode?: boolean | null
          level?: number
          map_x?: number | null
          map_y?: number | null
          name?: string
          rank?: string | null
          ryou_reward?: number
          xp_reward?: number
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: number
          level: number | null
          name: string
          ranking_points: number | null
          village_id: number | null
          xp: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          level?: number | null
          name: string
          ranking_points?: number | null
          village_id?: number | null
          xp?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          level?: number | null
          name?: string
          ranking_points?: number | null
          village_id?: number | null
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      player_chunin_exams: {
        Row: {
          active_session_id: string | null
          completed_at: string | null
          created_at: string
          current_round: number
          player_id: number
          status: string
          updated_at: string
        }
        Insert: {
          active_session_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_round?: number
          player_id: number
          status?: string
          updated_at?: string
        }
        Update: {
          active_session_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_round?: number
          player_id?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_chunin_exams_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_combat_sessions: {
        Row: {
          awaiting_enemy_turn: boolean
          created_at: string
          enemy_atk: number
          enemy_chakra: number
          enemy_def: number
          enemy_element: string | null
          enemy_hp_remaining: number
          enemy_id: number
          enemy_level: number
          enemy_max_hp: number
          enemy_name: string
          exam_round: number | null
          expires_at: string
          from_map: boolean
          is_dojo: boolean
          is_exam: boolean
          last_action_at: string | null
          last_jutsu_id: number | null
          last_jutsu_turn: number | null
          player_chakra: number
          player_hp: number
          player_id: number
          player_max_chakra: number
          player_max_hp: number
          player_max_stamina: number
          player_stamina: number
          session_id: string
          status: string
          turn_count: number
        }
        Insert: {
          awaiting_enemy_turn?: boolean
          created_at?: string
          enemy_atk: number
          enemy_chakra?: number
          enemy_def: number
          enemy_element?: string | null
          enemy_hp_remaining: number
          enemy_id: number
          enemy_level: number
          enemy_max_hp: number
          enemy_name: string
          exam_round?: number | null
          expires_at?: string
          from_map?: boolean
          is_dojo?: boolean
          is_exam?: boolean
          last_action_at?: string | null
          last_jutsu_id?: number | null
          last_jutsu_turn?: number | null
          player_chakra: number
          player_hp: number
          player_id: number
          player_max_chakra: number
          player_max_hp: number
          player_max_stamina: number
          player_stamina: number
          session_id?: string
          status?: string
          turn_count?: number
        }
        Update: {
          awaiting_enemy_turn?: boolean
          created_at?: string
          enemy_atk?: number
          enemy_chakra?: number
          enemy_def?: number
          enemy_element?: string | null
          enemy_hp_remaining?: number
          enemy_id?: number
          enemy_level?: number
          enemy_max_hp?: number
          enemy_name?: string
          exam_round?: number | null
          expires_at?: string
          from_map?: boolean
          is_dojo?: boolean
          is_exam?: boolean
          last_action_at?: string | null
          last_jutsu_id?: number | null
          last_jutsu_turn?: number | null
          player_chakra?: number
          player_hp?: number
          player_id?: number
          player_max_chakra?: number
          player_max_hp?: number
          player_max_stamina?: number
          player_stamina?: number
          session_id?: string
          status?: string
          turn_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_combat_sessions_enemy_id_fkey"
            columns: ["enemy_id"]
            isOneToOne: false
            referencedRelation: "npcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_combat_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_consumables: {
        Row: {
          consumable_id: number | null
          created_at: string
          id: string
          player_id: number | null
          quantity: number
        }
        Insert: {
          consumable_id?: number | null
          created_at?: string
          id?: string
          player_id?: number | null
          quantity?: number
        }
        Update: {
          consumable_id?: number | null
          created_at?: string
          id?: string
          player_id?: number | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_consumables_consumable_id_fkey"
            columns: ["consumable_id"]
            isOneToOne: false
            referencedRelation: "consumables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_consumables_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_defeated_npcs: {
        Row: {
          defeated_at: string | null
          id: number
          npc_id: number | null
          player_id: number | null
        }
        Insert: {
          defeated_at?: string | null
          id?: number
          npc_id?: number | null
          player_id?: number | null
        }
        Update: {
          defeated_at?: string | null
          id?: number
          npc_id?: number | null
          player_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_defeated_npcs_npc_id_fkey"
            columns: ["npc_id"]
            isOneToOne: false
            referencedRelation: "npcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_defeated_npcs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_inventory: {
        Row: {
          acquired_at: string | null
          id: number
          is_equipped: boolean | null
          is_favorite: boolean | null
          is_server_acquired: boolean
          item_id: number | null
          player_id: number | null
          rarity: string | null
          rolled_stats: Json | null
          upgrade_level: number | null
        }
        Insert: {
          acquired_at?: string | null
          id?: number
          is_equipped?: boolean | null
          is_favorite?: boolean | null
          is_server_acquired?: boolean
          item_id?: number | null
          player_id?: number | null
          rarity?: string | null
          rolled_stats?: Json | null
          upgrade_level?: number | null
        }
        Update: {
          acquired_at?: string | null
          id?: number
          is_equipped?: boolean | null
          is_favorite?: boolean | null
          is_server_acquired?: boolean
          item_id?: number | null
          player_id?: number | null
          rarity?: string | null
          rolled_stats?: Json | null
          upgrade_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_inventory_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_jutsus: {
        Row: {
          id: number
          is_equipped: boolean | null
          jutsu_id: number | null
          level: number | null
          player_id: number | null
        }
        Insert: {
          id?: number
          is_equipped?: boolean | null
          jutsu_id?: number | null
          level?: number | null
          player_id?: number | null
        }
        Update: {
          id?: number
          is_equipped?: boolean | null
          jutsu_id?: number | null
          level?: number | null
          player_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_jutsus_jutsu_id_fkey"
            columns: ["jutsu_id"]
            isOneToOne: false
            referencedRelation: "jutsus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_jutsus_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_quests: {
        Row: {
          completed_at: string | null
          id: number
          player_id: number | null
          quest_id: number | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: number
          player_id?: number | null
          quest_id?: number | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: number
          player_id?: number | null
          quest_id?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_quests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_quests_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "story_quests"
            referencedColumns: ["id"]
          },
        ]
      }
      player_summons: {
        Row: {
          affection: number
          created_at: string
          id: number
          is_equipped: boolean
          level: number
          player_id: number
          summon_id: number
        }
        Insert: {
          affection?: number
          created_at?: string
          id?: number
          is_equipped?: boolean
          level?: number
          player_id: number
          summon_id: number
        }
        Update: {
          affection?: number
          created_at?: string
          id?: number
          is_equipped?: boolean
          level?: number
          player_id?: number
          summon_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_summons_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_summons_summon_id_fkey"
            columns: ["summon_id"]
            isOneToOne: false
            referencedRelation: "summons"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          active_missions: Json | null
          active_task_end_time: string | null
          active_task_id: number | null
          agilidade: number | null
          avatar: string | null
          bingo_book_kills: number | null
          buk: number | null
          bukijutsu: number | null
          chakra: number | null
          character_id: string | null
          clan: string | null
          clan_custom_stats: Json
          clan_id: number | null
          clan_lvl: number
          class: string
          completed_missions: Json | null
          created_at: string
          daily_chakra_spent: number | null
          daily_map_battles: number | null
          daily_npcs_defeated: number | null
          daily_rewards_claimed: Json | null
          daily_trainings: number | null
          dojo_clears: number | null
          element: string | null
          element2: string | null
          energia: number | null
          event_tickets: number | null
          fainted_at: string | null
          forca: number | null
          fugas: number | null
          gen: number | null
          genjutsu: number | null
          hp: number | null
          id: number
          inteligencia: number | null
          inventory_essences: Json | null
          is_fainted: boolean | null
          is_vip: boolean
          jutsus_learned: Json | null
          last_daily_claim: string | null
          last_daily_reset: string | null
          last_event_date: string | null
          level: number | null
          losses_dojo: number | null
          losses_pvp: number | null
          mission_slots: number | null
          missions_a: number | null
          missions_b: number | null
          missions_c: number | null
          missions_d: number | null
          missions_s: number | null
          name: string
          nin: number | null
          ninjutsu: number | null
          npc_wins: number | null
          org_id: number | null
          passou_exame_chunin: boolean | null
          pontos_atributos: number | null
          portoes_used_at: string | null
          pvp_wins: number | null
          rank: string | null
          resistencia: number | null
          resources_regenerated_at: string
          ryous: number | null
          selo: number | null
          stamina: number | null
          stamina_pts: number | null
          tai: number | null
          taijutsu: number | null
          tasks_completed: number | null
          team_id: number | null
          title: string | null
          unlocked_avatars: Json
          user_id: string | null
          vila_atual_id: number | null
          village_id: number | null
          vip_coins: number | null
          wins_dojo: number | null
          wins_pvp: number | null
          xp: number | null
        }
        Insert: {
          active_missions?: Json | null
          active_task_end_time?: string | null
          active_task_id?: number | null
          agilidade?: number | null
          avatar?: string | null
          bingo_book_kills?: number | null
          buk?: number | null
          bukijutsu?: number | null
          chakra?: number | null
          character_id?: string | null
          clan?: string | null
          clan_custom_stats?: Json
          clan_id?: number | null
          clan_lvl?: number
          class: string
          completed_missions?: Json | null
          created_at?: string
          daily_chakra_spent?: number | null
          daily_map_battles?: number | null
          daily_npcs_defeated?: number | null
          daily_rewards_claimed?: Json | null
          daily_trainings?: number | null
          dojo_clears?: number | null
          element?: string | null
          element2?: string | null
          energia?: number | null
          event_tickets?: number | null
          fainted_at?: string | null
          forca?: number | null
          fugas?: number | null
          gen?: number | null
          genjutsu?: number | null
          hp?: number | null
          id?: number
          inteligencia?: number | null
          inventory_essences?: Json | null
          is_fainted?: boolean | null
          is_vip?: boolean
          jutsus_learned?: Json | null
          last_daily_claim?: string | null
          last_daily_reset?: string | null
          last_event_date?: string | null
          level?: number | null
          losses_dojo?: number | null
          losses_pvp?: number | null
          mission_slots?: number | null
          missions_a?: number | null
          missions_b?: number | null
          missions_c?: number | null
          missions_d?: number | null
          missions_s?: number | null
          name: string
          nin?: number | null
          ninjutsu?: number | null
          npc_wins?: number | null
          org_id?: number | null
          passou_exame_chunin?: boolean | null
          pontos_atributos?: number | null
          portoes_used_at?: string | null
          pvp_wins?: number | null
          rank?: string | null
          resistencia?: number | null
          resources_regenerated_at?: string
          ryous?: number | null
          selo?: number | null
          stamina?: number | null
          stamina_pts?: number | null
          tai?: number | null
          taijutsu?: number | null
          tasks_completed?: number | null
          team_id?: number | null
          title?: string | null
          unlocked_avatars?: Json
          user_id?: string | null
          vila_atual_id?: number | null
          village_id?: number | null
          vip_coins?: number | null
          wins_dojo?: number | null
          wins_pvp?: number | null
          xp?: number | null
        }
        Update: {
          active_missions?: Json | null
          active_task_end_time?: string | null
          active_task_id?: number | null
          agilidade?: number | null
          avatar?: string | null
          bingo_book_kills?: number | null
          buk?: number | null
          bukijutsu?: number | null
          chakra?: number | null
          character_id?: string | null
          clan?: string | null
          clan_custom_stats?: Json
          clan_id?: number | null
          clan_lvl?: number
          class?: string
          completed_missions?: Json | null
          created_at?: string
          daily_chakra_spent?: number | null
          daily_map_battles?: number | null
          daily_npcs_defeated?: number | null
          daily_rewards_claimed?: Json | null
          daily_trainings?: number | null
          dojo_clears?: number | null
          element?: string | null
          element2?: string | null
          energia?: number | null
          event_tickets?: number | null
          fainted_at?: string | null
          forca?: number | null
          fugas?: number | null
          gen?: number | null
          genjutsu?: number | null
          hp?: number | null
          id?: number
          inteligencia?: number | null
          inventory_essences?: Json | null
          is_fainted?: boolean | null
          is_vip?: boolean
          jutsus_learned?: Json | null
          last_daily_claim?: string | null
          last_daily_reset?: string | null
          last_event_date?: string | null
          level?: number | null
          losses_dojo?: number | null
          losses_pvp?: number | null
          mission_slots?: number | null
          missions_a?: number | null
          missions_b?: number | null
          missions_c?: number | null
          missions_d?: number | null
          missions_s?: number | null
          name?: string
          nin?: number | null
          ninjutsu?: number | null
          npc_wins?: number | null
          org_id?: number | null
          passou_exame_chunin?: boolean | null
          pontos_atributos?: number | null
          portoes_used_at?: string | null
          pvp_wins?: number | null
          rank?: string | null
          resistencia?: number | null
          resources_regenerated_at?: string
          ryous?: number | null
          selo?: number | null
          stamina?: number | null
          stamina_pts?: number | null
          tai?: number | null
          taijutsu?: number | null
          tasks_completed?: number | null
          team_id?: number | null
          title?: string | null
          unlocked_avatars?: Json
          user_id?: string | null
          vila_atual_id?: number | null
          village_id?: number | null
          vip_coins?: number | null
          wins_dojo?: number | null
          wins_pvp?: number | null
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_player_avatar"
            columns: ["avatar"]
            isOneToOne: false
            referencedRelation: "avatars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_active_task_id_fkey"
            columns: ["active_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_vila_atual_id_fkey"
            columns: ["vila_atual_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      ranks: {
        Row: {
          description: string | null
          icon_src: string | null
          id: number
          name_id: string | null
          req_bingo_book: number | null
          req_clan_lvl: number | null
          req_combat_points: number | null
          req_gate_lvl: number | null
          req_invocation_lvl: number | null
          req_jutsus: number | null
          req_jutsus_lvl2: number | null
          req_jutsus_lvl3: number | null
          req_karma_lvl: number | null
          req_level: number | null
          req_missions_a: number | null
          req_missions_b: number | null
          req_missions_c: number | null
          req_missions_d: number | null
          req_missions_s: number | null
          req_npc_wins: number | null
          req_tasks: number | null
          title: string | null
          train_bonus: number | null
          train_max_mult: number | null
          train_min_mult: number | null
        }
        Insert: {
          description?: string | null
          icon_src?: string | null
          id: number
          name_id?: string | null
          req_bingo_book?: number | null
          req_clan_lvl?: number | null
          req_combat_points?: number | null
          req_gate_lvl?: number | null
          req_invocation_lvl?: number | null
          req_jutsus?: number | null
          req_jutsus_lvl2?: number | null
          req_jutsus_lvl3?: number | null
          req_karma_lvl?: number | null
          req_level?: number | null
          req_missions_a?: number | null
          req_missions_b?: number | null
          req_missions_c?: number | null
          req_missions_d?: number | null
          req_missions_s?: number | null
          req_npc_wins?: number | null
          req_tasks?: number | null
          title?: string | null
          train_bonus?: number | null
          train_max_mult?: number | null
          train_min_mult?: number | null
        }
        Update: {
          description?: string | null
          icon_src?: string | null
          id?: number
          name_id?: string | null
          req_bingo_book?: number | null
          req_clan_lvl?: number | null
          req_combat_points?: number | null
          req_gate_lvl?: number | null
          req_invocation_lvl?: number | null
          req_jutsus?: number | null
          req_jutsus_lvl2?: number | null
          req_jutsus_lvl3?: number | null
          req_karma_lvl?: number | null
          req_level?: number | null
          req_missions_a?: number | null
          req_missions_b?: number | null
          req_missions_c?: number | null
          req_missions_d?: number | null
          req_missions_s?: number | null
          req_npc_wins?: number | null
          req_tasks?: number | null
          title?: string | null
          train_bonus?: number | null
          train_max_mult?: number | null
          train_min_mult?: number | null
        }
        Relationships: []
      }
      status_effects: {
        Row: {
          base_value: number | null
          default_duration: number | null
          description: string | null
          icon: string | null
          id: number
          name: string
          stat_affected: string | null
          type: string
        }
        Insert: {
          base_value?: number | null
          default_duration?: number | null
          description?: string | null
          icon?: string | null
          id?: number
          name: string
          stat_affected?: string | null
          type: string
        }
        Update: {
          base_value?: number | null
          default_duration?: number | null
          description?: string | null
          icon?: string | null
          id?: number
          name?: string
          stat_affected?: string | null
          type?: string
        }
        Relationships: []
      }
      story_quests: {
        Row: {
          description: string | null
          dialogue: Json | null
          id: number
          npc_image_url: string | null
          npc_name: string | null
          objective_target: Json | null
          objective_type: string | null
          prerequisite_quest_id: number | null
          req_level: number | null
          rewards: Json | null
          title: string
        }
        Insert: {
          description?: string | null
          dialogue?: Json | null
          id?: number
          npc_image_url?: string | null
          npc_name?: string | null
          objective_target?: Json | null
          objective_type?: string | null
          prerequisite_quest_id?: number | null
          req_level?: number | null
          rewards?: Json | null
          title: string
        }
        Update: {
          description?: string | null
          dialogue?: Json | null
          id?: number
          npc_image_url?: string | null
          npc_name?: string | null
          objective_target?: Json | null
          objective_type?: string | null
          prerequisite_quest_id?: number | null
          req_level?: number | null
          rewards?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_quests_prerequisite_quest_id_fkey"
            columns: ["prerequisite_quest_id"]
            isOneToOne: false
            referencedRelation: "story_quests"
            referencedColumns: ["id"]
          },
        ]
      }
      summons: {
        Row: {
          animal_type: string
          base_atk: number
          base_hp: number
          created_at: string
          description: string
          element: string | null
          id: number
          name: string
          rarity: string
          req_level: number
          req_rank: string
        }
        Insert: {
          animal_type: string
          base_atk?: number
          base_hp?: number
          created_at?: string
          description?: string
          element?: string | null
          id?: number
          name: string
          rarity?: string
          req_level?: number
          req_rank?: string
        }
        Update: {
          animal_type?: string
          base_atk?: number
          base_hp?: number
          created_at?: string
          description?: string
          element?: string | null
          id?: number
          name?: string
          rarity?: string
          req_level?: number
          req_rank?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string | null
          description: string | null
          duration_s: number
          id: number
          is_active: boolean | null
          req_level: number
          ryou_reward: number
          title: string
          xp_reward: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_s?: number
          id?: number
          is_active?: boolean | null
          req_level?: number
          ryou_reward?: number
          title: string
          xp_reward?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_s?: number
          id?: number
          is_active?: boolean | null
          req_level?: number
          ryou_reward?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          id: number
          level: number | null
          name: string
          ranking_points: number | null
          village_id: number | null
          xp: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          level?: number | null
          name: string
          ranking_points?: number | null
          village_id?: number | null
          xp?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          level?: number | null
          name?: string
          ranking_points?: number | null
          village_id?: number | null
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      village_buildings: {
        Row: {
          building_type: string
          created_at: string | null
          current_donations: number | null
          id: string
          level: number | null
          next_level_cost: number | null
          village_id: number
        }
        Insert: {
          building_type: string
          created_at?: string | null
          current_donations?: number | null
          id?: string
          level?: number | null
          next_level_cost?: number | null
          village_id: number
        }
        Update: {
          building_type?: string
          created_at?: string | null
          current_donations?: number | null
          id?: string
          level?: number | null
          next_level_cost?: number | null
          village_id?: number
        }
        Relationships: []
      }
      village_donors: {
        Row: {
          building_id: string | null
          id: string
          last_donated_at: string | null
          player_id: number | null
          total_donated: number | null
        }
        Insert: {
          building_id?: string | null
          id?: string
          last_donated_at?: string | null
          player_id?: number | null
          total_donated?: number | null
        }
        Update: {
          building_id?: string | null
          id?: string
          last_donated_at?: string | null
          player_id?: number | null
          total_donated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "village_donors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "village_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "village_donors_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      villages: {
        Row: {
          color_hex: string | null
          created_at: string
          icon: string | null
          id: number
          is_rogue_village: boolean | null
          leader_title: string | null
          level: number | null
          map_x_percent: number | null
          map_y_percent: number | null
          name: string
          xp: number | null
        }
        Insert: {
          color_hex?: string | null
          created_at?: string
          icon?: string | null
          id?: number
          is_rogue_village?: boolean | null
          leader_title?: string | null
          level?: number | null
          map_x_percent?: number | null
          map_y_percent?: number | null
          name: string
          xp?: number | null
        }
        Update: {
          color_hex?: string | null
          created_at?: string
          icon?: string | null
          id?: number
          is_rogue_village?: boolean | null
          leader_title?: string | null
          level?: number | null
          map_x_percent?: number | null
          map_y_percent?: number | null
          name?: string
          xp?: number | null
        }
        Relationships: []
      }
      world_boss_damage: {
        Row: {
          created_at: string | null
          event_id: number | null
          id: string
          is_last_hit: boolean | null
          player_id: number | null
          total_damage: number | null
        }
        Insert: {
          created_at?: string | null
          event_id?: number | null
          id?: string
          is_last_hit?: boolean | null
          player_id?: number | null
          total_damage?: number | null
        }
        Update: {
          created_at?: string | null
          event_id?: number | null
          id?: string
          is_last_hit?: boolean | null
          player_id?: number | null
          total_damage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "world_boss_damage_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "global_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_boss_damage_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      world_boss_logs: {
        Row: {
          boss_name: string
          created_at: string
          damage_dealt: number
          id: number
          player_id: number
        }
        Insert: {
          boss_name: string
          created_at?: string
          damage_dealt: number
          id?: number
          player_id: number
        }
        Update: {
          boss_name?: string
          created_at?: string
          damage_dealt?: number
          id?: number
          player_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "world_boss_logs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      world_boss_sessions: {
        Row: {
          created_at: string
          damage_total: number
          ended_at: string | null
          event_id: number
          id: string
          is_active: boolean
          player_id: number
          turn_count: number
        }
        Insert: {
          created_at?: string
          damage_total?: number
          ended_at?: string | null
          event_id: number
          id?: string
          is_active?: boolean
          player_id: number
          turn_count?: number
        }
        Update: {
          created_at?: string
          damage_total?: number
          ended_at?: string | null
          event_id?: number
          id?: string
          is_active?: boolean
          player_id?: number
          turn_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "world_boss_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "global_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_boss_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abandonar_combate_sessao: {
        Args: { p_player_id: number; p_session_id: string }
        Returns: Json
      }
      abrir_portao: {
        Args: { p_gate_id: number; p_player_id: number }
        Returns: Json
      }
      alterar_avatar_jogador: {
        Args: { p_avatar_id: string; p_player_id: number }
        Returns: Json
      }
      alterar_equipamento_inventario: {
        Args: {
          p_equipped: boolean
          p_inventory_item_id: number
          p_player_id: number
        }
        Returns: Json
      }
      aprender_elemento: {
        Args: { p_element_id: string; p_player_id: number }
        Returns: Json
      }
      aprender_jutsu: {
        Args: { p_cost?: number; p_jutsu_id: number; p_player_id: number }
        Returns: Json
      }
      aprender_jutsus_massa: {
        Args: { p_jutsus: Json; p_player_id: number; p_total_cost?: number }
        Returns: Json
      }
      aprender_kinjutsu: {
        Args: { p_jutsu_id: number; p_player_id: number }
        Returns: Json
      }
      aprimorar_equipamento: {
        Args: { p_inventory_item_id: number; p_player_id: number }
        Returns: Json
      }
      assinar_invocacao: {
        Args: { p_invocacao_id: number; p_player_id: number }
        Returns: Json
      }
      atacar_world_boss: {
        Args: {
          p_action: string
          p_jutsu_id?: number
          p_player_id: number
          p_session_id: string
        }
        Returns: Json
      }
      atualizar_titulo_jogador: {
        Args: { p_player_id: number; p_title: string }
        Returns: Json
      }
      calcular_level_por_xp: { Args: { p_xp: number }; Returns: number }
      comprar_item_loja: {
        Args: { p_item_id: number; p_player_id: number }
        Returns: Json
      }
      comprar_ramen: {
        Args: {
          p_consumable_id: number
          p_player_id: number
          p_quantidade: number
        }
        Returns: Json
      }
      concluir_story_quest: {
        Args: { p_player_id: number; p_quest_id: number }
        Returns: Json
      }
      criar_personagem: {
        Args: {
          p_avatar: string
          p_character_id: string
          p_class: string
          p_name: string
          p_village_id: number
        }
        Returns: Json
      }
      desbloquear_avatar_templo: {
        Args: { p_avatar_id: string; p_player_id: number; p_req_level: number }
        Returns: Json
      }
      desbloquear_portao: {
        Args: {
          p_player_id: number
          p_portao_idx: number
          p_req_level: number
          p_req_ryous: number
        }
        Returns: Json
      }
      distribute_boss_rewards: {
        Args: { p_event_id: number }
        Returns: undefined
      }
      doar_vila: {
        Args: { p_amount: number; p_building_type: string; p_player_id: number }
        Returns: Json
      }
      encerrar_world_boss: {
        Args: { p_player_id: number; p_session_id: string }
        Returns: Json
      }
      entrar_cla: {
        Args: { p_clan_id: number; p_custom_stats: Json; p_player_id: number }
        Returns: Json
      }
      equipar_invocacao: {
        Args: {
          p_equipped: boolean
          p_player_id: number
          p_player_summon_id: number
        }
        Returns: Json
      }
      finalizar_combate:
        | {
            Args: {
              p_combat_log: Json
              p_enemy_id: number
              p_player_id: number
              p_result: string
              p_turn_count: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_combat_log: Json
              p_enemy_id: number
              p_enemy_name?: string
              p_fallback_ryous?: number
              p_fallback_xp?: number
              p_player_id: number
              p_result: string
              p_turn_count: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_combat_log: Json
              p_enemy_id: number
              p_enemy_name: string
              p_fallback_ryous: number
              p_fallback_xp: number
              p_from_map: boolean
              p_player_id: number
              p_result: string
              p_turn_count: number
            }
            Returns: Json
          }
      finalizar_combate_sessao: {
        Args: {
          p_combat_log: Json
          p_player_id: number
          p_session_id: string
          p_turn_count: number
        }
        Returns: Json
      }
      finalizar_missao: {
        Args: {
          p_mission_id: number
          p_mission_ryous: number
          p_mission_type: string
          p_mission_xp: number
          p_player_id: number
        }
        Returns: Json
      }
      get_clan_bonus: { Args: { p_clan: string }; Returns: Json }
      get_equipment_bonus: {
        Args: { p_equipped_items: Json; p_stat_name: string }
        Returns: number
      }
      get_rank_bonus: { Args: { p_rank: string }; Returns: Json }
      hospital_alta: {
        Args: {
          p_global_hospital_cost_mult?: number
          p_max_cp: number
          p_max_hp: number
          p_paid: boolean
          p_player_id: number
        }
        Returns: Json
      }
      iniciar_combate_sessao: {
        Args: {
          p_enemy_id: number
          p_from_map?: boolean
          p_is_dojo?: boolean
          p_player_id: number
        }
        Returns: Json
      }
      iniciar_exame_chunin: {
        Args: { p_player_id: number; p_round: number }
        Returns: Json
      }
      iniciar_missao: {
        Args: {
          p_duration_seconds: number
          p_mission_id: number
          p_player_id: number
        }
        Returns: Json
      }
      iniciar_story_quest: {
        Args: { p_player_id: number; p_quest_id: number }
        Returns: Json
      }
      iniciar_world_boss: {
        Args: { p_event_id: number; p_player_id: number }
        Returns: Json
      }
      kurokage_elemental_multiplier: {
        Args: { p_attacker_element: string; p_defender_element: string }
        Returns: number
      }
      kurokage_equipment_bonus: {
        Args: { p_player_id: number; p_stat_name: string }
        Returns: number
      }
      kurokage_player_max_stat: {
        Args: { p_player_id: number; p_stat_name: string }
        Returns: number
      }
      kurokage_roll_loot: { Args: { p_rank: string }; Returns: Json }
      marcar_jogador_derrotado: { Args: { p_player_id: number }; Returns: Json }
      modificar_jutsu_slots: {
        Args: {
          p_action: string
          p_essence_key: string
          p_jutsu_id: number
          p_player_id: number
          p_slot_idx: number
          p_upgrade_cost: number
        }
        Returns: Json
      }
      promover_graduacao: {
        Args: { p_novo_rank: string; p_player_id: number }
        Returns: Json
      }
      regenerar_recursos_jogador: {
        Args: { p_player_id: number }
        Returns: Json
      }
      reivindicar_bonus_diario: { Args: { p_player_id: number }; Returns: Json }
      reivindicar_recompensa_diaria:
        | {
            Args: {
              p_day_index: number
              p_player_id: number
              p_reward_amount: number
              p_reward_type: string
            }
            Returns: Json
          }
        | { Args: { p_player_id: number; p_task_key: string }; Returns: Json }
      reservar_raid_stamina: {
        Args: { p_fight_count: number; p_player_id: number }
        Returns: Json
      }
      reset_daily_progress: { Args: { p_player_id: number }; Returns: Json }
      resolver_limpeza_rapida: {
        Args: { p_fight_count: number; p_player_id: number }
        Returns: Json
      }
      resolver_turno_combate:
        | {
            Args: {
              p_action: string
              p_active_buffs?: Json
              p_equipped_summon?: Json
              p_global_debuffs?: Json
              p_jutsu_payload?: Json
              p_npc_stats?: Json
              p_player_id: number
              p_portao_multiplier?: number
              p_target_type?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_action: string
              p_active_buffs?: Json
              p_equipped_summon?: Json
              p_global_debuffs: Json
              p_jutsu_payload?: Json
              p_npc_stats: Json
              p_player_atk_fis?: number
              p_player_atk_mag?: number
              p_player_id: number
              p_portao_multiplier?: number
              p_target_type: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_action: string
              p_active_buffs?: Json
              p_equipped_summon?: Json
              p_global_debuffs?: Json
              p_jutsu_payload?: Json
              p_npc_stats?: Json
              p_player_id: string
              p_portao_multiplier?: number
              p_target_id?: string
              p_target_type?: string
            }
            Returns: Json
          }
      resolver_turno_combate_sessao: {
        Args: {
          p_action: string
          p_jutsu_id?: number
          p_player_id: number
          p_session_id: string
        }
        Returns: Json
      }
      responder_turno_combate_sessao: {
        Args: { p_player_id: number; p_session_id: string }
        Returns: Json
      }
      trair_vila: { Args: { p_player_id: number }; Returns: Json }
      treinar_atributo: {
        Args: {
          p_atributo: string
          p_hero_max: number
          p_hero_min: number
          p_player_id: number
        }
        Returns: Json
      }
      treinar_atributos: {
        Args: { p_atributo: string; p_player_id: number; p_quantidade: number }
        Returns: Json
      }
      treinar_cla: {
        Args: { p_player_id: number; p_target_level: number }
        Returns: Json
      }
      usar_consumivel_combate_sessao: {
        Args: {
          p_consumable_id: number
          p_player_id: number
          p_session_id: string
        }
        Returns: Json
      }
      usar_consumivel_inventario: {
        Args: { p_inventory_id: string; p_player_id: number }
        Returns: Json
      }
      vender_itens: {
        Args: { p_inventory_ids: number[]; p_player_id: number }
        Returns: Json
      }
      vender_itens_inventario: {
        Args: { p_inventory_ids: number[]; p_player_id: number }
        Returns: Json
      }
      viajar_mapa: {
        Args: { p_cost: number; p_player_id: number; p_target_village: number }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

