const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function isEventExpired(event) {
  if (!event?.ends_at) return false;
  return new Date(event.ends_at) <= new Date();
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

  if (error || !data) return null;

  if (isEventExpired(data)) {
    const newEndsAt = new Date(Date.now() + WEEK_MS).toISOString();
    const updates = { ends_at: newEndsAt };
    if (data.boss_hp <= 0) {
      updates.boss_hp = data.boss_max_hp;
    }

    const { data: renewed, error: renewError } = await supabase
      .from('global_events')
      .update(updates)
      .eq('id', data.id)
      .select()
      .single();

    if (!renewError && renewed) return renewed;
    return { ...data, ends_at: newEndsAt };
  }

  return data;
}

export async function fetchActiveGlobalEvents(supabase) {
  const { data, error } = await supabase
    .from('global_events')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: false });

  if (error || !data?.length) return [];

  const renewed = [];
  for (const event of data) {
    if (event.is_world_boss && isEventExpired(event)) {
      const boss = await fetchActiveWorldBoss(supabase);
      if (boss) renewed.push(boss);
    } else if (!isEventExpired(event)) {
      renewed.push(event);
    }
  }

  return renewed;
}
