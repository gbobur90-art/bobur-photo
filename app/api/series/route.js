
import { NextResponse } from 'next/server'

const KEY = 'bobur_series'

async function readSeries() {
  try {
    const url = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN
    const res = await fetch(`${url}/get/${KEY}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    })
    const data = await res.json()
    if (!data?.result) return []
    const parsed = JSON.parse(data.result)
    if (typeof parsed === 'string') return JSON.parse(parsed)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

async function writeSeries(series) {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['SET', KEY, JSON.stringify(series)]
    ])
  })
  if (!res.ok) throw new Error('KV write failed: ' + await res.text())
}

export async function GET() {
  try {
    const series = await readSeries()
    return NextResponse.json(series)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { password, series } = body
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
    }
    await writeSeries(series)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
