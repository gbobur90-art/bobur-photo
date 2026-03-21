import { NextResponse } from 'next/server'

const KEY = 'bobur_about'

async function kvGet(key) {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  const res = await fetch(`${url}/get/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  })
  const data = await res.json()
  return data.result ? JSON.parse(data.result) : null
}

async function kvSet(key, value) {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  await fetch(`${url}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(value))
  })
}

export async function GET() {
  try {
    const data = await kvGet(KEY)
    return NextResponse.json(data || {})
  } catch {
    return NextResponse.json({})
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { password, about } = body
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
    }
    await kvSet(KEY, about)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
