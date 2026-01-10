# Guia de Deploy na Vercel

Este projeto está pronto para ser implantado na Vercel. Siga os passos abaixo:

## Pré-requisitos
- Uma conta na [Vercel](https://vercel.com)
- O projeto enviado para um repositório Git (GitHub, GitLab, ou Bitbucket)

## Passos para Deploy

1.  **Acesse o Dashboard da Vercel**:
    - Clique em **"Add New..."** e selecione **"Project"**.
    - Importe este repositório git.

2.  **Configurações do Projeto**:
    - **Framework Preset**: A Vercel deve detectar automaticamente como `Vite`. Se não, selecione `Vite`.
    - **Root Directory**: `.` (padrão, ou `./BMA` se o repositório contiver a pasta raiz). *Nota: Como seu package.json está na raiz, use a raiz.*
    - **Build Command**: `npm run build` (ou `vite build`)
    - **Output Directory**: `dist`
    - **Install Command**: `npm install`

3.  **Variáveis de Ambiente (Environment Variables)**:
    - Adicione as seguintes variáveis (baseadas no seu `.env.local`):
        - `VITE_SUPABASE_URL`: (Sua URL do Supabase)
        - `VITE_SUPABASE_ANON_KEY`: (Sua chave Anon do Supabase)
        - `GEMINI_API_KEY`: (Sua chave da API Gemini)
    - **Importante**: Na Vercel, você deve adicionar essas chaves nas configurações do projeto. O `.env.local` não é enviado para o git por segurança.

4.  **Deploy**:
    - Clique em **Deploy**.
    - Aguarde o processo finalizar.

## Verificação PWA
Após o deploy, teste em um dispositivo móvel:
- Verifique se o prompt de instalação aparece.
- Instale e abra o app.
- Verifique se o ícone e a tela de abertura (splash screen) estão corretos.
