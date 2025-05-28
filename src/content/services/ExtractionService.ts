/**
 * src/content/services/ExtractionService.ts
 * This service is responsible for extracting specific pieces of information
 * (e.g., customer name, CPF/document number) from the DOM of the target platform (Matrix Go).
 * It uses DOM selectors and text markers defined in the configuration.
 */
import type { Config } from '../config';
import type { DomService } from './DomService';

export class ExtractionService {
  private config: Config;
  private dom: DomService;

  /**
   * Constructs an instance of the ExtractionService.
   * @param {Config} config The application configuration object containing selectors and text markers.
   * @param {DomService} domService An instance of the DomService for DOM interactions.
   */
  constructor(config: Config, domService: DomService) {
    this.config = config;
    this.dom = domService;
  }

  /**
   * Formats a string of numbers as a CPF (XXX.XXX.XXX-XX) or CNPJ (XX.XXX.XXX/XXXX-XX).
   * If the input string does not match the length of a CPF or CNPJ after removing non-digit characters,
   * it returns the original (cleaned) number string.
   *
   * @param {string} docNumber The document number string, possibly containing non-digit characters.
   * @returns {string} The formatted document number or the cleaned original if not a CPF/CNPJ length.
   */
  private formatDocumentNumber(docNumber: string): string {
    const justNumbers = docNumber.replace(/\D/g, ''); // Ensure only digits

    if (justNumbers.length === 11) { // CPF format
      return justNumbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (justNumbers.length === 14) { // CNPJ format
      return justNumbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

    console.warn(`Omni Max [ExtractionService]: Number "${justNumbers}" (from original "${docNumber}") does not match CPF or CNPJ length for formatting.`);
    return justNumbers; // Return cleaned numbers if not a standard CPF/CNPJ length
  }

  /**
   * Extracts the customer's document number (CPF or CNPJ) from the page.
   * It searches within the configured conversation container for an element matching
   * the CPF label selector and text marker.
   *
   * @returns {string | null} The formatted document number if found, otherwise null.
   */
  public extractDocumentNumber(): string | null {
    const conversaDiv = this.dom.query(this.config.selectors.conversaContainer);
    if (!conversaDiv) {
      console.warn("Omni Max [ExtractionService]: Conversation container not found. Cannot extract document number.");
      return null;
    }

    // Assumes cpfLabelElement points to the <small> tag, and the <strong> is inside it.
    const parentElements = this.dom.queryAll<HTMLElement>(this.config.selectors.cpfInfoContainer, conversaDiv);
    const cpfParentElement = parentElements.find(el => {
      const labelElement = el.querySelector(this.config.selectors.cpfLabelQueryInContainer); // The <strong> part
      return labelElement && this.dom.getTextSafely(labelElement) === this.config.textMarkers.cpfLabel;
    });

    if (cpfParentElement) {
      // Assumes the CPF value is the text content of the parent <small> tag, after the label.
      const fullText = this.dom.getTextSafely(cpfParentElement);
      let documentNumber = fullText.split(this.config.textMarkers.cpfLabel)[1]?.trim();

      if (documentNumber) {
        // TODO: Implement user-configurable CPF formatting (e.g., numbers only vs. formatted).
        // For now, always formats if it matches CPF/CNPJ length.
        documentNumber = this.formatDocumentNumber(documentNumber);
        console.log("Omni Max [ExtractionService]: Extracted Document Number:", documentNumber);
        return documentNumber;
      }
    }
    console.warn(`Omni Max [ExtractionService]: CPF Label "${this.config.textMarkers.cpfLabel}" not found or document number is missing.`);
    return null;
  }

  /**
   * Extracts the customer's name from the page.
   * This method relies on configured selectors and text markers to locate and parse the name.
   * The reliability of this method is highly dependent on the stability of the target page's DOM structure.
   *
   * @returns {string | null} The extracted customer name if found, otherwise null.
   */
  public extractCustomerName(): string | null {
    const conversaDiv = this.dom.query(this.config.selectors.conversaContainer);
    if (!conversaDiv) {
      console.warn("Omni Max [ExtractionService]: Conversation container not found. Cannot extract customer name.");
      return null;
    }

    // Find an element (e.g., <small>) that contains the customer name indicator text.
    const nameSourceElement = this.dom.queryAll<HTMLElement>(this.config.selectors.nameInfoContainer, conversaDiv).find(
      (el) => this.dom.getTextSafely(el).includes(this.config.textMarkers.customerNameIndicator || '---') // Fallback if indicator is undefined
    );

    if (nameSourceElement && this.config.textMarkers.customerNameIndicator && this.config.textMarkers.customerNameSeparator) {
      const fullText = this.dom.getTextSafely(nameSourceElement);
      // Split by indicator, then by separator. E.g., "Matrícula: 123 - John Doe"
      // 1. After "Matrícula: ", get " 123 - John Doe"
      // 2. After " - ", get "John Doe"
      const textAfterIndicator = fullText.split(this.config.textMarkers.customerNameIndicator)[1];
      if (textAfterIndicator) {
          const nameParts = textAfterIndicator.split(this.config.textMarkers.customerNameSeparator);
          if (nameParts.length > 1) {
              const name = nameParts[1].trim();
              if (name) {
                  console.log("Omni Max [ExtractionService]: Extracted Customer Name:", name);
                  return name;
              }
          }
      }
    }
    console.warn("Omni Max [ExtractionService]: Customer name could not be extracted. Check selectors and text markers.");
    return null;
  }
  /**
   * Extrai o número de telefone do cliente da página.
   * @returns O número de telefone como string, ou null se não encontrado.
   */
  public extractPhoneNumber(): string | null {
    const conversaDiv = this.dom.query(this.config.selectors.conversaContainer);
    if (!conversaDiv) {
      console.warn("Omni Max [ExtractionService]: Container da conversa não encontrado para Telefone.");
      return null;
    }

    const potentialContainers = this.dom.queryAll<HTMLElement>(this.config.selectors.phoneInfoContainer, conversaDiv);
    const targetContainer = potentialContainers.find(container => {
      const labelElement = this.dom.query(this.config.selectors.phoneLabelQueryInContainer, container);
      return labelElement && this.dom.getTextSafely(labelElement) === this.config.textMarkers.phoneLabel;
    });

    if (targetContainer) {
      const fullText = this.dom.getTextSafely(targetContainer);
      // Assume que o telefone é o texto após o label "Telefone:"
      let phoneNumber = fullText.split(this.config.textMarkers.phoneLabel)[1]?.trim();
      if (phoneNumber && phoneNumber.startsWith(':')) {
        phoneNumber = phoneNumber.substring(1).trim();
      }
      
      if (phoneNumber) {
        console.log("Omni Max [ExtractionService]: Telefone extraído:", phoneNumber);
        return phoneNumber.replace(/\D/g, ''); // Retorna apenas números por padrão, ou ajuste conforme necessário
      }
    }
    console.warn(`Omni Max [ExtractionService]: Label de Telefone "${this.config.textMarkers.phoneLabel}" ou valor não encontrados.`);
    return null;
  }

  /**
   * Extrai o número de protocolo do atendimento da página.
   * @returns O número de protocolo como string, ou null se não encontrado.
   */
  public extractProtocolNumber(): string | null {
    const conversaDiv = this.dom.query(this.config.selectors.conversaContainer);
    if (!conversaDiv) {
      console.warn("Omni Max [ExtractionService]: Container da conversa não encontrado para Protocolo.");
      return null;
    }

    const potentialContainers = this.dom.queryAll<HTMLElement>(this.config.selectors.protocolInfoContainer, conversaDiv);
    const targetContainer = potentialContainers.find(container => {
      const labelElement = this.dom.query(this.config.selectors.protocolLabelQueryInContainer, container);
      return labelElement && this.dom.getTextSafely(labelElement) === this.config.textMarkers.protocolLabel;
    });

    if (targetContainer) {
      const fullText = this.dom.getTextSafely(targetContainer);
      let protocolNumber = fullText.split(this.config.textMarkers.protocolLabel)[1]?.trim();
       if (protocolNumber && protocolNumber.startsWith(':')) {
        protocolNumber = protocolNumber.substring(1).trim();
      }

      if (protocolNumber) {
        console.log("Omni Max [ExtractionService]: Protocolo extraído:", protocolNumber);
        return protocolNumber.replace(/\D/g, ''); // Retorna apenas números por padrão
      }
    }
    console.warn(`Omni Max [ExtractionService]: Label de Protocolo "${this.config.textMarkers.protocolLabel}" ou valor não encontrados.`);
    return null;
  }
}