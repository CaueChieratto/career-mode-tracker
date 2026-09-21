# Career Mode Tracker

O **Career Mode Tracker** é um aplicativo para organizar e acompanhar suas carreiras de treinador no EA FC/FIFA. Ele funciona como um diário do seu clube: você registra jogadores, partidas, contratações e conquistas e consulta a história que construiu ao longo das temporadas.

A interface é em português e foi pensada para uso no celular, com informações divididas em abas e telas dedicadas a cada parte da carreira.

## Sumário

- [O que você pode fazer](#o-que-você-pode-fazer)
- [Como usar no dia a dia](#como-usar-no-dia-a-dia)
- [Conta e personalização](#conta-e-personalização)
- [Tecnologias utilizadas](#tecnologias-utilizadas)
- [Como executar o projeto](#como-executar-o-projeto)
- [Organização dos arquivos](#organização-dos-arquivos)
- [Como os dados são organizados](#como-os-dados-são-organizados)
- [Como publicar o aplicativo](#como-publicar-o-aplicativo)

## O que você pode fazer

### Organizar suas carreiras e temporadas

Cada carreira reúne a história de um clube sob o comando do seu treinador. Você pode definir o nome do clube, o treinador, o país, a data de início, as cores e o escudo.

As temporadas separam os acontecimentos de cada ano. Assim, fica mais fácil consultar o elenco, as competições e os resultados de diferentes momentos da carreira.

Também é possível agrupar carreiras do mesmo treinador arrastando uma sobre a outra. Esse recurso serve para reunir passagens por diferentes clubes em uma mesma trajetória.

### Cuidar do elenco

A área de elenco reúne as informações dos jogadores: nome, nacionalidade, idade, posição, número da camisa, salário, valor de mercado e nota geral, também chamada de _overall_.

Você pode escolher capitães, organizar a lista por diferentes critérios e consultar o perfil de cada atleta. Isso ajuda a conhecer melhor o grupo e acompanhar suas mudanças durante a temporada.

### Registrar transferências e contratos

Contratações, vendas, empréstimos e retornos podem ser registrados junto com os clubes envolvidos, as datas e os valores da negociação. Também há opções para registrar aposentadorias e saídas por fim de contrato.

Essas informações ajudam a acompanhar quem chegou, quem saiu e o histórico de movimentações do elenco.

### Acompanhar as partidas

Cada partida reúne o adversário, a competição, a data e a indicação de quem joga em casa. Depois do jogo, você pode registrar o placar e os principais acontecimentos.

Entre os detalhes disponíveis estão:

- Gols, assistências e gols contra.
- Cartões e melhor jogador da partida, também chamado de MVP.
- Prorrogação e disputa de pênaltis.
- Escalação, formação e substituições.
- Notas e desempenho individual dos jogadores.
- Números da equipe, como posse de bola, finalizações e passes.

A linha do tempo apresenta os acontecimentos do jogo em sequência, facilitando a consulta ao que aconteceu na partida.

### Consultar estatísticas e comparar jogadores

As estatísticas ajudam a entender o desempenho do time e dos atletas. Você pode registrar números por competição e consultar informações reunidas por temporada ou carreira.

A comparação de jogadores coloca os números lado a lado para observar diferenças de desempenho. Os rankings destacam atletas em diferentes critérios, e a área de curiosidades reúne informações como sequências de resultados, maiores vitórias e retrospectos contra adversários.

### Acompanhar a tabela e as conquistas

A tabela reúne os times da competição, jogos disputados, vitórias, empates, derrotas, pontos e saldo de gols. As marcações de posição ajudam a identificar faixas de classificação, acesso ou rebaixamento.

A área de títulos funciona como uma galeria das conquistas do clube, associando os troféus às temporadas em que foram registrados.

### Desenvolver a categoria de base

A categoria de base tem um espaço próprio para cadastrar jovens jogadores, registrar sua evolução e acompanhar torneios e partidas.

Você pode consultar mudanças de atributos, registrar a promoção de um atleta ao elenco profissional ou sua dispensa. O histórico de atividades reúne acontecimentos da base para facilitar o acompanhamento dos jogadores.

### Compartilhar resumos

O aplicativo oferece opções para copiar informações como texto, incluindo elenco, estatísticas e resumos de partidas. Isso facilita guardar anotações ou compartilhar os resultados da carreira em uma conversa.

## Como usar no dia a dia

1. **Crie sua conta ou entre com e-mail e senha.**
2. **Cadastre uma carreira**, informando o clube e o treinador.
3. **Adicione uma temporada** e escolha as competições que deseja acompanhar.
4. **Monte o elenco**, preenchendo as informações dos jogadores.
5. **Registre as partidas e movimentações** conforme avança no jogo.
6. **Consulte os números e as conquistas** para acompanhar a história do time.

Por exemplo: depois de uma vitória, você pode registrar o placar, os autores dos gols e as notas dos jogadores. Em outro momento, pode consultar esses registros para comparar o desempenho dos atletas durante a temporada.

## Conta e personalização

O acesso é feito com e-mail e senha. As informações das carreiras são salvas na nuvem pelo Firebase, o serviço usado pelo projeto para contas e armazenamento de dados.

Você pode personalizar cores e escudo do clube, escolher a moeda da carreira e alternar entre os temas claro e escuro. O tutorial dentro do aplicativo apresenta suas áreas e recursos.

Algumas informações de equipes são buscadas em serviços de futebol:

| Serviço           | Para que serve                                                               |
| ----------------- | ---------------------------------------------------------------------------- |
| TheSportsDB       | Buscar informações do clube ao criar uma carreira, como nome, escudo e cores |
| football-data.org | Buscar informações de equipes usadas no cadastro de adversários              |
| Cloudinary        | Receber e hospedar imagens de escudos enviadas pelo usuário                  |

## Tecnologias utilizadas

Esta seção apresenta as ferramentas usadas para construir o aplicativo e o papel de cada uma.

| Tecnologia                      | Função no projeto                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| React                           | Montar as telas e atualizar as informações exibidas                                 |
| TypeScript                      | Definir os formatos dos dados e ajudar na organização do código                     |
| Vite                            | Executar o projeto durante o desenvolvimento e preparar os arquivos para publicação |
| React Router                    | Controlar a navegação entre as páginas                                              |
| Firebase Authentication         | Gerenciar cadastro, entrada e saída da conta                                        |
| Cloud Firestore                 | Armazenar carreiras, temporadas, jogadores e partidas                               |
| CSS Modules e CSS global        | Definir cores, tamanhos, espaçamentos e aparência das telas                         |
| @dnd-kit                        | Criar interações de arrastar e soltar                                               |
| Swiper                          | Organizar áreas com navegação por deslize                                           |
| react-icons e react-world-flags | Exibir ícones e bandeiras                                                           |
| date-fns, uuid e classnames     | Trabalhar com datas, identificadores e estilos                                      |
| ESLint                          | Verificar padrões e regras do código                                                |
| Vercel                          | Hospedar o aplicativo e encaminhar as chamadas da API de futebol                    |

As dependências e os comandos estão em [package.json](package.json). O [package-lock.json](package-lock.json) registra as versões utilizadas na instalação.

## Como executar o projeto

As instruções abaixo são para quem deseja abrir o projeto no próprio computador e trabalhar no código.

### Preparar as ferramentas e os serviços

Para executar o aplicativo, tenha:

- **Node.js e npm**, usados para instalar as ferramentas do projeto e iniciar o aplicativo.
- **Git**, para baixar o repositório com o comando abaixo.
- **Um projeto Firebase**, com Authentication por e-mail/senha e Cloud Firestore configurados.
- **Um token de acesso ao football-data.org**, usado na busca de equipes.
- **Uma conta Cloudinary**, com nome da conta e configuração de envio de imagens, para utilizar o upload de escudos.

### Baixar e instalar

No terminal, execute:

```bash
git clone https://github.com/CaueChieratto/carrer-mode-tracker.git
cd carrer-mode-tracker
npm ci
```

O primeiro comando baixa o projeto. O segundo abre sua pasta no terminal. O terceiro instala as dependências nas versões registradas no arquivo `package-lock.json`.

### Configurar as conexões

Crie um arquivo chamado **`.env.local`** na pasta principal do projeto. Ele reúne as configurações usadas para conectar o aplicativo aos serviços externos.

Preencha os campos com os valores das suas contas:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

VITE_FOOTBALL_DATA_API_TOKEN=

VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

| Configuração                    | Para que serve                                                 |
| ------------------------------- | -------------------------------------------------------------- |
| `VITE_FIREBASE_*`               | Identificar o projeto Firebase usado pelo aplicativo           |
| `VITE_FOOTBALL_DATA_API_TOKEN`  | Configurar o acesso à consulta de equipes do football-data.org |
| `VITE_CLOUDINARY_CLOUD_NAME`    | Identificar a conta Cloudinary que recebe as imagens           |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Escolher a configuração de envio de imagens no Cloudinary      |

### Abrir o aplicativo

```bash
npm run dev
```

O terminal mostrará o endereço para abrir no navegador. No computador, use a visualização de celular das ferramentas do navegador, com largura de até **600 px**, para acessar a interface móvel.

### Comandos do projeto

| Comando           | O que faz                                                                 |
| ----------------- | ------------------------------------------------------------------------- |
| `npm run dev`     | Inicia o aplicativo para desenvolvimento                                  |
| `npm run build`   | Verifica o TypeScript e prepara os arquivos de publicação na pasta `dist` |
| `npm run lint`    | Analisa o código com as regras do ESLint                                  |
| `npm run preview` | Permite visualizar localmente a versão preparada pelo build               |

## Organização dos arquivos

As pastas separam as telas, os componentes visuais e as funções que trabalham com os dados.

```text
src/
├── common/                  # Funções, serviços e definições compartilhadas
│   ├── hooks/               # Lógica reutilizável das telas
│   ├── services/            # Acesso aos dados e serviços externos
│   ├── helpers/             # Funções de apoio
│   ├── interfaces/          # Formatos dos dados
│   └── utils/               # Datas, valores e outras operações comuns
├── components/              # Elementos reutilizáveis, como botões e formulários
├── contexts/                # Informações compartilhadas, como o tema
├── layout/SectionView/      # Organização das abas de clubes e jogadores
├── pages/                   # Páginas principais do aplicativo
├── ui/                      # Menus, cabeçalhos e janelas de edição
├── App.tsx                  # Organização das rotas
└── main.tsx                 # Ponto de entrada do aplicativo

public/                      # Imagens, escudos e troféus
package.json                 # Dependências e comandos
vite.config.ts               # Configuração do ambiente de desenvolvimento
vercel.json                  # Configuração de publicação na Vercel
```

## Como os dados são organizados

As informações são armazenadas no **Cloud Firestore**, o banco de dados do Firebase. Cada conta tem suas carreiras, e cada carreira reúne temporadas e registros relacionados.

Para quem trabalha no código, a estrutura principal é:

```text
users/{uid}
├── careers/{careerId}
│   └── seasons/{seasonId}
│       ├── players/{playerId}
│       ├── matches/{matchId}
│       │   └── playerStats/{playerId}
│       ├── table/{teamId}
│       ├── academyPlayers/{academyPlayerId}
│       └── academyTournaments/{tournamentId}
└── careerGroups/{groupId}
```

Os nomes entre chaves representam identificadores. Por exemplo, `careerId` identifica uma carreira e `playerId` identifica um jogador.

| Registro             | O que guarda                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| `careers`            | Identidade do clube, treinador, cores, títulos e informações das temporadas no campo `clubData` |
| `players`            | Cadastro, contratos e estatísticas por competição dos jogadores                                 |
| `matches`            | Informações, resultado, acontecimentos e escalação de cada partida                              |
| `playerStats`        | Desempenho individual de um jogador em uma partida                                              |
| `table`              | Registros das equipes na classificação                                                          |
| `academyPlayers`     | Jogadores e histórico de evolução da base                                                       |
| `academyTournaments` | Torneios da base, com suas partidas no campo `matches`                                          |
| `careerGroups`       | Ligações entre carreiras que fazem parte da trajetória do mesmo treinador                       |

## Como publicar o aplicativo

Publicar significa disponibilizar o aplicativo em um endereço na internet. O projeto possui configuração para a **Vercel** no arquivo [vercel.json](vercel.json).

As configurações principais de publicação são:

| Opção                         | Valor                                                          |
| ----------------------------- | -------------------------------------------------------------- |
| Comando de build              | `npm run build`                                                |
| Pasta dos arquivos publicados | `dist`                                                         |
| Configurações de conexão      | Variáveis de ambiente cadastradas na plataforma antes do build |

O arquivo `vercel.json` também define dois encaminhamentos:

- **Consultas de futebol:** chamadas para `/api/football-data/*` são encaminhadas ao serviço football-data.org.
- **Páginas do aplicativo:** os endereços internos carregam `index.html`, e o React Router apresenta a tela correspondente.

Durante o desenvolvimento, o [vite.config.ts](vite.config.ts) faz o encaminhamento das consultas de futebol pelo servidor local.
