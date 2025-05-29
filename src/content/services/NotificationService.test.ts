/**
 * @file src/content/services/NotificationService.test.ts
 * @description Unit tests for the NotificationService class.
 * These tests verify the service's ability to create, display, animate, and remove
 * toast notifications, assuming it uses an injected DomService for DOM manipulations.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationService } from './NotificationService';
import { DomService } from './DomService'; // Actual class import for `vi.mock` to target

// --- Constants for Style Verification ---
// These are based on the expected styles applied by NotificationService.
// `expect.any(String)` is used for fontFamily due to potential variations.
const EXPECTED_BASE_TOAST_STYLES: Partial<CSSStyleDeclaration> = {
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

const EXPECTED_TOAST_TYPE_COLORS: Record<string, string> = {
  success: '#2ecc71',
  warning: '#f39c12',
  error: '#e74c3c',
};

// --- Mock for DomService and its instance ---
// This mockElement will be returned by the mocked `createElementWithOptions`.
const mockToastElement = document.createElement('div');
// Spy on the remove method of this specific mock element.
vi.spyOn(mockToastElement, 'remove');

const mockDomServiceInstance = {
  createElementWithOptions: vi.fn(),
  applyStyles: vi.fn(),
  waitNextFrame: vi.fn().mockResolvedValue(undefined), // Default: simulate frame passage
};

// Mock the entire DomService module.
// Any `new DomService()` will now use this mock constructor.
vi.mock('./DomService', () => ({
  DomService: vi.fn(() => mockDomServiceInstance),
}));

/**
 * Test suite for NotificationService, assuming it uses a mocked DomService.
 */
describe('NotificationService (with mocked DomService)', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    // Reset all mocks to ensure a clean state for each test.
    // This includes call history and mock implementations.
    vi.resetAllMocks();

    // Clear spy calls on mockToastElement.remove, as it's a persistent object.
    vi.mocked(mockToastElement.remove).mockClear();

    // Re-apply default mock implementations needed for NotificationService.
    mockDomServiceInstance.createElementWithOptions.mockReturnValue(mockToastElement);
    mockDomServiceInstance.waitNextFrame.mockResolvedValue(undefined);

    // Create a new NotificationService instance for each test.
    // It will be injected with the mockDomServiceInstance due to `vi.mock`.
    const domServiceInjected = new DomService(); // This call returns `mockDomServiceInstance`.
    notificationService = new NotificationService(domServiceInjected);

    // Use fake timers to control setTimeout calls within NotificationService.
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Run any pending timers and restore real timers.
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    // `vi.resetAllMocks()` in the next `beforeEach` handles general mock cleanup.
  });

  /**
   * Test case for the entire lifecycle of a success toast with default parameters.
   * Verifies creation, animation, and removal through DomService interactions.
   */
  it('should create, animate, and remove a success toast with default duration', async () => {
    const message = 'Test Success!';
    notificationService.showToast(message); // Default type: 'success', duration: 3000ms

    // 1. Verify element creation via DomService
    expect(mockDomServiceInstance.createElementWithOptions).toHaveBeenCalledOnce();
    const createArgs = mockDomServiceInstance.createElementWithOptions.mock.calls[0];
    expect(createArgs[0]).toBe('div'); // Tag name
    expect(createArgs[1]?.textContent).toBe(message);
    expect(createArgs[1]?.parent).toBe(document.body); // Assuming it appends to body
    expect(createArgs[1]?.styles).toMatchObject({
      ...EXPECTED_BASE_TOAST_STYLES,
      backgroundColor: EXPECTED_TOAST_TYPE_COLORS.success,
      opacity: '0', // Initial state before fade-in
      transform: 'translateY(20px)',
    });

    // 2. Verify waitNextFrame is called before fade-in animation
    expect(mockDomServiceInstance.waitNextFrame).toHaveBeenCalledOnce();

    // 3. Verify fade-in animation styles are applied
    // `waitNextFrame`'s promise needs to resolve for this to be called.
    await vi.waitFor(() => {
      expect(mockDomServiceInstance.applyStyles).toHaveBeenCalledWith(
        mockToastElement,
        { opacity: '1', transform: 'translateY(0)' }
      );
    });

    // 4. Advance timers for toast visibility duration (default 3000ms)
    vi.advanceTimersByTime(3000);

    // 5. Verify fade-out animation styles are applied
    expect(mockDomServiceInstance.applyStyles).toHaveBeenCalledWith(
      mockToastElement,
      { opacity: '0', transform: 'translateY(20px)' }
    );

    // 6. Advance timers for fade-out animation duration (300ms)
    vi.advanceTimersByTime(300);
    expect(mockToastElement.remove).toHaveBeenCalledOnce();
  });

  /**
   * Test case for a warning toast with a specified duration.
   * Verifies correct type-based styling and duration handling.
   */
  it('should create a warning toast with specified duration and correct styling', async () => {
    const message = 'Test Warning Message';
    const duration = 1500;
    notificationService.showToast(message, 'warning', duration);

    expect(mockDomServiceInstance.createElementWithOptions).toHaveBeenCalledOnce();
    const createArgs = mockDomServiceInstance.createElementWithOptions.mock.calls[0];
    expect(createArgs[1]?.styles?.backgroundColor).toBe(EXPECTED_TOAST_TYPE_COLORS.warning);

    await vi.waitFor(() => { // Wait for fade-in
      expect(mockDomServiceInstance.applyStyles).toHaveBeenCalledWith(mockToastElement, { opacity: '1', transform: 'translateY(0)' });
    });
    
    vi.advanceTimersByTime(duration); // Specified duration
    expect(mockDomServiceInstance.applyStyles).toHaveBeenCalledWith(mockToastElement, { opacity: '0', transform: 'translateY(20px)' });

    vi.advanceTimersByTime(300); // Fade-out duration
    expect(mockToastElement.remove).toHaveBeenCalledOnce();
  });

  /**
   * Verifies that an error toast is created with the correct error-type styling.
   * Focuses on the creation aspect, as the animation/removal lifecycle is similar to other types.
   */
  it('should create an error toast with error-specific styling', () => {
    notificationService.showToast('Test Error Occurred', 'error');
    expect(mockDomServiceInstance.createElementWithOptions).toHaveBeenCalledOnce();
    const createArgs = mockDomServiceInstance.createElementWithOptions.mock.calls[0];
    expect(createArgs[1]?.styles?.backgroundColor).toBe(EXPECTED_TOAST_TYPE_COLORS.error);
  });

  /**
   * Tests the fallback behavior for an unknown toast type.
   * Expects it to default to 'success' styling.
   */
  it('should use success color styling for an unknown toast type', () => {
    // @ts-expect-error: Intentionally testing an invalid type.
    notificationService.showToast('Unknown Type Toast', 'information');
    expect(mockDomServiceInstance.createElementWithOptions).toHaveBeenCalledOnce();
    const createArgs = mockDomServiceInstance.createElementWithOptions.mock.calls[0];
    // Assumes NotificationService defaults to 'success' color if type is unrecognized.
    expect(createArgs[1]?.styles?.backgroundColor).toBe(EXPECTED_TOAST_TYPE_COLORS.success);
  });
});