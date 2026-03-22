import { NextResponse } from 'next/server'

const KEY = 'bobur_about'

async function readAbout() {
  try {
    const url = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN
    const res = await fetch(`${url}/get/${KEY}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    })
    const data = await res.json()
    if (!data?.result) return null
    const parsed = JSON.parse(data.result)
    // Защита от двойного JSON
    if (typeof parsed === 'string') return JSON.parse(parsed)
    return parsed
  } catch { return null }
}

async function writeAbout(value) {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['SET', KEY, JSON.stringify(value)]
    ])
  })
  if (!res.ok) throw new Error('KV write failed: ' + await res.text())
}

export async function GET() {
  try {
    const data = await readAbout()
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
    await writeAbout(about)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
