# 📡 CFTV Planner Pro

Solução profissional para planejamento e design de sistemas de segurança e monitoramento (CFTV). Crie plantas baixas, posicione câmeras com FOV real, trace cabos e gere relatórios e listas de materiais detalhados em segundos.

![Preview](https://cftv.solidsites.dev/preview.png) https://cftv.solidsites.dev/

## 🚀 Funcionalidades Principais

### 🗺️ Canvas Inteligente
- **Ferramentas de Desenho:** Paredes, portas, janelas, objetos, câmeras, cabos e desenho livre.
- **Ângulo Snap (45°):** Linhas retas com precisão ao traçar cabos e desenhos.
- **Suavização Chaikin:** Algoritmo automático para suavizar trajetos de cabos e desenhos livres.
- **Seleção Múltipla & Marquee:** Mova grupos de entidades simultaneamente.
- **Fusão de Pontos:** Extremidades de paredes se unem e movem juntas.

### 📋 Lista de Materiais (BOM)
- **Geração Automática:** Calcula câmeras, cabos, conectores, fontes, DVR/NVR e HDD com base no canvas.
- **Comprimento Real:** Campo para sobrescrever o comprimento calculado de cada cabo.
- **Itens Manuais:** Adicione itens extras diretamente na lista.
- **Exportação:** CSV (planilha) e PDF/impressão.

### 📱 Mobile & PWA
- **Tela Cheia (Fullscreen):** Botão dedicado no header + atalho F11.
- **Instalável como App:** Suporte a PWA — adicione à tela inicial do Android/iOS e abra sem interface do navegador.
- **Otimizado para S-Pen:** Traços precisos com estilete em dispositivos Samsung.
- **Menu Superior com Scroll:** Acesse todos os botões em telas estreitas deslizando o header.
- **Caixa de Ferramentas Compacta:** Botões reduzidos com scroll vertical no mobile.

### ☁️ Nuvem & Projetos
- **Supabase Auth:** Salve e acesse projetos de qualquer dispositivo.
- **Auto-save Local:** Projetos persistem no `localStorage` mesmo sem conta.

### 📄 Relatórios
- **PDF em Alta Definição:** Auto-enquadramento do canvas com legenda colorida.
- **Catálogo Inteligente:** Marcas líderes (Intelbras, Hikvision) com especificações técnicas reais.

## 🛠️ Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Vanilla JS, Canvas API, Lucide Icons |
| Estilo | CSS Puro (Grid + Flexbox, dark/light theme) |
| Backend/DB | Supabase (Auth + PostgreSQL) |
| Tooling | Vite, PWA Manifest |

## 💻 Como Rodar Localmente

```bash
# Clone o repositório
git clone https://github.com/marques823/cftv-planner.git
cd cftv-planner

# Instale as dependências
npm install

# Configure o ambiente
cp .env.example .env
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# Inicie o servidor de desenvolvimento
npm run dev
```

## 🐋 Manter Ativo em Servidor (PM2)

```bash
npm install -g pm2
pm2 start "npm run dev" --name "cftv-planner"
pm2 save && pm2 startup
```

## 📱 Instalar como App no Celular

| Plataforma | Passos |
|-----------|--------|
| Android (Chrome) | Menu ⋮ → "Adicionar à tela inicial" |
| iOS (Safari) | Botão Compartilhar ⬆️ → "Adicionar à Tela de Início" |

O app abrirá em modo tela cheia sem interface do navegador.

## ⌨️ Atalhos de Teclado

| Tecla | Ação |
|-------|------|
| `S` | Seleção |
| `W` | Parede |
| `C` | Câmera |
| `L` | Cabo |
| `D` | Desenho livre |
| `R` | Régua |
| `T` | Texto |
| `E` | Apagar |
| `Del` | Excluir selecionado |
| `Ctrl+Z` | Desfazer |
| `F11` | Tela cheia |

---
Desenvolvido por **Tiago Marques** — [marques823@gmail.com](mailto:marques823@gmail.com)
