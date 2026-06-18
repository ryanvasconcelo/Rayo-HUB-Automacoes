import sys

# Script embutido para ler o CSV e copiar linha por linha para a saída padrão,
# que vai ser capturada e salva dentro do sandbox
with open('/Users/ryanrichard/projecont/automacoes_RH/automacao_rh_adiantamento/backend/extracao_folha_consolidada.csv', 'r') as f:
    sys.stdout.write(f.read())
