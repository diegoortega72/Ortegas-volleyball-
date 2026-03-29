import { createClient } from '@supabase/supabase-js'

const SURL = 'https://qfpbdtzkandainjuejoo.supabase.co'
const SKEY = 'sb_publishable_HvQx-fLOiiXNm2XLLwWnuw_8ci9rokr'

export const sb = createClient(SURL, SKEY)

export const POOLS = ['A', 'B', 'C']
export const COLORS = ['#FF3B30','#007AFF','#FF9500','#AF52DE','#14b8a6','#f97316','#6366f1','#ec4899','#84cc16','#06b6d4','#8b5cf6','#10b981','#ef4444','#f59e0b','#3b82f6']