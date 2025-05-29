/**
 * @file src/content/services/NotificationService.test.ts
 * @description Unit tests for the NotificationService class.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationService } from './NotificationService';
import { DomService } from './DomService'; // Importa a classe real para que o vi.mock funcione corretamente

// --- Constantes de Estilo e Cores ---
const toastBaseStylesFromNotificationService: Partial<CSSStyleDeclaration> = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '6px',
    color: 'white',
    zIndex: '2147483647',
    fontFamily: expect.any(String),
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};

const toastTypeColors: Record<string, string> = {
    success: '#2ecc71',
    warning: '#f39c12',
    error: '#e74c3c',
};

// --- Mock da DomService ---
const mockToastElement = document.createElement('div'); // Elemento mock que será "criado"
// Adicionamos um spy no método remove DESTE elemento específico
vi.spyOn(mockToastElement, 'remove');

const mockDomServiceInstance = {
    createElementWithOptions: vi.fn().mockReturnValue(mockToastElement),
    applyStyles: vi.fn(),
    waitNextFrame: vi.fn().mockResolvedValue(undefined), // Simula que o frame passou
    // Adicione outros métodos da DomService que NotificationService possa usar
};

// Mocka o módulo DomService. Todas as instâncias de DomService usarão este mock.
vi.mock('./DomService', () => {
    // O construtor mockado da DomService deve retornar nossa instância mockada
    return {
        DomService: vi.fn(() => mockDomServiceInstance),
    };
});

describe('NotificationService (with mocked DomService)', () => {
    let notificationService: NotificationService;
    // Não precisamos mais de appendChildSpy nem rafSpy aqui, pois DomService é mockada

    beforeEach(() => {
        // Limpa todos os mocks ANTES de cada teste para garantir um estado limpo
        vi.resetAllMocks();

        // Configura o mock de createElementWithOptions para retornar o mockToastElement limpo
        // (seu spy de 'remove' também será resetado por resetAllMocks se o elemento for recriado,
        // mas como mockToastElement é global ao describe, seu spy é persistente a menos que recriado)
        // Se mockToastElement.remove foi chamado em um teste anterior, seu spy terá chamadas.
        // Para garantir que 'remove' esteja limpo para cada teste:
        vi.spyOn(mockToastElement, 'remove').mockClear(); // Limpa chamadas do spy de remove
        mockDomServiceInstance.createElementWithOptions.mockReturnValue(mockToastElement);
        mockDomServiceInstance.waitNextFrame.mockResolvedValue(undefined);


        // Cria uma instância de NotificationService.
        // O construtor de DomService (importado) é mockado para retornar mockDomServiceInstance.
        // Portanto, `new DomService()` dentro do construtor de NotificationService
        // (ou se passado como argumento) usará o mock.
        const domServiceInjected = new DomService(); // Isso vai retornar mockDomServiceInstance
        notificationService = new NotificationService(domServiceInjected);

        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers(); // Executa timers pendentes
        vi.useRealTimers();     // Restaura timers reais
        // vi.restoreAllMocks(); // Já chamado implicitamente por resetAllMocks no beforeEach do próximo teste
                               // ou no vitest-setup.ts. Se não, adicione aqui.
    });

    it('should create, animate, and remove a success toast with default duration', async () => {
        const message = 'Success!';
        notificationService.showToast(message); // type 'success' e duration 3000 por padrão

        // 1. Verifica DomService.createElementWithOptions
        expect(mockDomServiceInstance.createElementWithOptions).toHaveBeenCalledOnce();
        const createElementArgs = mockDomServiceInstance.createElementWithOptions.mock.calls[0];
        expect(createElementArgs[0]).toBe('div');
        expect(createElementArgs[1]?.textContent).toBe(message);
        expect(createElementArgs[1]?.parent).toBe(document.body);
        expect(createElementArgs[1]?.styles).toMatchObject({
            ...toastBaseStylesFromNotificationService,
            backgroundColor: toastTypeColors.success,
            opacity: '0',
            transform: 'translateY(20px)',
        });

        // 2. Verifica waitNextFrame
        expect(mockDomServiceInstance.waitNextFrame).toHaveBeenCalledOnce();

        // 3. Verifica applyStyles para animar a entrada
        // Como waitNextFrame mockado resolve imediatamente (ou quase), applyStyles deve ser chamado.
        // A primeira chamada a applyStyles pode ser DENTRO de createElementWithOptions se você configurou assim.
        // A segunda chamada é para a animação de entrada.
        // Vamos verificar a chamada específica da animação de entrada.
        await vi.waitFor(() => { // Espera a promise do waitNextFrame e a subsequente applyStyles
            expect(mockDomServiceInstance.applyStyles).toHaveBeenCalledWith(mockToastElement, {
                opacity: '1',
                transform: 'translateY(0)', // JSDOM pode adicionar 'px'
            });
        });

        // Contagem total de chamadas para applyStyles pode variar.
        // Se createElementWithOptions chama applyStyles:
        // 1. Chamada dentro de createElementWithOptions (para estilos iniciais/base)
        // 2. Chamada para animação de entrada
        // 3. Chamada para animação de saída
        // Verifique o número exato de chamadas se for importante, ou foque nos argumentos das chamadas específicas.
        const fadeInStylesCall = mockDomServiceInstance.applyStyles.mock.calls.find(call => call[1].opacity === '1');
        expect(fadeInStylesCall).toBeDefined();
        expect(fadeInStylesCall?.[1]).toEqual({ opacity: '1', transform: 'translateY(0)' });


        // 4. Avança timer para duração do toast
        vi.advanceTimersByTime(3000);
        const fadeOutStylesCall = mockDomServiceInstance.applyStyles.mock.calls.find(call => call[1].opacity === '0' && call[0] === mockToastElement);
        expect(fadeOutStylesCall).toBeDefined();
        expect(fadeOutStylesCall?.[1]).toEqual({
            opacity: '0',
            transform: 'translateY(20px)',
        });

        // 5. Avança timer para animação de saída
        vi.advanceTimersByTime(300);
        expect(mockToastElement.remove).toHaveBeenCalledOnce();
    });

    it('should create a warning toast with specified duration', async () => {
        const message = 'Warning message';
        const duration = 1000;
        notificationService.showToast(message, 'warning', duration);

        expect(mockDomServiceInstance.createElementWithOptions).toHaveBeenCalledOnce();
        const createElementArgs = mockDomServiceInstance.createElementWithOptions.mock.calls[0];
        expect(createElementArgs[1]?.styles?.backgroundColor).toBe(toastTypeColors.warning);

        // Animação de entrada
        await vi.waitFor(() => {
            expect(mockDomServiceInstance.applyStyles).toHaveBeenCalledWith(mockToastElement, {
                opacity: '1',
                transform: 'translateY(0)',
            });
        });
        
        vi.advanceTimersByTime(duration); // Duração especificada
        // Animação de saída
        expect(mockDomServiceInstance.applyStyles).toHaveBeenCalledWith(mockToastElement, {
            opacity: '0',
            transform: 'translateY(20px)',
        });

        vi.advanceTimersByTime(300); // Fade-out
        expect(mockToastElement.remove).toHaveBeenCalledOnce();
    });

    it('should create an error toast', () => {
        notificationService.showToast('Error occurred', 'error');
        expect(mockDomServiceInstance.createElementWithOptions).toHaveBeenCalledOnce();
        const createElementArgs = mockDomServiceInstance.createElementWithOptions.mock.calls[0];
        expect(createElementArgs[1]?.styles?.backgroundColor).toBe(toastTypeColors.error);
    });

    it('should use success color for unknown type', () => {
        // @ts-expect-error: Testando um tipo inválido intencionalmente
        notificationService.showToast('Unknown type toast', 'info');
        expect(mockDomServiceInstance.createElementWithOptions).toHaveBeenCalledOnce();
        const createElementArgs = mockDomServiceInstance.createElementWithOptions.mock.calls[0];
        expect(createElementArgs[1]?.styles?.backgroundColor).toBe(toastTypeColors.success); // Fallback
    });
});