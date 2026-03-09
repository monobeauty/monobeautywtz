
## Foto real e indicador de status das instancias no menu lateral

### O que sera feito

1. **Capturar a foto de perfil da instancia na Evolution API** -- O endpoint `fetchInstances` ja retorna `profilePictureUrl` e `profileName` no objeto de cada instancia. Atualmente o edge function e o hook `useEvolutionInstances` descartam essas informacoes.

2. **Atualizar o edge function `fetch-instances`** para incluir `profilePictureUrl` e `profileName` na resposta.

3. **Atualizar o hook `useEvolutionInstances`** para expor um mapa de `profilePicUrl` e `profileName` por instancia.

4. **Atualizar o `InstanceSidebar`** para:
   - Exibir a foto real do WhatsApp da instancia usando o componente Avatar (com fallback para as iniciais caso a foto nao esteja disponivel).
   - Corrigir a bolinha cinza: ela e o indicador de status de conexao. Quando o status e "unknown" ou nao reconhecido, fica cinza (`bg-muted-foreground/40`). Sera ajustada para ter cores mais claras e significativas.

### O que e a bolinha cinza

A bolinha cinza e o indicador de status de conexao da instancia com o WhatsApp:
- **Verde**: conectada (status "open" ou "connected")
- **Amarela**: conectando (status "connecting")
- **Cinza**: desconectada ou status desconhecido

Se as instancias estao funcionando normalmente, provavelmente o status retornado pela API nao esta sendo mapeado corretamente para "open"/"connected". Isso sera verificado e corrigido.

---

### Detalhes tecnicos

**1. Edge function `supabase/functions/fetch-instances/index.ts`**

Adicionar `profilePictureUrl` e `profileName` ao objeto retornado:

```typescript
data.forEach((item: any) => {
  const name = item.instance?.instanceName || ...;
  const status = item.instance?.status || ...;
  const profilePicUrl = item.instance?.profilePictureUrl || null;
  const profileName = item.instance?.profileName || null;
  if (name) instances.push({ name, status, profilePicUrl, profileName });
});
```

**2. Hook `src/hooks/useEvolutionInstances.ts`**

Atualizar a interface `EvolutionInstance` e expor mapas adicionais:

```typescript
export interface EvolutionInstance {
  name: string;
  status: string;
  profilePicUrl: string | null;
  profileName: string | null;
}

// Expor um mapa de profile pics
const profilePicMap: Record<string, string | null> = {};
instances.forEach((i) => {
  profilePicMap[i.name] = i.profilePicUrl;
});
```

**3. Componente `src/components/InstanceSidebar.tsx`**

- Receber nova prop `instanceProfilePics` (mapa nome -> URL da foto).
- Substituir o circulo com iniciais por um `Avatar` com `AvatarImage` (foto real) e `AvatarFallback` (iniciais como fallback).
- Manter a bolinha de status sobreposta ao avatar.

**4. Componente `src/pages/Index.tsx`**

- Passar o mapa `profilePicMap` do hook para o `InstanceSidebar`.
