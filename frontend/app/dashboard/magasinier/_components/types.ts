import { LucideIcon } from 'lucide-react';

export interface MagStats {
    pending_requests: number;
    approved_requests: number;
    rejected_requests: number;
    total_items_out: number;
    critical_stock_alerts: number;
}

export interface KpiCardProps {
    label: string;
    value: number;
    icon: LucideIcon;
    color: string;
    bg: string;
}

export interface StockAlert {
    id: number;
    name: string;
    reference: string;
    quantity: number;
    location: string;
}

export interface PendingRequest {
    id: number;
    work_order_id: number;
    work_order_title: string;
    requester_name: string;
    created_at: string;
    items_count: number;
}

export interface TopPiece {
    name: string;
    reference: string;
    quantity: number;
    percentage: number;
}

export interface WeeklyData {
    day: string;
    count: number;
}
