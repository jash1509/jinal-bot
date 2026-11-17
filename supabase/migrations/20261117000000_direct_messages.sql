-- Supabase Auth supplies user identities. Clients use RPCs for writes.
create table public.direct_conversations (
    id uuid primary key default gen_random_uuid(),
    participant_a uuid not null references auth.users(id) on delete cascade,
    participant_b uuid not null references auth.users(id) on delete cascade,
    check (participant_a < participant_b),
    unique (participant_a, participant_b)
);

create index direct_conversations_participant_b_idx
    on public.direct_conversations (participant_b);

create table public.direct_messages (
    id uuid primary key,
    conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
    sender_id uuid not null references auth.users(id) on delete cascade,
    body text not null check (char_length(btrim(body)) between 1 and 10000),
    created_at timestamptz not null default now()
);

create index direct_messages_conversation_idx
    on public.direct_messages (conversation_id, created_at, id);

create table public.message_notifications (
    message_id uuid primary key references public.direct_messages(id) on delete cascade,
    recipient_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    read_at timestamptz
);

create index message_notifications_recipient_idx
    on public.message_notifications (recipient_id, created_at, message_id);

alter table public.direct_conversations enable row level security;
alter table public.direct_messages enable row level security;
alter table public.message_notifications enable row level security;

revoke all on public.direct_conversations, public.direct_messages, public.message_notifications
    from public, anon, authenticated;
grant select on public.direct_conversations, public.direct_messages, public.message_notifications
    to authenticated;

create policy direct_conversations_select on public.direct_conversations for select to authenticated
    using ((select auth.uid()) in (participant_a, participant_b));

create policy direct_messages_select on public.direct_messages for select to authenticated
    using (exists (
        select 1 from public.direct_conversations c where c.id = conversation_id
    ));

create policy message_notifications_select on public.message_notifications for select to authenticated
    using (recipient_id = (select auth.uid()));

create function public.open_direct_conversation(other_user uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
    caller uuid := auth.uid();
    conversation uuid;
begin
    if caller is null or other_user is null or caller = other_user then
        raise exception 'A different recipient is required' using errcode = '22023';
    end if;

    insert into public.direct_conversations (participant_a, participant_b)
    values (least(caller, other_user), greatest(caller, other_user))
    on conflict (participant_a, participant_b) do update set participant_a = excluded.participant_a
    returning id into conversation;
    return conversation;
end;
$$;

create function public.send_direct_message(conversation uuid, message uuid, message_body text)
returns public.direct_messages language plpgsql security definer set search_path = '' as $$
declare
    caller uuid := auth.uid();
    recipient uuid;
    saved public.direct_messages;
begin
    select case when c.participant_a = caller then c.participant_b else c.participant_a end
      into recipient
      from public.direct_conversations c
     where c.id = conversation and caller in (c.participant_a, c.participant_b);
    if recipient is null then
        raise exception 'Conversation unavailable' using errcode = '42501';
    end if;

    insert into public.direct_messages (id, conversation_id, sender_id, body)
    values (message, conversation, caller, message_body)
    on conflict (id) do nothing
    returning * into saved;

    if found then
        insert into public.message_notifications (message_id, recipient_id) values (message, recipient);
    else
        select * into saved from public.direct_messages m
         where m.id = message and m.sender_id = caller and m.conversation_id = conversation
           and m.body = message_body;
        if not found then
            raise exception 'Message ID unavailable' using errcode = '22023';
        end if;
    end if;
    return saved;
end;
$$;

create function public.mark_message_notification_read(message uuid)
returns void language sql security definer set search_path = '' as $$
    update public.message_notifications
       set read_at = now()
     where message_id = message and recipient_id = auth.uid() and read_at is null;
$$;

revoke execute on function public.open_direct_conversation(uuid),
    public.send_direct_message(uuid, uuid, text), public.mark_message_notification_read(uuid)
    from public, anon, authenticated;
grant execute on function public.open_direct_conversation(uuid),
    public.send_direct_message(uuid, uuid, text), public.mark_message_notification_read(uuid)
    to authenticated;

alter publication supabase_realtime add table public.direct_messages, public.message_notifications;
