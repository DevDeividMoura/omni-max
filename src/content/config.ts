/**
 * src/content/config.ts
 * Configurações estáticas para o content script do Omni Max,
 * como seletores DOM e marcadores de texto.
 */

export interface Config {
  selectors: {
    conversaContainer: string;
    editableChatbox: string;
    cpfLabelElement: string; 
    nameLabelElement: string;
    tabsList?: string; 
  };
  textMarkers: {
    cpfLabel: string;
    customerNameIndicator?: string; 
    customerNameSeparator?: string; 
  };
}

export const CONFIG: Config = Object.freeze({
  selectors: {
    conversaContainer: '.tab-pane.active .conversa.col-lg-12',
    editableChatbox: "#Abas .tab-pane.active .faketextbox.pastable[contenteditable='true']",
    cpfLabelElement: 'small > strong',
    nameLabelElement: 'small', 
    tabsList: '#tabs', 
  },
  textMarkers: {
    cpfLabel: 'CPF Cliente:',
    customerNameIndicator: 'Matrícula:', 
    customerNameSeparator: ' - ',       
  },
});