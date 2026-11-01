// Os horários dos eventos são estado autoritativo do servidor.
// O cliente nunca renova expiração, HP ou agenda por escrita direta.
export function isEventExpired(event, now = Date.now()) {
  if (!event?.ends_at) return false;
  const end = Date.parse(event.ends_at);
  return !Number.isFinite(end) || end <= now;
}

export async function fetchActiveWorldBoss(supabase) {
  const { data, error } = await supabase
    .from('global_events')
    .select('*')
    .eq('is_active', true)
    .eq('is_world_boss', true)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data || isEventExpired(data) || Number(data.boss_hp) <= 0) return null;
  return data;
}

export async function fetchActiveGlobalEvents(supabase) {
  const { data, error } = await supabase
    .from('global_events')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: false });

  if (error || !Array.isArray(data)) return [];
  return data.filter(event => !isEventExpired(event) &&
    (!event.is_world_boss || Number(event.boss_hp) > 0));
}
