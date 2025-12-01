// This file is required for Next.js instrumentation and server initialization
// It runs once when the server starts

export async function register() {
  // Only initialize on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🔧 Initializing server services...');
    
    try {
      const { initializeSnapshotScheduler } = await import('@/lib/snapshot-scheduler');
      console.log('Starting snapshot scheduler...');
      initializeSnapshotScheduler();
      console.log('Snapshot scheduler started successfully');
    } catch (error) {
      console.error('Failed to initialize snapshot scheduler:', error);
      // Continue anyway - don't crash server
    }
  }
}
