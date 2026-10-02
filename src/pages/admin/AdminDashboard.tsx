import TopStatsCards from '@/components/dashboard/TopStatsCards'
import RecentActivityTable from '@/components/dashboard/RecentActivityTable'
import AiConfigStatus from '@/components/dashboard/AiConfigStatus'

export default function AdminDashboard() {
    return (
        <div className="flex-1 overflow-y-auto p-8 bg-[#f1f5f9]">
            <TopStatsCards />
            <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 320px' }}>
                <RecentActivityTable />
                <AiConfigStatus />
            </div>
        </div>
    )
}
