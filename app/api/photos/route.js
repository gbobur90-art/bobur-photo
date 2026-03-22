import { NextResponse } from 'next/server'

const KEY = 'bobur_photos'

async function readPhotos() {
  try {
    const url = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN
    const res = await fetch(`${url}/get/${KEY}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (!data?.result) return []
    return JSON.parse(data.result)
  } catch (e) {
    console.error('readPhotos error:', e.message)
    return []
  }
}

async function writePhotos(photos) {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  console.log('writePhotos: writing', photos.length, 'photos')
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['SET', KEY, JSON.stringify(photos)]
    ])
  })
  const text = await res.text()
  console.log('writePhotos response:', res.status, text.slice(0, 200))
  if (!res.ok) throw new Error('KV write failed: ' + text)
}

export async function GET() {
  try {
    const photos = await readPhotos()
    return NextResponse.json(photos)
  } catch (err) {
    console.error('GET error:', err.message)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request) {
  try {
    console.log('POST /api/photos started')
    const body = await request.json()
    const { password, photo } = body
    console.log('POST body received, photo url:', photo?.url?.slice(0, 50))

    const adminPw = process.env.ADMIN_PASSWORD
    if (!adminPw) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD не задан' }, { status: 500 })
    }
    if (password !== adminPw) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
    }
    if (!photo?.url) {
      return NextResponse.json({ ok: true })
    }

    console.log('Reading photos...')
    const photos = await readPhotos()
    console.log('Got', photos.length, 'existing photos')

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

    console.log('Writing', photos.length, 'photos...')
    await writePhotos(photos)
    console.log('Write success!')
    return NextResponse.json(newPhoto)
  } catch (err) {
    console.error('POST error:', err.message, err.stack)
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
