'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/services/auth';
import { Role } from '@/types/user';

export function useAuthGuard(allowedRoles?: Role[]) {
    const router = useRouter();
    useEffect(() => {
        const user = getUser();
        if (!user) { router.replace('/login'); return; }
        if (allowedRoles && !allowedRoles.includes(user.role)) {
            router.replace(`/dashboard/${user.role}`);
        }
    }, []);
}
