import 'express-session';
import type { User } from '@db/schema';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    authenticated?: boolean;
  }
}

declare global {
  namespace Express {
    interface User extends Omit<User, 'password'> {
      id: number;
      username: string;
      name: string;
      annualLeaveBalance: number;
    }
  }
}
