export const metadata = {
  title: 'ATOL - Semantic Task Ledger',
  description: 'Task management system with semantic organization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
