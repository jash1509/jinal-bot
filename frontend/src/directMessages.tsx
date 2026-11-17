import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import './styles/directMessages.css';

type Message = { id: string; sender_id: string; body: string; created_at: string };
type Notice = { message_id: string; read_at: string | null };
type Conversation = { id: string; participant_a: string; participant_b: string };

function SignIn({ client }: { client: SupabaseClient }) {
  const [mode, setMode] = useState<'sign-in' | 'reset'>('sign-in');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const credentials = { email: String(fields.get('email')).trim(), password: String(fields.get('password')) };
    setBusy(true);
    setStatus('');
    try {
      if (mode === 'reset') {
        const { error } = await client.auth.resetPasswordForEmail(credentials.email, { redirectTo: window.location.origin + window.location.pathname });
        setStatus(error?.message ?? 'If this email has an account, check your inbox for a reset link.');
        return;
      }
      const { error } = await client.auth.signInWithPassword(credentials);
      if (error) setStatus(error.message);
    } catch {
      setStatus('Could not reach the sign-in service. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const action = mode === 'sign-in' ? 'Sign in' : 'Reset password';
  function switchMode(next: typeof mode) { setMode(next); setStatus(''); }
  return <section>
    <h2>{action}</h2>
    {mode === 'sign-in' && <p>Access is by invitation. Ask the owner for an invite.</p>}
    <form onSubmit={submit}>
      <label>Email <input name="email" type="email" autoComplete="email" required /></label>
      {mode !== 'reset' && <label>Password <input name="password" type="password" autoComplete="current-password" required /></label>}
      <button disabled={busy}>{action}</button>
    </form>
    {mode === 'sign-in' ? <p>
      <button type="button" disabled={busy} onClick={() => switchMode('reset')}>Forgot password</button>
    </p> : <button type="button" disabled={busy} onClick={() => switchMode('sign-in')}>Back to sign in</button>}
    <p role="status">{status}</p>
  </section>;
}

function Messages({ client, session }: { client: SupabaseClient; session: Session }) {
  const userId = session.user.id;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef<{ conversation: string; body: string; id: string }>();

  useEffect(() => {
    let disposed = false;
    let generation = 0;
    async function refresh() {
      const current = ++generation;
      const [chats, inbox, thread] = await Promise.all([
        client.from('direct_conversations').select('*').order('id'),
        client.from('message_notifications').select('message_id,read_at').is('read_at', null),
        active ? client.from('direct_messages').select('*').eq('conversation_id', active)
          .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(100) : null,
      ]);
      if (disposed || current !== generation) return;
      const error = chats.error ?? inbox.error ?? thread?.error;
      if (error) { setStatus(error.message); return; }
      setConversations(chats.data ?? []);
      setNotices(inbox.data ?? []);
      setMessages(thread?.data?.reverse() ?? []);
    }
    void refresh();
    const channel = client.channel(`direct-messages:${userId}:${active}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_notifications', filter: `recipient_id=eq.${userId}` }, refresh);
    if (active) channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${active}` }, refresh);
    channel.subscribe(state => { if (state === 'SUBSCRIBED') void refresh(); });
    return () => { disposed = true; void client.removeChannel(channel); };
  }, [client, userId, active]);

  const unread = new Set(notices.map(notice => notice.message_id));

  async function open(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const recipient = String(new FormData(event.currentTarget).get('recipient')).trim();
    const { data, error } = await client.rpc('open_direct_conversation', { other_user: recipient });
    if (error) setStatus('Could not open a chat with that user ID.');
    else {
      setStatus('');
      if (active !== data) { setMessages([]); setActive(data); }
    }
  }

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = body.trim();
    if (!content || busy) return;
    if (pending.current?.conversation !== active || pending.current.body !== content) {
      pending.current = { conversation: active, body: content, id: crypto.randomUUID() };
    }
    setBusy(true);
    try {
      const { data, error } = await client.rpc('send_direct_message', { conversation: active, message: pending.current.id, message_body: content });
      if (error) setStatus(error.message);
      else {
        pending.current = undefined;
        setMessages(previous => previous.some(item => item.id === data.id) ? previous : [...previous, data]);
        setBody('');
        setStatus('');
      }
    } catch {
      setStatus('Could not send the message. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function markRead(messageId: string) {
    const { error } = await client.rpc('mark_message_notification_read', { message: messageId });
    if (error) setStatus(error.message);
    else setNotices(previous => previous.filter(notice => notice.message_id !== messageId));
  }

  return <>
    <section>
      <p>Signed in as {session.user.email} <button type="button" onClick={async () => {
        const { error } = await client.auth.signOut();
        if (error) setStatus(error.message);
      }}>Sign out</button></p>
      <p>Your user ID <code>{userId}</code></p>
      <form onSubmit={open}>
        <label>Recipient’s user ID <input name="recipient" disabled={busy} required /></label>
        <button disabled={busy}>Open chat</button>
      </form>
    </section>
    <section>
      <h2>Chats · {unread.size} unread</h2>
      {conversations.map(chat => <button key={chat.id} type="button" disabled={busy || active === chat.id}
        onClick={() => { setMessages([]); setActive(chat.id); }}>
        {chat.participant_a === userId ? chat.participant_b : chat.participant_a}
      </button>)}
    </section>
    {active && <section>
      <h2>Messages</h2>
      <ul>
        {messages.map(message => <li key={message.id}>
          <strong>{message.sender_id === userId ? 'You' : 'Recipient'}</strong>
          <p>{message.body}</p>
          {unread.has(message.id) && <button type="button" onClick={() => void markRead(message.id)}>Mark as read</button>}
        </li>)}
      </ul>
      <form onSubmit={send}>
        <label>Message <textarea value={body} onChange={event => setBody(event.target.value)} maxLength={10000} disabled={busy} required /></label>
        <button disabled={busy}>Send</button>
      </form>
    </section>}
    <p role="status">{status}</p>
  </>;
}

function App({ client, inviteToken }: { client: SupabaseClient; inviteToken: string | null }) {
  const [session, setSession] = useState<Session | null | undefined>();
  const [recovering, setRecovering] = useState(false);
  const [resetStatus, setResetStatus] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const pendingInvite = useRef(inviteToken);
  useEffect(() => {
    const { data: { subscription } } = client.auth.onAuthStateChange((event, next) => {
      if (pendingInvite.current && next?.access_token === pendingInvite.current) {
        pendingInvite.current = null;
        setRecovering(true);
      }
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(next);
    });
    return () => subscription.unsubscribe();
  }, [client]);
  if (session === undefined) return <p role="status">Loading session…</p>;
  if (recovering && session) return <section>
    <h2>Choose a new password</h2>
    <form onSubmit={async event => {
      event.preventDefault();
      const password = String(new FormData(event.currentTarget).get('password'));
      setSavingPassword(true);
      try {
        const { error } = await client.auth.updateUser({ password });
        if (error) setResetStatus(error.message);
        else { setResetStatus(''); setRecovering(false); }
      } catch {
        setResetStatus('Could not update the password. Try again.');
      } finally {
        setSavingPassword(false);
      }
    }}>
      <label>New password <input name="password" type="password" autoComplete="new-password" required /></label>
      <button disabled={savingPassword}>Save password</button>
    </form>
    <p role="status">{resetStatus}</p>
  </section>;
  return session ? <Messages key={session.user.id} client={client} session={session} /> : <SignIn client={client} />;
}

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const callback = new URLSearchParams(window.location.hash.slice(1));
const inviteToken = callback.get('type') === 'invite' ? callback.get('access_token') : null;
createRoot(document.getElementById('root')!).render(<main>
  <h1>Jinal Bots Messages</h1>
  {url && key ? <App client={createClient(url, key)} inviteToken={inviteToken} /> : <p>Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable messages.</p>}
</main>);
