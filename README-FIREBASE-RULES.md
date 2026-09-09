# Correção do PERMISSION_DENIED — Admin sem Firebase Authentication

O cadastro/login personalizado de administradores usa `site/admins` no Firebase Realtime Database e não usa Firebase Authentication.

Para permitir que o navegador leia e grave `site/admins`, as regras precisam autorizar esse caminho.

## Firebase Console

Abra:
Realtime Database → Rules

Adicione o bloco abaixo dentro de `rules` (ou publique o arquivo `database.rules.json` com o Firebase CLI):

```json
{
  "rules": {
    "site": {
      "admins": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

### Atenção de segurança

Sem Firebase Authentication não existe uma identidade confiável para as Rules. Portanto, `.write: true` significa que qualquer pessoa que conheça o endereço do banco pode tentar criar, alterar ou apagar registros em `site/admins`.

Este projeto segue o requisito de não usar Authentication, mas isso é uma limitação estrutural do modelo. Para produção, a opção segura é colocar o cadastro/login atrás de um backend ou voltar a usar Firebase Authentication.

Se as regras atuais do seu banco já possuem regras para `site/alunos`, `site/filiacoes`, `site/docentes` e `site/manutencao`, NÃO apague essas regras. Acrescente somente o bloco `admins` ao bloco `site` existente.
