# Política de Privacidade do Omni Max

<div align="center">

[English](./PRIVACY_POLICY.md) · Português · [Español](./PRIVACY_POLICY.es.md)

</div>

---

**Última Atualização:** 25 de junho de 2025

Esta Política de Privacidade descreve como o Omni Max ("nós" ou "nosso") trata suas informações quando você utiliza nossa extensão de navegador. Nosso princípio fundamental é proteger sua privacidade e processar o mínimo de dados possível. O Omni Max foi projetado para operar localmente em sua máquina.

## 1. Informações que Coletamos e Armazenamos

O Omni Max armazena todos os seus dados localmente em seu computador, utilizando os mecanismos de armazenamento integrados do seu navegador (`chrome.storage.sync`, `chrome.storage.local` e `IndexedDB`). Nós **não** possuímos um servidor e **não** coletamos, transmitimos ou visualizamos suas informações pessoais.

Os dados armazenados localmente pela extensão incluem:

* **Configurações:** Suas preferências para habilitar/desabilitar módulos, teclas de atalho e correções de layout.
* **Credenciais do Provedor de IA:** Suas chaves de API (ex: para OpenAI, Google Gemini) e URLs Base (ex: para Ollama). Esta informação é armazenada localmente e usada apenas para comunicar-se diretamente do seu navegador com o provedor de IA que você selecionou. **Essas chaves nunca são enviadas para nós ou para qualquer outro terceiro.**
* **Personas de IA:** As personas personalizadas que você cria, incluindo seus nomes, descrições e prompts de sistema.
* **Documentos da Base de Conhecimento:** O conteúdo dos documentos que você adiciona à sua base de conhecimento local. Estes dados são convertidos em representações numéricas (embeddings) e armazenados no IndexedDB do seu navegador para que a IA possa realizar buscas.
* **Estado da Conversa do Agente:** O histórico de suas interações com o assistente de IA do Omni Max é salvo localmente no IndexedDB do seu navegador para fornecer memória de conversação para cada sessão de atendimento ao cliente.

## 2. Como Usamos Suas Informações

As informações armazenadas localmente são usadas exclusivamente para fornecer as funcionalidades da extensão:

* **Chaves de API/URLs:** Usadas para fazer requisições diretamente ao serviço de IA de terceiros que você configurou (ex: OpenAI, Google Gemini, Ollama). Suas interações com esses serviços estão sujeitas às suas respectivas políticas de privacidade.
* **Conteúdo da Base de Conhecimento:** Usado localmente pelo agente para encontrar informações relevantes e fornecer respostas contextualmente cientes às suas perguntas.
* **Configurações e Personas:** Usadas para personalizar o comportamento da extensão de acordo com suas preferências.

## 3. Compartilhamento e Divulgação de Informações

Nós não compartilhamos, vendemos ou divulgamos nenhum dos seus dados com ninguém. Como todos os dados são armazenados localmente em seu dispositivo, você está no controle total. A única comunicação externa iniciada pela extensão é entre o seu navegador e o provedor de IA que você configurou explicitamente.

## 4. Segurança dos Dados

Nós confiamos nos mecanismos de segurança do armazenamento local do seu navegador (`chrome.storage` e `IndexedDB`) para proteger as informações armazenadas em seu dispositivo.

## 5. Alterações a Esta Política de Privacidade

Podemos atualizar esta Política de Privacidade de tempos em tempos. Notificaremos você sobre quaisquer alterações publicando a nova Política de Privacidade nesta página e atualizando a data da "Última Atualização". Aconselha-se que você revise esta Política de Privacidade periodicamente para quaisquer alterações.

## 6. Contato

Se você tiver alguma dúvida sobre esta Política de Privacidade, por favor, abra uma issue em nosso repositório do GitHub:
[https://github.com/DevDeividMoura/omni-max/issues](https://github.com/DevDeividMoura/omni-max/issues)