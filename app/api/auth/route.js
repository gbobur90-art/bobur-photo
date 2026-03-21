import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { password } = await request.json()
    const adminPw = process.env.ADMIN_PASSWORD
    if (!adminPw) return NextResponse.json({ error: 'ADMIN_PASSWORD не настроен' }, { status: 500 })
    if (password !== adminPw) return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
