
-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE for authenticated

-- === messages ===
DROP POLICY IF EXISTS "Authenticated users can read messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can delete messages" ON messages;
DROP POLICY IF EXISTS "Service role full access to messages" ON messages;

CREATE POLICY "Enable read access for messages" ON messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for messages" ON messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable delete for messages" ON messages FOR DELETE TO authenticated USING (true);

-- === chat_status ===
DROP POLICY IF EXISTS "Authenticated users can read chat_status" ON chat_status;
DROP POLICY IF EXISTS "Authenticated users can insert chat_status" ON chat_status;
DROP POLICY IF EXISTS "Authenticated users can update chat_status" ON chat_status;
DROP POLICY IF EXISTS "Authenticated users can delete chat_status" ON chat_status;
DROP POLICY IF EXISTS "Service role full access to chat_status" ON chat_status;

CREATE POLICY "Enable read access for chat_status" ON chat_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for chat_status" ON chat_status FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for chat_status" ON chat_status FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for chat_status" ON chat_status FOR DELETE TO authenticated USING (true);

-- === bot_memoria ===
DROP POLICY IF EXISTS "Authenticated users can read bot_memoria" ON bot_memoria;
DROP POLICY IF EXISTS "Authenticated users can insert bot_memoria" ON bot_memoria;
DROP POLICY IF EXISTS "Authenticated users can update bot_memoria" ON bot_memoria;
DROP POLICY IF EXISTS "Authenticated users can delete bot_memoria" ON bot_memoria;
DROP POLICY IF EXISTS "Service role full access to bot_memoria" ON bot_memoria;

CREATE POLICY "Enable read access for bot_memoria" ON bot_memoria FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for bot_memoria" ON bot_memoria FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for bot_memoria" ON bot_memoria FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for bot_memoria" ON bot_memoria FOR DELETE TO authenticated USING (true);

-- === configuracoes_sistema ===
DROP POLICY IF EXISTS "Authenticated users can read configuracoes_sistema" ON configuracoes_sistema;
DROP POLICY IF EXISTS "Authenticated users can insert configuracoes_sistema" ON configuracoes_sistema;
DROP POLICY IF EXISTS "Authenticated users can update configuracoes_sistema" ON configuracoes_sistema;
DROP POLICY IF EXISTS "Authenticated users can delete configuracoes_sistema" ON configuracoes_sistema;
DROP POLICY IF EXISTS "Service role full access to configuracoes_sistema" ON configuracoes_sistema;

CREATE POLICY "Enable read access for configuracoes_sistema" ON configuracoes_sistema FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for configuracoes_sistema" ON configuracoes_sistema FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for configuracoes_sistema" ON configuracoes_sistema FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for configuracoes_sistema" ON configuracoes_sistema FOR DELETE TO authenticated USING (true);

-- === setores_atendimento ===
DROP POLICY IF EXISTS "Authenticated users can read setores" ON setores_atendimento;
DROP POLICY IF EXISTS "Authenticated users can insert setores" ON setores_atendimento;
DROP POLICY IF EXISTS "Authenticated users can update setores" ON setores_atendimento;
DROP POLICY IF EXISTS "Authenticated users can delete setores" ON setores_atendimento;
DROP POLICY IF EXISTS "Service role full access to setores" ON setores_atendimento;

CREATE POLICY "Enable read access for setores_atendimento" ON setores_atendimento FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for setores_atendimento" ON setores_atendimento FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for setores_atendimento" ON setores_atendimento FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for setores_atendimento" ON setores_atendimento FOR DELETE TO authenticated USING (true);

-- === perfis_usuarios ===
DROP POLICY IF EXISTS "Usuários leem próprio perfil" ON perfis_usuarios;

CREATE POLICY "Enable read access for perfis_usuarios" ON perfis_usuarios FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Enable insert for perfis_usuarios" ON perfis_usuarios FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable update for perfis_usuarios" ON perfis_usuarios FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
