-- GAME_NT / Kurokage — estrutura de referência privada v2 (01/11/2026).
-- Espelho versionado do DDL aplicado no projeto Supabase via migrations MCP:
-- create_private_reference_catalog_staging_v2
-- index_private_reference_catalog_source_files_v2
-- expand_reference_staging_to_shop_packs_screens_20261101
-- NÃO faz TRUNCATE, DELETE, alterações em players ou publicação de conteúdos.
-- As cargas de registros usam fontes em data/reference e docs/reverse-engineering.
create schema if not exists content_reference;
revoke all on schema content_reference from public, anon, authenticated;

create table if not exists content_reference.import_batches(
 batch_id text primary key,
 observed_on date not null,
 status text not null default 'staging' check(status in ('staging','reviewed','rejected')),
 source_manifest jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table if not exists content_reference.entries(
 batch_id text not null references content_reference.import_batches(batch_id) on delete restrict,
 entity_kind text not null check(entity_kind in ('character','character_variant','clan','jutsu','item','pack','observed_screen')),
 reference_id text not null,
 display_name text not null check(length(btrim(display_name))>0),
 source_path text not null,
 payload jsonb not null,
 review_status text not null default 'observed_unverified'
   check(review_status in ('observed_unverified','approved','rejected')),
 gameplay_enabled boolean not null default false check(gameplay_enabled=false),
 staged_at timestamptz not null default now(),
 primary key(batch_id,entity_kind,reference_id)
);
create index if not exists ix_content_reference_entries_kind
 on content_reference.entries(batch_id,entity_kind,review_status);
create table if not exists content_reference.legacy_catalog_snapshot(
 table_name text not null,
 record_id text not null,
 row_data jsonb not null,
 captured_at timestamptz not null default now(),
 primary key(table_name,record_id)
);
create table if not exists content_reference.source_files(
 batch_id text not null references content_reference.import_batches(batch_id) on delete restrict,
 file_path text not null,
 git_blob_sha text not null,
 size_bytes bigint not null check(size_bytes>=0),
 source_kind text not null check(source_kind in ('reference_catalog','research_document','research_media','runtime_art')),
 review_status text not null default 'not_reviewed' check(review_status in ('not_reviewed','approved','rejected')),
 indexed_at timestamptz not null default now(),
 primary key(batch_id,file_path)
);
alter table content_reference.import_batches enable row level security;
alter table content_reference.entries enable row level security;
alter table content_reference.source_files enable row level security;
alter table content_reference.legacy_catalog_snapshot enable row level security;
revoke all on all tables in schema content_reference from public, anon, authenticated;

-- Executar o snapshot somente ANTES de qualquer migração de catálogo.
-- Não inclui jogadores, contas, inventários ou resultados de combates.
insert into content_reference.legacy_catalog_snapshot(table_name,record_id,row_data)
select 'characters',id::text,to_jsonb(t) from public.characters t on conflict do nothing;
insert into content_reference.legacy_catalog_snapshot(table_name,record_id,row_data)
select 'avatars',id::text,to_jsonb(t) from public.avatars t on conflict do nothing;
insert into content_reference.legacy_catalog_snapshot(table_name,record_id,row_data)
select 'clans',id::text,to_jsonb(t) from public.clans t on conflict do nothing;
insert into content_reference.legacy_catalog_snapshot(table_name,record_id,row_data)
select 'clan_skills',id::text,to_jsonb(t) from public.clan_skills t on conflict do nothing;
insert into content_reference.legacy_catalog_snapshot(table_name,record_id,row_data)
select 'jutsus',id::text,to_jsonb(t) from public.jutsus t on conflict do nothing;
insert into content_reference.legacy_catalog_snapshot(table_name,record_id,row_data)
select 'npcs',id::text,to_jsonb(t) from public.npcs t on conflict do nothing;
insert into content_reference.legacy_catalog_snapshot(table_name,record_id,row_data)
select 'items',id::text,to_jsonb(t) from public.items t on conflict do nothing;
insert into content_reference.legacy_catalog_snapshot(table_name,record_id,row_data)
select 'missions',id::text,to_jsonb(t) from public.missions t on conflict do nothing;

-- Verificação de prontidão:
-- SELECT entity_kind,count(*) FROM content_reference.entries
-- WHERE batch_id='ng-2026-11-01-v2' GROUP BY entity_kind;
-- SELECT source_kind,count(*) FROM content_reference.source_files
-- WHERE batch_id='ng-2026-11-01-v2' GROUP BY source_kind;
-- Lote 2 (PR #99): 86 items, 49 packs, 9 telas observadas; 187 fontes novas indexadas.
-- Entradas totais (01/11): 1911; fontes Git indexadas: 3042.
-- REGRA: nunca migrar automaticamente técnicas, itens ou pacotes observados para o catálogo ativo.
