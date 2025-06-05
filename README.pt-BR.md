[Read this README in English](README.md)

# Omni Max ![Logo](/src/assets/icons/icon-32.png)

**O Omni Max é uma extensão para o Chrome turbinada com Inteligência Artificial, projetada para otimizar a plataforma de atendimento ao cliente omnichannel [Matrix Go](https://www.matrixgo.ai/). Ele fornece aos agentes ferramentas para resumo de chats, aprimoramento de respostas, modelos de mensagens e acesso rápido a dados para melhorar a eficiência e as interações com os clientes.**

## ✨ Funcionalidades Principais

O Omni Max visa otimizar o fluxo de trabalho dos agentes de atendimento ao cliente na plataforma Matrix Go, oferecendo:

* 🤖 **Assistência com Inteligência Artificial:**
    * **Resumo de Chat:** Gere instantaneamente resumos concisos de conversas longas com clientes.
* 📝 **Processamento de Modelos de Mensagem:** Insira nomes de clientes de forma rápida e formatada; selecione variáveis nos modelos com um único clique.
* 🖱️ **Atalhos de Cópia Rápida:**
    * Copiar nome do cliente (ex: `Ctrl+Shift+Z` por padrão).
    * Copiar número do documento do cliente (CPF/CNPJ) (ex: `Ctrl+Shift+X` por padrão).
    * Copiar um modelo de Ordem de Serviço pré-preenchido (ex: `Ctrl+Shift+S` por padrão).
* ⚙️ **Design Modular:** Habilite ou desabilite funcionalidades específicas (módulos) através do menu popup da extensão para personalizar a experiência de acordo com suas necessidades individuais.
* 🎨 **Correções de Layout:** Ajustes opcionais no layout da plataforma Matrix Go para melhor usabilidade (ex: mover a lista de conversas).

## 🎯 Plataforma Alvo

Esta extensão é especificamente projetada para se integrar e aprimorar a experiência do usuário na plataforma de atendimento ao cliente omnichannel **Matrix Go**.

## 🛠️ Tecnologias Utilizadas (Principais)

* [SvelteKit](https://kit.svelte.dev/)
* [TypeScript](https://www.typescriptlang.org/)
* [Vite](https://vitejs.dev/)
* [CRXJS Vite Plugin](https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin/README.md) (para Manifest V3 de Extensões do Chrome)
* [LangChain](https://js.langchain.com/) para integrações com provedores de IA.

## 🚀 Como Começar

### Pré-requisitos

* [Node.js](https://nodejs.org/) (versão LTS recomendada)
* `npm` (vem com o Node.js) ou `yarn` / `pnpm`

### Instalação (para Usuários)

*(Instruções sobre como instalar a extensão Omni Max pela Chrome Web Store estarão disponíveis aqui assim que for publicada. Para desenvolvimento e testes, veja a seção "Configuração de Desenvolvimento" abaixo.)*

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