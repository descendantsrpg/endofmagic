# Editor do Site

O CPainel agora possui o menu **Editor do Site**. As configurações são salvas em `site/configuracao` no Firebase Realtime Database, permitindo alterar a aparência e personalizações sem reenviar os arquivos HTML.

## Recursos
- Plano de fundo personalizado
- Cor principal e cor escura
- Escurecimento do plano de fundo
- Banner global com imagem, título e subtítulo
- Título e subtítulo por página
- Ativar/desativar página
- Bloco HTML personalizado por página
- CSS personalizado por página

As imagens são comprimidas no navegador e gravadas como data URL no Realtime Database. Para imagens muito grandes ou muitos banners, recomenda-se migrar os arquivos para Firebase Storage em uma etapa futura.

## Regras
Como este projeto não usa Firebase Authentication, `site/configuracao` precisa ter leitura/escrita permitidas para o modelo atual funcionar. Isso não é uma proteção de administrador real; qualquer pessoa que consiga acessar o banco pode tentar escrever nesses caminhos.
