import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const password = formData.get('password')
    const image = formData.get('image')
    const title = formData.get('title') || 'photo'

    // Check admin password
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
    }

    if (!image) {
      return NextResponse.json({ error: 'Нет файла' }, { status: 400 })
    }

    // Upload to ImgBB
    const imgbbForm = new FormData()
    imgbbForm.append('image', image)
    imgbbForm.append('name', title)

    const res = await fetch(
      `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
      { method: 'POST', body: imgbbForm }
    )

    const data = await res.json()

    if (!data.success) {
      return NextResponse.json({ error: 'Ошибка загрузки на ImgBB' }, { status: 500 })
    }

    return NextResponse.json({
      url: data.data.url,
      display_url: data.data.display_url,
      thumb: data.data.thumb?.url || data.data.url,
      delete_url: data.data.delete_url,
      id: data.data.id,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
