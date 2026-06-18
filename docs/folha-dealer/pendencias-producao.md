# Pendências e Próximos Passos para Produção

Este documento lista itens e funcionalidades que não fazem parte do MVP (Minimum Viable Product) atual, mas que devem ser avaliados e implementados para uma versão completa em produção.

## Itens Fora do Escopo do MVP Atual

- **Conexão Direta com Banco Fortes**
  A integração atual depende do upload de um arquivo CSV. Futuramente, deverá ser implementada a extração direta conectada ao banco.

- **Worker Local / VPN / Túnel Seguro**
  Será necessário estabelecer a arquitetura de segurança (ex: VPN, Cloudflare Tunnel ou Worker local) para acessar diretamente o banco Fortes do cliente de forma segura.

- **Persistência das Execuções**
  Salvar no banco de dados os resultados de cada processamento (histórico de execuções), em vez de apenas manter em memória (snapshot atual).

- **Histórico de Aprovações**
  Registrar quem aprovou o lote, a data e hora (timestamp) da aprovação e notas associadas à aprovação para fins de auditoria.

- **Armazenamento de Arquivos**
  Armazenar permanentemente no sistema os arquivos gerados (Excel de conferência e TXT) associados a cada lote aprovado.

- **Controle de Usuários e Permissões**
  Restringir acesso para que apenas usuários com nível adequado de permissão possam aprovar lotes ou gerar os arquivos TXT finais.

- **Suporte a Outras Empresas**
  O MVP pode focar em uma única empresa, mas a versão final deve parametrizar e suportar dados e layouts para múltiplas empresas.

- **Suporte a NBS**
  A inclusão da integração ou adaptação das regras para o sistema NBS.

- **Parametrização Visual de De-Para**
  A interface deverá permitir aos usuários ajustar regras de *De-Para* de rubricas, encargos e centros de custos de forma visual, sem necessitar alterar arquivos de configuração via código.

- **Configuração de Lotação vs. Consolidado**
  Adicionar a opção visual para permitir que o usuário escolha se deseja o processamento líquido consolidado em uma única linha ou rateado detalhadamente por lotação.

- **Validação Final Real no Dealer**
  Validar a solução em sua totalidade com importações reais massivas de clientes no Dealer para garantir o correto funcionamento em cenários reais complexos.
