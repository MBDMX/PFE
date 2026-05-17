import axios from 'axios';

const getApiBaseUrl = () => {
    return 'http://127.0.0.1:5000/api';
};

const api = axios.create({ 
    baseURL: process.env.NEXT_PUBLIC_API_URL || getApiBaseUrl(),
    timeout: 10000 // Timeout global de 10s pour les requêtes lourdes (SAP)
});

api.interceptors.request.use(cfg => {
    const token = localStorage.getItem('token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== 'undefined' && error.response) {
            const status = error.response.status;
            let message = error.response.data?.detail || "Une erreur est survenue côté serveur.";
            if (Array.isArray(message)) message = message.map((err: any) => err.msg).join(', ');

            if (status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
            }

            if (status >= 400) {
                const event = new CustomEvent('api:error', { detail: message });
                window.dispatchEvent(event);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
