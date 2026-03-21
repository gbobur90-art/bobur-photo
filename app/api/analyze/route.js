import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const image = formData.get('image')

    if (!image) {
      return NextResponse.json({ error: 'Нет файла' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY не настроен' }, { status: 500 })
    }

    const arrayBuffer = await image.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = image.type || 'image/jpeg'
    const filename = image.name || ''
    const dateFromFilename = filename.match(/(\d{4})[_-](\d{2})[_-](\d{2})/)?.[0]?.replace(/_/g, '-') || ''

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64 }
            },
            {
              type: 'text',
              text: `Ты помогаешь фотографу заполнить метаданные. Внимательно изучи фотографию.\n${dateFromFilename ? 'Дата из имени файла: ' + dateFromFilename : ''}\n\nВерни ТОЛЬКО валидный JSON без markdown:\n{"title":"короткое поэтичное название 3-5 слов по-русски","desc":"красивое описание 1-2 предложения по-русски с атмосферой","location":"конкретное место по-русски (город/страна) или пустая строка","cat":"одно из: Путешествия, Природа, Архитектура, Улица, Портрет","date":"YYYY-MM-DD если можно определить иначе пустая строка"}`
            }
          ]
        }]
      })
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      return NextResponse.json({ error: errText }, { status: 500 })
    }

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text || ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ title:'', desc:'', location:'', cat:'Путешествия', date: dateFromFilename })

    let parsed = {}
    try { parsed = JSON.parse(jsonMatch[0]) } catch { parsed = {} }
    if (!parsed.date && dateFromFilename) parsed.date = dateFromFilename

    return NextResponse.json({
      title: parsed.title || '',
      desc: parsed.desc || '',
      location: parsed.location || '',
      cat: parsed.cat || 'Путешествия',
      date: parsed.date || ''
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
