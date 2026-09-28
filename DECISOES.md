# Walkthrough — Módulo De-para Contas Contábeis

## O que foi feito

Implementado o módulo completo de cadastro de **De-para Evento Fortes → Conta Contábil Dealer**, permitindo que o usuário gerencie os mapeamentos contábeis diretamente pela interface, sem precisar alterar código.

## Arquivos modificados

### Backend
- [`folha-dealer-centers-store.js`](file:///Users/ryanrichard/projecont/Rayo/apps/rayo-server/folha-dealer-centers-store.js) — O `normalizePayload` agora inclui o array `accountMappings` na serialização JSON. O `loadSeed` também inicializa com `accountMappings: []`.

### Core (Motor)
- [`merge-center-config.js`](file:///Users/ryanrichard/projecont/Rayo/apps/rayo/src/lib/folha-dealer/merge-center-config.js) — Nova função `mergeAccountMappings(seedMappings, stored)` que mescla as regras de conta do código (`braga-veiculos.config.js`) com as regras dinâmicas gravadas pelo usuário no servidor. `seedPayloadFromCenterMappings` e `normalizeCentersPayload` também foram atualizados.

### Hooks
- [`useFolhaDealer.js`](file:///Users/ryanrichard/projecont/Rayo/apps/rayo/src/hooks/useFolhaDealer.js) — `resolveRuntimeConfig()` agora chama `mergeAccountMappings` e injeta o resultado no `config` de runtime, garantindo que o motor contábil use os mapeamentos mesclados.
- [`useFolhaDealerCenters.js`](file:///Users/ryanrichard/projecont/Rayo/apps/rayo/src/hooks/useFolhaDealerCenters.js) — Expõe `mergedAccountMappings` e passa `seedAccountMappings` no fallback de seed.

### UI
- [`FolhaDealerCadastrosPanel.jsx`](file:///Users/ryanrichard/projecont/Rayo/apps/rayo/src/components/FolhaDealerCadastrosPanel.jsx) — Nova seção **"De-para Evento → Conta Contábil"** com:
  - Tabela editável inline (evento, conta, D/C, descrição, ativo)
  - Formulário para adicionar novos mapeamentos
  - Botão de excluir por linha
  - Salvamento unificado com centros e lotações

## Verificação

| Check | Resultado |
|---|---|
| `vite build` | ✅ Exit 0, sem erros |
| Commit | ✅ `e3a8d7a` |
| Push | ✅ `feat/folha-dealer-cadastro-centros` atualizada no remote |

## Hierarquia de dados

```
Seed (braga-veiculos.config.js)  →  merge  ←  Servidor (JSON do rayo-server)
                                       ↓
                              Config de Runtime usado pelo motor
```

Os mapeamentos que o usuário salvar pela tela **sobrescrevem** os do seed para o mesmo `eventCode`.
