# Guia de Instalação e Deploy — Rayo Hub (Windows / Rede Local)

Este guia ensina como instalar e fazer o deploy do **Rayo Hub** em uma máquina Windows para que qualquer computador na mesma rede local (Wi-Fi ou Cabo) possa acessá-lo via navegador, **sem necessidade de autenticação**.

---

## Módulos Incluídos

| Módulo | Rota | Descrição |
|--------|------|-----------|
| **Rayo Hub** | `/` | Página inicial com acesso a todos os módulos |
| **PIS/COFINS** | `/pis-cofins` | Revisão de NCMs e regras tributárias |
| **Auditor ICMS** | `/icms` | Auditoria de ICMS com robô e-Auditoria |
| **Contas Razão** | `/contas-razao` | Conciliação Razão × Relatório |
| **Estoque Auditor** | `/stock` | Auditoria de inventário |
| **Subvenções ZFM** | `/subvencoes` | Subvenções ZFM (Convênio 65/88) + download SEFAZ-AM |
| **Conciliação de Notas** | `/conciliacao-notas` | Conciliação por Número de Nota (Razão × Relatório Financeiro) |

---

## 1. Pré-requisitos

### 1.1 Node.js
1. Acesse [https://nodejs.org/](https://nodejs.org/)
2. Baixe a versão **LTS (Recommended for Most Users)**.
3. Instale normalmente (Next > Next > Install). Deixe as opções padrão ativas.

### 1.2 Git (opcional, recomendado)
- Para atualizações via `git pull`: [https://git-scm.com/download/win](https://git-scm.com/download/win)

---

## 2. Baixar a Aplicação

### Via Git Clone (recomendado)
```cmd
git clone https://github.com/ryanvasconcelo/Rayo-HUB-Automacoes.git
cd Rayo-HUB-Automacoes
```

### Via ZIP
1. Acesse o repositório no GitHub.
2. Clique em **Code** → **Download ZIP**.
3. Extraia a pasta em um local de fácil acesso (ex: `C:\Rayo`).
4. Abra o Prompt de Comando e navegue até a pasta:
   ```cmd
   cd C:\Rayo\Rayo-HUB-Automacoes
   ```

---

## 3. Instalação

Execute os comandos na ordem:

```cmd
npm install
npm run build:all
```

- **`npm install`** — Instala todas as dependências do monorepo (inclui Chromium do Playwright para o módulo Subvenções).
- **`npm run build:all`** — Gera os builds de produção do Rayo Hub e do módulo Subvenções ZFM.

---

## 4. Configuração (.env)

### 4.1 Rayo Server (obrigatório para Auditor ICMS)

O robô do e-Auditoria precisa de credenciais para buscar regras de ICMS.

1. Navegue até `apps\rayo-server\`
2. Copie `.env.example` para `.env`
3. Abra `.env` no Bloco de Notas e preencha:

```
EAUDITORIA_EMAIL=seu_email@empresa.com
EAUDITORIA_PASSWORD=SuaSenha
# Porta 3000 = não exige admin; acesse http://<IP>:3000
# Porta 80 = exige "Executar como administrador"
PORT=3000
```

4. Salve o arquivo. Sem isso, o **Auditor ICMS** ficará offline.

### 4.2 Subvenções Server (obrigatório para download SEFAZ-AM)

O módulo **Subvenções ZFM** usa um servidor separado para baixar XMLs do portal SEFAZ-AM via certificado digital.

1. Navegue até `apps\subvencoes-server\`
2. Copie `.env.example` para `.env`
3. Abra `.env` e preencha:

```
PORT=3002
SEFAZ_IE=041504550
SEFAZ_PFX_PATH=C:\Caminho\para\seu\certificado.pfx
SEFAZ_PFX_SENHA=senha_do_certificado
SEFAZ_CFOP=
SEFAZ_HEADLESS=false
```

4. Ajuste `SEFAZ_PFX_PATH` para o caminho absoluto do seu certificado A1 (.pfx).

---

## 5. Iniciar o Sistema

Um único comando sobe todos os servidores:

```cmd
npm start
```

Isso inicia:
- **rayo-server** (porta 3000) — Rayo Hub + API do e-Auditoria
- **subvencoes-server** (porta 3002) — Download de XMLs SEFAZ-AM

Se o **Firewall do Windows** perguntar se deseja permitir acesso à rede, marque **Redes Privadas** e clique em **Permitir Acesso**.

---

## 6. Acessar na Rede

### Descobrir o IP do servidor
```cmd
ipconfig
```
Procure **Endereço IPv4** (ex: `192.168.0.166`).

### Acesso
Qualquer PC na mesma rede abre no navegador:

```
http://192.168.0.166:3000
```

Ou diretamente em um módulo:
- `http://192.168.0.166:3000/icms` — Auditor ICMS
- `http://192.168.0.166:3000/subvencoes` — Subvenções ZFM
- `http://192.168.0.166:3000/conciliacao-notas` — Conciliação de Notas

Se configurou `PORT=80` no `.env`, use `http://192.168.0.166` (sem porta).

---

## 7. Iniciar Automaticamente com o Windows

1. Abra o **Bloco de Notas**.
2. Cole o código abaixo (ajuste o caminho):

```bat
@echo off
cd C:\Rayo\Rayo-HUB-Automacoes
npm start
```

3. Salve como `iniciar-rayo.bat`.
4. Pressione `Windows + R`, digite `shell:startup` e coloque o arquivo na pasta que abrir.

---

## 8. Atualizar o Sistema

Quando houver novas versões no repositório:

```cmd
cd C:\Rayo\Rayo-HUB-Automacoes
git pull
npm install
npm run build:all
npm start
```

---

## 9. Solução de Problemas

| Problema | Solução |
|----------|---------|
| **Site não carrega / carregando infinito** | Libere as portas **3000** e **3002** no Firewall do Windows (Regras de Entrada > Nova Regra > Porta TCP). Se usar PORT=80, libere também a 80. |
| **Auditor ICMS: Offline** | Verifique o `.env` em `apps\rayo-server\` com `EAUDITORIA_EMAIL` e `EAUDITORIA_PASSWORD` corretos. |
| **Robô SEFAZ: Offline** | Verifique o `.env` em `apps\subvencoes-server\` e se o certificado `.pfx` existe no caminho indicado. |
| **Subvenções: tela em branco** | Execute `npm run build:all` novamente. O build do módulo Subvenções deve gerar `apps\subvencoes\dist\`. |
| **IP mudou** | Configure o IP como estático nas configurações de rede do Windows ou fixe-o no roteador. |

---

## 10. Módulo Conciliação de Notas

O módulo **Conciliação de Notas** cruza o Razão Contábil (NBS) com o Relatório Financeiro (Sifin) usando o **Número da Nota** como chave.

### Uso
1. Acesse `http://<IP>/conciliacao-notas`
2. Faça upload do **Razão Contábil** (CSV/Excel) e do **Relatório Financeiro** (CSV/Excel)
3. O sistema cruza os datasets e exibe divergências (Conciliado, Investigar, Inconsistência, Sem Financeiro)
4. Exporte os resultados em XLSX para trilha de auditoria

### Fluxos suportados
- **Clientes a Receber** — Razão NBS × Relatório de Clientes
- **Fornecedores a Pagar** — Razão NBS × Títulos em Aberto
