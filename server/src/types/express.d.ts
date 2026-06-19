declare global {
  namespace Express {
    interface Request {
      user: {
        userId: string;
        role: 'admin' | 'manager' | 'employee';
        employeeId: string | null;
        departmentId: string | null;
        isDirector: boolean;
      };
    }
  }
}

export {};
