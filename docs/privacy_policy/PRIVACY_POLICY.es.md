# Política de Privacidad de Omni Max

<div align="center">

[English](./PRIVACY_POLICY.md) · [Português](./PRIVACY_POLICY.pt-BR.md) · Español

</div>

---

**Última Actualización:** 25 de junio de 2025

Esta Política de Privacidad describe cómo Omni Max ("nosotros" o "nuestro") maneja su información cuando usted utiliza nuestra extensión de navegador. Nuestro principio fundamental es proteger su privacidad y procesar la menor cantidad de datos posible. Omni Max está diseñado para operar localmente en su máquina.

## 1. Información que Recopilamos y Almacenamos

Omni Max almacena todos sus datos localmente en su ordenador, utilizando los mecanismos de almacenamiento integrados de su navegador (`chrome.storage.sync`, `chrome.storage.local` e `IndexedDB`). **No** tenemos un servidor y **no** recopilamos, transmitimos ni vemos su información personal.

Los datos almacenados localmente por la extensión incluyen:

* **Ajustes de Configuración:** Sus preferencias para habilitar/deshabilitar módulos, teclas de atajo y correcciones de diseño.
* **Credenciales del Proveedor de IA:** Sus claves de API (p. ej., para OpenAI, Google Gemini) y URL Base (p. ej., para Ollama). Esta información se almacena localmente y solo se utiliza para comunicarse directamente desde su navegador con el proveedor de IA que usted ha seleccionado. **Estas claves nunca se nos envían a nosotros ni a ningún otro tercero.**
* **Personas de IA:** Las personas personalizadas que usted crea, incluyendo sus nombres, descripciones y prompts del sistema.
* **Documentos de la Base de Conocimiento:** El contenido de los documentos que usted añade a su base de conocimiento local. Estos datos se convierten en representaciones numéricas (embeddings) y se almacenan en el IndexedDB de su navegador para que la IA pueda realizar búsquedas.
* **Estado de la Conversación del Agente:** El historial de sus interacciones con el asistente de IA de Omni Max se guarda localmente en el IndexedDB de su navegador para proporcionar memoria de conversación para cada sesión de servicio al cliente.

## 2. Cómo Usamos Su Información

La información almacenada localmente se utiliza exclusivamente para proporcionar las funcionalidades de la extensión:

* **Claves de API/URLs:** Se utilizan para realizar solicitudes directamente al servicio de IA de terceros que usted ha configurado (p. ej., OpenAI, Google Gemini, Ollama). Sus interacciones con estos servicios están sujetas a sus respectivas políticas de privacidad.
* **Contenido de la Base de Conocimiento:** Utilizado localmente por el agente para encontrar información relevante y proporcionar respuestas contextualmente conscientes a sus consultas.
* **Ajustes y Personas:** Se utilizan para personalizar el comportamiento de la extensión según sus preferencias.

## 3. Uso Compartido y Divulgación de Información

No compartimos, vendemos ni divulgamos ninguno de sus datos con nadie. Dado que todos los datos se almacenan localmente en su dispositivo, usted tiene el control total. La única comunicación externa iniciada por la extensión es entre su navegador y el proveedor de IA que usted ha configurado explícitamente.

## 4. Seguridad de los Datos

Confiamos en los mecanismos de seguridad del almacenamiento local de su navegador (`chrome.storage` e `IndexedDB`) para proteger la información almacenada en su dispositivo.

## 5. Cambios en Esta Política de Privacidad

Podemos actualizar esta Política de Privacidad de vez en cuando. Le notificaremos cualquier cambio publicando la nueva Política de Privacidad en esta página y actualizando la fecha de "Última Actualización". Se le aconseja que revise esta Política de Privacidad periódicamente para detectar cualquier cambio.

## 6. Contacto

Si tiene alguna pregunta sobre esta Política de Privacidad, por favor, abra un issue en nuestro repositorio de GitHub:
[https://github.com/DevDeividMoura/omni-max/issues](https://github.com/DevDeividMoura/omni-max/issues)