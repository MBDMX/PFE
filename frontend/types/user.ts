export type Role = 'admin' | 'manager' | 'technician';
export interface User {
    id: number;
    username: string;
    role: Role;
    name: string;
}
