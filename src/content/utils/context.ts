// src/content/utils/context.ts
import type { DomService } from '../services/DomService';
import type { ActiveChatContext } from '../types';

/**
 * Gets the context (protocol, attendance, contact IDs) from the currently active chat tab.
 * @param {DomService} domService - An instance of the DomService.
 * @returns {ActiveChatContext | null} The context of the active chat, or null if not found.
 */
export function getActiveTabChatContext(domService: DomService): ActiveChatContext | null {
    const activeTabLinkElement = domService.query<HTMLAnchorElement>('ul#tabs li.active a');
    if (activeTabLinkElement) {
        const protocolNumber = activeTabLinkElement.dataset.protocolo;
        const attendanceId = activeTabLinkElement.dataset.atendimento;
        const contactId = activeTabLinkElement.dataset.contato;

        const panelElement = attendanceId ? domService.query<HTMLElement>(`#aba_${attendanceId}`) : null;

        if (protocolNumber && attendanceId && contactId) {
            return {
                protocolNumber,
                attendanceId,
                contactId,
                panelElement: panelElement || undefined
            };
        }
    }
    return null;
}