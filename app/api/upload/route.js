import { NextResponse } from 'next/server'

export async function POST(request) {
  const { password } = await request.json()
  
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
  }
  
  return NextResponse.json({ key: process.env.IMGBB_API_KEY })
}
