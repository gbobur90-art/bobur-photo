'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const DEFAULT_CATS = ['Путешествия', 'Природа', 'Архитектура', 'Улица', 'Портрет']
const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
function fmtDate(d) { if(!d) return ''; try { const dt=new Date(d); return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}` } catch { return d } }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}; return a }

function SeriesEditModalComponent({editingSeries, photos, series, setSeries, saveSeries, setShowSeriesEdit, MB, MBX, mTitle, closeX, mInput, mLabel, btnSave, btnCancel, C, BG}) {
  const [titleVal, setTitleVal] = useState(editingSeries?.title||'')
  const [descVal, setDescVal] = useState(editingSeries?.desc||'')
  const [sel, setSel] = useState(editingSeries?.photoIds||[])
  const TXT = '#e8e2d9', MUT = 'rgba(232,226,217,0.45)'
  return (
    <div style={MB} onClick={e=>e.target===e.currentTarget&&setShowSeriesEdit(false)}>
      <div style={{...MBX,width:560,maxWidth:'100%'}}>
        <button style={closeX} onClick={()=>setShowSeriesEdit(false)}>✕</button>
        <div style={mTitle}>{editingSeries?'Редактировать серию':'Новая серия'}</div>
        <div style={{marginBottom:'1rem'}}>
          <label style={mLabel}>Название</label>
          <input autoFocus={!!editingSeries} style={mInput} value={titleVal} onChange={e=>setTitleVal(e.target.value)} placeholder="Напр. Мальдивы 2022"/>
        </div>
        <div style={{marginBottom:'1rem'}}>
          <label style={mLabel}>Описание</label>
          <input style={mInput} value={descVal} onChange={e=>setDescVal(e.target.value)} placeholder="Краткое описание..."/>
        </div>
        <div style={{marginBottom:'1rem'}}>
          <label style={mLabel}>Выбери фотографии ({sel.length} выбрано)</label>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6,maxHeight:200,overflowY:'auto'}}>
            {photos.map(p=>(
              <div key={p.id} onClick={()=>setSel(prev=>prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev,p.id])}
                style={{aspectRatio:'1',position:'relative',cursor:'pointer',border:sel.includes(p.id)?`2px solid ${C}`:'2px solid transparent',borderRadius:2,overflow:'hidden',background:'#1a1a1a'}}>
                {p.url&&<img src={p.thumb||p.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none'}}/>}
                {sel.includes(p.id)&&<div style={{position:'absolute',top:3,right:3,background:C,borderRadius:'50%',width:14,height:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:BG,fontWeight:'bold'}}>✓</div>}
              </div>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:'1.25rem'}}>
          {editingSeries&&<button style={{...btnCancel,color:'#E24B4A',borderColor:'rgba(226,75,74,0.3)'}} onClick={async()=>{const u=series.filter(s=>s.id!==editingSeries.id);setSeries(u);await saveSeries(u);setShowSeriesEdit(false)}}>Удалить</button>}
          <button style={btnCancel} onClick={()=>setShowSeriesEdit(false)}>Отмена</button>
          <button style={btnSave} onClick={()=>{
            if(!titleVal.trim()) return
            const cover=photos.find(p=>sel.includes(p.id))?.url||''
            const upd=editingSeries
              ?series.map(s=>s.id===editingSeries.id?{...s,title:titleVal,desc:descVal,photoIds:sel,cover:cover||s.cover}:s)
              :[...series,{id:Date.now().toString(),title:titleVal,desc:descVal,photoIds:sel,cover}]
            setSeries(upd); saveSeries(upd); setShowSeriesEdit(false)
          }}>Сохранить</button>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('home')
  const [galleryTab, setGalleryTab] = useState('all')
  const [slideOrder, setSlideOrder] = useState([])
  const [slideIdx, setSlideIdx] = useState(0)
  const [filterCat, setFilterCat] = useState('Все')
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState('new')
  const [likes, setLikes] = useState({})
  const [cats, setCats] = useState(DEFAULT_CATS)
  const [series, setSeries] = useState([])
  const [activeSeries, setActiveSeries] = useState(null)
  const [lightbox, setLightbox] = useState(null)

  const [showUpload, setShowUpload] = useState(false)
  const [showPwModal, setShowPwModal] = useState(false)
  const [pwPurpose, setPwPurpose] = useState('upload')
  const [showDlModal, setShowDlModal] = useState(false)
  const [dlPhoto, setDlPhoto] = useState(null)
  const [showAboutEdit, setShowAboutEdit] = useState(false)
  const [showCatManager, setShowCatManager] = useState(false)
  const [showSeriesEdit, setShowSeriesEdit] = useState(false)
  const [editingSeries, setEditingSeries] = useState(null)
  const [showNewSeriesInUpload, setShowNewSeriesInUpload] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [showAvatarUpload, setShowAvatarUpload] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploadMode, setUploadMode] = useState('single')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadPreview, setUploadPreview] = useState(null)
  const [uploadForm, setUploadForm] = useState({
    title: '', desc: '', cat: 'Путешествия', date: new Date().toISOString().split('T')[0],
    seriesId: '', location: ''
  })
  const [newSeriesName, setNewSeriesName] = useState('')
  const [bulkFiles, setBulkFiles] = useState([])
  const [bulkSeriesId, setBulkSeriesId] = useState('')
  const [bulkNewSeriesName, setBulkNewSeriesName] = useState('')
  const [bulkShowNewSeries, setBulkShowNewSeries] = useState(false)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0)
  const [currentSection, setCurrentSection] = useState(0)
  const [preloaderDone, setPreloaderDone] = useState(false)
  const [preloaderOut, setPreloaderOut] = useState(false)
  const [cursorPos, setCursorPos] = useState({x:-100,y:-100})
  const [cursorHover, setCursorHover] = useState(false)
  const [views, setViews] = useState({})
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [homeSearch, setHomeSearch] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  const [about, setAbout] = useState({
    name:'Bobur', nameLast:'Gafurov', role:'Фотограф · Ташкент',
    bio:'Начинающий фотограф, влюблённый в свет и момент.\n\nСнимаю природу, путешествия и города — ищу красоту в обычных вещах.',
    email:'email@example.com', ig:'@boburphoto', city:'Ташкент',
    phone:'', telegram:''
  })

  const timerRef = useRef(null)

  // Preloader
  useEffect(() => {
    const t1 = setTimeout(() => setPreloaderOut(true), 1800)
    const t2 = setTimeout(() => setPreloaderDone(true), 2400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Custom cursor
  useEffect(() => {
    const move = (e) => setCursorPos({x:e.clientX, y:e.clientY})
    const over = (e) => { if(e.target.closest('button')||e.target.closest('a')||e.target.closest('[data-hover]')) setCursorHover(true) }
    const out = () => setCursorHover(false)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseover', over)
    window.addEventListener('mouseout', out)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseover', over); window.removeEventListener('mouseout', out) }
  }, [])

  // Views counter
  function incrementView(photoId) {
    try {
      const key = 'view_'+photoId
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key,'1')
        setViews(v => ({...v, [photoId]:(v[photoId]||0)+1}))
      }
    } catch {}
  }

  // Watermark download
  async function downloadWithWatermark(photo, authorName) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width; canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const fontSize = Math.max(18, Math.round(img.width * 0.025))
        ctx.font = `${fontSize}px Georgia, serif`
        const text = '© ' + authorName
        const tw = ctx.measureText(text).width
        const pad = fontSize * 0.8
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(img.width - tw - pad*2 - 10, img.height - fontSize - pad*2 - 10, tw + pad*2, fontSize + pad*2)
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.fillText(text, img.width - tw - pad - 10, img.height - pad - 10)
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a'); a.href = url
          a.download = (photo.title||'photo').replace(/[^a-zа-я0-9]/gi,'_') + '.jpg'
          a.click(); URL.revokeObjectURL(url)
        }, 'image/jpeg', 0.92)
      }
      img.onerror = () => { window.open(photo.url, '_blank') }
      img.src = photo.url
    } catch { window.open(photo.url, '_blank') }
  }

  // Share / copy link
  function sharePhoto(photoId, e) {
    e && e.stopPropagation()
    try {
      const url = window.location.origin + '?photo=' + photoId
      navigator.clipboard.writeText(url)
      setCopiedId(photoId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {}
  }


  const loadPhotos = useCallback(async () => {
    try {
      const res = await fetch('/api/photos')
      const data = await res.json()
      const arr = Array.isArray(data) ? data : []
      setPhotos(arr)
      const lk = {}; arr.forEach(p => { lk[p.id] = p.likes||0 }); setLikes(lk)
    } catch {}
    setLoading(false)
  }, [])

  const loadAbout = useCallback(async () => {
    try {
      const res = await fetch('/api/about')
      const data = await res.json()
      if (data && Object.keys(data).length > 0) {
        setAbout(prev => ({ ...prev, ...data }))
        if (data.avatarUrl) setAvatarUrl(data.avatarUrl)
      }
    } catch {}
  }, [])

  const loadSeries = useCallback(async () => {
    try {
      const res = await fetch("/api/series")
      const data = await res.json()
      if (Array.isArray(data)) setSeries(data)
    } catch {}
  }, [])

  const saveSeries = useCallback(async (newSeries) => {
    if (!adminPassword) return
    try {
      await fetch("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword, series: newSeries })
      })
    } catch {}
  }, [adminPassword])

  useEffect(() => { loadPhotos(); loadAbout(); loadSeries() }, [loadPhotos, loadAbout, loadSeries])

  useEffect(() => {
    if (photos.length === 0) return
    setSlideOrder(shuffle(photos.map(p => p.id)))
  }, [photos.length])

  useEffect(() => {
    if (view !== 'home' || slideOrder.length === 0) return
    timerRef.current = setInterval(() => setSlideIdx(i => (i+1) % slideOrder.length), 5000)
    return () => clearInterval(timerRef.current)
  }, [view, slideOrder.length])

  useEffect(() => {
    const handler = (e) => {
      if (lightbox) {
        const arr = getDisplayPhotos()
        const i = arr.findIndex(p => p.id === lightbox.id)
        if (e.key === 'ArrowRight') setLightbox(arr[(i+1) % arr.length])
        else if (e.key === 'ArrowLeft') setLightbox(arr[(i-1+arr.length) % arr.length])
        else if (e.key === 'Escape') { setLightbox(null); setShowDlModal(false) }
        return
      }
      if (e.key === 'Escape') {
        setShowUpload(false); setShowPwModal(false); setShowDlModal(false)
        setShowAboutEdit(false); setShowCatManager(false); setShowSeriesEdit(false)
        setUploadMode('single'); setBulkFiles([])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, slideOrder.length])

  useEffect(() => {
    const block = (e) => { if(e.target.tagName==='IMG') e.preventDefault() }
    document.addEventListener('contextmenu', block)
    document.addEventListener('dragstart', block)
    return () => { document.removeEventListener('contextmenu', block); document.removeEventListener('dragstart', block) }
  }, [])

  useEffect(() => {
    if (lightbox) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [lightbox])

  const slidePhotos = slideOrder.map(id => photos.find(p => p.id===id)).filter(Boolean)

  function getDisplayPhotos() {
    return photos
      .filter(p => filterCat==='Все' || p.cat===filterCat)
      .filter(p => !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.desc?.toLowerCase().includes(search.toLowerCase()))
      .sort((a,b) => {
        if (sortMode==='new') return new Date(b.createdAt)-new Date(a.createdAt)
        if (sortMode==='old') return new Date(a.createdAt)-new Date(b.createdAt)
        return (likes[b.id]||0)-(likes[a.id]||0)
      })
  }

  function toggleLike(photoId, e) {
    e && e.stopPropagation()
    try {
      const key = 'liked_'+photoId
      const already = localStorage.getItem(key)
      if (already) { localStorage.removeItem(key); setLikes(l=>({...l,[photoId]:Math.max(0,(l[photoId]||1)-1)})) }
      else { localStorage.setItem(key,'1'); setLikes(l=>({...l,[photoId]:(l[photoId]||0)+1})) }
    } catch {}
  }

  function isLiked(id) { try { return !!localStorage.getItem('liked_'+id) } catch { return false } }

  function requireAdmin(purpose, onSuccess) {
    if (isAdmin) { onSuccess(); return }
    setPwPurpose(purpose); setPwInput(''); setPwError('')
    setPendingAction(() => onSuccess); setShowPwModal(true)
  }

  async function checkPassword() {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwInput })
      })
      const data = await res.json()
      if (res.status === 401 || data.error) { setPwError('Неверный пароль'); return }
      setIsAdmin(true); setAdminPassword(pwInput)
      setShowPwModal(false); setPwError('')
      if (pendingAction) { pendingAction(); setPendingAction(null) }
      await loadPhotos()
    } catch { setPwError('Ошибка соединения') }
  }

  async function onFileSelect(e) {
    const file = e.target.files[0]; if(!file) return
    setUploadFile(file)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result
      setUploadPreview(dataUrl)
      setAnalyzing(true)
      try {
        const compressed = await compressFromDataUrl(dataUrl, 800, 0.75)
        const base64 = compressed.split(',')[1]
        const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: base64, mimeType: 'image/jpeg', filename: file.name }) })
        if (res.ok) {
          const data = await res.json()
          if (!data.error) setUploadForm(f => ({ ...f, title: data.title||f.title, desc: data.desc||f.desc, cat: data.cat||f.cat, date: data.date||f.date, location: data.location||f.location }))
        }
      } catch(err) { console.error('AI error:', err) }
      setAnalyzing(false)
    }
    reader.readAsDataURL(file)
  }

  async function uploadToImgBB(dataUrl, title) {
    const base64 = dataUrl.split(',')[1]
    const form = new FormData()
    form.append('key', '8093b5a4acf05371a044d92054ea6cd0')
    form.append('image', base64)
    form.append('name', title || 'photo')
    const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form })
    const data = await res.json()
    if (!data.success) throw new Error('ImgBB: ' + JSON.stringify(data.error))
    return { url: data.data.url, thumb: data.data.thumb?.url || data.data.url }
  }

  async function compressFromDataUrl(dataUrl, maxSize, quality) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > h && w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize }
        else if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => resolve(dataUrl)
      img.src = dataUrl
    })
  }

  async function doUpload() {
    if (!uploadFile || !uploadForm.title) return
    setUploading(true)
    try {
      let seriesId = uploadForm.seriesId
      if (showNewSeriesInUpload && newSeriesName.trim()) {
        const newSer = { id: Date.now().toString(), title: newSeriesName.trim(), desc:'', photoIds:[], cover:'' }
        setSeries(prev => [...prev, newSer]); seriesId = newSer.id
      }
      const compressed = await compressFromDataUrl(uploadPreview, 1600, 0.88)
      const imgData = await uploadToImgBB(compressed, uploadForm.title)
      const fullDesc = uploadForm.location ? `${uploadForm.desc}${uploadForm.desc?' · ':''}📍 ${uploadForm.location}` : uploadForm.desc
      const metaRes = await fetch('/api/photos', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({password:adminPassword, photo:{ title: uploadForm.title, desc: fullDesc, cat: uploadForm.cat, date: uploadForm.date, url: imgData.url, thumb: imgData.thumb, location: uploadForm.location, likes: 0, seriesId }})
      })
      if (!metaRes.ok) throw new Error('Ошибка сохранения')
      const newPhoto = await metaRes.json()
      if (seriesId && newPhoto?.id) {
        setSeries(prev => { const updated = prev.map(s => s.id===seriesId ? {...s, photoIds:[...(s.photoIds||[]),newPhoto.id], cover:s.cover||imgData.url} : s); saveSeries(updated); return updated })
      }
      await loadPhotos()
      setShowUpload(false); setUploadFile(null); setUploadPreview(null); setNewSeriesName(''); setShowNewSeriesInUpload(false)
      setUploadForm({title:'',desc:'',cat:cats[0]||'Путешествия',date:new Date().toISOString().split('T')[0],seriesId:'',location:''})
    } catch(err) { alert('Ошибка: '+err.message) }
    setUploading(false)
  }

  async function onBulkFilesSelect(e) {
    const files = Array.from(e.target.files); if (!files.length) return
    const items = files.map(file => ({ id: Math.random().toString(36).slice(2), file, preview: null, form: { title: file.name.replace(/\.[^.]+$/,''), desc:'', cat:'Путешествия', date: new Date().toISOString().split('T')[0], location:'' }, status: 'pending', analyzing: false }))
    for (const item of items) { await new Promise(resolve => { const reader = new FileReader(); reader.onload = ev => { item.preview = ev.target.result; resolve() }; reader.readAsDataURL(item.file) }) }
    setBulkFiles(items)
    const analyze = async (item) => {
      setBulkFiles(prev => prev.map(x => x.id===item.id ? {...x, analyzing:true} : x))
      try {
        const compressed = await compressFromDataUrl(item.preview, 800, 0.75)
        const base64 = compressed.split(',')[1]
        const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: base64, mimeType: 'image/jpeg', filename: item.file.name }) })
        if (res.ok) { const data = await res.json(); setBulkFiles(prev => prev.map(x => x.id===item.id ? { ...x, analyzing: false, form: { ...x.form, title: data.title||x.form.title, desc: data.desc||'', cat: data.cat||x.form.cat, date: data.date||x.form.date, location: data.location||'' } } : x)) }
        else { setBulkFiles(prev => prev.map(x => x.id===item.id ? {...x, analyzing:false} : x)) }
      } catch { setBulkFiles(prev => prev.map(x => x.id===item.id ? {...x, analyzing:false} : x)) }
    }
    for (let i = 0; i < items.length; i += 3) { await Promise.all(items.slice(i, i+3).map(analyze)) }
  }

  function updateBulkItem(id, field, value) { setBulkFiles(prev => prev.map(x => x.id===id ? {...x, form:{...x.form,[field]:value}} : x)) }
  function removeBulkItem(id) { setBulkFiles(prev => prev.filter(x => x.id!==id)) }

  async function doBulkUpload() {
    const pending = bulkFiles.filter(x => x.status==='pending' && x.form.title); if (!pending.length) return
    setBulkUploading(true); setBulkProgress(0)
    let seriesId = bulkSeriesId
    if (bulkShowNewSeries && bulkNewSeriesName.trim()) { const newSer = {id: Date.now().toString(), title: bulkNewSeriesName.trim(), desc:'', photoIds:[], cover:''}; setSeries(prev => [...prev, newSer]); seriesId = newSer.id }
    let done = 0
    for (const item of pending) {
      try {
        setBulkFiles(prev => prev.map(x => x.id===item.id ? {...x, status:'uploading'} : x))
        const compressed = await compressFromDataUrl(item.preview, 1600, 0.88)
        const imgData = await uploadToImgBB(compressed, item.form.title)
        const fullDesc = item.form.location ? `${item.form.desc}${item.form.desc?' · ':''}📍 ${item.form.location}` : item.form.desc
        const metaRes = await fetch('/api/photos', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({password:adminPassword, photo:{title:item.form.title, desc:fullDesc, cat:item.form.cat, date:item.form.date, url:imgData.url, thumb:imgData.thumb, location:item.form.location, likes:0, seriesId}}) })
        const newPhoto = await metaRes.json()
        if (seriesId && newPhoto?.id) { setSeries(prev => prev.map(s => s.id===seriesId ? {...s, photoIds:[...(s.photoIds||[]),newPhoto.id], cover:s.cover||imgData.url} : s)) }
        setBulkFiles(prev => prev.map(x => x.id===item.id ? {...x, status:'done'} : x))
      } catch { setBulkFiles(prev => prev.map(x => x.id===item.id ? {...x, status:'error'} : x)) }
      done++; setBulkProgress(Math.round(done/pending.length*100))
    }
    if (seriesId) { setSeries(prev => { saveSeries(prev); return prev }) }
    await loadPhotos(); setBulkUploading(false)
    if (bulkFiles.every(x => x.status==='done'||x.status==='error')) {
      setShowUpload(false); setBulkFiles([]); setBulkSeriesId(''); setBulkNewSeriesName(''); setBulkShowNewSeries(false); setBulkProgress(0); setUploadMode('single')
    }
  }

  const C='#c8a96e', MUT='rgba(232,226,217,0.45)', BG='#0a0a0a', TXT='#e8e2d9'
  const mInput = {width:'100%',padding:'8px 10px',fontSize:13,background:'#1a1a1a',border:'1px solid rgba(232,226,217,0.12)',borderRadius:2,color:TXT,outline:'none',fontFamily:"'Jost',sans-serif"}
  const mLabel = {display:'block',fontSize:'0.65rem',letterSpacing:'0.18em',textTransform:'uppercase',color:MUT,marginBottom:4}
  const btnSave = {padding:'7px 20px',fontSize:'0.75rem',letterSpacing:'0.14em',textTransform:'uppercase',background:C,border:'none',color:BG,cursor:'pointer',borderRadius:2,fontWeight:400}
  const btnCancel = {padding:'7px 16px',fontSize:'0.75rem',borderRadius:2,border:'1px solid rgba(232,226,217,0.2)',background:'transparent',color:MUT,cursor:'pointer'}
  const MB = {position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.92)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}
  const MBX = {background:'#111',border:'1px solid rgba(232,226,217,0.1)',borderRadius:4,padding:'2.5rem',width:460,maxWidth:'100%',position:'relative',maxHeight:'90vh',overflowY:'auto'}
  const mTitle = {fontFamily:"'Cormorant Garamond',serif",fontSize:'1.5rem',fontWeight:300,marginBottom:'1.5rem'}
  const closeX = {position:'absolute',top:12,right:14,background:'none',border:'none',color:MUT,fontSize:'1.2rem',cursor:'pointer'}

  const [mobileMenu, setMobileMenu] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const Nav = ({solid}) => (
    <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:200,background:solid?BG:'transparent',borderBottom:solid?'1px solid rgba(232,226,217,0.06)':'none',transition:'background 0.4s'}}>
      <div style={{height:56,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 1.25rem'}}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.3rem',fontWeight:300,letterSpacing:'0.1em',color:TXT,cursor:'pointer'}} onClick={()=>{setView('home');setMobileMenu(false)}}>
          Фото<em style={{color:C,fontStyle:'italic'}}>Дневник</em>
        </div>
        {!isMobile && (
          <ul style={{display:'flex',gap:'1.5rem',listStyle:'none',alignItems:'center',margin:0,padding:0}}>
            {[['home','Главная'],['gallery','Галерея'],['about','Об авторе']].map(([v,l])=>(
              <li key={v}><span style={{fontSize:'0.72rem',letterSpacing:'0.18em',textTransform:'uppercase',color:view===v?TXT:MUT,cursor:'pointer'}} onClick={()=>setView(v)}>{l}</span></li>
            ))}
            <li><button style={{fontSize:'0.72rem',letterSpacing:'0.15em',textTransform:'uppercase',color:BG,background:C,border:'none',padding:'6px 16px',borderRadius:2,cursor:'pointer'}} onClick={()=>requireAdmin('upload',()=>setShowUpload(true))}>+ Добавить</button></li>
          </ul>
        )}
        {isMobile && (
          <button onClick={()=>setMobileMenu(m=>!m)} style={{background:'none',border:'none',color:TXT,fontSize:'1.5rem',cursor:'pointer',padding:'4px 8px',lineHeight:1}}>{mobileMenu?'✕':'☰'}</button>
        )}
      </div>
      {isMobile && mobileMenu && (
        <div style={{background:'rgba(10,10,10,0.98)',borderTop:'1px solid rgba(232,226,217,0.08)',padding:'0.5rem 0 1rem'}}>
          {[['home','Главная'],['gallery','Галерея'],['about','Об авторе']].map(([v,l])=>(
            <div key={v} onClick={()=>{setView(v);setMobileMenu(false)}} style={{padding:'14px 1.5rem',fontSize:'0.8rem',letterSpacing:'0.18em',textTransform:'uppercase',color:view===v?C:MUT,cursor:'pointer',borderBottom:'1px solid rgba(232,226,217,0.04)'}}>{l}</div>
          ))}
          <div style={{padding:'14px 1.5rem'}}>
            <button style={{fontSize:'0.8rem',letterSpacing:'0.15em',textTransform:'uppercase',color:BG,background:C,border:'none',padding:'12px 0',borderRadius:2,cursor:'pointer',width:'100%'}} onClick={()=>{setMobileMenu(false);requireAdmin('upload',()=>setShowUpload(true))}}>+ Добавить фото</button>
          </div>
        </div>
      )}
    </nav>
  )

  const PhotoCard = ({p}) => {
    const liked = isLiked(p.id); const lc = likes[p.id]||0; const vc = views[p.id]||0
    return (
      <div style={{position:'relative',aspectRatio:'3/2',overflow:'hidden',cursor:'zoom-in',background:'#111'}}
        onMouseEnter={e=>{e.currentTarget.querySelector('.ov').style.background='rgba(0,0,0,0.5)';e.currentTarget.querySelectorAll('.rv').forEach(el=>{el.style.opacity='1';el.style.transform='translateY(0)'})}}
        onMouseLeave={e=>{e.currentTarget.querySelector('.ov').style.background='rgba(0,0,0,0)';e.currentTarget.querySelectorAll('.rv').forEach(el=>{el.style.opacity='0';el.style.transform='translateY(8px)'})}}
        onClick={()=>{incrementView(p.id);setLightbox(p)}}>
        {p.url?<img src={p.url} alt={p.title} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none',userSelect:'none'}} draggable={false}/>:<div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#1a1a2e,#0f3460)'}}/>}
        <div style={{position:'absolute',top:8,right:8,display:'flex',gap:5,zIndex:2}}>
          {vc>0&&<div style={{background:'rgba(10,10,10,0.7)',backdropFilter:'blur(4px)',borderRadius:999,padding:'3px 8px',fontSize:'0.6rem',color:MUT,display:'flex',alignItems:'center',gap:3}}>👁 {vc}</div>}
          {lc>0&&<div style={{background:'rgba(10,10,10,0.75)',backdropFilter:'blur(4px)',border:'1px solid rgba(226,75,74,0.4)',borderRadius:999,padding:'3px 8px',fontSize:'0.65rem',color:'#E24B4A',display:'flex',alignItems:'center',gap:4}}>♥ {lc}</div>}
        </div>
        <div className="ov" style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',justifyContent:'flex-end',padding:'1rem',background:'rgba(0,0,0,0)',transition:'background 0.3s',zIndex:1}}>
          <div className="rv" style={{fontSize:'0.6rem',letterSpacing:'0.22em',textTransform:'uppercase',color:C,marginBottom:3,opacity:0,transform:'translateY(8px)',transition:'all 0.3s'}}>{p.cat}</div>
          <div className="rv" style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1rem',fontWeight:300,opacity:0,transform:'translateY(8px)',transition:'all 0.3s 0.04s'}}>{p.title}</div>
          <div className="rv" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:6,opacity:0,transform:'translateY(8px)',transition:'all 0.3s 0.08s'}}>
            <div style={{display:'flex',gap:5}}>
              <button onClick={e=>{e.stopPropagation();setDlPhoto(p);setShowDlModal(true)}} style={{fontSize:'0.6rem',letterSpacing:'0.15em',textTransform:'uppercase',padding:'5px 10px',borderRadius:2,border:'1px solid rgba(232,226,217,0.3)',background:'rgba(10,10,10,0.6)',color:TXT,cursor:'pointer'}}>✉</button>
            </div>
            <button onClick={e=>toggleLike(p.id,e)} style={{display:'flex',alignItems:'center',gap:5,fontSize:'0.72rem',padding:'5px 10px',borderRadius:2,border:liked?'1px solid rgba(226,75,74,0.5)':'1px solid rgba(232,226,217,0.25)',background:'rgba(10,10,10,0.6)',color:liked?'#E24B4A':MUT,cursor:'pointer'}}>{liked?'♥':'♡'} {lc>0&&lc}</button>
          </div>
        </div>
      </div>
    )
  }

  const PhotoGrid = ({list}) => (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'2px'}}>
      {list.length===0&&<div style={{color:MUT,padding:'4rem',gridColumn:'1/-1',textAlign:'center'}}>Нет фотографий</div>}
      {list.map(p=><PhotoCard key={p.id} p={p}/>)}
    </div>
  )

  const [showSeriesPicker, setShowSeriesPicker] = useState(false)
  const [showEditPhoto, setShowEditPhoto] = useState(false)
  const [editingPhoto, setEditingPhoto] = useState(null)

  async function assignSeriesToPhoto(photoId, seriesId) {
    setSeries(prev => { const updated = prev.map(s => { if (s.id===seriesId) { return (s.photoIds||[]).includes(photoId)?s:{...s,photoIds:[...(s.photoIds||[]),photoId]} } else { return {...s,photoIds:(s.photoIds||[]).filter(id=>id!==photoId)} } }); saveSeries(updated); return updated })
    try { await fetch('/api/photos',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:adminPassword,photoId,seriesId})}) } catch {}
    await loadPhotos()
  }

  async function deletePhoto(photoId) {
    if (!confirm('Удалить?')) return
    try { await fetch(`/api/photos?id=${photoId}&password=${encodeURIComponent(adminPassword)}`,{method:'DELETE'}); await loadPhotos(); setLightbox(null) } catch(err) { alert('Ошибка: '+err.message) }
  }

  async function saveEditPhoto(photoId, form) {
    try {
      const res = await fetch('/api/photos',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:adminPassword,photoId,...form})})
      if (!res.ok) throw new Error('Ошибка')
      await loadPhotos(); setShowEditPhoto(false); setEditingPhoto(null)
    } catch(err) { alert('Ошибка: '+err.message) }
  }

  const Lightbox = () => {
    const arr = getDisplayPhotos()
    const idx = arr.findIndex(p=>p.id===lightbox.id)
    const liked = isLiked(lightbox.id); const lc = likes[lightbox.id]||0; const vc = views[lightbox.id]||0
    const prev = arr[(idx-1+arr.length)%arr.length]; const next = arr[(idx+1)%arr.length]
    const currentSer = series.find(s=>(s.photoIds||[]).includes(lightbox.id))
    return (
      <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.97)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:60,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 1.5rem',background:'linear-gradient(to bottom,rgba(0,0,0,0.7),transparent)',zIndex:2}}>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <span style={{fontSize:'0.65rem',letterSpacing:'0.2em',textTransform:'uppercase',color:C}}>{lightbox.cat}</span>
            <span style={{fontSize:'0.65rem',color:MUT}}>{fmtDate(lightbox.date)}</span>
            {lightbox.location&&<span style={{fontSize:'0.65rem',color:MUT}}>📍 {lightbox.location}</span>}
            {vc>0&&<span style={{fontSize:'0.65rem',color:MUT}}>👁 {vc}</span>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {arr.length>1&&<span style={{fontSize:'0.65rem',color:MUT}}>{idx+1} / {arr.length}</span>}
            <button onClick={()=>setLightbox(null)} style={{background:'none',border:'none',color:TXT,fontSize:'1.6rem',cursor:'pointer',lineHeight:1,padding:'4px 8px'}}>✕</button>
          </div>
        </div>
        {arr.length>1&&<button onClick={()=>setLightbox(prev)} style={{position:'absolute',left:16,top:'50%',transform:'translateY(-50%)',width:52,height:52,borderRadius:'50%',border:'1px solid rgba(232,226,217,0.2)',background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',color:TXT,fontSize:'1.3rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}>←</button>}
        {arr.length>1&&<button onClick={()=>setLightbox(next)} style={{position:'absolute',right:16,top:'50%',transform:'translateY(-50%)',width:52,height:52,borderRadius:'50%',border:'1px solid rgba(232,226,217,0.2)',background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',color:TXT,fontSize:'1.3rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}>→</button>}
        <img src={lightbox.url} alt={lightbox.title} draggable={false} style={{maxWidth:'calc(100vw - 140px)',maxHeight:'calc(100vh - 160px)',width:'auto',height:'auto',objectFit:'contain',pointerEvents:'none',userSelect:'none',borderRadius:2}}/>
        <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'1.5rem 2rem',background:'linear-gradient(to top,rgba(0,0,0,0.85),transparent)',display:'flex',alignItems:'flex-end',justifyContent:'space-between',zIndex:2,flexWrap:'wrap',gap:8}}>
          <div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.5rem',fontWeight:300,marginBottom:4}}>{lightbox.title}</div>
            {lightbox.desc&&<div style={{fontSize:'0.8rem',color:MUT,maxWidth:600}}>{lightbox.desc}</div>}
          </div>
          <div style={{display:'flex',gap:8,flexShrink:0,flexWrap:'wrap'}}>
            <button onClick={e=>toggleLike(lightbox.id,e)} style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.75rem',padding:'8px 14px',borderRadius:2,border:liked?'1px solid rgba(226,75,74,0.5)':'1px solid rgba(232,226,217,0.2)',background:'rgba(0,0,0,0.5)',color:liked?'#E24B4A':MUT,cursor:'pointer'}}>{liked?'♥':'♡'}{lc>0?` (${lc})`:''}</button>
            {isAdmin&&<button onClick={()=>downloadWithWatermark(lightbox, about.name+' '+about.nameLast)} style={{fontSize:'0.75rem',padding:'8px 14px',borderRadius:2,border:'1px solid rgba(232,226,217,0.2)',background:'rgba(0,0,0,0.5)',color:MUT,cursor:'pointer'}}>↓ Скачать</button>}
            <button onClick={e=>{e.stopPropagation();setDlPhoto(lightbox);setShowDlModal(true)}} style={{fontSize:'0.75rem',padding:'8px 18px',borderRadius:2,border:`1px solid ${C}`,background:'transparent',color:C,cursor:'pointer'}}>✉ Напиши мне</button>
            {isAdmin&&<div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setEditingPhoto(lightbox);setShowEditPhoto(true)}} style={{fontSize:'0.75rem',padding:'8px 14px',borderRadius:2,border:'1px solid rgba(232,226,217,0.2)',background:'rgba(0,0,0,0.5)',color:TXT,cursor:'pointer'}}>✏</button>
              <button onClick={()=>deletePhoto(lightbox.id)} style={{fontSize:'0.75rem',padding:'8px 14px',borderRadius:2,border:'1px solid rgba(226,75,74,0.3)',background:'rgba(0,0,0,0.5)',color:'#E24B4A',cursor:'pointer'}}>🗑</button>
            </div>}
            {isAdmin&&<div style={{position:'relative'}}>
              <button onClick={()=>setShowSeriesPicker(p=>!p)} style={{fontSize:'0.75rem',padding:'8px 14px',borderRadius:2,border:'1px solid rgba(232,226,217,0.2)',background:'rgba(0,0,0,0.5)',color:MUT,cursor:'pointer'}}>✏ {currentSer?currentSer.title:'Серия'}</button>
              {showSeriesPicker&&<div style={{position:'absolute',bottom:'110%',right:0,background:'#1a1a1a',border:'1px solid rgba(232,226,217,0.15)',borderRadius:4,minWidth:200,zIndex:10,overflow:'hidden'}}>
                <div onClick={()=>{assignSeriesToPhoto(lightbox.id,'');setShowSeriesPicker(false)}} style={{padding:'10px 14px',fontSize:'0.78rem',color:MUT,cursor:'pointer',borderBottom:'1px solid rgba(232,226,217,0.06)'}} onMouseEnter={e=>e.target.style.background='rgba(232,226,217,0.06)'} onMouseLeave={e=>e.target.style.background='transparent'}>— Без серии —</div>
                {series.map(s=><div key={s.id} onClick={()=>{assignSeriesToPhoto(lightbox.id,s.id);setShowSeriesPicker(false)}} style={{padding:'10px 14px',fontSize:'0.78rem',color:s.id===currentSer?.id?C:TXT,cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(232,226,217,0.06)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{s.id===currentSer?.id?'✓ ':''}{s.title}</div>)}
              </div>}
            </div>}
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════
  // HOME — SNAP-SCROLL STORYTELLING
  // ══════════════════════════════════════════════════
  if (view==='home') {
    const seriesData = series.map(ser=>({...ser, photos:photos.filter(p=>(ser.photoIds||[]).includes(p.id))}))
    const activeCats = cats.filter(cat=>photos.filter(p=>p.cat===cat).length>0)
    const hasSeriesSection = seriesData.length > 0
    // sections: [0]=слайдер, [1]=серии?, [2]=категории?, [last]=автор
    const sectionLabels = ['Главная', ...(hasSeriesSection?['Серии']:[]), ...(activeCats.length>0?['Категории']:[]), 'Об авторе']

    function scrollTo(idx) {
      const el = document.getElementById(`sec-${idx}`)
      if (el) el.scrollIntoView({behavior:'smooth'})
    }

    return (
      <div style={{background:BG,color:TXT,fontFamily:"'Jost',sans-serif",fontWeight:300}}>
        {/* ── Global styles for cursor and hover zoom ── */}
        <style>{`
          * { cursor: none !important; }
          .icon-thumb { transition: transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 0.35s ease; }
          .icon-thumb:hover { transform: scale(1.08); box-shadow: 0 8px 32px rgba(0,0,0,0.6); z-index: 2; }
        `}</style>

        {/* ── Custom cursor ── */}
        {!isMobile&&<>
          <div style={{position:'fixed',left:cursorPos.x,top:cursorPos.y,width:cursorHover?36:14,height:cursorHover?36:14,borderRadius:'50%',border:`1.5px solid ${C}`,transform:'translate(-50%,-50%)',pointerEvents:'none',zIndex:9999,transition:'width 0.2s,height 0.2s,opacity 0.2s',opacity:0.85,mixBlendMode:'normal'}}/>
          <div style={{position:'fixed',left:cursorPos.x,top:cursorPos.y,width:4,height:4,borderRadius:'50%',background:C,transform:'translate(-50%,-50%)',pointerEvents:'none',zIndex:9999}}/>
        </>}

        {/* ── Preloader ── */}
        {!preloaderDone&&(
          <div style={{position:'fixed',inset:0,zIndex:9000,background:BG,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16,opacity:preloaderOut?0:1,transition:'opacity 0.6s ease',pointerEvents:preloaderOut?'none':'all'}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMobile?'2rem':'3rem',fontWeight:300,letterSpacing:'0.15em',color:TXT,opacity:preloaderOut?0:1,transform:preloaderOut?'translateY(-10px)':'translateY(0)',transition:'all 0.5s ease'}}>
              {about.name} <em style={{color:C,fontStyle:'italic'}}>{about.nameLast}</em>
            </div>
            <div style={{width:40,height:1,background:`linear-gradient(to right,transparent,${C},transparent)`,animation:'none'}}/>
            <div style={{fontSize:'0.6rem',letterSpacing:'0.3em',textTransform:'uppercase',color:MUT}}>Фотограф</div>
          </div>
        )}

        {/* ── Floating search button ── */}
        <button onClick={()=>setShowSearchModal(true)}
          style={{position:'fixed',bottom:isMobile?'1.5rem':'2rem',left:'50%',transform:'translateX(-50%)',zIndex:250,background:'rgba(10,10,10,0.75)',backdropFilter:'blur(12px)',border:`1px solid rgba(232,226,217,0.18)`,color:MUT,borderRadius:999,padding:'10px 22px',fontSize:'0.7rem',letterSpacing:'0.18em',textTransform:'uppercase',display:'flex',alignItems:'center',gap:8,boxShadow:'0 4px 24px rgba(0,0,0,0.5)'}}>
          <span style={{fontSize:'0.8rem'}}>🔍</span> Поиск
        </button>

        {/* ── Search modal ── */}
        {showSearchModal&&(
          <div style={{position:'fixed',inset:0,zIndex:2000,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(12px)',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:'12vh'}} onClick={e=>e.target===e.currentTarget&&setShowSearchModal(false)}>
            <div style={{width:'100%',maxWidth:560,padding:'0 1.5rem'}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.8rem',fontWeight:300,textAlign:'center',marginBottom:'1.5rem',color:TXT}}>Поиск фотографий</div>
              <div style={{position:'relative',marginBottom:'1.5rem'}}>
                <input autoFocus value={homeSearch} onChange={e=>setHomeSearch(e.target.value)}
                  style={{width:'100%',padding:'14px 50px 14px 20px',fontSize:15,background:'rgba(255,255,255,0.06)',border:`1px solid rgba(232,226,217,0.2)`,borderRadius:4,color:TXT,outline:'none',fontFamily:"'Jost',sans-serif",boxSizing:'border-box'}}
                  placeholder="Название, категория, место..."/>
                <button onClick={()=>setShowSearchModal(false)} style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:MUT,fontSize:'1.2rem',cursor:'pointer'}}>✕</button>
              </div>
              {homeSearch.trim()&&(()=>{
                const results = photos.filter(p=>
                  p.title?.toLowerCase().includes(homeSearch.toLowerCase())||
                  p.cat?.toLowerCase().includes(homeSearch.toLowerCase())||
                  p.location?.toLowerCase().includes(homeSearch.toLowerCase())||
                  p.desc?.toLowerCase().includes(homeSearch.toLowerCase())
                ).slice(0,8)
                return (
                  <div style={{display:'flex',flexDirection:'column',gap:2,maxHeight:'55vh',overflowY:'auto'}}>
                    {results.length===0&&<div style={{color:MUT,textAlign:'center',padding:'2rem',fontSize:'0.85rem'}}>Ничего не найдено</div>}
                    {results.map(p=>(
                      <div key={p.id} onClick={()=>{incrementView(p.id);setLightbox(p);setShowSearchModal(false)}}
                        style={{display:'flex',alignItems:'center',gap:14,padding:'10px 12px',borderRadius:3,background:'rgba(255,255,255,0.04)',cursor:'pointer',border:'1px solid rgba(232,226,217,0.08)'}}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(200,169,110,0.08)'}
                        onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}>
                        <div style={{width:52,height:36,borderRadius:2,overflow:'hidden',flexShrink:0,background:'#1a1a1a'}}>
                          {p.thumb&&<img src={p.thumb} alt="" style={{width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none'}}/>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1rem',fontWeight:300,color:TXT,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.title}</div>
                          <div style={{fontSize:'0.62rem',letterSpacing:'0.15em',textTransform:'uppercase',color:C,marginTop:2}}>{p.cat}{p.location?` · ${p.location}`:''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        <Nav solid={false}/>

        {/* ── Dot навигация справа ── */}
        <div style={{position:'fixed',right:isMobile?6:18,top:'50%',transform:'translateY(-50%)',zIndex:300,display:'flex',flexDirection:'column',gap:8}}>
          {sectionLabels.map((label,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:8,cursor:'pointer',padding:'3px 0',group:'true'}}
              onClick={()=>scrollTo(i)}>
              {!isMobile&&(
                <span style={{
                  fontSize:'0.58rem',letterSpacing:'0.14em',textTransform:'uppercase',
                  color:currentSection===i?C:MUT,
                  opacity:currentSection===i?1:0,
                  maxWidth:currentSection===i?120:0,
                  overflow:'hidden',
                  whiteSpace:'nowrap',
                  transition:'all 0.35s ease',
                  pointerEvents:'none'
                }}>{label}</span>
              )}
              <div style={{
                width:currentSection===i?8:4,
                height:currentSection===i?8:4,
                borderRadius:'50%',
                background:currentSection===i?C:'rgba(232,226,217,0.25)',
                border:currentSection===i?'none':'1px solid rgba(232,226,217,0.35)',
                transition:'all 0.3s ease',
                flexShrink:0,
                boxShadow:currentSection===i?`0 0 8px ${C}55`:''
              }}/>
            </div>
          ))}
        </div>

        {/* ── Scroll контейнер ── */}
        <div
          style={{height:'100vh',overflowY:'scroll',scrollSnapType:'y mandatory'}}
          onScroll={e=>{
            const idx = Math.round(e.target.scrollTop / window.innerHeight)
            setCurrentSection(Math.max(0,Math.min(idx,sectionLabels.length-1)))
          }}>

          {/* ── Секция 0: Слайдер ── */}
          <section id="sec-0" style={{height:'100vh',scrollSnapAlign:'start',position:'relative',display:'flex',alignItems:'flex-end',overflow:'hidden'}}>
            {slidePhotos.length===0&&<div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#1a1a2e,#0f3460)'}}/>}
            {slidePhotos.map((p,i)=>(
              <div key={p.id} style={{position:'absolute',inset:0,opacity:i===slideIdx?1:0,transition:'opacity 1.2s ease'}}>
                <div style={{position:'absolute',inset:0,backgroundImage:`url(${p.url})`,backgroundSize:'cover',backgroundPosition:'center'}}/>
                <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.6) 100%)'}}/>
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:'55%',background:'linear-gradient(to top,rgba(0,0,0,0.9),transparent)'}}/>
              </div>
            ))}
            <div style={{position:'relative',zIndex:2,padding:isMobile?'0 1.5rem 5rem':'0 3rem 5rem',width:'100%'}}>
              {slidePhotos.length>0&&<div style={{fontSize:'0.65rem',letterSpacing:'0.25em',textTransform:'uppercase',color:C,marginBottom:'0.6rem'}}>{slidePhotos[slideIdx]?.cat}</div>}
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'clamp(2rem,5vw,4.5rem)',fontWeight:300,lineHeight:1.05}}>
                {slidePhotos.length>0?slidePhotos[slideIdx]?.title:'Bobur Gafurov'}
              </div>
              {slidePhotos.length>0&&<div style={{fontSize:'0.7rem',color:MUT,letterSpacing:'0.15em',marginTop:'0.75rem'}}>{fmtDate(slidePhotos[slideIdx]?.date)}</div>}
            </div>
            {/* Стрелки слайдера */}
            {slidePhotos.length>1&&(
              <div style={{position:'absolute',bottom:'2rem',left:isMobile?'1rem':'3rem',zIndex:10,display:'flex',gap:'0.75rem'}}>
                {['←','→'].map((ar,i)=>(
                  <button key={i} onClick={()=>setSlideIdx(idx=>i===0?(idx-1+slidePhotos.length)%slidePhotos.length:(idx+1)%slidePhotos.length)}
                    style={{width:40,height:40,borderRadius:'50%',border:'1px solid rgba(232,226,217,0.2)',background:'rgba(10,10,10,0.4)',backdropFilter:'blur(6px)',color:TXT,cursor:'pointer',fontSize:'0.9rem',display:'flex',alignItems:'center',justifyContent:'center'}}>{ar}</button>
                ))}
              </div>
            )}
            {/* Статистика */}
            <div style={{position:'absolute',right:isMobile?'2.5rem':'3rem',bottom:'2rem',zIndex:10,display:'flex',gap:'1.5rem'}}>
              {[[photos.length,'фото'],[series.length,'серий']].map(([num,label])=>(
                <div key={label} style={{textAlign:'center'}}>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.4rem',fontWeight:300,lineHeight:1}}>{num}</div>
                  <div style={{fontSize:'0.55rem',letterSpacing:'0.18em',textTransform:'uppercase',color:MUT,marginTop:2}}>{label}</div>
                </div>
              ))}
            </div>
            {/* Подсказка скролл */}
            <div style={{position:'absolute',bottom:'1rem',left:'50%',transform:'translateX(-50%)',zIndex:10,display:'flex',flexDirection:'column',alignItems:'center',gap:4,opacity:0.4}}>
              <span style={{fontSize:'0.5rem',letterSpacing:'0.2em',textTransform:'uppercase',color:MUT}}>скролл</span>
              <div style={{width:1,height:28,background:'linear-gradient(to bottom,rgba(232,226,217,0.5),transparent)'}}/>
            </div>
          </section>

          {/* ── Секция серий (sec-1) ── */}
          {hasSeriesSection&&(()=>{
            return (
              <section id="sec-1" style={{minHeight:'100vh',scrollSnapAlign:'start',display:'flex',flexDirection:'column',justifyContent:'center',padding:isMobile?'5rem 1rem 3rem':'5rem 3rem 3rem',position:'relative'}}>
                <div style={{position:'relative',zIndex:1}}>
                  <div style={{marginBottom:'2rem'}}>
                    <div style={{fontSize:'0.58rem',letterSpacing:'0.28em',textTransform:'uppercase',color:C,marginBottom:10,opacity:0.8}}>Коллекции · {seriesData.length} серий</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMobile?'2.5rem':'4rem',fontWeight:300,lineHeight:1}}>Серии</div>
                  </div>
                  {/* Все серии — мелкие иконки */}
                  <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(3,1fr)':'repeat(auto-fill,minmax(130px,1fr))',gap:isMobile?'0.6rem':'0.75rem'}}>
                    {seriesData.map(ser=>{
                      const cover=ser.cover||ser.photos?.[0]?.url
                      return (
                        <div key={ser.id} onClick={()=>{setView('gallery');setGalleryTab('series');setActiveSeries(ser)}}
                          className="icon-thumb"
                          style={{position:'relative',borderRadius:3,overflow:'hidden',cursor:'pointer',aspectRatio:'1',background:'linear-gradient(135deg,#1a1a2e,#0f3460)'}}>
                          {cover&&<img src={cover} alt={ser.title} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none'}} draggable={false}/>}
                          <div className="sov" style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',transition:'background 0.3s',display:'flex',flexDirection:'column',justifyContent:'flex-end',padding:'0.5rem 0.6rem'}}>
                            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMobile?'0.75rem':'0.85rem',fontWeight:300,lineHeight:1.2,color:TXT,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{ser.title}</div>
                            <div style={{fontSize:'0.55rem',letterSpacing:'0.14em',textTransform:'uppercase',color:C,marginTop:2,opacity:0.9}}>{ser.photos?.length||0} фото</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )
          })()}

          {/* ── Секция категорий (одна, мелкие иконки) ── */}
          {activeCats.length>0&&(()=>{
            const secIdx = hasSeriesSection?2:1
            return (
              <section id={`sec-${secIdx}`} style={{minHeight:'100vh',scrollSnapAlign:'start',display:'flex',flexDirection:'column',justifyContent:'center',padding:isMobile?'5rem 1rem 3rem':'5rem 3rem 3rem',position:'relative'}}>
                <div style={{position:'relative',zIndex:1}}>
                  <div style={{marginBottom:'2rem'}}>
                    <div style={{fontSize:'0.58rem',letterSpacing:'0.28em',textTransform:'uppercase',color:C,marginBottom:10,opacity:0.8}}>Темы · {activeCats.length} категорий</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMobile?'2.5rem':'4rem',fontWeight:300,lineHeight:1}}>Категории</div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(3,1fr)':'repeat(auto-fill,minmax(130px,1fr))',gap:isMobile?'0.6rem':'0.75rem'}}>
                    {activeCats.map(cat=>{
                      const catPhotos = photos.filter(p=>p.cat===cat)
                      const cover = catPhotos[0]?.url
                      return (
                        <div key={cat} onClick={()=>{setFilterCat(cat);setView('gallery');setGalleryTab('all')}}
                          className="icon-thumb"
                          style={{position:'relative',borderRadius:3,overflow:'hidden',cursor:'pointer',aspectRatio:'1',background:'linear-gradient(135deg,#1a1a2e,#0f3460)'}}>
                          {cover&&<img src={cover} alt={cat} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none'}} draggable={false}/>}
                          <div className="cov" style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',transition:'background 0.3s',display:'flex',flexDirection:'column',justifyContent:'flex-end',padding:'0.5rem 0.6rem'}}>
                            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMobile?'0.75rem':'0.85rem',fontWeight:300,lineHeight:1.2,color:TXT,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{cat}</div>
                            <div style={{fontSize:'0.55rem',letterSpacing:'0.14em',textTransform:'uppercase',color:C,marginTop:2,opacity:0.9}}>{catPhotos.length} фото</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )
          })()}

          {/* ── Секция об авторе ── */}
          {(()=>{
            const secIdx = (hasSeriesSection?2:1) + (activeCats.length>0?1:0)
            return (
              <section id={`sec-${secIdx}`} style={{minHeight:'100vh',scrollSnapAlign:'start',display:'flex',alignItems:'center',justifyContent:'center',padding:isMobile?'5rem 1.25rem 3rem':'4rem 3rem',position:'relative',overflow:'hidden'}}>
                {avatarUrl&&<div style={{position:'absolute',inset:0,backgroundImage:`url(${avatarUrl})`,backgroundSize:'cover',backgroundPosition:'center top',filter:'blur(60px)',opacity:0.07,transform:'scale(1.1)'}}/>}
                <div style={{maxWidth:900,width:'100%',display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:isMobile?'2rem':'5rem',alignItems:'center',position:'relative',zIndex:1}}>
                  <div style={{aspectRatio:'3/4',position:'relative',overflow:'hidden',background:'linear-gradient(160deg,#1a1a2e,#0f3460 60%,#1c0a00)',borderRadius:2,maxHeight:isMobile?'45vh':'65vh'}}>
                    {avatarUrl&&<img src={avatarUrl} alt={about.name} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none'}} draggable={false}/>}
                    {isAdmin&&<button onClick={()=>setShowAvatarUpload(true)} style={{position:'absolute',bottom:16,left:'50%',transform:'translateX(-50%)',padding:'7px 18px',fontSize:'0.65rem',letterSpacing:'0.15em',textTransform:'uppercase',background:'rgba(10,10,10,0.75)',backdropFilter:'blur(4px)',border:`1px solid ${C}`,color:C,cursor:'pointer',borderRadius:2,whiteSpace:'nowrap'}}>{avatarUrl?'✏ Сменить':'+ Фото'}</button>}
                  </div>
                  <div>
                    <div style={{fontSize:'0.62rem',letterSpacing:'0.28em',textTransform:'uppercase',color:C,marginBottom:'1rem'}}>Об авторе</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'clamp(1.8rem,4vw,3rem)',fontWeight:300,lineHeight:1.1,marginBottom:'1.25rem'}}>
                      {about.name} <em style={{color:C,fontStyle:'italic'}}>{about.nameLast}</em>
                    </div>
                    <div style={{width:36,height:1,background:C,marginBottom:'1.25rem',opacity:0.6}}/>
                    <div style={{fontSize:'0.84rem',lineHeight:1.85,color:MUT,marginBottom:'1.5rem'}}>
                      {about.bio.split('\n\n').map((p,i)=><p key={i} style={{marginTop:i>0?'0.8rem':0}}>{p}</p>)}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem',borderTop:'1px solid rgba(232,226,217,0.08)',borderBottom:'1px solid rgba(232,226,217,0.08)',padding:'1rem 0',marginBottom:'1.5rem'}}>
                      {[[photos.length,'Фото'],[series.length,'Серий'],[Object.values(likes).reduce((a,b)=>a+b,0),'Лайков']].map(([num,label])=>(
                        <div key={label}>
                          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.8rem',fontWeight:300,color:C,lineHeight:1}}>{num}</div>
                          <div style={{fontSize:'0.6rem',letterSpacing:'0.18em',textTransform:'uppercase',color:MUT,marginTop:3}}>{label}</div>
                        </div>
                      ))}
                    </div>
                    {[['@',about.email],['ig',about.ig],about.phone?['☎',about.phone]:null,about.telegram?['tg',about.telegram]:null,['✦',about.city]].filter(Boolean).map(([icon,val])=>(
                      <div key={icon} style={{display:'flex',alignItems:'center',gap:'0.8rem',fontSize:'0.77rem',color:MUT,marginBottom:'0.5rem'}}>
                        <span style={{color:C,width:20,fontSize:'0.7rem',flexShrink:0}}>{icon}</span>
                        <span style={{color:TXT}}>{val}</span>
                      </div>
                    ))}
                    <div style={{display:'flex',gap:'0.75rem',marginTop:'1.5rem',flexWrap:'wrap'}}>
                      <button onClick={()=>setView('gallery')} style={{padding:'9px 22px',fontSize:'0.7rem',letterSpacing:'0.18em',textTransform:'uppercase',border:'none',background:C,color:BG,cursor:'pointer',borderRadius:2}}>Галерея</button>
                      <button onClick={()=>requireAdmin('about',()=>setShowAboutEdit(true))} style={{padding:'9px 22px',fontSize:'0.7rem',letterSpacing:'0.18em',textTransform:'uppercase',border:'1px solid rgba(232,226,217,0.2)',background:'transparent',color:MUT,cursor:'pointer',borderRadius:2}}>Редактировать</button>
                    </div>
                  </div>
                </div>
              </section>
            )
          })()}

        </div>{/* end scroll container */}

        {lightbox&&<Lightbox/>}
        {showDlModal&&dlPhoto&&<DlModal/>}
        {showPwModal&&<PwModal/>}
        {showUpload&&<UploadModal/>}
        {showEditPhoto&&editingPhoto&&<EditPhotoModal/>}
        {showAboutEdit&&<AboutEditModal/>}
        {showAvatarUpload&&<AvatarUploadModal/>}
      </div>
    )
  }

  // ═══ GALLERY ═══
  if (view==='gallery') {
    const displayPhotos = getDisplayPhotos()
    const seriesData = series.map(ser=>({...ser,photos:photos.filter(p=>(ser.photoIds||[]).includes(p.id))}))
    return (
      <div style={{minHeight:'100vh',background:BG,color:TXT,fontFamily:"'Jost',sans-serif",fontWeight:300,overflowY:'auto'}}>
        <Nav solid={true}/>
        <div style={{paddingTop:isMobile?56:80}}>
          <div style={{padding:isMobile?'1rem 1rem 0':'2rem 3rem 0',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'2.2rem',fontWeight:300}}>Галерея</div>
            <div style={{display:'flex',gap:8}}>
              {isAdmin&&galleryTab==='all'&&<button style={{fontSize:'0.65rem',padding:'6px 16px',borderRadius:2,border:'none',background:C,color:BG,cursor:'pointer',letterSpacing:'0.12em',textTransform:'uppercase'}} onClick={()=>setShowCatManager(true)}>⚙ Темы</button>}
              {isAdmin&&galleryTab==='series'&&<button style={{fontSize:'0.65rem',padding:'6px 16px',borderRadius:2,border:'none',background:C,color:BG,cursor:'pointer',letterSpacing:'0.12em',textTransform:'uppercase'}} onClick={()=>{setEditingSeries(null);setShowSeriesEdit(true)}}>+ Серия</button>}
            </div>
          </div>
          <div style={{padding:isMobile?'0.75rem 1rem 0':'1.25rem 3rem 0',display:'flex',borderBottom:'1px solid rgba(232,226,217,0.08)'}}>
            {[['all','Все фото'],['cats','Категории'],['series','Серии']].map(([tab,label])=>(
              <button key={tab} onClick={()=>{setGalleryTab(tab);setActiveSeries(null)}} style={{padding:'10px 24px',fontSize:'0.72rem',letterSpacing:'0.15em',textTransform:'uppercase',background:'transparent',border:'none',borderBottom:galleryTab===tab?`2px solid ${C}`:'2px solid transparent',color:galleryTab===tab?TXT:MUT,cursor:'pointer',marginBottom:-1}}>{label}</button>
            ))}
          </div>
          {galleryTab==='all'&&(
            <div>
              <div style={{padding:'1rem 3rem',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                <div style={{position:'relative'}}>
                  <span style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',opacity:0.4,fontSize:13}}>🔍</span>
                  <input style={{padding:'6px 10px 6px 32px',fontSize:13,border:'0.5px solid rgba(232,226,217,0.2)',borderRadius:6,background:'rgba(255,255,255,0.05)',color:TXT,outline:'none',width:200}} placeholder="Поиск..." value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                {['Все',...cats].map(cat=>(
                  <button key={cat} onClick={()=>setFilterCat(cat)} style={{fontSize:'0.65rem',padding:'5px 13px',borderRadius:999,border:filterCat===cat?'none':'1px solid rgba(232,226,217,0.2)',cursor:'pointer',background:filterCat===cat?C:'transparent',color:filterCat===cat?BG:MUT,letterSpacing:'0.15em',textTransform:'uppercase'}}>{cat}</button>
                ))}
                <div style={{marginLeft:'auto',display:'flex',gap:6}}>
                  {[['new','Новые'],['old','Старые'],['popular','Популярные']].map(([m,l])=>(
                    <button key={m} onClick={()=>setSortMode(m)} style={{fontSize:'0.65rem',padding:'5px 12px',borderRadius:6,border:sortMode===m?`1px solid ${C}`:'1px solid rgba(232,226,217,0.2)',cursor:'pointer',background:'transparent',color:sortMode===m?C:MUT}}>{l}</button>
                  ))}
                </div>
              </div>
              <div style={{fontSize:'0.7rem',color:MUT,padding:isMobile?'0 1rem 0.5rem':'0 3rem 0.5rem'}}>{displayPhotos.length} фото</div>
              <div style={{padding:isMobile?'0 1rem 4rem':'0 3rem 4rem'}}><PhotoGrid list={displayPhotos}/></div>
            </div>
          )}
          {galleryTab==='cats'&&(
            <div style={{padding:'2rem 3rem 4rem'}}>
              {cats.map(cat=>{
                const cp=photos.filter(p=>p.cat===cat); if(!cp.length) return null
                return (
                  <div key={cat} style={{marginBottom:'3rem'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
                      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.6rem',fontWeight:300}}>{cat}</div>
                      <span style={{fontSize:'0.65rem',letterSpacing:'0.18em',textTransform:'uppercase',color:C}}>{cp.length} фото</span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'2px'}}>{cp.slice(0,6).map(p=><PhotoCard key={p.id} p={p}/>)}</div>
                    {cp.length>6&&<button onClick={()=>{setFilterCat(cat);setGalleryTab('all')}} style={{marginTop:12,fontSize:'0.65rem',letterSpacing:'0.18em',textTransform:'uppercase',background:'transparent',border:`1px solid ${C}`,color:C,padding:'7px 20px',borderRadius:2,cursor:'pointer'}}>Показать все {cp.length} →</button>}
                  </div>
                )
              })}
            </div>
          )}
          {galleryTab==='series'&&(
            <div style={{padding:'2rem 3rem 4rem'}}>
              {activeSeries?(
                <div>
                  <div style={{marginBottom:'1.5rem'}}>
                    <div style={{fontSize:'0.65rem',letterSpacing:'0.2em',textTransform:'uppercase',color:C,marginBottom:8,cursor:'pointer'}} onClick={()=>setActiveSeries(null)}>← Все серии</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'2rem',fontWeight:300}}>{activeSeries.title}</div>
                    {activeSeries.desc&&<div style={{fontSize:'0.85rem',color:MUT,marginTop:6}}>{activeSeries.desc}</div>}
                  </div>
                  {(activeSeries.photos?.length||0)===0?<div style={{color:MUT,padding:'2rem 0'}}>Пока нет фото.</div>:<PhotoGrid list={activeSeries.photos||[]}/>}
                </div>
              ):(
                <>
                  {seriesData.length===0&&<div style={{color:MUT,padding:'4rem 0',textAlign:'center'}}>Серий пока нет.</div>}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'1.5rem'}}>
                    {seriesData.map(ser=>{
                      const cover=ser.cover||ser.photos?.[0]?.url
                      return (
                        <div key={ser.id} onClick={()=>setActiveSeries(ser)} style={{position:'relative',borderRadius:4,overflow:'hidden',cursor:'pointer',aspectRatio:'4/3',background:'linear-gradient(135deg,#1a1a2e,#0f3460)'}}>
                          {cover&&<img src={cover} alt={ser.title} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none'}} draggable={false}/>}
                          <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 60%)',display:'flex',flexDirection:'column',justifyContent:'flex-end',padding:'1.5rem'}}>
                            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.4rem',fontWeight:300}}>{ser.title}</div>
                            <div style={{fontSize:'0.65rem',letterSpacing:'0.18em',textTransform:'uppercase',color:C,marginTop:4}}>{ser.photos?.length||0} фото</div>
                            {ser.desc&&<div style={{fontSize:'0.75rem',color:'rgba(232,226,217,0.55)',marginTop:4}}>{ser.desc}</div>}
                          </div>
                          {isAdmin&&<button onClick={e=>{e.stopPropagation();setEditingSeries(ser);setShowSeriesEdit(true)}} style={{position:'absolute',top:10,right:10,background:'rgba(10,10,10,0.7)',border:'1px solid rgba(232,226,217,0.2)',color:TXT,borderRadius:2,padding:'4px 10px',fontSize:'0.65rem',cursor:'pointer'}}>✏</button>}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {lightbox&&<Lightbox/>}
        {showDlModal&&dlPhoto&&<DlModal/>}
        {showPwModal&&<PwModal/>}
        {showUpload&&<UploadModal/>}
        {showCatManager&&<CatManagerModal/>}
        {showSeriesEdit&&<SeriesEditModal/>}
        {showEditPhoto&&editingPhoto&&<EditPhotoModal/>}
      </div>
    )
  }

  // ═══ ABOUT ═══
  if (view==='about') return (
    <div style={{minHeight:'100vh',background:BG,color:TXT,fontFamily:"'Jost',sans-serif",fontWeight:300,overflowY:'auto'}}>
      <Nav solid={true}/>
      <div style={{maxWidth:900,margin:'0 auto',padding:isMobile?'calc(56px + 1.5rem) 1.25rem 3rem':'calc(64px + 3rem) 3rem 5rem',display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:isMobile?'2rem':'5rem',alignItems:'start'}}>
        <div style={{aspectRatio:'3/4',position:'relative',overflow:'hidden',background:'linear-gradient(160deg,#1a1a2e,#0f3460 60%,#1c0a00)'}}>
          {avatarUrl&&<img src={avatarUrl} alt={about.name} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none'}} draggable={false}/>}
          {isAdmin&&<button onClick={()=>setShowAvatarUpload(true)} style={{position:'absolute',bottom:16,left:'50%',transform:'translateX(-50%)',padding:'7px 18px',fontSize:'0.65rem',letterSpacing:'0.15em',textTransform:'uppercase',background:'rgba(10,10,10,0.75)',backdropFilter:'blur(4px)',border:`1px solid ${C}`,color:C,cursor:'pointer',borderRadius:2,whiteSpace:'nowrap'}}>{avatarUrl?'✏ Сменить фото':'+ Фото профиля'}</button>}
        </div>
        <div>
          <div style={{fontSize:'0.62rem',letterSpacing:'0.28em',textTransform:'uppercase',color:C,marginBottom:'1.2rem'}}>Об авторе</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'clamp(2.2rem,4vw,3.2rem)',fontWeight:300,lineHeight:1.1,marginBottom:'2rem'}}>
            {about.name} <em style={{color:C,fontStyle:'italic'}}>{about.nameLast}</em>
          </div>
          <div style={{width:40,height:1,background:C,marginBottom:'1.8rem',opacity:0.6}}/>
          <div style={{fontSize:'0.88rem',lineHeight:1.9,color:MUT,marginBottom:'2rem'}}>
            {about.bio.split('\n\n').map((p,i)=><p key={i} style={{marginTop:i>0?'1rem':0}}>{p}</p>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1.5rem',borderTop:'1px solid rgba(232,226,217,0.08)',borderBottom:'1px solid rgba(232,226,217,0.08)',padding:'1.5rem 0',marginBottom:'2.5rem'}}>
            {[[photos.length,'Фотографий'],[series.length,'Серий'],[Object.values(likes).reduce((a,b)=>a+b,0),'Лайков']].map(([num,label])=>(
              <div key={label}>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'2rem',fontWeight:300,color:C,lineHeight:1}}>{num}</div>
                <div style={{fontSize:'0.62rem',letterSpacing:'0.18em',textTransform:'uppercase',color:MUT,marginTop:4}}>{label}</div>
              </div>
            ))}
          </div>
          {[['@',about.email],['ig',about.ig],about.phone?['☎',about.phone]:null,about.telegram?['tg',about.telegram]:null,['✦',about.city]].filter(Boolean).map(([icon,val])=>(
            <div key={icon} style={{display:'flex',alignItems:'center',gap:'1rem',fontSize:'0.78rem',color:MUT,marginBottom:'0.6rem'}}>
              <span style={{color:C,width:20,fontSize:'0.7rem',flexShrink:0}}>{icon}</span><span style={{color:TXT}}>{val}</span>
            </div>
          ))}
          <div style={{display:'flex',gap:'1rem',marginTop:'2rem',flexWrap:'wrap'}}>
            <button onClick={()=>requireAdmin('about',()=>setShowAboutEdit(true))} style={{padding:'9px 24px',fontSize:'0.7rem',letterSpacing:'0.18em',textTransform:'uppercase',border:'1px solid rgba(232,226,217,0.2)',background:'transparent',color:MUT,cursor:'pointer',borderRadius:2}}>Редактировать</button>
          </div>
        </div>
      </div>
      {showPwModal&&<PwModal/>}
      {showAboutEdit&&<AboutEditModal/>}
      {showAvatarUpload&&<AvatarUploadModal/>}
    </div>
  )

  // ══════ MODALS ══════
  function PwModal() {
    const labels={upload:'Вход для загрузки',about:'Редактирование профиля',series:'Управление сериями',cat:'Управление темами'}
    return (
      <div style={MB} onClick={e=>e.target===e.currentTarget&&setShowPwModal(false)}>
        <div style={MBX}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:'1.8rem',marginBottom:'1rem',opacity:0.5}}>🔒</div>
            <div style={mTitle}>{labels[pwPurpose]||'Вход'}</div>
            <div style={{fontSize:'0.75rem',color:MUT,marginBottom:'1.8rem'}}>Введите пароль администратора</div>
            <input style={{...mInput,textAlign:'center',letterSpacing:'0.3em',marginBottom:'0.5rem'}} type="password" placeholder="••••••••" value={pwInput} onChange={e=>setPwInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&checkPassword()} autoFocus/>
            {pwError&&<div style={{color:'#E24B4A',fontSize:'0.72rem',marginBottom:'0.5rem'}}>{pwError}</div>}
            <button style={{...btnSave,width:'100%',padding:10,marginTop:8}} onClick={checkPassword}>Войти</button>
            <br/><button style={{...btnCancel,border:'none',marginTop:8}} onClick={()=>setShowPwModal(false)}>Отмена</button>
          </div>
        </div>
      </div>
    )
  }

  function UploadModal() {
    return (
      <div style={MB} onClick={e=>e.target===e.currentTarget&&setShowUpload(false)}>
        <div style={{...MBX,width:uploadMode==='bulk'?720:460,maxWidth:'96vw',maxHeight:'92vh',overflowY:'auto'}}>
          <button style={closeX} onClick={()=>setShowUpload(false)}>✕</button>
          <div style={{display:'flex',marginBottom:'1.5rem',borderBottom:'1px solid rgba(232,226,217,0.08)'}}>
            {[['single','Одно фото'],['bulk','Несколько фото']].map(([mode,label])=>(
              <button key={mode} onClick={()=>setUploadMode(mode)} style={{padding:'8px 20px',fontSize:'0.72rem',letterSpacing:'0.15em',textTransform:'uppercase',background:'transparent',border:'none',borderBottom:uploadMode===mode?`2px solid ${C}`:'2px solid transparent',color:uploadMode===mode?TXT:MUT,cursor:'pointer',marginBottom:-1}}>{label}</button>
            ))}
          </div>
          {uploadMode==='single'&&(
            <>
              <div style={{marginBottom:'1rem'}}>
                <label style={mLabel}>Фотография</label>
                <div style={{border:uploadFile?`1.5px solid ${C}`:'1.5px dashed rgba(232,226,217,0.2)',borderRadius:2,padding:'1.25rem',textAlign:'center',cursor:'pointer',color:uploadFile?C:MUT,fontSize:13,position:'relative'}} onClick={()=>{if(analyzing)return;const fi=document.getElementById('fi');if(fi){fi.value='';fi.click()}}}>
                  {uploadPreview?<img src={uploadPreview} alt="" style={{maxHeight:100,borderRadius:2,display:'block',margin:'0 auto'}}/>:'Нажмите, чтобы выбрать фото'}
                  <div style={{marginTop:4,fontSize:11}}>{uploadFile?.name||''}</div>
                  {analyzing&&<div style={{position:'absolute',inset:0,background:'rgba(10,10,10,0.8)',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:2,flexDirection:'column',gap:8}}><div style={{fontSize:'1.2rem'}}>🤖</div><div style={{fontSize:'0.75rem',color:C}}>AI анализирует...</div></div>}
                </div>
                <input id="fi" type="file" accept="image/*" style={{display:'none'}} onChange={onFileSelect} onClick={e=>{e.target.value=''}}/>
              </div>
              {[['title','Название','Напр. Закат в горах'],['desc','Описание','Атмосфера...'],['location','📍 Место','Напр. Мальдивы']].map(([k,l,ph])=>(
                <div key={k} style={{marginBottom:'1rem'}}><label style={mLabel}>{l}</label>{k==='desc'?<textarea style={{...mInput,minHeight:56,resize:'vertical'}} value={uploadForm[k]} onChange={e=>setUploadForm(f=>({...f,[k]:e.target.value}))} placeholder={ph}/>:<input style={mInput} value={uploadForm[k]} onChange={e=>setUploadForm(f=>({...f,[k]:e.target.value}))} placeholder={ph}/>}</div>
              ))}
              <div style={{marginBottom:'1rem'}}><label style={mLabel}>Тема</label><select style={mInput} value={uploadForm.cat} onChange={e=>setUploadForm(f=>({...f,cat:e.target.value}))}>{cats.map(cat=><option key={cat}>{cat}</option>)}</select></div>
              <div style={{marginBottom:'1rem'}}>
                <label style={mLabel}>Серия</label>
                {!showNewSeriesInUpload?(
                  <div style={{display:'flex',gap:8}}>
                    <select style={{...mInput,flex:1}} value={uploadForm.seriesId} onChange={e=>setUploadForm(f=>({...f,seriesId:e.target.value}))}><option value="">— Без серии —</option>{series.map(ser=><option key={ser.id} value={ser.id}>{ser.title}</option>)}</select>
                    <button type="button" onClick={()=>setShowNewSeriesInUpload(true)} style={{padding:'8px 14px',fontSize:'0.7rem',borderRadius:2,border:`1px solid ${C}`,background:'transparent',color:C,cursor:'pointer',whiteSpace:'nowrap'}}>+ Новая</button>
                  </div>
                ):(
                  <div style={{display:'flex',gap:8}}>
                    <input style={{...mInput,flex:1}} value={newSeriesName} onChange={e=>setNewSeriesName(e.target.value)} placeholder="Название новой серии..." autoFocus/>
                    <button type="button" onClick={()=>{setShowNewSeriesInUpload(false);setNewSeriesName('')}} style={{padding:'8px 10px',borderRadius:2,border:'1px solid rgba(232,226,217,0.2)',background:'transparent',color:MUT,cursor:'pointer'}}>✕</button>
                  </div>
                )}
              </div>
              <div style={{marginBottom:'1rem'}}><label style={mLabel}>Дата</label><input style={mInput} type="date" value={uploadForm.date} onChange={e=>setUploadForm(f=>({...f,date:e.target.value}))}/></div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:'1.25rem'}}>
                <button style={btnCancel} onClick={()=>setShowUpload(false)}>Отмена</button>
                <button style={{...btnSave,opacity:(uploading||analyzing)?0.6:1}} onClick={doUpload} disabled={uploading||analyzing}>{uploading?'Загрузка...':analyzing?'Анализ...':'Сохранить'}</button>
              </div>
            </>
          )}
          {uploadMode==='bulk'&&(
            <>
              {bulkFiles.length===0?(
                <div>
                  <div style={{border:'1.5px dashed rgba(232,226,217,0.2)',borderRadius:2,padding:'2.5rem',textAlign:'center',cursor:'pointer',color:MUT}} onClick={()=>document.getElementById('bulk-fi').click()}>
                    <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>📁</div>
                    <div style={{marginBottom:4}}>Выберите несколько фотографий</div>
                    <div style={{fontSize:'0.72rem',color:'rgba(232,226,217,0.3)'}}>AI проанализирует каждую</div>
                  </div>
                  <input id="bulk-fi" type="file" accept="image/*" multiple style={{display:'none'}} onChange={onBulkFilesSelect}/>
                </div>
              ):(
                <div>
                  <div style={{background:'rgba(200,169,110,0.06)',border:'1px solid rgba(200,169,110,0.15)',borderRadius:2,padding:'12px 14px',marginBottom:'1rem'}}>
                    <label style={{...mLabel,marginBottom:8}}>Серия для всех фото</label>
                    {!bulkShowNewSeries?(
                      <div style={{display:'flex',gap:8}}>
                        <select style={{...mInput,flex:1}} value={bulkSeriesId} onChange={e=>setBulkSeriesId(e.target.value)}><option value="">— Без серии —</option>{series.map(ser=><option key={ser.id} value={ser.id}>{ser.title}</option>)}</select>
                        <button onClick={()=>setBulkShowNewSeries(true)} style={{padding:'8px 14px',fontSize:'0.7rem',borderRadius:2,border:`1px solid ${C}`,background:'transparent',color:C,cursor:'pointer',whiteSpace:'nowrap'}}>+ Новая</button>
                      </div>
                    ):(
                      <div style={{display:'flex',gap:8}}>
                        <input style={{...mInput,flex:1}} value={bulkNewSeriesName} onChange={e=>setBulkNewSeriesName(e.target.value)} placeholder="Название серии..."/>
                        <button onClick={()=>{setBulkShowNewSeries(false);setBulkNewSeriesName('')}} style={{padding:'8px 10px',borderRadius:2,border:'1px solid rgba(232,226,217,0.2)',background:'transparent',color:MUT,cursor:'pointer'}}>✕</button>
                      </div>
                    )}
                  </div>
                  {bulkUploading&&<div style={{marginBottom:'1rem'}}><div style={{display:'flex',justifyContent:'space-between',fontSize:'0.7rem',color:MUT,marginBottom:6}}><span>Загружаю...</span><span>{bulkProgress}%</span></div><div style={{height:3,background:'rgba(232,226,217,0.1)',borderRadius:2}}><div style={{height:'100%',background:C,borderRadius:2,width:`${bulkProgress}%`,transition:'width 0.3s'}}/></div></div>}
                  <div style={{display:'flex',flexDirection:'column',gap:'1px',maxHeight:'52vh',overflowY:'auto'}}>
                    {bulkFiles.map(item=>(
                      <div key={item.id} style={{display:'grid',gridTemplateColumns:'72px 1fr auto',gap:10,padding:'10px',background:item.status==='done'?'rgba(99,153,34,0.08)':item.status==='error'?'rgba(226,75,74,0.08)':'rgba(255,255,255,0.02)',borderRadius:2,alignItems:'start'}}>
                        <div style={{position:'relative',aspectRatio:'1',overflow:'hidden',borderRadius:2,background:'#1a1a1a'}}>
                          {item.preview&&<img src={item.preview} alt="" style={{width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none'}}/>}
                          {item.analyzing&&<div style={{position:'absolute',inset:0,background:'rgba(10,10,10,0.75)',display:'flex',alignItems:'center',justifyContent:'center'}}>🤖</div>}
                          {item.status==='done'&&<div style={{position:'absolute',inset:0,background:'rgba(99,153,34,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem'}}>✓</div>}
                          {item.status==='uploading'&&<div style={{position:'absolute',inset:0,background:'rgba(200,169,110,0.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',color:BG}}>↑</div>}
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:5}}>
                          <input style={{...mInput,padding:'5px 8px',fontSize:12}} value={item.form.title} onChange={e=>updateBulkItem(item.id,'title',e.target.value)} disabled={item.status==='done'||bulkUploading}/>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                            <select style={{...mInput,padding:'5px 8px',fontSize:12}} value={item.form.cat} onChange={e=>updateBulkItem(item.id,'cat',e.target.value)} disabled={item.status==='done'||bulkUploading}>{cats.map(cat=><option key={cat}>{cat}</option>)}</select>
                            <input style={{...mInput,padding:'5px 8px',fontSize:12}} type="date" value={item.form.date} onChange={e=>updateBulkItem(item.id,'date',e.target.value)} disabled={item.status==='done'||bulkUploading}/>
                          </div>
                          <input style={{...mInput,padding:'5px 8px',fontSize:12}} value={item.form.location} onChange={e=>updateBulkItem(item.id,'location',e.target.value)} placeholder="📍 Место" disabled={item.status==='done'||bulkUploading}/>
                          {item.status==='error'&&<div style={{fontSize:'0.65rem',color:'#E24B4A'}}>Ошибка</div>}
                        </div>
                        {!bulkUploading&&item.status!=='done'&&<button onClick={()=>removeBulkItem(item.id)} style={{background:'none',border:'none',color:MUT,cursor:'pointer',fontSize:'1rem'}}>✕</button>}
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:8,justifyContent:'space-between',marginTop:'1rem'}}>
                    <button style={{...btnCancel,fontSize:'0.7rem'}} onClick={()=>document.getElementById('bulk-fi-more').click()}>+ Ещё</button>
                    <input id="bulk-fi-more" type="file" accept="image/*" multiple style={{display:'none'}} onChange={async e=>{const nf=Array.from(e.target.files);const ni=nf.map(f=>({id:Math.random().toString(36).slice(2),file:f,preview:null,form:{title:f.name.replace(/\.[^.]+$/,''),desc:'',cat:'Путешествия',date:new Date().toISOString().split('T')[0],location:''},status:'pending',analyzing:false}));for(const it of ni){await new Promise(r=>{const rd=new FileReader();rd.onload=ev=>{it.preview=ev.target.result;r()};rd.readAsDataURL(it.file)})};setBulkFiles(prev=>[...prev,...ni])}}/>
                    <div style={{display:'flex',gap:8}}>
                      <button style={btnCancel} onClick={()=>{setBulkFiles([]);setBulkProgress(0)}}>Очистить</button>
                      <button style={{...btnSave,opacity:bulkUploading?0.6:1}} onClick={doBulkUpload} disabled={bulkUploading}>{bulkUploading?`Загружаю ${bulkProgress}%`:`Загрузить ${bulkFiles.filter(x=>x.status==='pending').length} фото`}</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  function DlModal() {
    const subj=encodeURIComponent('Запрос на фото: '+dlPhoto.title)
    const body=encodeURIComponent('Здравствуйте!\n\nХочу запросить фото «'+dlPhoto.title+'».\n\nЦель: \n\nС уважением,')
    const tgHandle=about.telegram?(about.telegram.startsWith('@')?about.telegram.slice(1):about.telegram):(about.ig?.startsWith('@')?about.ig.slice(1):about.ig)
    return (
      <div style={{...MB,zIndex:1100}} onClick={e=>e.target===e.currentTarget&&setShowDlModal(false)}>
        <div style={{...MBX,textAlign:'center'}}>
          <button style={closeX} onClick={()=>setShowDlModal(false)}>✕</button>
          <div style={{fontSize:'1.5rem',marginBottom:'1rem',opacity:0.5}}>✉</div>
          <div style={mTitle}>Напишите мне</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.1rem',fontStyle:'italic',color:C,marginBottom:'0.5rem'}}>«{dlPhoto.title}»</div>
          <div style={{fontSize:'0.75rem',color:MUT,marginBottom:'2rem'}}>Выберите удобный способ связи</div>
          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16,textAlign:'left'}}>
            {about.email&&<a href={`mailto:${about.email}?subject=${subj}&body=${body}`} target="_blank" style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:2,background:'rgba(200,169,110,0.08)',border:'1px solid rgba(200,169,110,0.4)',color:TXT,textDecoration:'none',fontSize:'0.78rem'}}><span style={{color:C,width:20,textAlign:'center'}}>@</span><div><div style={{fontSize:'0.62rem',letterSpacing:'0.15em',textTransform:'uppercase',color:C,marginBottom:2}}>Email</div><div>{about.email}</div></div></a>}
            {tgHandle&&<a href={`https://t.me/${tgHandle}`} target="_blank" style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:2,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(232,226,217,0.15)',color:TXT,textDecoration:'none',fontSize:'0.78rem'}}><span style={{color:C,width:20,textAlign:'center',fontSize:'0.85rem',fontWeight:500}}>tg</span><div><div style={{fontSize:'0.62rem',letterSpacing:'0.15em',textTransform:'uppercase',color:C,marginBottom:2}}>Telegram</div><div>{about.telegram||about.ig}</div></div></a>}
            {about.phone&&<a href={`tel:${about.phone}`} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:2,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(232,226,217,0.15)',color:TXT,textDecoration:'none',fontSize:'0.78rem'}}><span style={{color:C,width:20,textAlign:'center'}}>☎</span><div><div style={{fontSize:'0.62rem',letterSpacing:'0.15em',textTransform:'uppercase',color:C,marginBottom:2}}>Телефон</div><div>{about.phone}</div></div></a>}
          </div>
          <button style={{...btnCancel,width:'100%'}} onClick={()=>setShowDlModal(false)}>Закрыть</button>
        </div>
      </div>
    )
  }

  function CatManagerModal() {
    const [newCat,setNewCat]=useState('')
    return (
      <div style={MB} onClick={e=>e.target===e.currentTarget&&setShowCatManager(false)}>
        <div style={MBX}>
          <button style={closeX} onClick={()=>setShowCatManager(false)}>✕</button>
          <div style={mTitle}>Управление темами</div>
          <div style={{marginBottom:'1.5rem'}}>
            {cats.map(cat=>(
              <div key={cat} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(232,226,217,0.06)'}}>
                <span style={{fontSize:14}}>{cat}</span>
                {DEFAULT_CATS.includes(cat)?<span style={{fontSize:11,color:MUT}}>стандартная</span>:<button onClick={()=>setCats(p=>p.filter(x=>x!==cat))} style={{background:'none',border:'none',color:'#E24B4A',cursor:'pointer',fontSize:13}}>✕</button>}
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:8}}>
            <input style={{...mInput,flex:1}} value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Новая тема..." onKeyDown={e=>{if(e.key==='Enter'&&newCat.trim()){setCats(p=>[...p,newCat.trim()]);setNewCat('')}}}/>
            <button style={btnSave} onClick={()=>{if(newCat.trim()){setCats(p=>[...p,newCat.trim()]);setNewCat('')}}}>+ Добавить</button>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',marginTop:'1.5rem'}}><button style={btnSave} onClick={()=>setShowCatManager(false)}>Готово</button></div>
        </div>
      </div>
    )
  }

  function SeriesEditModal() {
    return (
      <SeriesEditModalComponent
        editingSeries={editingSeries}
        photos={photos}
        series={series}
        setSeries={setSeries}
        saveSeries={saveSeries}
        setShowSeriesEdit={setShowSeriesEdit}
        MB={MB} MBX={MBX} mTitle={mTitle} closeX={closeX}
        mInput={mInput} mLabel={mLabel} btnSave={btnSave} btnCancel={btnCancel}
        C={C} BG={BG}
      />
    )
  }

  function AboutEditModal() {
    const [form,setForm]=useState({...about}); const [saving,setSaving]=useState(false)
    async function saveAbout() {
      setSaving(true)
      try { setAbout(form); await fetch('/api/about',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:adminPassword,about:{...form,avatarUrl}})}); setShowAboutEdit(false) } catch { setShowAboutEdit(false) }
      setSaving(false)
    }
    return (
      <div style={MB} onClick={e=>e.target===e.currentTarget&&setShowAboutEdit(false)}>
        <div style={MBX}>
          <button style={closeX} onClick={()=>setShowAboutEdit(false)}>✕</button>
          <div style={mTitle}>Редактировать профиль</div>
          {[['name','Имя'],['nameLast','Фамилия'],['role','Подзаголовок'],['email','Email'],['ig','Instagram'],['telegram','Telegram (@username)'],['phone','Телефон'],['city','Город']].map(([k,l])=>(
            <div key={k} style={{marginBottom:'1rem'}}><label style={mLabel}>{l}</label><input style={mInput} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/></div>
          ))}
          <div style={{marginBottom:'1rem'}}><label style={mLabel}>О себе</label><textarea style={{...mInput,minHeight:80,resize:'vertical'}} value={form.bio||''} onChange={e=>setForm(f=>({...f,bio:e.target.value}))}/></div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:'1.25rem'}}>
            <button style={btnCancel} onClick={()=>setShowAboutEdit(false)}>Отмена</button>
            <button style={{...btnSave,opacity:saving?0.6:1}} onClick={saveAbout} disabled={saving}>{saving?'Сохраняю...':'Сохранить'}</button>
          </div>
        </div>
      </div>
    )
  }

  function AvatarUploadModal() {
    const [file,setFile]=useState(null); const [preview,setPreview]=useState(avatarUrl||null); const [saving,setSaving]=useState(false)
    const [pw,setPw]=useState(adminPassword||''); const [pwErr,setPwErr]=useState(''); const [verified,setVerified]=useState(!!adminPassword)
    async function verifyPw() { try { const res=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})}); if(!res.ok){setPwErr('Неверный пароль');return}; setAdminPassword(pw); setVerified(true) } catch { setPwErr('Ошибка') } }
    function onPick(e) { const f=e.target.files[0]; if(!f) return; setFile(f); const r=new FileReader(); r.onload=ev=>setPreview(ev.target.result); r.readAsDataURL(f) }
    async function save() {
      if(!file) return; setSaving(true)
      try { const c=await compressFromDataUrl(preview,800,0.85); const d=await uploadToImgBB(c,'avatar'); setAvatarUrl(d.url); await fetch('/api/about',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:adminPassword||pw,about:{...about,avatarUrl:d.url}})}); setShowAvatarUpload(false) } catch(err) { alert('Ошибка: '+err.message) }
      setSaving(false)
    }
    return (
      <div style={MB} onClick={e=>e.target===e.currentTarget&&setShowAvatarUpload(false)}>
        <div style={{...MBX,width:380}}>
          <button style={closeX} onClick={()=>setShowAvatarUpload(false)}>✕</button>
          <div style={mTitle}>Фото профиля</div>
          {!verified?(
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'1.8rem',marginBottom:'1rem',opacity:0.5}}>🔒</div>
              <input style={{...mInput,textAlign:'center',letterSpacing:'0.3em',marginBottom:'0.5rem'}} type="password" placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&verifyPw()} autoFocus/>
              {pwErr&&<div style={{color:'#E24B4A',fontSize:'0.72rem',marginBottom:'0.5rem'}}>{pwErr}</div>}
              <button style={{...btnSave,width:'100%',padding:10,marginTop:8}} onClick={verifyPw}>Войти</button>
              <br/><button style={{...btnCancel,border:'none',marginTop:8}} onClick={()=>setShowAvatarUpload(false)}>Отмена</button>
            </div>
          ):(
            <div>
              <div style={{aspectRatio:'3/4',position:'relative',overflow:'hidden',background:'linear-gradient(160deg,#1a1a2e,#0f3460)',borderRadius:2,marginBottom:'1rem'}}>{preview&&<img src={preview} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>}</div>
              <button onClick={()=>document.getElementById('avatar-fi').click()} style={{width:'100%',padding:'10px',fontSize:'0.75rem',letterSpacing:'0.15em',textTransform:'uppercase',border:'1.5px dashed rgba(232,226,217,0.2)',background:'transparent',color:MUT,cursor:'pointer',borderRadius:2,marginBottom:'1.5rem'}}>{file?'✓ '+file.name:'Выбрать фото'}</button>
              <input id="avatar-fi" type="file" accept="image/*" style={{display:'none'}} onChange={onPick}/>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button style={btnCancel} onClick={()=>setShowAvatarUpload(false)}>Отмена</button>
                <button style={{...btnSave,opacity:(!file||saving)?0.6:1}} onClick={save} disabled={!file||saving}>{saving?'Сохраняю...':'Сохранить'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  function EditPhotoModal() {
    const [form,setForm]=useState({title:editingPhoto?.title||'',desc:editingPhoto?.desc||'',cat:editingPhoto?.cat||cats[0],date:editingPhoto?.date||'',location:editingPhoto?.location||''})
    const [saving,setSaving]=useState(false)
    const currentSer=series.find(s=>(s.photoIds||[]).includes(editingPhoto?.id))
    const [selSeriesId,setSelSeriesId]=useState(currentSer?.id||'')
    async function handleSave() { setSaving(true); if(selSeriesId!==(currentSer?.id||'')) await assignSeriesToPhoto(editingPhoto.id,selSeriesId); await saveEditPhoto(editingPhoto.id,form); setSaving(false) }
    return (
      <div style={MB} onClick={e=>e.target===e.currentTarget&&setShowEditPhoto(false)}>
        <div style={MBX}>
          <button style={closeX} onClick={()=>setShowEditPhoto(false)}>✕</button>
          <div style={mTitle}>Редактировать фото</div>
          {[['title','Название'],['desc','Описание'],['location','📍 Место']].map(([k,l])=>(
            <div key={k} style={{marginBottom:'1rem'}}><label style={mLabel}>{l}</label>{k==='desc'?<textarea style={{...mInput,minHeight:56,resize:'vertical'}} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>:<input style={mInput} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>}</div>
          ))}
          <div style={{marginBottom:'1rem'}}><label style={mLabel}>Тема</label><select style={mInput} value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}>{cats.map(cat=><option key={cat}>{cat}</option>)}</select></div>
          <div style={{marginBottom:'1rem'}}><label style={mLabel}>Серия</label><select style={mInput} value={selSeriesId} onChange={e=>setSelSeriesId(e.target.value)}><option value="">— Без серии —</option>{series.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></div>
          <div style={{marginBottom:'1rem'}}><label style={mLabel}>Дата</label><input style={mInput} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:'1.25rem'}}>
            <button style={btnCancel} onClick={()=>setShowEditPhoto(false)}>Отмена</button>
            <button style={{...btnSave,opacity:saving?0.6:1}} onClick={handleSave} disabled={saving}>{saving?'Сохраняю...':'Сохранить'}</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
