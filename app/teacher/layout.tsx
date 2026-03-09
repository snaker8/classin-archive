'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, BarChart3, FolderOpen, Inbox, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

export default function TeacherLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    const navItems = [
        { name: '내 대시보드', href: '/teacher/dashboard', icon: LayoutDashboard },
        { name: '반 관리', href: '/teacher/groups', icon: BookOpen },
        { name: '리포트 관리', href: '#', icon: BarChart3 },
        { name: '자료 보관함', href: '#', icon: FolderOpen },
        { name: '알림함', href: '#', icon: Inbox, hasBadge: true },
    ]

    return (
        <div className="flex h-screen w-full flex-row overflow-hidden bg-background text-foreground">
            {/* Side Navigation */}
            <aside className="flex w-72 flex-col border-r border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
                <div className="flex flex-col gap-4 p-6 h-full">
                    {/* Branding */}
                    <div className="flex items-center gap-3 mb-8 px-2">
                        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                            <span className="text-primary-foreground font-black text-xl">과</span>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold tracking-tight text-foreground">과사람</h1>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">LMS System</p>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex flex-col gap-2 flex-1">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative",
                                        isActive
                                            ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                                    )}
                                >
                                    <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                                    <span className="text-sm">{item.name}</span>
                                    {item.hasBadge && (
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                        </span>
                                    )}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Footer / Settings */}
                    <div className="mt-auto pt-6 border-t border-border">
                        <Link
                            href="#"
                            className="flex items-center gap-3 px-4 py-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                        >
                            <Settings className="h-5 w-5" />
                            <span className="text-sm font-medium">설정</span>
                        </Link>
                        <Link
                            href="#"
                            className="flex items-center gap-3 px-4 py-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                        >
                            <LogOut className="h-5 w-5" />
                            <span className="text-sm font-medium">로그아웃</span>
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-background/50 relative">
                {children}
            </main>
        </div>
    )
}
