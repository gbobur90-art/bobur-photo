import { NextResponse } from 'next/server'

const PHOTOS_KEY = 'bobur_photos'

async function getKV() {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) throw new Error('KV не настроен — добавь KV_REST_API_URL и KV_REST_API_TOKEN в Vercel')
  return { url, token }
}

async function readPhotos() {
  try {
    const { url, token } = await getKV()
    const res = await fetch(`${url}/get/${PHOTOS_KEY}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    })
    if (!res.ok) return []
    const data = await res.json()
    if (!data.result) return []
    return JSON.parse(data.result)
  } catch {
    return []
  }
}

async function writePhotos(photos) {
  const { url, token } = await getKV()
  const value = JSON.stringify(photos)
  // Upstash REST API: POST /set with body {EX: ..., value: ...}  OR simple SET via pipeline
  const res = await fetch(`${url}/set/${PHOTOS_KEY}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(value)
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error('KV write error: ' + text)
  }
  return res.json()
}

export async function GET() {
  try {
    const photos = await readPhotos()
    return NextResponse.json(photos)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { password, photo } = body

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
    }

    // Password check only
    if (photo?.title === '__check__') {
      return NextResponse.json({ ok: true })
    }

    const photos = await readPhotos()
    const newPhoto = {
      id: Date.now().toString(),
      title: photo.title || 'Без названия',
      desc: photo.desc || '',
      cat: photo.cat || 'Путешествия',
      date: photo.date || new Date().toISOString().split('T')[0],
      url: photo.url || '',
      thumb: photo.thumb || photo.url || '',
      location: photo.location || '',
      seriesId: photo.seriesId || '',
      likes: photo.likes || 0,
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
    const updated = photos.filter(p => p.id !== id)
    await writePhotos(updated)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
