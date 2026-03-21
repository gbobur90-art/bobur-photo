import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const image = formData.get('image')
    if (!image) return NextResponse.json({ error: 'Нет файла' }, { status: 400 })
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'Нет ключа' }, { status: 500 })

    const arrayBuffer = await image.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = image.type || 'image/jpeg'
    const filename = image.name || ''
    const dateFromFilename = filename.match(/(\d{4})[_-](\d{2})[_-](\d{2})/)?.[0]?.replace(/_/g, '-') || ''

    const res = await fetch('https://api.anthropic.com/v1/messages', {
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
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
            { type: 'text', text: 'Проанализируй фото и верни ТОЛЬКО JSON без markdown:\n{"title":"название 3-5 слов по-русски","desc":"описание 1-2 предложения по-русски","location":"место съёмки по-русски или пустая строка","cat":"одно из: Путешествия, Природа, Архитектура, Улица, Портрет","date":"' + (dateFromFilename || '') + ' или YYYY-MM-DD или пустая строка"}' }
          ]
        }]
      })
    })

    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 })

    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ title:'', desc:'', location:'', cat:'Путешествия', date: dateFromFilename })

    let parsed = {}
    try { parsed = JSON.parse(match[0]) } catch {}
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
