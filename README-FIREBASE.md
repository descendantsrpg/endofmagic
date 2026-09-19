# Firebase — configuração atual

Projeto: `descendentes-bbcd5`

O sistema de jogadores usa Firebase Authentication com Email/Password e Realtime Database.

## Jogadores

- `site/usernames/{username}` — índice público de disponibilidade do nome de usuário.
- `site/profiles/{uid}` — perfil da conta autenticada.
- `site/fichasRascunhos/{uid}/{draftId}` — progresso automático.
- `site/fichas/{fichaId}` — fichas enviadas para o fluxo administrativo existente.

## Publicação após aprovação

O `admin.html` existente continua sendo responsável pela aprovação. A função já existente grava o personagem aprovado em `site/alunos/{studentKey}` e atualiza os contadores das filiações em `site/filiacoes`.

## Fotos

As fotos de personagens são comprimidas no navegador e salvas como Data URL no campo `avatarUrl` da ficha. Firebase Storage não é utilizado para personagens.

## Administradores

A estrutura existente `site/admins` e o mecanismo administrativo legado foram preservados. Não foi criado um segundo sistema de administradores.

## Importante

O CPainel legado não usa um token Firebase Authentication para suas operações no banco. Por isso, as regras compatíveis com esse CPainel não conseguem oferecer isolamento server-side completo para as escritas administrativas. Consulte `README-SISTEMA-CONTAS-FICHAS.md` antes de endurecer as regras.
