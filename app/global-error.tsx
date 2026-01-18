'use client'

import { useEffect } from 'react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Global error:', error)
    }, [error])

    return (
        <html>
            <body className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
                <h2 className="text-2xl font-bold mb-4 text-red-500">심각한 오류 발생</h2>
                <pre className="bg-gray-900 p-4 rounded text-sm mb-4 overflow-auto max-w-full">
                    {error.message}
                    {error.stack && <div className="mt-2 text-gray-500">{error.stack}</div>}
                </pre>
                <button
                    className="bg-white text-black px-4 py-2 rounded font-bold"
                    onClick={() => reset()}
                >
                    다시 시도
                </button>
            </body>
        </html>
    )
}
