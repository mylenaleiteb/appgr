-- Execute no SQL Editor de um projeto Supabase novo.
create type public.clothing_position as enum ('TOP','OUTERWEAR','BOTTOM','ONE_PIECE','SHOES','ACCESSORY');
create table public.categories (
 id text primary key,
 name text not null,
 type public.clothing_position not null,
 sort_order integer not null default 0
);
insert into public.categories(id,name,type,sort_order) values
 ('camisetas','Camisetas','TOP',1),('camisas','Camisas','TOP',2),('regatas','Regatas','TOP',3),('calcas','Calças','BOTTOM',4),('shorts','Shorts','BOTTOM',5),('saias','Saias','BOTTOM',6),('vestidos','Vestidos','ONE_PIECE',7),('casacos','Casacos','OUTERWEAR',8),('calcados','Calçados','SHOES',9),('acessorios','Acessórios','ACCESSORY',10);
create table public.clothing (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 100),
 category_id text not null references public.categories(id),
 favorite boolean not null default false,
 image_path text not null check (image_path like user_id::text || '/%'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.outfits (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 100),
 favorite boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.outfit_items (
 id uuid primary key default gen_random_uuid(),
 outfit_id uuid not null references public.outfits(id) on delete cascade,
 clothing_id uuid not null references public.clothing(id) on delete cascade,
 position public.clothing_position not null,
 created_at timestamptz not null default now(),
 unique(outfit_id,clothing_id)
);
create index clothing_user_idx on public.clothing(user_id);
create index outfits_user_idx on public.outfits(user_id);
create index outfit_items_clothing_idx on public.outfit_items(clothing_id);
create function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
create trigger clothing_updated before update on public.clothing for each row execute function public.touch_updated_at();
create trigger outfits_updated before update on public.outfits for each row execute function public.touch_updated_at();
alter table public.categories enable row level security;
alter table public.clothing enable row level security;
alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;
create policy categories_read on public.categories for select to authenticated using (true);
create policy own_clothing on public.clothing for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_outfits on public.outfits for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_outfit_items on public.outfit_items for all to authenticated
 using (exists (select 1 from public.outfits o where o.id=outfit_id and o.user_id=(select auth.uid())))
 with check (
 exists (select 1 from public.outfits o where o.id=outfit_id and o.user_id=(select auth.uid()))
 and exists (select 1 from public.clothing c join public.categories cat on cat.id=c.category_id where c.id=clothing_id and c.user_id=(select auth.uid()) and cat.type=position)
 );
-- Atomicamente salva o look e suas relações. RLS continua em vigor.
create function public.save_outfit(p_id uuid,p_name text,p_favorite boolean,p_items jsonb)
 returns void language plpgsql security invoker set search_path = public as $$
 begin
 if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
 if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Lista de peças inválida'; end if;
 if jsonb_array_length(p_items) = 0 then raise exception 'Selecione pelo menos uma peça'; end if;
 insert into public.outfits(id,user_id,name,favorite) values(p_id,auth.uid(),trim(p_name),p_favorite)
 on conflict(id) do update set name=excluded.name,favorite=excluded.favorite;
 delete from public.outfit_items where outfit_id=p_id;
 insert into public.outfit_items(outfit_id,clothing_id,position)
 select p_id,(item->>'clothing_id')::uuid,(item->>'position')::public.clothing_position from jsonb_array_elements(p_items) item;
 end;
 $$;
revoke all on function public.save_outfit(uuid,text,boolean,jsonb) from public;
grant execute on function public.save_outfit(uuid,text,boolean,jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('wardrobe','wardrobe',false,20971520,array['image/webp','image/jpeg','image/png']);
create policy wardrobe_read on storage.objects for select to authenticated using (bucket_id='wardrobe' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy wardrobe_upload on storage.objects for insert to authenticated with check (bucket_id='wardrobe' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy wardrobe_delete on storage.objects for delete to authenticated using (bucket_id='wardrobe' and (storage.foldername(name))[1]=(select auth.uid())::text);
