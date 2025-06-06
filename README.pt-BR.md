<a name="readme-top"></a>

<div align="center">

<img src="src/assets/icons/icon-128.png" alt="daily.dev animated logo" height="80">

<br>

# Bem-Vindos ao repositório Omni Max

[English](README.md) · Portuguese · [Spanish](README.md) 

Sabemos como é desafiador atender clientes. Mas, não precisa ser assim. <br/>
Omni Max é a extensão que todo agente merece. <br/>
Resumos de conversas automatizados, preenchimento rápido de modelos de mensagem e acesso instantâneo a dados — muito além do que você já viu. Experimente 😉


<!-- SHIELD GROUP -->

[![][chrome-users-shield]][chrome-users-link]
[![][latest-version-shield]][latest-version-link]
[![][github-license-shield]][github-license-link]<br/>

**Ajude mais agentes a sofrer menos compartilhando a Omni Max**

[![][share-x-shield]][share-x-link]
[![][share-telegram-shield]][share-telegram-link]
[![][share-whatsapp-shield]][share-whatsapp-link]
[![][share-linkedin-shield]][share-linkedin-link]



<img src="assets/github repo banner with browser.png" alt="Imagem de capa Omni Max" width="100%">
</br>
<!-- <a href="#"><strong>👀 Veja em ação → </strong></a> -->

</div>

## ❤️ Sobre a Omni Max

> [!IMPORTANT]
> Marque-nos com uma estrela para mostrar seu apoio e amor pela Omni Max ⭐️

A Omni Max será sua melhor amiga, turbinada com Inteligência Artificial, projetada para otimizar a plataforma de atendimento ao cliente omnichannel [Matrix Go](https://www.matrixgo.ai/). Ele fornece aos agentes ferramentas para resumo de chats, processamento de modelos de mensagens e acesso rápido a dados para melhorar a eficiência e as interações com os clientes.

<img src="assets/github repo star graphic.png" alt="banner de estrelas Omni Max" width="100%">

## 🎯 Plataforma Alvo

Esta extensão é projetada para se integrar e aprimorar a experiência do usuário na plataforma de atendimento ao cliente omnichannel da Matrix Go, podendo também ser adaptada à plataforma white-label da ASC Brasil (ASC SAC).

## 📌 Obtenha a Omni Max

A Omni Max está atualmente disponível para Google Chrome, Microsoft Edge e Mozilla Firefox.

Adquira agora em:

<p align="center">
    <a href="https://r.daily.dev/chrome">
    <img src="https://img.shields.io/badge/%20-Chrome-red?logo=google-chrome&logoColor=white" alt="Download for Chrome" />
    </a>
    <a href="https://microsoftedge.microsoft.com/addons/detail/dailydev-news-for-busy/cbdhgldgiancdheindpekpcbkccpjaeb">
    <img src="https://img.shields.io/badge/%20-Edge-blue?logo=microsoft-edge&logoColor=white" alt="Download for Edge" />
    </a>
    <a href="https://api.daily.dev/get">
    <img src="https://img.shields.io/badge/%20-Mobile-502ab0" alt="Download for Firefox" />
    </a>
</p>

## ✨ Funcionalidades Principais

A Omni Max visa otimizar o fluxo de trabalho dos agentes de atendimento ao cliente na plataforma omnichannel, oferecendo:

* 🤖 **Assistência com Inteligência Artificial:**
    * **Resumo de Chat:** Gere instantaneamente resumos concisos de conversas longas com clientes, proporcionando rápida contextualização da solicitação e indicando os próximos passos do atendimento.
* 📝 **Processamento de Modelos de Mensagem:** Insira nomes de clientes de forma rápida e formatada; selecione variáveis nos modelos com um único clique.
* 🖱️ **Atalhos de Cópia Rápida:**
    * Copiar nome do cliente (ex: `Ctrl+Shift+Z` por padrão).
    * Copiar número do documento do cliente (CPF/CNPJ) (ex: `Ctrl+Shift+X` por padrão).
    * Copiar um modelo de descrição de Ordem de Serviço pré-preenchido (ex: `Ctrl+Shift+S` por padrão).
* ⚙️ **Design Modular:** Habilite ou desabilite funcionalidades específicas (módulos) através do menu popup da extensão para personalizar a experiência de acordo com suas necessidades individuais.
* 🎨 **Correções de Layout:** Ajustes opcionais no layout da plataforma omnichannel para melhor usabilidade (ex: mover a lista de conversas para a esuqerda).

## 🛠️ Tecnologias Utilizadas (Principais)

* **[Svelte](https://svelte.dev/)** (v5) – framework reativo leve para construção da UI.
* **[TypeScript](https://www.typescriptlang.org/)** – tipagem estática e autocompletar, garantindo mais segurança no código.
* **[Vite](https://vitejs.dev/)** – bundler e servidor de desenvolvimento ultrarrápido, usado para compilar a extensão.
* **[CRXJS Vite Plugin](https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin/README.md)** – plugin que integra Manifest V3 ao fluxo do Vite, necessário para extensões Chrome modernas.
* **[LangChain](https://js.langchain.com/)** – biblioteca para orquestrar chamadas a provedores de IA (OpenAI, Anthropic, Google GenAI, etc.), utilizada nos módulos de resumo de chat e sugestões.
* **[Vitest](https://vitest.dev/) + [Vitest-Chrome](https://github.com/antonyg/sample-vitest-chrome)** – suite de testes unitários e integração específica para ambientes de extensão.
* **[Github Actions](https://github.com/features/actions)** – CI/CD para checagem (svelte-check), testes, build e deploy automático na Chrome Web Store.

## 🚀 Como Começar

### Pré-requisitos

* [Node.js](https://nodejs.org/) (versão LTS recomendada)
* `npm` (vem com o Node.js) ou `yarn` / `pnpm`

### Instalação (para Usuários)

Para instruções detalhadas de uso, por favor, consulte nosso [Guia do Usuário](/docs/GUIA_DO_USUARIO.md).

### Configuração de Desenvolvimento

Para configurar o Omni Max para desenvolvimento:

1.  **Clone o repositório:**
    ````bash
    git clone https://github.com/DevDeividMoura/omni-max.git
    cd omni-max
    ````

2.  **Instale as dependências:**
    ````bash
    npm install
    # ou yarn install / pnpm install
    ````

3.  **Execute em modo de desenvolvimento:**
    ````bash
    npm run dev
    ````
    Este comando irá:
    * Construir a extensão no diretório `/dist`.
    * Observar mudanças nos arquivos e reconstruir automaticamente (HMR para páginas da extensão e scripts de conteúdo).

4.  **Carregue a extensão descompactada no Chrome:**
    * Abra o Chrome e navegue para `chrome://extensions`.
    * Habilite o "Modo do desenvolvedor" usando o interruptor.
    * Clique no botão "Carregar sem compactação".
    * Selecione o diretório `dist` da pasta do seu projeto.

O Omni Max deve agora estar instalado e ativo para desenvolvimento.

## 🔧 Configuração

O Omni Max oferece uma variedade de configurações acessíveis através de sua interface popup, permitindo que você adapte a extensão ao seu fluxo de trabalho:

* **Habilitar/Desabilitar Globalmente:** Ative ou desative rapidamente toda a extensão.
* **Alternância de Módulos:** Habilite ou desabilite individualmente funcionalidades específicas como Resumo de Chat por IA, atalhos de Cópia Rápida, Correções de Layout e Processamento de Modelos.
* **Configurações de IA:**
    * Selecione seu provedor de IA preferido (ex: OpenAI, Gemini, Anthropic, Groq, Ollama).
    * Gerencie chaves de API ou URLs Base para o provedor escolhido.
    * Escolha um modelo de IA específico do provedor selecionado.
* **Prompts Personalizados:** Modifique os prompts padrão usados para funcionalidades de IA, como resumo de chat.
* **Teclas de Atalho:** Personalize os atalhos de teclado para ações de cópia rápida.

O estado dessas configurações é salvo entre as sessões do navegador. Para um guia detalhado sobre todas as opções de configuração, consulte o [Guia do Usuário](/docs/GUIA_DO_USUARIO.md#configurando-o-omni-max).

## 🏗️ Compilando para Produção

Para criar uma compilação da extensão pronta para produção (ex: para empacotar e enviar para a Chrome Web Store):

````bash
npm run build
````

Isso gerará arquivos otimizados no diretório `/dist`.

## 🤝 Contribuindo

Nós encorajamos contribuições para o Omni Max! Para contribuir, por favor:

1.  Siga o fluxo de trabalho Gitflow. O desenvolvimento de funcionalidades deve ocorrer em branches derivadas de `develop`.
2.  Use Commits Convencionais para suas mensagens de commit (veja a tabela na descrição da persona do projeto).
3.  Envie Pull Requests para a branch `develop`. Por favor, use o [template de Pull Request](/.github/PULL_REQUEST_TEMPLATE.md) fornecido.
4.  Garanta que qualquer novo código seja bem testado e siga os padrões de codificação do projeto (SOLID, Clean Code, etc.).
5.  Escreva testes unitários para novas funcionalidades e garanta que todos os testes passem (`npm run test`).
6.  Atualize a documentação (READMEs, Guia do Usuário) conforme necessário para quaisquer alterações ou novas funcionalidades.

Este projeto usa `release-please` para gerenciamento automatizado de releases baseado em Commits Convencionais.

## 📝 Licença

Este projeto é licenciado sob a Licença MIT.
Por favor, veja o arquivo `LICENSE.md` (se existir, caso contrário, assuma MIT com base na prática comum para seus projetos) para detalhes.

---

Feito com ❤️ por [@DevDeividMoura](https://github.com/DevDeividMoura)


<div align="right">

[![][back-to-top]](#readme-top)

</div>

<!-- LINK GROUP -->

[back-to-top]: https://img.shields.io/badge/-BACK_TO_TOP-151515?style=flat-square
[product-docs-link]: https://docs.daily.dev/docs/intro
[changelog-link]: https://app.daily.dev/sources/daily_updates
[report-bug-link]: https://github.com/dailydotdev/daily/issues/new?assignees=&labels=Type%3A+Bug&projects=&template=---bug-report.yml&title=%F0%9F%90%9B+BUG%3A+
[github-discussions-link]: https://github.com/dailydotdev/daily/discussions/new?category=feature-requests
[swag-store-link]: https://store.daily.dev/
[brand-book-link]: https://brand.daily.dev/

<!-- SHIELDS GROUP -->

[chrome-users-shield]: https://img.shields.io/chrome-web-store/users/jlmpjdjjbgclbocgajdjefcidcncaied?style=flat-square&logo=googlechrome&logoColor=white&label=chrome%20active%20users&labelColor=black&color=9E15D9
[chrome-users-link]: https://chromewebstore.google.com/detail/dailydev-the-homepage-dev/jlmpjdjjbgclbocgajdjefcidcncaied
[extension-rating-shield]: https://img.shields.io/amo/rating/daily?style=flat-square&labelColor=black&color=0FC54F
[extension-rating-link]: https://api.daily.dev/get
[latest-version-shield]: https://img.shields.io/chrome-web-store/v/jlmpjdjjbgclbocgajdjefcidcncaied?style=flat-square&label=latest%20version&labelColor=black&color=0FC54F
[latest-version-link]: https://api.daily.dev/get
[github-stars-shield]: https://img.shields.io/github/stars/dailydotdev/daily?style=flat-square&logo=github&labelColor=black&color=508CF9
[github-stars-link]: https://github.com/dailydotdev/daily/stargazers
[github-license-shield]: https://img.shields.io/github/license/dailydotdev/daily?style=flat-square&logo=github&labelColor=black&color=508CF9
[github-license-link]: https://github.com/dailydotdev/daily/issues

<!-- SHARE BUTTONS GROUP -->

[share-linkedin-link]: https://www.linkedin.com/shareArticle?mini=true&url=https%3A//daily.dev
[share-linkedin-shield]: https://img.shields.io/badge/-share%20on%20linkedin-black?labelColor=black&logo=linkedin&logoColor=white&style=flat-square
[share-mastodon-link]: https://mastodon.social/share?text=I%20recently%20started%20using%20daily.dev%20-%20It's%20like%20a%20newsfeed%20but%20just%20for%20dev%20content.%20Pretty%20handy%20for%20staying%20up%20to%20date%20without%20the%20usual%20internet%20rabbit%20hole.%20Might%20be%20a%20nice%20break%20from%20the%20usual%20sites.&url=
[share-mastodon-shield]: https://img.shields.io/badge/-share%20on%20mastodon-black?labelColor=black&logo=mastodon&logoColor=white&style=flat-square
[share-reddit-link]: http://www.reddit.com/submit?url=https%3A%2F%2Fdaily.dev&title=I%20recently%20started%20using%20daily.dev%20-%20It's%20like%20a%20newsfeed%20but%20just%20for%20dev%20content.%20Pretty%20handy%20for%20staying%20up%20to%20date%20without%20the%20usual%20internet%20rabbit%20hole.%20Might%20be%20a%20nice%20break%20from%20the%20usual%20sites.
[share-reddit-shield]: https://img.shields.io/badge/-share%20on%20reddit-black?labelColor=black&logo=reddit&logoColor=white&style=flat-square
[share-telegram-link]: https://t.me/share/url?url=https%3A//daily.dev&text=I%20recently%20started%20using%20daily.dev%20-%20It's%20like%20a%20newsfeed%20but%20just%20for%20dev%20content.%20Pretty%20handy%20for%20staying%20up%20to%20date%20without%20the%20usual%20internet%20rabbit%20hole.%20Might%20be%20a%20nice%20break%20from%20the%20usual%20sites.
[share-telegram-shield]: https://img.shields.io/badge/-share%20on%20telegram-black?labelColor=black&logo=telegram&logoColor=white&style=flat-square
[share-whatsapp-link]: https://api.whatsapp.com/send?text=I%20recently%20started%20using%20daily.dev%20-%20It's%20like%20a%20newsfeed%20but%20just%20for%20dev%20content.%20Pretty%20handy%20for%20staying%20up%20to%20date%20without%20the%20usual%20internet%20rabbit%20hole.%20Might%20be%20a%20nice%20break%20from%20the%20usual%20sites.%20https%3A%2F%2Fdaily.dev
[share-whatsapp-shield]: https://img.shields.io/badge/-share%20on%20whatsapp-black?labelColor=black&logo=whatsapp&logoColor=white&style=flat-square
[share-x-link]: https://twitter.com/intent/tweet?text=I%20recently%20started%20using%20daily.dev%20-%20It's%20like%20a%20newsfeed%20but%20just%20for%20dev%20content.%20Pretty%20handy%20for%20staying%20up%20to%20date%20without%20the%20usual%20internet%20rabbit%20hole.%20Might%20be%20a%20nice%20break%20from%20the%20usual%20sites.&url=
[share-x-shield]: https://img.shields.io/badge/-share%20on%20x-black?labelColor=black&logo=x&logoColor=white&style=flat-square
