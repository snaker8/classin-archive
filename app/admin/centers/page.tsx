import { CenterManagement } from '@/components/admin/center-management'

export default function CentersPage() {
    return (
        <div className="space-y-6 container mx-auto py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-foreground">센터/관 관리</h1>
                    <p className="text-muted-foreground mt-1">
                        시스템에 등록된 센터와 관을 관리합니다.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="md:col-span-2">
                    <CenterManagement />
                </div>
                <div>
                    {/* Add side info or help text here if needed */}
                    <div className="p-6 bg-muted/30 rounded-lg border">
                        <h3 className="font-semibold mb-2">도움말</h3>
                        <p className="text-sm text-muted-foreground space-y-2">
                            센터와 관을 등록하면 회원가입 및 학생 관리 시 해당 정보를 선택할 수 있습니다.
                            <br /><br />
                            <strong>센터 (Center):</strong> 지역별 센터 (예: 동래센터)
                            <br />
                            <strong>관 (Hall):</strong> 센터 내 세부 관 (예: 중등관, 고등관)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
