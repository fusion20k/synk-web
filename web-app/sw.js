// sw.js - Service Worker for background sync notifications
self.addEventListener('install', (event) => {
    console.log('Synk Service Worker installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Synk Service Worker activated');
    event.waitUntil(self.clients.claim());
});

// Background sync (if supported)
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    try {
        const response = await fetch('/api/sync/trigger', { method: 'POST' });
        if (response.ok) {
            self.registration.showNotification('Synk', {
                body: 'Background sync completed successfully!',
                icon: '/favicon.ico',
                badge: '/favicon.ico'
            });
        }
    } catch (error) {
        console.log('Background sync failed:', error);
    }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        self.clients.matchAll().then((clients) => {
            if (clients.length > 0) {
                clients[0].focus();
            } else {
                self.clients.openWindow('/');
            }
        })
    );
});