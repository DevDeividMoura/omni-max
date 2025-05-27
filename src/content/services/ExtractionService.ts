/**
 * src/content/services/ExtractionService.ts
 * Responsável por extrair informações específicas do DOM da plataforma Matrix Go.
 */
import type { Config } from '../config';
import type { DomService } from './DomService';

export class ExtractionService {
  private config: Config;
  private dom: DomService;

  constructor(config: Config, domService: DomService) {
    this.config = config;
    this.dom = domService;
  }

  /**
 * Formata uma string de números como CPF (XXX.XXX.XXX-XX) ou CNPJ (XX.XXX.XXX/XXXX-XX).
 * @param docNumber String contendo apenas os dígitos do documento.
 * @returns O número do documento formatado, ou a string original se não for CPF/CNPJ válido.
 */
  private formatDocumentNumber(docNumber: string): string {
    const justNumbers = docNumber.replace(/\D/g, ''); // Garante que temos apenas números

    if (justNumbers.length === 11) { // Formato CPF
      return justNumbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (justNumbers.length === 14) { // Formato CNPJ
      return justNumbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

    // Se não for CPF nem CNPJ pelo comprimento, retorna o número limpo (ou original, como preferir)
    console.warn(`Omni Max [ExtractionService]: Número "${justNumbers}" não parece ser CPF ou CNPJ válido para formatação.`);
    return docNumber; // Retorna o original (que já foi limpo de não dígitos se docNumber veio assim)
  }

  /**
   * Extrai o CPF do cliente da página.
   * @returns O CPF formatado ou null se não encontrado.
   */
  public extractDocumentNumber(): string | null {
    const conversaDiv = this.dom.query(this.config.selectors.conversaContainer);
    if (!conversaDiv) {
      console.warn("Omni Max [ExtractionService]: Container da conversa não encontrado para CPF.");
      return null;
    }

    const parentElements = this.dom.queryAll(this.config.selectors.cpfLabelElement.split(' > ')[0], conversaDiv);
    const cpfParentElement = parentElements.find(el => {
      const labelElement = el.querySelector(this.config.selectors.cpfLabelElement.split(' > ')[1]);
      return labelElement && this.dom.getTextSafely(labelElement) === this.config.textMarkers.cpfLabel;
    });

    if (cpfParentElement) {
      const fullText = this.dom.getTextSafely(cpfParentElement);
      const cpfText = fullText.split(':')[1]?.trim();
      if (cpfText) {
        // TODO: Adicionar lógica de formatação do CPF aqui, baseada em configuração salva em chrome.storage.sync
        // Por exemplo: const settings = await chrome.storage.sync.get('omniMaxCpfFormatting');
        // if (settings.omniMaxCpfFormatting === 'numbersOnly') return cpfText.replace(/\D/g, '');
        const documentNumber = this.formatDocumentNumber(cpfText);
        console.log("Omni Max [ExtractionService]: Numero do Documento extraído:", documentNumber);
        return documentNumber;
      }
    }
    console.warn(`Omni Max [ExtractionService]: Label de CPF "${this.config.textMarkers.cpfLabel}" não encontrada ou CPF ausente.`);
    return null;
  }

  /**
   * Extrai o nome do cliente da página.
   * (Adaptado da sua lógica original, precisa de seletores robustos)
   * @returns O nome do cliente ou null se não encontrado.
   */
  public extractCustomerName(): string | null {
    const conversaDiv = this.dom.query(this.config.selectors.conversaContainer);
    if (!conversaDiv) {
      console.warn("Omni Max [ExtractionService]: Container da conversa não encontrado para Nome.");
      return null;
    }

    const nameSourceElement = this.dom.queryAll(this.config.selectors.nameLabelElement, conversaDiv).find(
      (el) => this.dom.getTextSafely(el).includes(this.config.textMarkers.customerNameIndicator || 'Matrícula:')
    );

    if (nameSourceElement) {
      const fullText = this.dom.getTextSafely(nameSourceElement);
      const parts = fullText.split(this.config.textMarkers.customerNameSeparator || ' - ');
      if (parts.length > 1) {
        const name = parts[1].trim();
        if (name) {
          console.log("Omni Max [ExtractionService]: Nome extraído:", name);
          return name;
        }
      }
    }
    console.warn("Omni Max [ExtractionService]: Nome do cliente não pôde ser extraído.");
    return null;
  }
}