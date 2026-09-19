# Sistema de contas e fichas — integração com o CPainel existente

## O que foi implementado

- Cadastro de jogadores com Firebase Authentication (e-mail/senha usando um e-mail técnico derivado do usuário).
- Perfil do jogador separado das fichas em `site/profiles/{uid}`.
- Índice de usuário em `site/usernames/{username}` para impedir duplicidade.
- Login persistente com Firebase Authentication.
- `home.html` e `ficha.html` protegidos por sessão autenticada.
- Ficha única em `ficha.html`, dividida em 6 etapas.
- Rascunho salvo automaticamente em `site/fichasRascunhos/{uid}/{draftId}`.
- Um jogador pode possuir várias fichas.
- Fichas enviadas ficam em `site/fichas/{fichaId}` com status `em_analise`.
- Fichas devolvidas pelo CPainel ficam com status `altere_sua_ficha` e retornam aos Rascunhos.
- A ficha usa a estrutura já utilizada pelo CPainel: `characterName`, `characterAge`, `fairyTale`, `progenitors`, `royalRebel`, `extracurriculars`, `powers`, `personality`, `history` e `avatarUrl`.
- Filiações e atividades são carregadas dinamicamente do Firebase.
- A foto é comprimida no navegador e armazenada como Data URL diretamente no Realtime Database. **Firebase Storage não é utilizado.**
- O `admin.html` original do projeto foi preservado. Não foi criado um segundo sistema de aprovação nem uma segunda base de administradores.
- A aprovação existente do CPainel continua sendo o ponto que publica o personagem em `site/alunos` e atualiza `currentChildren` das filiações.
- O mesmo `studentKey` da ficha aprovada é reutilizado em novas aprovações para evitar duplicação.
- A página `alunos.html` continua consumindo `site/alunos`; `filiacoes.html` usa os alunos publicados para os totais.

## Fluxo

Jogador → Cadastro → Login → Home → Ficha → Rascunho automático → Enviar → `em_analise` → CPainel existente → Aprovar → `aprovada` + `site/alunos` + filiação sincronizada.

Na devolução para correção, o botão existente de revisão do CPainel grava `altere_sua_ficha` e cria/atualiza o rascunho correspondente. O jogador reabre o mesmo registro, corrige e envia novamente.

## Imagens

As fotos dos personagens são comprimidas para JPEG no navegador (até 720 px no maior lado, com redução adicional de qualidade se necessário) e salvas no campo `avatarUrl` da ficha. A mesma Data URL é reutilizada pelo CPainel, Home e Alunos.

## Administradores

O sistema administrativo existente foi preservado. Os administradores existentes continuam sendo reconhecidos pela estrutura `site/admins` e pelo mecanismo de login que já estava no `admin.html`. Não foi criada uma coleção paralela de administradores.

## Observação importante sobre segurança do banco

O CPainel legado deste projeto faz autenticação administrativa no navegador e acessa o Realtime Database diretamente. Como ele não apresenta um token Firebase Authentication de administrador ao banco, as regras do Realtime Database não conseguem distinguir uma escrita legítima desse CPainel de uma escrita anônima. Por isso, esta versão preserva o modelo de acesso do CPainel existente em vez de fingir que ele ganhou autorização server-side.

A proteção de páginas do jogador é feita com Firebase Authentication, e os dados de perfil/rascunho são organizados por UID. Para obter isolamento server-side completo também para as operações administrativas, o CPainel precisará futuramente migrar para Firebase Authentication/custom claims ou para um backend/Cloud Function. Essa migração não foi feita aqui para não substituir o sistema administrativo existente.

## Firebase

É necessário habilitar o provedor **Email/Password** no Firebase Authentication para as contas de jogadores.

O arquivo `database.rules.json` acompanha a estrutura usada pelo site. Publique-o somente depois de conferir o comportamento do CPainel legado e, se desejar segurança server-side completa para os administradores, faça a migração do CPainel para um token Firebase antes de fechar as regras de escrita.
