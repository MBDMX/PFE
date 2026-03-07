import api from './api';
import { User, Role } from '@/types/user';

export async function login(username: string, password: string, role: Role): Promise<{ user: User; token: string }> {
    const { data } = await api.post('/auth/login', { username, password, role });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
}

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

export function getUser(): User | null {
    if (typeof window === 'undefined') return null;
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
}
