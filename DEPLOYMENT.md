# Guia de Implantação e Persistência

Para manter o **CFTV Planner Pro** ativo em seu servidor remoto sem interrupções, siga estas recomendações.

## 1. Usando PM2 (Recomendado)

O PM2 é um gerenciador de processos para Node.js que reinicia o app automaticamente em caso de queda.

### Instalação
```bash
sudo npm install -g pm2
```

### Execução
Dentro da pasta do projeto:
```bash
pm2 start "npm run dev" --name "cftv-planner"
```

### Visualizar Status
```bash
pm2 status
pm2 logs cftv-planner
```

### Persistência ao Reiniciar Servidor
```bash
pm2 save
pm2 startup
```
(Copie e cole o comando gerado pelo `pm2 startup` no seu terminal).

## 2. Configuração de DNS e Host
O projeto está configurado para aceitar o host `cftv.solidsites.dev` no `vite.config.js`. Se mudar de domínio, atualize a propriedade `server.allowedHosts`.

## 3. Banco de Dados
A persistência é garantida pelo Supabase. O arquivo `.env` deve conter:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 4. Updates
Para atualizar o sistema via Git:
```bash
git pull
pm2 restart cftv-planner
```
