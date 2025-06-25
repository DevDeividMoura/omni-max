import { writable } from 'svelte/store';

/**
 * @interface Notification
 * @description Defines the structure for a single notification object.
 */
export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'error';
  duration: number;
}

/**
 * @const {import('svelte/store').Writable<Notification[]>} notifications
 * @description A writable Svelte store that holds an array of active notifications.
 */
export const notifications = writable<Notification[]>([]);

let notificationIdCounter = 0;

/**
 * Adds a new notification to the store, making it visible to the user.
 * @param {string} message The text content of the notification.
 * @param {'success' | 'warning' | 'error'} [type='success'] The style of the notification.
 * @param {number} [duration=3000] The time in milliseconds before the notification automatically disappears.
 */
export function addNotification(
  message: string,
  type: 'success' | 'warning' | 'error' = 'success',
  duration: number = 3000
): void {
  notificationIdCounter++;
  const newNotification: Notification = { 
    id: notificationIdCounter, 
    message, 
    type, 
    duration 
  };
  notifications.update(all => [...all, newNotification]);
}

/**
 * Removes a notification from the store by its unique ID.
 * @param {number} id The ID of the notification to remove.
 */
export function removeNotification(id: number): void {
  notifications.update(all => all.filter(n => n.id !== id));
}