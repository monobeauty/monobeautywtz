-- ============================================================
-- SQL DUMP COMPLETO - Mono Beauty
-- Gerado em: 2026-02-24
-- ============================================================

-- ============================================================
-- SCHEMA: TABELAS
-- ============================================================

-- Tabela: bot_memoria
CREATE TABLE IF NOT EXISTS public.bot_memoria (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telefone text NOT NULL UNIQUE,
  status text,
  data text,
  status_atendimento text NOT NULL DEFAULT 'pendente'::text,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabela: chat_status
CREATE TABLE IF NOT EXISTS public.chat_status (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  remote_jid text NOT NULL UNIQUE,
  instance_name text NOT NULL,
  status text NOT NULL DEFAULT 'open'::text,
  status_atendimento text DEFAULT 'pendente'::text,
  operador_nome text,
  operador_id uuid,
  closed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela: configuracoes_sistema
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave text NOT NULL UNIQUE,
  valor text NOT NULL,
  descricao text,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabela: messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_name text NOT NULL,
  remote_jid text NOT NULL,
  push_name text,
  message_text text,
  is_from_me boolean DEFAULT false,
  whatsapp_id text,
  status text DEFAULT 'sent'::text,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabela: perfis_usuarios
CREATE TABLE IF NOT EXISTS public.perfis_usuarios (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id uuid,
  nome text,
  email text,
  role text DEFAULT 'atendente'::text,
  instancias_permitidas text[] DEFAULT '{}'::text[],
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Tabela: setores_atendimento
CREATE TABLE IF NOT EXISTS public.setores_atendimento (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_setor text NOT NULL,
  numero_opcao text NOT NULL,
  instancia_responsavel text NOT NULL,
  msg_resposta text NOT NULL,
  msg_transferencia text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE public.bot_memoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setores_atendimento ENABLE ROW LEVEL SECURITY;

-- bot_memoria
CREATE POLICY "Authenticated users can read bot_memoria" ON public.bot_memoria FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert bot_memoria" ON public.bot_memoria FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update bot_memoria" ON public.bot_memoria FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete bot_memoria" ON public.bot_memoria FOR DELETE USING (true);
CREATE POLICY "Service role full access to bot_memoria" ON public.bot_memoria FOR ALL USING (true) WITH CHECK (true);

-- chat_status
CREATE POLICY "Authenticated users can read chat_status" ON public.chat_status FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert chat_status" ON public.chat_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update chat_status" ON public.chat_status FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete chat_status" ON public.chat_status FOR DELETE USING (true);
CREATE POLICY "Service role full access to chat_status" ON public.chat_status FOR ALL USING (true) WITH CHECK (true);

-- configuracoes_sistema
CREATE POLICY "Authenticated users can read configuracoes_sistema" ON public.configuracoes_sistema FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert configuracoes_sistema" ON public.configuracoes_sistema FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update configuracoes_sistema" ON public.configuracoes_sistema FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete configuracoes_sistema" ON public.configuracoes_sistema FOR DELETE USING (true);
CREATE POLICY "Service role full access to configuracoes_sistema" ON public.configuracoes_sistema FOR ALL USING (true) WITH CHECK (true);

-- messages
CREATE POLICY "Authenticated users can read messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can delete messages" ON public.messages FOR DELETE USING (true);
CREATE POLICY "Service role full access to messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- perfis_usuarios
CREATE POLICY "Usuários leem próprio perfil" ON public.perfis_usuarios FOR SELECT USING (auth.uid() = user_id);

-- setores_atendimento
CREATE POLICY "Authenticated users can read setores" ON public.setores_atendimento FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert setores" ON public.setores_atendimento FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update setores" ON public.setores_atendimento FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete setores" ON public.setores_atendimento FOR DELETE USING (true);
CREATE POLICY "Service role full access to setores" ON public.setores_atendimento FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_create_bot_memoria()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.is_from_me = false THEN
    INSERT INTO public.bot_memoria (telefone, status_atendimento)
    VALUES (split_part(NEW.remote_jid, '@', 1), 'pendente')
    ON CONFLICT (telefone) DO UPDATE SET status_atendimento = 'pendente';

    UPDATE public.chat_status
    SET status = 'open', closed_at = NULL, operador_nome = NULL, operador_id = NULL, updated_at = now()
    WHERE remote_jid = NEW.remote_jid AND status = 'closed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_chat_on_new_message()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.chat_status
  SET status = 'open', updated_at = now()
  WHERE remote_jid = NEW.remote_jid AND status = 'closed';
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_chat_status_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- DADOS: bot_memoria (10 registros)
-- ============================================================

INSERT INTO public.bot_memoria (id, telefone, status, data, status_atendimento, created_at) VALUES
  ('44374916-c38a-4d73-a0ce-19636ead72aa', '136056141816050', 'Opção 2', '20/02/2026', 'pendente', '2026-02-20 22:20:57.937357+00'),
  ('670d2955-fb04-4939-b1f1-72e356b31d0f', '553184064175', NULL, NULL, 'pendente', '2026-02-23 14:12:41.647+00'),
  ('6b883d5a-cc7d-4be5-8010-6026b255415e', '553141039660', 'Opção 2', '24/02/2026', 'pendente', '2026-02-24 13:06:24.642689+00'),
  ('ff7c1155-d75d-465d-8f5d-ab42df013d3a', '553171431574', NULL, NULL, 'pendente', '2026-02-23 16:11:53.474921+00'),
  ('d751502e-cd58-4264-8b80-06a68d3a84c2', '553398411758', NULL, NULL, 'pendente', '2026-02-20 20:22:24.224818+00'),
  ('31be51e3-5a43-4fa6-8317-13f8a8737e97', '553191336667', NULL, NULL, 'pendente', '2026-02-23 15:19:00.670228+00'),
  ('f9953c7a-23e7-4fe2-82d5-b69907114dbe', '553199481757', 'Opção 2', '24/02/2026', 'pendente', '2026-02-24 13:36:46.372246+00'),
  ('5976ae15-6d60-41fd-96a3-4cb04d312bfe', '553197108474', NULL, NULL, 'pendente', '2026-02-21 05:02:17.941796+00'),
  ('bd6dcfca-2540-41be-8ac2-c240d0dfec8c', '553187055688', 'Opção 2', '24/02/2026', 'pendente', '2026-02-24 13:33:03.690509+00'),
  ('8b9aa6e1-7761-45f8-b206-8143e1d6b509', '553175248061', 'Opção 2', '24/02/2026', 'pendente', '2026-02-24 14:15:28.484567+00')
ON CONFLICT (telefone) DO NOTHING;

-- ============================================================
-- DADOS: chat_status (9 registros)
-- ============================================================

INSERT INTO public.chat_status (id, remote_jid, instance_name, status, status_atendimento, operador_nome, operador_id, closed_at, created_at, updated_at) VALUES
  ('07765981-e882-44a6-943f-d8719fc8e8bf', '553191336667@s.whatsapp.net', 'Atendimento_Geral', 'open', 'pendente', NULL, NULL, NULL, '2026-02-23 15:19:01.032797+00', '2026-02-23 15:19:37.124839+00'),
  ('f70c4998-90b6-4634-8e89-4c2658c30d9a', '553199481757@s.whatsapp.net', 'Terceirizacao', 'open', 'pendente', NULL, NULL, NULL, '2026-02-24 13:30:34.513028+00', '2026-02-24 13:37:48.26792+00'),
  ('26a8886d-ac53-4e52-834c-3f052e837f4f', '553171431574@s.whatsapp.net', 'Atendimento_Geral', 'open', 'pendente', NULL, NULL, NULL, '2026-02-23 16:11:53.924357+00', '2026-02-23 16:12:19.041245+00'),
  ('ca707470-94ae-4d51-aa46-94ef8e2a5562', '553175248061@s.whatsapp.net', 'Terceirizacao', 'open', 'pendente', NULL, NULL, NULL, '2026-02-20 23:06:01.797461+00', '2026-02-24 14:16:09.445154+00'),
  ('c0b8c5e7-251a-4442-85cd-7028580014fd', '553197108474@s.whatsapp.net', 'Douglas', 'open', 'pendente', NULL, NULL, NULL, '2026-02-21 03:04:04.46583+00', '2026-02-21 05:02:31.690022+00'),
  ('21797bbd-e142-45fd-b172-e01f2fd4d94e', '553184064175@s.whatsapp.net', 'Douglas', 'open', 'pendente', NULL, NULL, NULL, '2026-02-23 14:12:42.193065+00', '2026-02-23 14:28:39.096281+00'),
  ('100f9a56-3048-4477-993a-edfca0a00440', '553141039660@s.whatsapp.net', 'Terceirizacao', 'open', 'pendente', NULL, NULL, NULL, '2026-02-24 13:06:13.617318+00', '2026-02-24 13:07:03.160923+00'),
  ('9ff19bc5-5f8a-41cc-b84b-21d945089dcd', '136056141816050@lid', 'conecta_digital', 'open', 'pendente', NULL, NULL, NULL, '2026-02-20 22:20:58.142816+00', '2026-02-20 22:20:58.142816+00'),
  ('228513f7-7066-42e6-9883-1506ea0aff5b', '553187055688@s.whatsapp.net', 'Terceirizacao', 'open', 'pendente', NULL, NULL, NULL, '2026-02-24 13:33:03.915678+00', '2026-02-24 13:33:39.186594+00')
ON CONFLICT (remote_jid) DO NOTHING;

-- ============================================================
-- DADOS: configuracoes_sistema (2 registros)
-- ============================================================

INSERT INTO public.configuracoes_sistema (id, chave, valor, descricao, created_at) VALUES
  ('e0f50c66-bef9-4bf3-8860-f5bd4dac9928', 'evolution_api_key', 'Mariana_Secure_2026_@', 'Global API Key da Evolution API', '2026-02-20 03:06:03.501257+00'),
  ('b0fb8b1a-9fe1-48a1-b107-63e14d8d0498', 'evolution_base_url', 'https://api.atendeflow.com.br', 'URL Base da Evolution API', '2026-02-20 03:15:46.878066+00')
ON CONFLICT (chave) DO NOTHING;

-- ============================================================
-- DADOS: perfis_usuarios (4 registros)
-- ============================================================

INSERT INTO public.perfis_usuarios (id, user_id, nome, email, role, instancias_permitidas, updated_at) VALUES
  ('e6125976-fb6f-44d7-8073-c880f7ae115d', 'f568b1e2-aa72-4b9e-84af-f2990af0b667', 'Douglas', 'douglas@dradigital.com.br', 'admin', '{}', '2026-02-20 04:41:56.014728+00'),
  ('5beb244a-2fdb-4ccc-b3b6-f3320013adb5', '24c79c60-9fe1-4577-9fe2-9efaf7517144', 'Rene', 'rene@monobeauty.com.br', 'atendente', '{conecta_digital}', '2026-02-20 15:25:27.630843+00'),
  ('6f999333-ffdc-4585-b227-801202bd6998', '60a891f4-748b-4121-86ff-ed1863e2a275', 'Mariana', 'mariana@monobeauty.com.br', 'atendente', '{Douglas}', '2026-02-20 15:29:26.037003+00'),
  ('54d8682b-a314-4df0-88f1-beb95a276218', 'bcb5a1d5-7dab-47a6-8d94-a5d7d701d7af', 'Renê', 'contato@monobeauty.com.br', 'admin', '{}', '2026-02-24 13:29:48.264644+00');

-- ============================================================
-- DADOS: setores_atendimento (2 registros)
-- ============================================================

INSERT INTO public.setores_atendimento (id, nome_setor, numero_opcao, instancia_responsavel, msg_resposta, msg_transferencia, ativo, created_at) VALUES
  ('7739e674-2402-42e7-9eeb-5a74d88ddcaa', 'Atendimento Geral', '1', 'Atendimento_Geral', 'Entendido. Um de nossos consultores entrará em contato em instantes.', 'Perfeito! Vou transferir seu atendimento para o responsável por este setor. Aguarde só um instante...', true, '2026-02-20 02:51:01.75306+00'),
  ('d8304f52-a591-4376-97a9-b742e53b6cd8', 'Dúvidas sobre Terceirização', '2', 'Terceirizacao', E'Olá! Meu nome é Mariana, falo do setor comercial da Mono Beauty.  \n\nNosso horário de atendimento é de 08:00 às 17:00.\n\nSerá um prazer lhe atender.\n\nPreparei um formulário rápido para entender suas necessidades:\n\nhttps://forms.gle/2mporSG59Yo82FHEA', 'Perfeito! Vou transferir seu atendimento para o responsável por este setor. Aguarde só um instante...', true, '2026-02-20 02:51:01.75306+00');

-- ============================================================
-- DADOS: messages (953 registros)
-- NOTA: A tabela messages contém 953 registros.
-- Devido ao volume, os dados de messages não foram incluídos neste dump.
-- Para exportar messages, use a query:
--   SELECT * FROM messages ORDER BY created_at ASC;
-- ou exporte via edge function /export-dump
-- ============================================================
