import './globals.css'

export const metadata = {
  title: 'Bobur Gafurov — Photo Diary',
  description: 'Photography by Bobur Gafurov — travel, nature, architecture',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
