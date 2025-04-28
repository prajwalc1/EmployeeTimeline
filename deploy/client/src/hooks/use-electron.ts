// Declare the window.api interface
declare global {
  interface Window {
    api: {
      getEmployees: () => Promise<{ success: boolean; data: any[]; error?: string }>;
      getEmployee: (id: number) => Promise<{ success: boolean; data: any; error?: string }>;
      getTimeEntries: (employeeId: number) => Promise<{ success: boolean; data: any[]; error?: string }>;
      createTimeEntry: (entry: any) => Promise<{ success: boolean; data: any; error?: string }>;
      getLeaveRequests: (employeeId: number) => Promise<{ success: boolean; data: any[]; error?: string }>;
      createLeaveRequest: (request: any) => Promise<{ success: boolean; data: any; error?: string }>;
      onError: (callback: (error: Error) => void) => void;
    };
  }
}

// Hook for using Electron APIs
export function useElectronApi() {
  const isElectron = 'api' in window;
  
  if (!isElectron) {
    console.warn('Not running in Electron environment');
    return null;
  }

  return {
    getEmployees: window.api.getEmployees,
    getEmployee: window.api.getEmployee,
    getTimeEntries: window.api.getTimeEntries,
    createTimeEntry: window.api.createTimeEntry,
    getLeaveRequests: window.api.getLeaveRequests,
    createLeaveRequest: window.api.createLeaveRequest,
    onError: window.api.onError,
  };
}
