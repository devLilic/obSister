// File: src/services/googleService.ts
export async function syncGoogleSchedule(): Promise<{ success: boolean; message: string }> {
    return await window.api.google.syncSchedule();
}
