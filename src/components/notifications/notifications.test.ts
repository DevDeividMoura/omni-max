// src/components/notifications/notifications.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { notifications, addNotification, removeNotification } from './notifications';

describe('notifications store', () => {
  // Limpa o store após cada teste para garantir isolamento
  afterEach(() => {
    notifications.set([]);
  });

  it('should start with an empty array', () => {
    expect(get(notifications)).toEqual([]);
  });

  it('addNotification should add a new notification to the store', () => {
    const message = 'Test Success';
    addNotification(message, 'success', 5000);

    const currentNotifications = get(notifications);
    expect(currentNotifications.length).toBe(1);
    expect(currentNotifications[0].message).toBe(message);
    expect(currentNotifications[0].type).toBe('success');
    expect(currentNotifications[0].duration).toBe(5000);
    expect(currentNotifications[0]).toHaveProperty('id');
  });

  it('addNotification should use default values for type and duration', () => {
    const message = 'Default Notification';
    addNotification(message);

    const currentNotifications = get(notifications);
    expect(currentNotifications.length).toBe(1);
    expect(currentNotifications[0].message).toBe(message);
    expect(currentNotifications[0].type).toBe('success'); // Default type
    expect(currentNotifications[0].duration).toBe(3000);  // Default duration
  });

  it('removeNotification should remove a notification by its id', () => {
    // Adiciona duas notificações
    addNotification('First');
    addNotification('Second');

    let currentNotifications = get(notifications);
    expect(currentNotifications.length).toBe(2);

    const idToRemove = currentNotifications[0].id;
    removeNotification(idToRemove);

    currentNotifications = get(notifications);
    expect(currentNotifications.length).toBe(1);
    expect(currentNotifications.find(n => n.id === idToRemove)).toBeUndefined();
    expect(currentNotifications[0].message).toBe('Second');
  });

  it('removeNotification should not fail when removing a non-existent id', () => {
    addNotification('Existing Notification');
    
    removeNotification(999); // ID não existente

    const currentNotifications = get(notifications);
    expect(currentNotifications.length).toBe(1); // O array deve permanecer inalterado
  });
});