import DashboardLayout from '@/components/layout/Dashboard';

export default function Layout({ children }: { children: React.ReactNode }) {
    return <DashboardLayout>{children}</DashboardLayout>;
}