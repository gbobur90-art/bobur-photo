import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { image, mimeType, filename } = body

    const sizeKB = Math.round((image?.length || 0) * 0.75 / 1024)
    console.log('Image size:', sizeKB, 'KB, filename:', filename)

    if (!image) return NextResponse.json({ error: 'Нет изображения' }, { status: 400 })
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'Нет ANTHROPIC_API_KEY' }, { status: 500 })

    const dateFromFilename = (filename || '').match(/(\d{4})[_-](\d{2})[_-](\d{2})/)?.[0]?.replace(/_/g, '-') || ''

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: image } },
            { type: 'text', text: 'Проанализируй фото. Верни ТОЛЬКО JSON:\n{"title":"название 3-5 слов по-русски","desc":"описание 1-2 предложения по-русски","location":"место по-русски или пустую строку","cat":"Путешествия или Природа или Архитектура или Улица или Портрет","date":"' + (dateFromFilename || '') + '"}' }
          ]
        }]
      })
    })

    const txt = await res.text()
    console.log('Anthropic status:', res.status, txt.slice(0, 200))

    if (!res.ok) return NextResponse.json({ error: 'Anthropic: ' + txt }, { status: 500 })

    const data = JSON.parse(txt)
    const text = data.content?.[0]?.text || ''
    console.log('AI response:', text)

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
