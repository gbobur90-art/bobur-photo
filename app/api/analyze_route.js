
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const password = formData.get('password')
    const image = formData.get('image')

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
    }

    if (!image) {
      return NextResponse.json({ error: 'Нет файла' }, { status: 400 })
    }

    // Convert image to base64
    const arrayBuffer = await image.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = image.type || 'image/jpeg'

    // Call Claude API to analyze the photo
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64,
                },
              },
              {
                type: 'text',
                text: `Ты помогаешь фотографу заполнить метаданные для его фотографии. Проанализируй это фото и верни JSON объект со следующими полями:

{
  "title": "Красивое короткое название фото (3-6 слов, по-русски)",
  "desc": "Поэтичное описание фото (1-2 предложения, по-русски, передай атмосферу и настроение)",
  "location": "Предполагаемое место съёмки (город, страна или описание места, по-русски). Если не можешь определить — напиши пустую строку",
  "cat": "Категория из списка: Путешествия, Природа, Архитектура, Улица, Портрет",
  "date": "Дата в формате YYYY-MM-DD если видна на фото или можно определить по контексту (например по листве, снегу). Иначе пустая строка"
}

Верни ТОЛЬКО JSON объект, без пояснений и markdown.`,
              },
            ],
          },
        ],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      return NextResponse.json({ error: 'Ошибка AI: ' + err }, { status: 500 })
    }

    const claudeData = await claudeRes.json()
    const text = claudeData.content?.[0]?.text || '{}'

    let parsed = {}
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = { title: '', desc: '', location: '', cat: 'Путешествия', date: '' }
    }

    return NextResponse.json(parsed)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
