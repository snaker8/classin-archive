'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Viewer Error:', error)
    }, [error])

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-900 text-white">
            <div className="text-center">
                <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">문제가 발생했습니다</h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    뷰어를 불러오는 중 오류가 발생했습니다.
                    <br />
                    ({error.message || '렌더링 오류'})
                </p>

                <div className="flex gap-4 justify-center">
                    <Button
                        variant="outline"
                        className="text-black bg-white hover:bg-gray-200"
                        onClick={() => window.location.href = '/admin/dashboard'}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        대시보드로 이동
                    </Button>
                    <Button
                        onClick={() => reset()}
                        className="bg-primary hover:bg-primary/90"
                    >
                        다시 시도
                    </Button>
                </div>
            </div>
        </div>
    )
}
