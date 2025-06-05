# Omni Max - Guia do Usuário

Bem-vindo ao Omni Max! Este guia irá ajudá-lo a instalar, configurar e usar a extensão Omni Max para aprimorar sua experiência na plataforma Matrix Go.

## Sumário

1.  [Introdução](#introdução)
2.  [Instalação](#instalação)
3.  [Acessando o Omni Max](#acessando-o-omni-max)
4.  [Funcionalidades Principais](#funcionalidades-principais)
    * [Correção de Layout](#correção-de-layout)
    * [Cópia Rápida: Nome do Cliente](#cópia-rápida-nome-do-cliente)
    * [Cópia Rápida: Número do Documento](#cópia-rápida-número-do-documento)
    * [Cópia Rápida: Modelo de Ordem de Serviço](#cópia-rápida-modelo-de-ordem-de-serviço)
    * [Processador de Modelos de Mensagem](#processador-de-modelos-de-mensagem)
    * [IA: Resumo do Chat](#ia-resumo-do-chat)
5.  [Configurando o Omni Max](#configurando-o-omni-max)
    * [Habilitar/Desabilitar Globalmente](#habilitardesabilitar-globalmente)
    * [Habilitando/Desabilitando Módulos](#habilitandodesabilitando-módulos)
    * [Configurando Provedor de IA](#configurando-provedor-de-ia)
    * [Personalizando Prompts](#personalizando-prompts)
    * [Personalizando Teclas de Atalho](#personalizando-teclas-de-atalho)
6.  [Solução de Problemas](#solução-de-problemas)
7.  [Contato e Suporte](#contato-e-suporte)

## Introdução

O Omni Max é uma extensão para o Chrome turbinada com Inteligência Artificial, projetada para otimizar a plataforma de atendimento ao cliente omnichannel [Matrix Go](https://www.matrixgo.ai/). Ele fornece aos agentes ferramentas para resumo de chats, processamento de modelos de mensagens e acesso rápido a dados para melhorar a eficiência e as interações com os clientes.

## Instalação

*(Esta seção será atualizada com instruções para instalação pela Chrome Web Store assim que a extensão for publicada.)*

Atualmente, para usar o Omni Max, você precisa carregá-lo como uma extensão descompactada em modo de desenvolvimento. Por favor, consulte as [instruções de Configuração de Desenvolvimento no README.md principal](../README.md#configuração-de-desenvolvimento).

## Acessando o Omni Max

Uma vez instalado, você pode acessar as funcionalidades e configurações do Omni Max através do seu menu popup:

1.  Clique no ícone de Extensões (geralmente uma peça de quebra-cabeça 🧩) na barra de ferramentas do Chrome.
2.  Encontre "Omni Max" na lista de extensões e clique nele.
3.  O popup do Omni Max aparecerá, permitindo que você configure suas definições.

## Funcionalidades Principais

O Omni Max oferece diversos módulos para aprimorar seu fluxo de trabalho. Você pode habilitar ou desabilitar esses módulos individualmente através do menu popup.

### Correção de Layout

* **O que faz:** Opcionalmente ajusta o layout da plataforma Matrix Go para melhor usabilidade. Por exemplo, pode mover a lista de conversas para a direita e limitar sua altura.
* **Como usar:** Habilite o módulo "Correção de Layout" no popup do Omni Max em "Módulos Gerais". As alterações serão aplicadas automaticamente à interface do Matrix Go.

### Cópia Rápida: Nome do Cliente

* **O que faz:** Permite copiar rapidamente o nome do cliente do chat ativo.
* **Atalho Padrão:** `Ctrl+Shift+Z`
* **Como usar:** Certifique-se de que o módulo "Atalho: Copiar Nome do Cliente" está habilitado no popup do Omni Max (em "Atalhos de Teclado"). Em um chat ativo no Matrix Go, pressione o atalho configurado. O nome do cliente será copiado para sua área de transferência, e uma notificação confirmará a ação.
* **Personalização:** Você pode alterar a tecla de atalho na seção "Atalhos de Teclado" do popup.

### Cópia Rápida: Número do Documento

* **O que faz:** Permite copiar rapidamente o número do documento do cliente (CPF ou CNPJ) do chat ativo.
* **Atalho Padrão:** `Ctrl+Shift+X`
* **Como usar:** Habilite o módulo "Atalho: Copiar Número do Documento do Cliente". Pressione o atalho configurado em um chat ativo. O número do documento será copiado e uma notificação aparecerá.
* **Personalização:** A tecla de atalho pode ser alterada no popup.

### Cópia Rápida: Modelo de Ordem de Serviço

* **O que faz:** Copia um modelo de Ordem de Serviço pré-definido para sua área de transferência. O modelo pode incluir automaticamente o número de telefone do cliente e o número do protocolo atual, se encontrados na página.
* **Atalho Padrão:** `Ctrl+Shift+S`
* **Como usar:** Habilite o módulo "Atalho: Template de Ordem de Serviço". Pressione o atalho configurado. O texto do modelo será copiado.
    ````
    Situação: [RELATO_DO_CLIENTE] |||
    Telefone: [TELEFONE_DO_CLIENTE_OU_PLACEHOLDER] |||
    Protocolo: [NUMERO_DO_PROTOCOLO_OU_PLACEHOLDER] |||
    OBS: [OBSERVAÇÕES]
    ````
* **Personalização:** A tecla de atalho pode ser alterada no popup.

### Processador de Modelos de Mensagem

* **O que faz:** Melhora o manuseio de modelos de mensagem dentro do Matrix Go. Pode formatar automaticamente nomes de clientes (ex: `{ANA MARIA}` torna-se `Ana`) e permite navegação/seleção rápida de variáveis como `[VARIAVEL]` usando a tecla `Tab`.
* **Como usar:** Habilite o módulo "Processador de Templates de Mensagens". Ao digitar na caixa de chat do Matrix Go, use seus modelos.
    * Para formatação de nome, use o placeholder `{CUSTOMER_NAME}` (ou o que estiver configurado).
    * Para seleção de variável, digite sua variável entre colchetes `[MINHA_VARIAVEL]`. Após digitar o colchete de fechamento, pressionar `Tab` deve selecionar o conteúdo dentro dos colchetes.

### IA: Resumo do Chat

* **O que faz:** Usa Inteligência Artificial para gerar um resumo conciso do histórico da conversa atual do cliente (protocolo).
* **Como usar:**
    1.  Habilite o módulo "IA: Resumir Atendimento" no popup do Omni Max (em "Configurações de IA").
    2.  Certifique-se de ter configurado um Provedor de IA e inserido a Chave de API/URL Base necessária (veja [Configurando Provedor de IA](#configurando-provedor-de-ia)).
    3.  Selecione um modelo de IA.
    4.  No Matrix Go, ao visualizar uma conversa ativa, um botão "Resumir com IA" (ou similar) deve aparecer próximo às ações do chat. Clique neste botão.
    5.  O resumo será gerado e exibido, geralmente em um popup ou área dedicada. O resumo também é armazenado em cache para a sessão atual.
* **Nota:** Esta funcionalidade requer uma chave de API válida para o provedor de IA selecionado (ex: OpenAI, Gemini, Groq, Anthropic) ou uma instância do Ollama em execução com uma URL Base especificada.

## Configurando o Omni Max

Você pode personalizar o Omni Max através do seu menu popup.

### Habilitar/Desabilitar Globalmente

* No topo do popup, há um interruptor principal. Isso permite que você habilite ou desabilite rapidamente todas as funcionalidades do Omni Max.
* O status ("Ativa" ou "Desativada") é exibido ao lado do interruptor.

### Habilitando/Desabilitando Módulos

O Omni Max é modular, o que significa que você pode ativar ou desativar funcionalidades específicas.

* **Módulos Gerais:** Contém funcionalidades como "Correção de Layout" e "Processador de Templates".
* **Atalhos de Teclado:** Permite habilitar/desabilitar todos os atalhos globalmente e, em seguida, alternar atalhos individuais como "Copiar Nome", "Copiar Número do Documento", etc.
* **Configurações de IA:** Permite habilitar/desabilitar todas as funções de IA globalmente e, em seguida, alternar módulos de IA individuais como "IA: Resumir Atendimento".

Cada módulo normalmente possui um interruptor ao lado do seu nome.

### Configurando Provedor de IA

Para usar as funcionalidades baseadas em IA, você precisa configurar um provedor de IA:

1.  Abra o popup do Omni Max e navegue para a seção "Configurações de IA".
2.  **Habilitar Funções de IA:** Certifique-se de que o interruptor principal para "Habilitar Todas as Funções de IA" está ativado.
3.  **Selecionar Provedor:** Escolha seu provedor de IA preferido na lista suspensa (ex: OpenAI, Google Gemini, Anthropic, Groq, Ollama).
4.  **Gerenciar Credenciais:**
    * Clique no botão "Gerenciar Credenciais ([Nome do Provedor])".
    * Um modal aparecerá solicitando:
        * **Chave de API (API Key):** Para provedores como OpenAI, Gemini, Anthropic, Groq. Você precisará obtê-la no site do respectivo provedor.
        * **URL Base:** Para provedores auto-hospedados como Ollama (ex: `http://localhost:11434`).
    * Insira sua credencial e clique em "OK".
    * A extensão fornece links para a documentação sobre como obter chaves de API para cada provedor.
5.  **Selecionar Modelo:** Uma vez que as credenciais estejam definidas e válidas, uma lista de modelos disponíveis para o provedor selecionado será carregada na lista suspensa "Modelo". Escolha o modelo que deseja usar. Se os modelos não carregarem, verifique sua Chave de API/URL Base e conexão com a internet.
6.  **Aplicar Alterações:** Clique no botão "Aplicar Alterações" na parte inferior do popup para salvar sua configuração de IA.

### Personalizando Prompts

Para funcionalidades de IA como "Resumo do Chat", você pode personalizar as instruções (prompts) dadas à IA.

1.  Abra o popup do Omni Max.
2.  Expanda a seção "Prompts Customizáveis".
3.  Você verá áreas de texto para diferentes funcionalidades de IA (ex: "Prompt de Resumo do Atendimento").
4.  Modifique o texto do prompt conforme desejado. Placeholders podem estar disponíveis (ex: para inserir o conteúdo do chat automaticamente - consulte os prompts padrão para exemplos).
5.  Clique em "Aplicar Alterações" para salvar.

### Personalizando Teclas de Atalho

Você pode alterar a letra usada para os atalhos Ctrl+Shift.

1.  Abra o popup do Omni Max.
2.  Expanda a seção "Atalhos de Teclado".
3.  Certifique-se de que "Habilitar Todos os Atalhos" está ativo e o módulo de atalho específico (ex: "Atalho: Copiar Nome do Cliente") também está habilitado.
4.  Ao lado de cada ação de atalho, há um campo de entrada mostrando a tecla atual (ex: "Z" para `Ctrl+Shift+Z`).
5.  Clique no campo de entrada e digite a nova letra única (A-Z) ou dígito (0-9) que você deseja usar para esse atalho.
6.  Clique em "Aplicar Alterações" para salvar.

## Solução de Problemas

* **Extensão não funciona:**
    * Certifique-se de que o Omni Max está habilitado em `chrome://extensions`.
    * Certifique-se de que o interruptor global no popup do Omni Max está "Ativa".
    * Verifique se o módulo específico que você deseja usar está habilitado no popup.
    * Recarregue a aba do Matrix Go após fazer alterações ou instalação inicial.
* **Funcionalidades de IA não funcionam / Erro "Modelos não carregando" / Erro de Chave de API:**
    * Verifique novamente se você inseriu a Chave de API ou URL Base correta para o seu provedor de IA selecionado na seção "Configurações de IA" do popup.
    * Certifique-se de que sua chave de API está ativa e possui créditos/cota suficientes com o provedor.
    * Para Ollama, certifique-se de que seu serviço Ollama está em execução e acessível na URL Base especificada.
    * Verifique sua conexão com a internet.
    * Tente salvar novamente suas credenciais e clicar em "Aplicar Alterações".
* **Atalhos não funcionam:**
    * Certifique-se de que "Habilitar Todos os Atalhos" está ativo no popup.
    * Certifique-se de que o módulo de atalho específico está habilitado.
    * Verifique conflitos com outras extensões do Chrome ou atalhos do sistema. Tente alterar a tecla no popup do Omni Max.

## Contato e Suporte

Se você encontrar bugs, tiver solicitações de funcionalidades ou precisar de ajuda:

* Por favor, verifique as [issues existentes no GitHub](https://github.com/DevDeividMoura/omni-max/issues).
* Se o seu problema não estiver listado, sinta-se à vontade para [abrir uma nova issue](https://github.com/DevDeividMoura/omni-max/issues/new).

---
Feito com ❤️ por [@DevDeividMoura](https://github.com/DevDeividMoura)