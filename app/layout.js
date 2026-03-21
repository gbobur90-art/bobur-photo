import './globals.css'

export const metadata = {
  title: 'Bobur Gafurov — Фотодневник',
  description: 'Фотографии Бобура Гафурова — путешествия, природа, архитектура',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
