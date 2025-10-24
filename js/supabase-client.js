/**
 * Supabase Client Configuration
 * Initializes and exports the Supabase client instance for use throughout the application
 */

(function(window) {
    'use strict';

    // Configuration from environment
    const SUPABASE_URL = 'https://nbolvclqiaqrupxknvlu.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ib2x2Y2xxaWFxcnVweGtudmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NTQ4MjgsImV4cCI6MjA3MTIzMDgyOH0.yz33_9PEZbC2ew_2lQyxb6B_cQruSANVrwM_4h-afg8';

    /**
     * Initialize Supabase Client
     * Waits for the Supabase library to be available, then initializes the client
     */
    function initializeSupabaseClient() {
        try {
            // Check if Supabase library is available
            if (!window.supabase || !window.supabase.createClient) {
                console.error('[Supabase Client] Supabase library not loaded. Make sure the CDN script is included before this file.');
                return null;
            }

            // Validate configuration
            if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
                console.error('[Supabase Client] Missing Supabase configuration (URL or ANON_KEY)');
                return null;
            }

            // Create and return Supabase client instance
            const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            
            console.log('[Supabase Client] Successfully initialized with project:', SUPABASE_URL.split('//')[1].split('.')[0]);
            
            return supabaseClient;
        } catch (error) {
            console.error('[Supabase Client] Initialization error:', error.message);
            return null;
        }
    }

    /**
     * Wait for Supabase library to be available
     * Retries with exponential backoff if not immediately available
     */
    function waitForSupabaseLibrary(maxAttempts = 30, delayMs = 100) {
        return new Promise((resolve, reject) => {
            let attempts = 0;

            function check() {
                if (window.supabase && window.supabase.createClient) {
                    resolve(true);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(check, delayMs);
                } else {
                    reject(new Error('Supabase library failed to load after ' + maxAttempts + ' attempts'));
                }
            }

            check();
        });
    }

    /**
     * Initialize with proper error handling and logging
     */
    async function init() {
        try {
            // Wait for Supabase library to be available
            await waitForSupabaseLibrary();

            // Initialize the client
            const client = initializeSupabaseClient();

            if (!client) {
                throw new Error('Failed to initialize Supabase client');
            }

            // Expose globally for other modules to use
            window.supabaseClient = client;

            // Dispatch initialization event for other modules to listen
            window.dispatchEvent(new CustomEvent('supabase-initialized', {
                detail: { client: client }
            }));

            return client;
        } catch (error) {
            console.error('[Supabase Client] Initialization failed:', error.message);
            
            // Dispatch error event
            window.dispatchEvent(new CustomEvent('supabase-init-error', {
                detail: { error: error.message }
            }));

            return null;
        }
    }

    /**
     * Get the Supabase client instance
     * If not yet initialized, triggers initialization
     */
    window.getSupabaseClient = async function() {
        if (window.supabaseClient) {
            return window.supabaseClient;
        }
        return await init();
    };

    /**
     * Initialize on DOM ready
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM is already ready
        init();
    }

    // Also initialize immediately if possible
    if (window.supabase && window.supabase.createClient) {
        init();
    }
})(window);