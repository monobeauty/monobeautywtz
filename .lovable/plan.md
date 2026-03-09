

## Diagnóstico

Identifiquei dois problemas principais:

### 1. RLS Policies são RESTRICTIVE (todas as tabelas)
Todas as policies nas tabelas `messages`, `chat_status`, `bot_memoria`, `configuracoes_sistema` e `setores_atendimento` estão como **RESTRICTIVE** (`Permissive: No`). No PostgreSQL, sem nenhuma policy PERMISSIVE, o acesso é negado por padrão — mesmo que as restrictive tenham `USING (true)`. Isso explica por que os dados não carregam.

### 2. Tabela `perfis_usuarios` sem INSERT policy
O hook `useUserProfile` tenta criar o perfil se não existir, mas a tabela não tem policy de INSERT, causando falha silenciosa.

---

## Plano de Correção

### Passo 1 — Corrigir RLS policies (migração SQL)

Dropar todas as policies RESTRICTIVE e recriar como PERMISSIVE para `authenticated`:

- **messages**: SELECT, INSERT, DELETE para authenticated
- **chat_status**: SELECT, INSERT, UPDATE, DELETE para authenticated
- **bot_memoria**: SELECT, INSERT, UPDATE, DELETE para authenticated
- **configuracoes_sistema**: SELECT, INSERT, UPDATE, DELETE para authenticated
- **setores_atendimento**: SELECT, INSERT, UPDATE, DELETE para authenticated
- **perfis_usuarios**: Adicionar INSERT e UPDATE para `auth.uid() = user_id`, e tornar o SELECT permissive

### Passo 2 — Página Contatos

A página `/contacts` usa `useMessages()` que depende das queries ao Supabase funcionarem. Com o RLS corrigido, os dados voltarão a carregar. Nenhuma alteração de código necessária na página em si.

### Passo 3 — Chat (página Index)

O chat usa `useMessages`, `useChatHistory`, `useChatStatus`, `useEvolutionContacts` — todos dependem do Supabase funcionar. Com RLS corrigido + Realtime subscription que já existe, o chat voltará a funcionar.

---

## Resumo das Alterações

| Tipo | Escopo |
|------|--------|
| Migração SQL | Recriar ~20 RLS policies como PERMISSIVE para `authenticated` |
| Código | Nenhuma alteração necessária |

