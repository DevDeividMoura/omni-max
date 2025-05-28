/**
 * src/content/config.ts
 * Provides static configurations for the Omni Max content script.
 * This includes DOM selectors for interacting with the target platform (Matrix Go)
 * and text markers used for identifying specific data elements.
 */

/**
 * Defines the structure for content script configurations.
 */
export interface Config {
  /**
   * CSS selectors for identifying key DOM elements on the Matrix Go platform.
   */
  selectors: {
    /** Selector for the main chat conversation container. */
    conversaContainer: string;
    /** Selector for the editable chatbox input field. */
    editableChatbox: string;
    /**
     * Selector for an element that is a reliable ancestor or direct identifier
     * for the customer's CPF label. Example: 'small > strong' if 'CPF Cliente:' is in a <strong>
     * inside a <small> tag that also contains the CPF value.
     */
    cpfInfoContainer: string;
    /**
     * Selector for an element that is a reliable ancestor or direct identifier
     * for the customer's CPF label, used in a container that may include other elements.
     * Example: 'small > strong' if the CPF label is in a <strong> inside a <small> tag.
     * This is used to ensure the CPF label can be found even if the structure changes.
     */
    cpfLabelQueryInContainer: string;
    /**
     * Selector for an element that is a reliable ancestor or direct identifier
     * for the customer's name label.
     */
    nameInfoContainer: string;
    /**
     * Selector for an element that is a reliable ancestor or direct identifier
     * for the customer's phone number information.
     */
    phoneInfoContainer: string;

    /**
     * Selector for an element that is a reliable ancestor or direct identifier
     * for the customer's phone number label, used in a container that may include other elements.
     */
    phoneLabelQueryInContainer: string;
    /**
     * Selector for an element that is a reliable ancestor or direct identifier
     * for the customer's protocol information.
     */
    protocolInfoContainer: string;
    /**
     * Selector for an element that is a reliable ancestor or direct identifier
     * for the customer's protocol label, used in a container that may include other elements.
     */
    protocolLabelQueryInContainer: string;
    /**
     * Optional selector for the list of tabs/conversations,
     * primarily used for layout correction adjustments.
     */
    tabsList?: string;
  };
  /**
   * Text markers used to locate specific pieces of information within text content
   * when DOM structure alone isn't sufficient or is too volatile.
   */
  textMarkers: {
    /** The exact text label that precedes the customer's CPF/document number. */
    cpfLabel: string;
    /**
     * Optional text indicator that often precedes the customer's name
     * (e.g., 'Matrícula:'). Used if the name is part of a larger text block.
     */
    customerNameIndicator?: string;
    /**
     * Optional separator used in conjunction with `customerNameIndicator`
     * to isolate the customer's name (e.g., ' - ' in "Matrícula: 123 - John Doe").
     */
    customerNameSeparator?: string;
    /** The exact text label that precedes the customer's phone number. */
    phoneLabel: string;
    /** The exact text label that precedes the customer's protocol number. */
    protocolLabel: string;
  };
}

/**
 * Static configuration object for the content script.
 * It is frozen to prevent accidental modifications at runtime.
 */
export const CONFIG: Config = Object.freeze({
  selectors: {
    conversaContainer: '.tab-pane.active .conversa.col-lg-12',
    editableChatbox: "#Abas .tab-pane.active .faketextbox.pastable[contenteditable='true']",
    cpfInfoContainer: 'small',
    cpfLabelQueryInContainer: 'strong', 
    nameInfoContainer: 'small',
    phoneInfoContainer: 'small',
    phoneLabelQueryInContainer: 'strong',
    protocolInfoContainer: 'small',
    protocolLabelQueryInContainer: 'strong',
    tabsList: '#tabs',
  },
  textMarkers: {
    cpfLabel: 'CPF Cliente:',
    customerNameIndicator: 'Matrícula:',
    customerNameSeparator: ' - ',
    phoneLabel: 'Telefone:',
    protocolLabel: 'Número de protocolo:',
  },
});