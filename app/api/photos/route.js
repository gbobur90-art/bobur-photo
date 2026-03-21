import { NextResponse } from 'next/server'

const PHOTOS_KEY = 'photos'

async function getRedis() {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  return { url, token }
}

async function readPhotos() {
  try {
    const { url, token } = await getRedis()
    if (!url || !token) return []
    const res = await fetch(`${url}/get/${PHOTOS_KEY}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    })
    const data = await res.json()
    return data.result ? JSON.parse(data.result) : []
  } catch { return [] }
}

async function writePhotos(photos) {
  const { url, token } = await getRedis()
  if (!url || !token) throw new Error('База данных не настроена')
  const encoded = encodeURIComponent(JSON.stringify(photos))
  await fetch(`${url}/set/${PHOTOS_KEY}/${encoded}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  })
}

export async function GET() {
  const photos = await readPhotos()
  return NextResponse.json(photos)
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { password, photo } = body
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
    }
    if (photo.title === '__check__') {
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
