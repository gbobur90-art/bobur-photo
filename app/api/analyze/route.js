import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const image = formData.get('image')

    if (!image) return NextResponse.json({ error: 'Нет файла' }, { status: 400 })
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'Нет ANTHROPIC_API_KEY' }, { status: 500 })

    const arrayBuffer = await image.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = image.type || 'image/jpeg'
    const filename = image.name || ''
    const dateFromFilename = filename.match(/(\d{4})[_-](\d{2})[_-](\d{2})/)?.[0]?.replace(/_/g, '-') || ''

    const payload = {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          { type: 'text', text: 'Проанализируй фото. Верни ТОЛЬКО JSON:\n{"title":"название 3-5 слов по-русски","desc":"описание 1-2 предложения","location":"место или пустая строка","cat":"Путешествия или Природа или Архитектура или Улица или Портрет","date":"' + (dateFromFilename || '') + '"}' }
        ]
      }]
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload)
    })

    const responseText = await res.text()
    console.log('Anthropic status:', res.status)
    console.log('Anthropic response:', responseText.substring(0, 500))

    if (!res.ok) {
      return NextResponse.json({ error: 'Anthropic error: ' + responseText }, { status: 500 })
    }

    const data = JSON.parse(responseText)
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
    console.error('Analyze error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
