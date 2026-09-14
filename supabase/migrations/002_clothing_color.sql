-- Preserva as peças, fotos e looks existentes; cor começa como NULL.
alter table public.clothing add column if not exists color text;
