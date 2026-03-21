'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const CATS = ['Все', 'Путешествия', 'Природа', 'Архитектура', 'Улица', 'Портрет']
const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`
}

export default function Home() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('home') // home | gallery | about
  const [slideIdx, setSlideIdx] = useState(0)
  const [filterCat, setFilterCat] = useState('Все')
  const [search, setSearch] = useState('')
  const [sortNew, setSortNew] = useState(true)
  const [showFav, setShowFav] = useState(false)
  const [favs, setFavs] = useState({})

  // Modals
  const [showUpload, setShowUpload] = useState(false)
  const [showPwModal, setShowPwModal] = useState(false)
  const [showDlModal, setShowDlModal] = useState(false)
  const [dlPhoto, setDlPhoto] = useState(null)
  const [showAboutEdit, setShowAboutEdit] = useState(false)

  // Upload form
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadPreview, setUploadPreview] = useState(null)
  const [uploadForm, setUploadForm] = useState({ title: '', desc: '', cat: 'Путешествия', date: new Date().toISOString().split('T')[0] })

  // About
  const [about, setAbout] = useState({
    name: 'Bobur', nameLast: 'Gafurov', role: 'Фотограф · Ташкент',
    bio: 'Начинающий фотограф, влюблённый в свет и момент.\n\nСнимаю природу, путешествия и города — ищу красоту в обычных вещах.',
    email: 'email@example.com', ig: '@boburphoto', city: 'Ташкент'
  })

  const timerRef = useRef(null)

  // Load photos
  const loadPhotos = useCallback(async () => {
    try {
      const res = await fetch('/api/photos')
      const data = await res.json()
      setPhotos(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { loadPhotos() }, [loadPhotos])

  // Slideshow timer
  useEffect(() => {
    if (view !== 'home' || photos.length === 0) return
    timerRef.current = setInterval(() => setSlideIdx(i => (i + 1) % Math.min(photos.length, 5)), 6000)
    return () => clearInterval(timerRef.current)
  }, [view, photos.length])

  // Keyboard
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') setSlideIdx(i => (i + 1) % Math.min(photos.length, 5))
      if (e.key === 'ArrowLeft') setSlideIdx(i => (i - 1 + Math.min(photos.length, 5)) % Math.min(photos.length, 5))
      if (e.key === 'Escape') { setShowUpload(false); setShowPwModal(false); setShowDlModal(false); setShowAboutEdit(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [photos.length])

  // Block right-click on images
  useEffect(() => {
    const handler = (e) => { if (e.target.tagName === 'IMG') e.preventDefault() }
    document.addEventListener('contextmenu', handler)
    document.addEventListener('dragstart', (e) => { if (e.target.tagName === 'IMG') e.preventDefault() })
    return () => document.removeEventListener('contextmenu', handler)
  }, [])

  const slidePhotos = photos.slice(0, 5)

  // Gallery filter
  const filteredPhotos = photos
    .filter(p => filterCat === 'Все' || p.cat === filterCat)
    .filter(p => !showFav || favs[p.id])
    .filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.desc?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortNew ? new Date(b.createdAt) - new Date(a.createdAt) : new Date(a.createdAt) - new Date(b.createdAt))

  // Auth
  async function checkPassword() {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: (() => { const f = new FormData(); f.append('password', pwInput); f.append('check', '1'); return f })()
    })
    if (res.status !== 400) {
      setIsAdmin(true); setShowPwModal(false); setShowUpload(true); setPwError('')
    } else {
      // Verify via photos API
      const r = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwInput, photo: { title: '__check__', url: '', cat: 'check', date: '2000-01-01' } })
      })
      if (r.status === 401) { setPwError('Неверный пароль') }
      else { setIsAdmin(true); setShowPwModal(false); setShowUpload(true); setPwError(''); loadPhotos() }
    }
  }

  // File select
  function onFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadFile(file)
    const reader = new FileReader()
    reader.onload = ev => setUploadPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  // Upload photo
  async function doUpload() {
    if (!uploadFile || !uploadForm.title) return
    setUploading(true)
    try {
      // 1. Upload image to ImgBB
      const imgForm = new FormData()
      imgForm.append('password', pwInput)
      imgForm.append('image', uploadFile)
      imgForm.append('title', uploadForm.title)
      const imgRes = await fetch('/api/upload', { method: 'POST', body: imgForm })
      const imgData = await imgRes.json()
      if (!imgRes.ok) throw new Error(imgData.error)

      // 2. Save photo metadata
      const metaRes = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: pwInput,
          photo: { ...uploadForm, url: imgData.url, thumb: imgData.thumb }
        })
      })
      if (!metaRes.ok) throw new Error('Ошибка сохранения')
      await loadPhotos()
      setShowUpload(false)
      setUploadFile(null); setUploadPreview(null)
      setUploadForm({ title: '', desc: '', cat: 'Путешествия', date: new Date().toISOString().split('T')[0] })
    } catch (err) {
      alert('Ошибка: ' + err.message)
    }
    setUploading(false)
  }

  const s = { // styles object
    site: { minHeight: '100vh', background: '#0a0a0a', color: '#e8e2d9', fontFamily: "'Jost', sans-serif", fontWeight: 300, overflow: 'hidden' },
    nav: (solid) => ({ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 3rem', background: solid ? '#0a0a0a' : 'linear-gradient(to bottom, rgba(10,10,10,0.85) 0%, transparent 100%)', borderBottom: solid ? '1px solid rgba(232,226,217,0.06)' : 'none' }),
    logo: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', fontWeight: 300, letterSpacing: '0.12em', color: '#e8e2d9', cursor: 'pointer' },
    navLinks: { display: 'flex', gap: '2.5rem', listStyle: 'none' },
    navLink: (active) => ({ fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: active ? '#e8e2d9' : 'rgba(232,226,217,0.45)', cursor: 'pointer', transition: 'color 0.2s' }),
    slideshow: { position: 'fixed', inset: 0, zIndex: 0 },
    slide: (active) => ({ position: 'absolute', inset: 0, opacity: active ? 1 : 0, transition: 'opacity 1.1s ease', display: 'flex', alignItems: 'flex-end' }),
    slideBg: (url) => ({ position: 'absolute', inset: 0, backgroundImage: url ? `url(${url})` : 'linear-gradient(135deg,#1a1a2e,#0f3460)', backgroundSize: 'cover', backgroundPosition: 'center' }),
    vignette: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%)' },
    slideBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)' },
    caption: { position: 'relative', zIndex: 2, padding: '0 3rem 6rem', width: '100%' },
    catLabel: { fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#c8a96e', marginBottom: '0.6rem' },
    slideTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(2rem,5vw,4rem)', fontWeight: 300, lineHeight: 1.1 },
    slideDate: { fontSize: '0.7rem', color: 'rgba(232,226,217,0.45)', letterSpacing: '0.15em', marginTop: '0.75rem' },
    counter: { position: 'fixed', top: '50%', right: '2.5rem', transform: 'translateY(-50%)', zIndex: 100, writingMode: 'vertical-rl', fontSize: '0.65rem', letterSpacing: '0.2em', color: 'rgba(232,226,217,0.45)' },
    dots: { position: 'fixed', bottom: '3.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', gap: 8, alignItems: 'center' },
    dot: (active) => ({ width: 5, height: 5, borderRadius: '50%', background: active ? '#c8a96e' : 'rgba(232,226,217,0.45)', cursor: 'pointer', transform: active ? 'scale(1.4)' : 'scale(1)', transition: 'all 0.3s' }),
    controls: { position: 'fixed', bottom: '3.5rem', right: '3rem', zIndex: 100, display: 'flex', gap: '1rem' },
    ctrlBtn: { width: 42, height: 42, borderRadius: '50%', border: '1px solid rgba(232,226,217,0.2)', background: 'rgba(10,10,10,0.4)', backdropFilter: 'blur(6px)', color: '#e8e2d9', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    likeFab: (liked) => ({ position: 'fixed', bottom: '3.5rem', left: '3rem', zIndex: 100, background: 'rgba(10,10,10,0.4)', backdropFilter: 'blur(6px)', border: liked ? '1px solid rgba(226,75,74,0.4)' : '1px solid rgba(232,226,217,0.2)', color: liked ? '#E24B4A' : 'rgba(232,226,217,0.45)', fontSize: '0.7rem', letterSpacing: '0.12em', padding: '8px 18px', borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }),
    overlay: { position: 'fixed', inset: 0, zIndex: 200, background: '#0a0a0a', overflowY: 'auto' },
    galleryInner: { paddingTop: 80 },
    galleryHeader: { padding: '2.5rem 3rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    galleryTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: '2.2rem', fontWeight: 300, letterSpacing: '0.04em' },
    toolbar: { padding: '0 3rem 1rem', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    searchWrap: { position: 'relative', flex: 1, minWidth: 160, maxWidth: 260 },
    searchInput: { width: '100%', padding: '6px 10px 6px 32px', fontSize: 13, border: '0.5px solid rgba(232,226,217,0.2)', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: '#e8e2d9', outline: 'none' },
    fBtn: (active) => ({ fontSize: '0.65rem', padding: '5px 13px', borderRadius: 999, border: active ? 'none' : '1px solid rgba(232,226,217,0.2)', cursor: 'pointer', background: active ? '#c8a96e' : 'transparent', color: active ? '#0a0a0a' : 'rgba(232,226,217,0.45)', letterSpacing: '0.15em', textTransform: 'uppercase' }),
    sortBtn: (active) => ({ fontSize: '0.65rem', padding: '5px 12px', borderRadius: 6, border: active ? '1px solid #c8a96e' : '1px solid rgba(232,226,217,0.2)', cursor: 'pointer', background: 'transparent', color: active ? '#c8a96e' : 'rgba(232,226,217,0.45)', letterSpacing: '0.12em' }),
    favBtn: (active) => ({ fontSize: '0.65rem', padding: '5px 12px', borderRadius: 6, border: active ? '1px solid #E24B4A' : '1px solid rgba(232,226,217,0.2)', cursor: 'pointer', background: 'transparent', color: active ? '#E24B4A' : 'rgba(232,226,217,0.45)', marginLeft: 'auto' }),
    grid: { padding: '1rem 3rem 4rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '2px' },
    card: { position: 'relative', aspectRatio: '3/2', overflow: 'hidden', cursor: 'pointer' },
    cardImg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', userSelect: 'none' },
    cardOverlay: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.25rem', background: 'rgba(0,0,0,0)', transition: 'background 0.3s' },
    pcCat: { fontSize: '0.6rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c8a96e', marginBottom: 4, opacity: 0, transform: 'translateY(6px)', transition: 'all 0.3s' },
    pcTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontWeight: 300, opacity: 0, transform: 'translateY(6px)', transition: 'all 0.3s 0.05s' },
    dlBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', padding: '6px 14px', borderRadius: 2, border: '1px solid rgba(232,226,217,0.3)', background: 'rgba(10,10,10,0.6)', backdropFilter: 'blur(4px)', color: '#e8e2d9', cursor: 'pointer', marginTop: 8, opacity: 0, transition: 'all 0.3s 0.1s' },
    // modals
    modalBg: { position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
    modalBox: { background: '#111', border: '1px solid rgba(232,226,217,0.1)', borderRadius: 4, padding: '2.5rem', width: 420, maxWidth: '100%', position: 'relative', maxHeight: '90vh', overflowY: 'auto' },
    mTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', fontWeight: 300, marginBottom: '1.5rem' },
    mField: { marginBottom: '1rem' },
    mLabel: { display: 'block', fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(232,226,217,0.45)', marginBottom: 4 },
    mInput: { width: '100%', padding: '8px 10px', fontSize: 13, background: '#1a1a1a', border: '1px solid rgba(232,226,217,0.12)', borderRadius: 2, color: '#e8e2d9', outline: 'none', fontFamily: "'Jost', sans-serif" },
    mActions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem' },
    btnCancel: { padding: '7px 16px', fontSize: '0.75rem', borderRadius: 2, border: '1px solid rgba(232,226,217,0.2)', background: 'transparent', color: 'rgba(232,226,217,0.45)', cursor: 'pointer' },
    btnSave: { padding: '7px 20px', fontSize: '0.75rem', letterSpacing: '0.14em', textTransform: 'uppercase', background: '#c8a96e', border: 'none', color: '#0a0a0a', cursor: 'pointer', borderRadius: 2, fontWeight: 400 },
    closeX: { position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', color: 'rgba(232,226,217,0.45)', fontSize: '1.2rem', cursor: 'pointer' },
    fileZone: (has) => ({ border: has ? '1.5px solid #c8a96e' : '1.5px dashed rgba(232,226,217,0.2)', borderRadius: 2, padding: '1.25rem', textAlign: 'center', cursor: 'pointer', color: has ? '#c8a96e' : 'rgba(232,226,217,0.45)', fontSize: 13 }),
    // about
    aboutInner: { maxWidth: 900, margin: '0 auto', padding: 'calc(64px + 3rem) 3rem 5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'start' },
    avatar: { aspectRatio: '3/4', position: 'relative', overflow: 'hidden', background: 'linear-gradient(160deg,#1a1a2e 0%,#0f3460 60%,#1c0a00 100%)' },
    aboutContent: { paddingTop: '1rem' },
    aboutEyebrow: { fontSize: '0.62rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c8a96e', marginBottom: '1.2rem' },
    aboutName: { fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(2.2rem,4vw,3.2rem)', fontWeight: 300, lineHeight: 1.1, marginBottom: '2rem' },
    divider: { width: 40, height: 1, background: '#c8a96e', marginBottom: '1.8rem', opacity: 0.6 },
    bio: { fontSize: '0.88rem', lineHeight: 1.9, color: 'rgba(232,226,217,0.45)', marginBottom: '2rem' },
    stats: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem', borderTop: '1px solid rgba(232,226,217,0.08)', borderBottom: '1px solid rgba(232,226,217,0.08)', padding: '1.5rem 0', marginBottom: '2.5rem' },
    statNum: { fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem', fontWeight: 300, color: '#c8a96e', lineHeight: 1 },
    statLabel: { fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(232,226,217,0.45)', marginTop: 4 },
    contactRow: { display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', color: 'rgba(232,226,217,0.45)', marginBottom: '0.6rem' },
    editBtn: { marginTop: '2rem', padding: '9px 24px', fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', border: '1px solid rgba(232,226,217,0.2)', background: 'transparent', color: 'rgba(232,226,217,0.45)', cursor: 'pointer', borderRadius: 2 },
    // dl modal
    dlPhotoName: { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontStyle: 'italic', color: '#c8a96e', marginBottom: '1.5rem' },
    dlContactRow: { display: 'flex', gap: 10, marginBottom: 10 },
    dlEmailBtn: { flex: 1, padding: '11px 10px', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', borderRadius: 2, cursor: 'pointer', background: '#c8a96e', border: '1px solid #c8a96e', color: '#0a0a0a', fontWeight: 400, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
    dlTgBtn: { flex: 1, padding: '11px 10px', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', borderRadius: 2, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(232,226,217,0.2)', color: 'rgba(232,226,217,0.45)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
    dlNote: { fontSize: '0.68rem', color: 'rgba(232,226,217,0.45)', lineHeight: 1.7, marginTop: '1.2rem' },
  }

  // Nav component
  const Nav = ({ solid }) => (
    <nav style={s.nav(solid)}>
      <div style={s.logo} onClick={() => setView('home')}>
        Фото<em style={{ color: '#c8a96e', fontStyle: 'italic' }}>Дневник</em>
      </div>
      <ul style={s.navLinks}>
        {[['home','Главная'],['gallery','Галерея'],['about','Об авторе']].map(([v,label]) => (
          <li key={v}><span style={s.navLink(view===v)} onClick={() => setView(v)}>{label}</span></li>
        ))}
        <li><span style={s.navLink(false)} onClick={() => isAdmin ? setShowUpload(true) : setShowPwModal(true)}>+ Добавить</span></li>
      </ul>
    </nav>
  )

  // === HOME VIEW ===
  if (view === 'home') return (
    <div style={s.site}>
      <Nav solid={false} />
      <div style={s.slideshow}>
        {slidePhotos.length === 0 && (
          <div style={{ ...s.slide(true) }}>
            <div style={{ ...s.slideBg(null) }} />
            <div style={s.vignette} /><div style={s.slideBottom} />
            <div style={s.caption}>
              <div style={s.catLabel}>Портфолио</div>
              <div style={s.slideTitle}>Bobur Gafurov</div>
              <div style={s.slideDate}>Фотодневник</div>
            </div>
          </div>
        )}
        {slidePhotos.map((p, i) => (
          <div key={p.id} style={s.slide(i === slideIdx)}>
            <div style={s.slideBg(p.url)} />
            <div style={s.vignette} /><div style={s.slideBottom} />
            <div style={s.caption}>
              <div style={s.catLabel}>{p.cat}</div>
              <div style={s.slideTitle}>{p.title}</div>
              <div style={s.slideDate}>{fmtDate(p.date)}</div>
            </div>
          </div>
        ))}
      </div>

      {slidePhotos.length > 1 && <>
        <div style={s.counter}>
          <span style={{ color: '#e8e2d9' }}>{String(slideIdx+1).padStart(2,'0')}</span>
          {' / '}{String(slidePhotos.length).padStart(2,'0')}
        </div>
        <div style={s.dots}>
          {slidePhotos.map((_,i) => <div key={i} style={s.dot(i===slideIdx)} onClick={() => setSlideIdx(i)} />)}
        </div>
        <div style={s.controls}>
          <button style={s.ctrlBtn} onClick={() => setSlideIdx(i => (i-1+slidePhotos.length)%slidePhotos.length)}>←</button>
          <button style={s.ctrlBtn} onClick={() => setSlideIdx(i => (i+1)%slidePhotos.length)}>→</button>
        </div>
      </>}

      <button style={s.likeFab(favs[slidePhotos[slideIdx]?.id])} onClick={() => {
        const id = slidePhotos[slideIdx]?.id
        if (id) setFavs(f => ({ ...f, [id]: !f[id] }))
      }}>
        {favs[slidePhotos[slideIdx]?.id] ? '♥' : '♡'} Нравится
      </button>

      {showPwModal && <PwModal />}
      {showUpload && <UploadModal />}
    </div>
  )

  // === GALLERY VIEW ===
  if (view === 'gallery') return (
    <div style={{ ...s.site, overflow: 'auto', height: '100vh' }}>
      <Nav solid={true} />
      <div style={s.galleryInner}>
        <div style={s.galleryHeader}>
          <div style={s.galleryTitle}>Все работы</div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(232,226,217,0.45)' }}>{filteredPhotos.length} фото</div>
        </div>
        <div style={s.toolbar}>
          <div style={s.searchWrap}>
            <span style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', opacity:0.4, fontSize:13 }}>🔍</span>
            <input style={s.searchInput} placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {CATS.map(c => <button key={c} style={s.fBtn(filterCat===c)} onClick={() => setFilterCat(c)}>{c}</button>)}
          <button style={s.sortBtn(sortNew)} onClick={() => setSortNew(true)}>Новые</button>
          <button style={s.sortBtn(!sortNew)} onClick={() => setSortNew(false)}>Старые</button>
          <button style={s.favBtn(showFav)} onClick={() => setShowFav(f => !f)}>
            ♥ Избранное {Object.values(favs).filter(Boolean).length > 0 ? `(${Object.values(favs).filter(Boolean).length})` : ''}
          </button>
        </div>
        <div style={s.grid}>
          {loading && <div style={{ color:'rgba(232,226,217,0.45)', padding:'4rem', gridColumn:'1/-1', textAlign:'center' }}>Загрузка...</div>}
          {!loading && filteredPhotos.length === 0 && <div style={{ color:'rgba(232,226,217,0.45)', padding:'4rem', gridColumn:'1/-1', textAlign:'center' }}>Нет фотографий</div>}
          {filteredPhotos.map(p => (
            <div key={p.id} style={s.card}
              onMouseEnter={e => {
                e.currentTarget.querySelector('.ov').style.background = 'rgba(0,0,0,0.45)'
                e.currentTarget.querySelectorAll('.reveal').forEach(el => { el.style.opacity='1'; el.style.transform='translateY(0)' })
              }}
              onMouseLeave={e => {
                e.currentTarget.querySelector('.ov').style.background = 'rgba(0,0,0,0)'
                e.currentTarget.querySelectorAll('.reveal').forEach(el => { el.style.opacity='0'; el.style.transform='translateY(6px)' })
              }}
            >
              {p.url ? <img src={p.url} alt={p.title} style={s.cardImg} draggable={false} /> :
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#1a1a2e,#0f3460)' }} />}
              <div className="ov" style={s.cardOverlay}>
                <div className="reveal" style={s.pcCat}>{p.cat}</div>
                <div className="reveal" style={s.pcTitle}>{p.title}</div>
                <button className="reveal" style={s.dlBtn} onClick={() => { setDlPhoto(p); setShowDlModal(true) }}>✉ Запросить фото</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showPwModal && <PwModal />}
      {showUpload && <UploadModal />}
      {showDlModal && dlPhoto && <DlModal />}
    </div>
  )

  // === ABOUT VIEW ===
  if (view === 'about') return (
    <div style={{ ...s.site, overflow: 'auto', height: '100vh' }}>
      <Nav solid={true} />
      <div style={s.aboutInner}>
        <div style={s.avatar} />
        <div style={s.aboutContent}>
          <div style={s.aboutEyebrow}>Об авторе</div>
          <div style={s.aboutName}>{about.name} <em style={{ color:'#c8a96e', fontStyle:'italic' }}>{about.nameLast}</em></div>
          <div style={s.divider} />
          <div style={s.bio}>
            {about.bio.split('\n\n').map((p,i) => <p key={i} style={{ marginTop: i>0?'1rem':0 }}>{p}</p>)}
          </div>
          <div style={s.stats}>
            <div><div style={s.statNum}>{photos.length}</div><div style={s.statLabel}>Фотографий</div></div>
            <div><div style={s.statNum}>5</div><div style={s.statLabel}>Тем</div></div>
            <div><div style={s.statNum}>{Object.values(favs).filter(Boolean).length}</div><div style={s.statLabel}>Понравилось</div></div>
          </div>
          <div style={s.contactRow}><span style={{ color:'#c8a96e', width:14 }}>@</span><span style={{ color:'#e8e2d9' }}>{about.email}</span></div>
          <div style={s.contactRow}><span style={{ color:'#c8a96e', width:14, fontSize:'0.7rem' }}>ig</span><span style={{ color:'#e8e2d9' }}>{about.ig}</span></div>
          <div style={s.contactRow}><span style={{ color:'#c8a96e', width:14 }}>✦</span><span style={{ color:'#e8e2d9' }}>{about.city}</span></div>
          <button style={s.editBtn} onClick={() => setShowAboutEdit(true)}>Редактировать</button>
        </div>
      </div>
      {showAboutEdit && <AboutEditModal />}
    </div>
  )

  // === MODALS ===
  function PwModal() {
    return (
      <div style={s.modalBg} onClick={e => e.target===e.currentTarget && setShowPwModal(false)}>
        <div style={s.modalBox}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'1.8rem', marginBottom:'1rem', opacity:0.5 }}>🔒</div>
            <div style={s.mTitle}>Вход для автора</div>
            <div style={{ fontSize:'0.75rem', color:'rgba(232,226,217,0.45)', marginBottom:'1.8rem' }}>Введите пароль для добавления фотографий</div>
            <input style={{ ...s.mInput, textAlign:'center', letterSpacing:'0.3em', marginBottom:'0.5rem' }}
              type="password" placeholder="••••••••" value={pwInput}
              onChange={e => setPwInput(e.target.value)}
              onKeyDown={e => e.key==='Enter' && checkPassword()} autoFocus />
            {pwError && <div style={{ color:'#E24B4A', fontSize:'0.72rem', marginBottom:'0.5rem' }}>{pwError}</div>}
            <button style={{ ...s.btnSave, width:'100%', padding:10, marginTop:8 }} onClick={checkPassword}>Войти</button>
            <br/><button style={{ ...s.btnCancel, border:'none', marginTop:8 }} onClick={() => setShowPwModal(false)}>Отмена</button>
          </div>
        </div>
      </div>
    )
  }

  function UploadModal() {
    return (
      <div style={s.modalBg} onClick={e => e.target===e.currentTarget && setShowUpload(false)}>
        <div style={s.modalBox}>
          <button style={s.closeX} onClick={() => setShowUpload(false)}>✕</button>
          <div style={s.mTitle}>Новое фото</div>
          <div style={s.mField}>
            <label style={s.mLabel}>Фотография</label>
            <div style={s.fileZone(!!uploadFile)} onClick={() => document.getElementById('fileInput').click()}>
              {uploadPreview ? <img src={uploadPreview} alt="" style={{ maxHeight:100, borderRadius:2 }} /> : 'Нажмите, чтобы выбрать'}
              <div style={{ marginTop:4 }}>{uploadFile?.name || ''}</div>
            </div>
            <input id="fileInput" type="file" accept="image/*" style={{ display:'none' }} onChange={onFileSelect} />
          </div>
          {['title','desc'].map(key => (
            <div key={key} style={s.mField}>
              <label style={s.mLabel}>{key==='title'?'Название':'Описание'}</label>
              <input style={s.mInput} type="text" value={uploadForm[key]}
                onChange={e => setUploadForm(f => ({...f,[key]:e.target.value}))}
                placeholder={key==='title'?'Напр. Закат в горах':'Несколько слов...'} />
            </div>
          ))}
          <div style={s.mField}>
            <label style={s.mLabel}>Тема</label>
            <select style={s.mInput} value={uploadForm.cat} onChange={e => setUploadForm(f => ({...f,cat:e.target.value}))}>
              {CATS.slice(1).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={s.mField}>
            <label style={s.mLabel}>Дата</label>
            <input style={s.mInput} type="date" value={uploadForm.date} onChange={e => setUploadForm(f => ({...f,date:e.target.value}))} />
          </div>
          <div style={s.mActions}>
            <button style={s.btnCancel} onClick={() => setShowUpload(false)}>Отмена</button>
            <button style={{ ...s.btnSave, opacity: uploading?0.6:1 }} onClick={doUpload} disabled={uploading}>
              {uploading ? 'Загрузка...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  function DlModal() {
    const subject = encodeURIComponent('Запрос на скачивание фото: ' + dlPhoto.title)
    const body = encodeURIComponent('Здравствуйте!\n\nХочу запросить фото «' + dlPhoto.title + '».\n\nЦель использования: \n\nС уважением,')
    const tgUser = about.ig?.startsWith('@') ? about.ig.slice(1) : about.ig
    return (
      <div style={s.modalBg} onClick={e => e.target===e.currentTarget && setShowDlModal(false)}>
        <div style={{ ...s.modalBox, textAlign:'center' }}>
          <button style={s.closeX} onClick={() => setShowDlModal(false)}>✕</button>
          <div style={{ fontSize:'1.5rem', marginBottom:'1rem', opacity:0.5 }}>📷</div>
          <div style={s.mTitle}>Запросить фото</div>
          <div style={s.dlPhotoName}>«{dlPhoto.title}»</div>
          <div style={{ fontSize:'0.75rem', color:'rgba(232,226,217,0.45)', marginBottom:'1.5rem' }}>Свяжитесь с автором для получения разрешения</div>
          <div style={s.dlContactRow}>
            <a style={s.dlEmailBtn} href={`mailto:${about.email}?subject=${subject}&body=${body}`} target="_blank">✉ Написать на email</a>
            <a style={s.dlTgBtn} href={`https://t.me/${tgUser}`} target="_blank">→ Telegram</a>
          </div>
          <div style={s.dlNote}>Укажите название фото и цель использования.<br/>Автор свяжется с вами.</div>
        </div>
      </div>
    )
  }

  function AboutEditModal() {
    const [form, setForm] = useState({...about})
    return (
      <div style={s.modalBg} onClick={e => e.target===e.currentTarget && setShowAboutEdit(false)}>
        <div style={s.modalBox}>
          <button style={s.closeX} onClick={() => setShowAboutEdit(false)}>✕</button>
          <div style={s.mTitle}>Об авторе</div>
          {[['name','Имя'],['nameLast','Фамилия'],['role','Подзаголовок'],['email','Email'],['ig','Instagram / Telegram'],['city','Город']].map(([k,label]) => (
            <div key={k} style={s.mField}>
              <label style={s.mLabel}>{label}</label>
              <input style={s.mInput} value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} />
            </div>
          ))}
          <div style={s.mField}>
            <label style={s.mLabel}>О себе</label>
            <textarea style={{ ...s.mInput, minHeight:80, resize:'vertical' }} value={form.bio} onChange={e => setForm(f => ({...f,bio:e.target.value}))} />
          </div>
          <div style={s.mActions}>
            <button style={s.btnCancel} onClick={() => setShowAboutEdit(false)}>Отмена</button>
            <button style={s.btnSave} onClick={() => { setAbout(form); setShowAboutEdit(false) }}>Сохранить</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
