import api from './base';
import { handlePost } from './offline-helpers';

export const authService = {
    register: (data: any) => handlePost('/auth/register', data, 'CREATE_USER'),
    enrollFace: (descriptor: number[]) => api.post('/face/enroll', { descriptor }),
    enrollFaceMulti: (descriptors: number[][]) => api.post('/face/enroll-multi', { descriptors }),
    faceLogin: (descriptor: number[]) => api.post('/face/login', { descriptor }),

    getCurrentUser: () => {
        if (typeof window === 'undefined') return null;
        const user = localStorage.getItem('user');
        if (user) return JSON.parse(user);
        const token = localStorage.getItem('token');
        if (!token) return null;
        try {
            const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            return { id: payload.id, role: payload.role, name: payload.name };
        } catch { return null; }
    },
};
