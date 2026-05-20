-- =========================================================================
-- VANTA WEBHOOK TRIGGER SETUP SQL
-- Run this in your Supabase SQL Editor to link database changes to your Edge Function.
-- =========================================================================

-- 1. Enable HTTP request support in PostgreSQL if not already active
create extension if not exists "http" with schema "extensions";

-- 2. Create the Trigger function that executes when the orders table is modified
create or replace function public.tr_orders_webhook()
returns trigger as $$
declare
  payload json;
  webhook_url text := 'https://your-project-ref.supabase.co/functions/v1/send-order-email';
  supabase_anon_key text := 'YOUR_SUPABASE_ANON_KEY'; -- Use your Supabase service_role or anon key for authentication
begin
  -- Construct the webhook payload
  payload := json_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW),
    'old_record', case when TG_OP = 'UPDATE' then row_to_json(OLD) else null end
  );

  -- Perform the secure asynchronous HTTP request to your deployed edge function
  perform
    net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || supabase_anon_key
      ),
      body := payload::text,
      timeout_milliseconds := 5000
    );

  return NEW;
end;
$$ language plpgsql security definer;

-- 3. Drop trigger if it already exists
drop trigger if exists on_orders_changed on public.orders;

-- 4. Bind the trigger to INSERT and UPDATE operations on the orders table
create trigger on_orders_changed
after insert or update
on public.orders
for each row
execute function public.tr_orders_webhook();
