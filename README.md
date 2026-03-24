# 📡 CFTV Planner Pro

Solução profissional para planejamento e design de sistemas de segurança e monitoramento (CFTV). Crie plantas baixas, posicione câmeras com FOV (Campo de Visão) real e gere relatórios detalhados em segundos.

![Preview](https://cftv.solidsites.dev/preview.png)

## 🚀 Funcionalidades Principais

- **Seleção Múltipla & Marquee:** Selecione e mova grupos de câmeras e paredes simultaneamente.
- **Nuvem (Supabase):** Salve seus projetos na conta e acesse de qualquer lugar.
- **Relatórios HD:** Exportação de PDF/Imagem em alta definição com auto-enquadramento e legenda colorida.
- **Catálogo Inteligente:** Marcas líderes (Intelbras, Hikvision) com especificações técnicas reais.
- **S-Pen Optimization:** Interface responsiva e otimizada para tablets e celulares premium como S24 Ultra.
- **Medição Real:** Régua de precisão e escala automática baseada em metros.

## 🛠️ Tecnologias

- **Frontend:** Vanilla JS, Canvas API, Lucide Icons.
- **Backend/DB:** Supabase (Auth + PostgreSQL).
- **Tooling:** Vite, CSS Grid/Flexbox.

## 💻 Como Rodar Localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/marques823/cftv-planner.git
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure o `.env` com suas chaves do Supabase.
4. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## 🐋 Como Manter Ativo (Servidor)

Para garantir que o sistema continue rodando mesmo após fechar o terminal, utilize o **PM2**:

1. Instale o PM2:
   ```bash
   npm install -g pm2
   ```
2. Inicie o Vite em modo preview ou dev:
   ```bash
   pm2 start "npm run dev" --name "cftv-planner"
   ```
3. Salve a lista de processos:
   ```bash
   pm2 save
   pm2 startup
   ```

---
Desenvolvido por **Tiago Marques** - [marques823@gmail.com](mailto:marques823@gmail.com)