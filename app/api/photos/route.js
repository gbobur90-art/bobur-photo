import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'photos.json')

async function readPhotos() {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writePhotos(photos) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
  await fs.writeFile(DB_PATH, JSON.stringify(photos, null, 2))
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

    const photos = await readPhotos()
    const newPhoto = {
      id: Date.now().toString(),
      title: photo.title || 'Без названия',
      desc: photo.desc || '',
      cat: photo.cat || 'Путешествия',
      date: photo.date || new Date().toISOString().split('T')[0],
      url: photo.url,
      thumb: photo.thumb || photo.url,
      liked: false,
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
