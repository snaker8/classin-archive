// This layout bypasses the StudentLayout auth check
// The viewer page handles its own auth internally
export default function ViewerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
