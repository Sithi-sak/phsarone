import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function handleBlock(req: Request) {
  const body = await req.json().catch(() => ({}));
  const blocked_id = body.blocked_id;
  const reason = body.reason || null;

  // derive requester id from bearer token
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.split(' ')[1];
  if (!token) return new Response(JSON.stringify({ error: 'missing auth token' }), { status: 401 });

  let blocker_id: string;
  try {
    const [_header, payload, _signature] = token.split('.');
    const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    blocker_id = decodedPayload.sub;
  } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid auth token' }), { status: 401 });
  }

  if (!blocker_id || !blocked_id) {
    return new Response(JSON.stringify({ error: 'missing blocker_id or blocked_id' }), { status: 400 });
  }

  const { data, error } = await supabase
    .from('blocked_users')
    .upsert({ blocker_id, blocked_id, reason }, { onConflict: '(blocker_id, blocked_id)' })
    .select('*')
    .single();

  if (error) {
    console.error('block error', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, blocked: data }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleUnblock(req: Request) {
  const body = await req.json().catch(() => ({}));
  const blocked_id = body.blocked_id;

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.split(' ')[1];
  if (!token) return new Response(JSON.stringify({ error: 'missing auth token' }), { status: 401 });

  let blocker_id: string;
  try {
    const [_header, payload, _signature] = token.split('.');
    const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    blocker_id = decodedPayload.sub;
  } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid auth token' }), { status: 401 });
  }

  if (!blocker_id || !blocked_id) {
    return new Response(JSON.stringify({ error: 'missing blocker_id or blocked_id' }), { status: 400 });
  }

  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', blocker_id)
    .eq('blocked_id', blocked_id);

  if (error) {
    console.error('unblock error', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleCheckBlock(req: Request) {
  const body = await req.json().catch(() => ({}));
  const other_user_id = body.other_user_id;

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.split(' ')[1];
  if (!token) return new Response(JSON.stringify({ error: 'missing auth token' }), { status: 401 });

  let my_id: string;
  try {
    const [_header, payload, _signature] = token.split('.');
    const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    my_id = decodedPayload.sub;
  } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid auth token' }), { status: 401 });
  }

  if (!my_id || !other_user_id) {
    return new Response(JSON.stringify({ error: 'missing ids' }), { status: 400 });
  }

  // Check if I blocked them
  const { data: iBlocked, error: err1 } = await supabase
    .from('blocked_users')
    .select('id')
    .eq('blocker_id', my_id)
    .eq('blocked_id', other_user_id)
    .maybeSingle();

  // Check if they blocked me
  const { data: theyBlocked, error: err2 } = await supabase
    .from('blocked_users')
    .select('id')
    .eq('blocker_id', other_user_id)
    .eq('blocked_id', my_id)
    .maybeSingle();

  return new Response(JSON.stringify({
    isBlockedByMe: !!iBlocked,
    isBlockedByThem: !!theyBlocked,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleMute(req: Request, convId: string) {
  const body = await req.json().catch(() => ({}));
  const muted = typeof body.muted === 'boolean' ? body.muted : true;

  // derive requester id from bearer token
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.split(' ')[1];
  if (!token) return new Response(JSON.stringify({ error: 'missing auth token' }), { status: 401 });

  let requester_id: string;
  try {
    const [_header, payload, _signature] = token.split('.');
    const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    requester_id = decodedPayload.sub;
  } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid auth token' }), { status: 401 });
  }

  const { data: conv, error: gerr } = await supabase
    .from('conversations')
    .select('id,buyer_id,seller_id,buyer_muted,seller_muted')
    .eq('id', convId)
    .single();

  if (gerr || !conv) {
    return new Response(JSON.stringify({ error: 'conversation not found' }), { status: 404 });
  }

  const updates: any = { updated_at: new Date().toISOString() };
  if (conv.buyer_id === requester_id) updates.buyer_muted = muted;
  if (conv.seller_id === requester_id) updates.seller_muted = muted;

  const { data: upd, error: uerr } = await supabase
    .from('conversations')
    .update(updates)
    .eq('id', convId)
    .select('*')
    .single();

  if (uerr) {
    return new Response(JSON.stringify({ error: uerr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, conversation: upd }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const pathname = url.pathname.replace(/\/+$/, '');

    if (req.method === 'POST' && pathname.endsWith('/block')) {
      return await handleBlock(req);
    }

    if (req.method === 'POST' && pathname.endsWith('/unblock')) {
      return await handleUnblock(req);
    }

    if (req.method === 'POST' && pathname.endsWith('/check-block')) {
      return await handleCheckBlock(req);
    }

    // mute: PATCH /mute/:conversation_id or /conversations/:id/mute
    if ((req.method === 'PATCH' || req.method === 'POST') && pathname.includes('/mute')) {
      const parts = pathname.split('/').filter(Boolean);
      const convId = parts[parts.length - 1];
      return await handleMute(req, convId);
    }

    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500 });
  }
});
