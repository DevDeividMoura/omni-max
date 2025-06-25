<script lang="ts">
  import { notifications } from './notifications';
  import NotificationToast from './NotificationToast.svelte';
</script>

<div class="notification-container">
  {#each $notifications as notification (notification.id)}
    <NotificationToast
      id={notification.id}
      message={notification.message}
      type={notification.type}
      duration={notification.duration}
    />
  {/each}
</div>

<style>
  .notification-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483647; /* High z-index to appear over all page content */
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
</style>