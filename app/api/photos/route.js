import { NextResponse } from 'next/server'
const KEY = 'bobur_photos'

async function kv(method, path, body) {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) throw new Error('KV_REST_API_URL или KV_REST_API_TOKEN не заданы в Vercel')
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(`${url}${path}`, opts)
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { result: null } }
}

async function readPhotos() {
  try {
    const data = await kv('GET', `/get/${KEY}`)
    if (!data?.result) return []
    return JSON.parse(data.result)
  } catch { return [] }
}

async function writePhotos(photos) {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  const res = await fetch(`${url}/set/${KEY}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    // ИСПРАВЛЕНО: передаём массив напрямую, Upstash сам сериализует
    body: JSON.stringify(JSON.stringify(photos)),
  })
  if (!res.ok) throw new Error('KV write failed: ' + await res.text())
}

export async function GET() {
  try {
    const photos = await readPhotos()
    return NextResponse.json(photos)
  } catch (err) {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { password, photo } = body
    const adminPw = process.env.ADMIN_PASSWORD
    if (!adminPw) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD не задан в Vercel' }, { status: 500 })
    }
    if (password !== adminPw) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
    }
    if (!photo?.url) {
      return NextResponse.json({ ok: true })
    }
    const photos = await readPhotos()
    const newPhoto = {
      id: Date.now().toString(),
      title: photo.title || 'Без названия',
      desc: photo.desc || '',
      cat: photo.cat || 'Путешествия',
      date: photo.date || new Date().toISOString().split('T')[0],
      url: photo.url,
      thumb: photo.thumb || photo.url,
      location: photo.location || '',
      seriesId: photo.seriesId || '',
      likes: 0,
      createdAt: new Date().toISOString(),
    }
    photos.unshift(newPhoto)
    await writePhotos(photos)
    return NextResponse.json(newPhoto)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const password = searchParams.get('password')
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
    }
    const photos = await readPhotos()
    await writePhotos(photos.filter(p => p.id !== id))
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
