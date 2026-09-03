# Login administrativo sem Firebase Authentication

O CPainel agora usa um cadastro personalizado no Firebase Realtime Database:

`site/admins/{login}`

Cada registro contém `name`, `login`, `email`, `passwordHash`, `passwordHint`, `active`, `createdAt` e `updatedAt`.

A senha não é salva em texto puro; o navegador gera um hash SHA-256 antes de enviar o cadastro ao banco.

## Importante sobre segurança

Este modo NÃO substitui uma autenticação real no servidor. Como a aplicação é estática e não usa Firebase Authentication, o navegador é responsável por consultar o cadastro e manter a sessão em `localStorage`. Isso significa que o login não pode, sozinho, impedir alguém tecnicamente habilidoso de manipular o cliente.

Para que o CPainel consiga gravar notícias, alunos, filiações, docentes e manutenção sem Firebase Authentication, as regras do Realtime Database precisam permitir as operações correspondentes. Abrir escrita pública para todo `site` torna o conteúdo vulnerável a alterações por terceiros e, por isso, essa configuração não é recomendada para produção.

A solução realmente segura para administrar um site estático continua sendo um backend ou Firebase Authentication/Cloud Functions.
