'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const DEFAULT_CATS = ['Путешествия', 'Природа', 'Архитектура', 'Улица', 'Портрет']
const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
function fmtDate(d) { if(!d) return ''; try { const dt=new Date(d); return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}` } catch { return d } }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}; return a }

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

  const [about, setAbout] = useState({
    name:'Bobur', nameLast:'Gafurov', role:'Фотограф · Ташкент',
    bio:'Начинающий фотограф, влюблённый в свет и момент.\n\nСнимаю природу, путешествия и города — ищу красоту в обычных вещах.',
    email:'email@example.com', ig:'@boburphoto', city:'Ташкент'
  })

  const timerRef = useRef(null)

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

  // Keyboard nav
  useEffect(() => {
    const handler = (e) => {
      if (lightbox) {
        const arr = getDisplayPhotos()
        const i = arr.findIndex(p => p.id === lightbox.id)
        if (e.key === 'ArrowRight') setLightbox(arr[(i+1) % arr.length])
        else if (e.key === 'ArrowLeft') setLightbox(arr[(i-1+arr.length) % arr.length])
        else if (e.key === 'Escape') setLightbox(null)
        return
      }
      if (e.key === 'ArrowRight') setSlideIdx(i => (i+1) % Math.max(slideOrder.length,1))
      if (e.key === 'ArrowLeft') setSlideIdx(i => (i-1+Math.max(slideOrder.length,1)) % Math.max(slideOrder.length,1))
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

  // Lock scroll when lightbox open
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwInput })
      })
      const data = await res.json()
      if (res.status === 401 || data.error) { setPwError('Неверный пароль'); return }
      setIsAdmin(true)
      setAdminPassword(pwInput)
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

      // Compress and analyze with AI
      setAnalyzing(true)
      try {
        const compressed = await compressFromDataUrl(dataUrl, 800, 0.75)
        // Extract pure base64 from data URL
        const base64 = compressed.split(',')[1]
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, mimeType: 'image/jpeg', filename: file.name })
        })
        if (res.ok) {
          const data = await res.json()
          if (!data.error) {
            setUploadForm(f => ({
              ...f,
              title: data.title || f.title,
              desc: data.desc || f.desc,
              cat: data.cat || f.cat,
              date: data.date || f.date,
              location: data.location || f.location,
            }))
          }
        }
      } catch(err) { console.error('AI error:', err) }
      setAnalyzing(false)
    }
    reader.readAsDataURL(file)
  }

  async function uploadToImgBB(dataUrl, title) {
    // Upload directly from browser to ImgBB — bypasses Vercel size limits
    const base64 = dataUrl.split(',')[1]
    const form = new FormData()
    form.append('key', '8093b5a4acf05371a044d92054ea6cd0')
    form.append('image', base64)
    form.append('name', title || 'photo')
    const res = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: form
    })
    const data = await res.json()
    if (!data.success) throw new Error('ImgBB: ' + JSON.stringify(data.error))
    return { url: data.data.url, thumb: data.data.thumb?.url || data.data.url }
  }

  // ← ИСПРАВЛЕНИЕ: была удалена эта строка в прошлом коммите
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

  function dataUrlToBlob(dataUrl) {
    const [header, data] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)[1]
    const bytes = atob(data)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    return new Blob([arr], { type: mime })
  }

  async function doUpload() {
    if (!uploadFile || !uploadForm.title) return
    setUploading(true)
    try {
      // Create new series if requested
      let seriesId = uploadForm.seriesId
      if (showNewSeriesInUpload && newSeriesName.trim()) {
        const newSer = { id: Date.now().toString(), title: newSeriesName.trim(), desc:'', photoIds:[], cover:'' }
        setSeries(prev => [...prev, newSer])
        seriesId = newSer.id
      }

      // Upload directly to ImgBB from browser (no Vercel size limit)
      const compressed = await compressFromDataUrl(uploadPreview, 1600, 0.88)
      const imgData = await uploadToImgBB(compressed, uploadForm.title)

      const fullDesc = uploadForm.location
        ? `${uploadForm.desc}${uploadForm.desc ? ' · ' : ''}📍 ${uploadForm.location}`
        : uploadForm.desc

      const metaRes = await fetch('/api/photos', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({password:adminPassword, photo:{
          title: uploadForm.title, desc: fullDesc, cat: uploadForm.cat,
          date: uploadForm.date, url: imgData.url, thumb: imgData.thumb,
          location: uploadForm.location, likes: 0, seriesId
        }})
      })
      if (!metaRes.ok) throw new Error('Ошибка сохранения')
      const newPhoto = await metaRes.json()

      if (seriesId && newPhoto?.id) {
        setSeries(prev => {
          const updated = prev.map(s => s.id===seriesId
            ? {...s, photoIds:[...(s.photoIds||[]),newPhoto.id], cover:s.cover||imgData.url}
            : s)
          saveSeries(updated)
          return updated
        })
      }

      await loadPhotos()
      setShowUpload(false); setUploadFile(null); setUploadPreview(null); setNewSeriesName('')
      setShowNewSeriesInUpload(false)
      setUploadForm({title:'',desc:'',cat:cats[0]||'Путешествия',date:new Date().toISOString().split('T')[0],seriesId:'',location:''})
    } catch(err) { alert('Ошибка: '+err.message) }
    setUploading(false)
  }

  async function onBulkFilesSelect(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const items = files.map(file => ({
      id: Math.random().toString(36).slice(2),
      file, preview: null,
      form: { title: file.name.replace(/\.[^.]+$/,''), desc:'', cat:'Путешествия', date: new Date().toISOString().split('T')[0], location:'' },
      status: 'pending', analyzing: false
    }))
    // generate previews
    for (const item of items) {
      await new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = ev => { item.preview = ev.target.result; resolve() }
        reader.readAsDataURL(item.file)
      })
    }
    setBulkFiles(items)
    // analyze all with AI in parallel
    const analyze = async (item) => {
      setBulkFiles(prev => prev.map(x => x.id===item.id ? {...x, analyzing:true} : x))
      try {
        const compressed = await compressFromDataUrl(item.preview, 800, 0.75)
        const base64 = compressed.split(',')[1]
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, mimeType: 'image/jpeg', filename: item.file.name })
        })
        if (res.ok) {
          const data = await res.json()
          setBulkFiles(prev => prev.map(x => x.id===item.id ? {
            ...x, analyzing: false,
            form: { ...x.form, title: data.title||x.form.title, desc: data.desc||'', cat: data.cat||x.form.cat, date: data.date||x.form.date, location: data.location||'' }
          } : x))
        } else {
          setBulkFiles(prev => prev.map(x => x.id===item.id ? {...x, analyzing:false} : x))
        }
      } catch {
        setBulkFiles(prev => prev.map(x => x.id===item.id ? {...x, analyzing:false} : x))
      }
    }
    // Run 3 at a time
    for (let i = 0; i < items.length; i += 3) {
      await Promise.all(items.slice(i, i+3).map(analyze))
    }
  }

  function updateBulkItem(id, field, value) {
    setBulkFiles(prev => prev.map(x => x.id===id ? {...x, form:{...x.form,[field]:value}} : x))
  }

  function removeBulkItem(id) {
    setBulkFiles(prev => prev.filter(x => x.id!==id))
  }

  async function doBulkUpload() {
    const pending = bulkFiles.filter(x => x.status==='pending' && x.form.title)
    if (!pending.length) return
    setBulkUploading(true)
    setBulkProgress(0)

    // Resolve series
    let seriesId = bulkSeriesId
    if (bulkShowNewSeries && bulkNewSeriesName.trim()) {
      const newSer = {id: Date.now().toString(), title: bulkNewSeriesName.trim(), desc:'', photoIds:[], cover:''}
      setSeries(prev => [...prev, newSer])
      seriesId = newSer.id
    }

    let done = 0
    for (const item of pending) {
      try {
        setBulkFiles(prev => prev.map(x => x.id===item.id ? {...x, status:'uploading'} : x))
        const compressed = await compressFromDataUrl(item.preview, 1600, 0.88)
        const imgData = await uploadToImgBB(compressed, item.form.title)

        const fullDesc = item.form.location
          ? `${item.form.desc}${item.form.desc?' · ':''}📍 ${item.form.location}`
          : item.form.desc

        const metaRes = await fetch('/api/photos', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({password:adminPassword, photo:{
            title:item.form.title, desc:fullDesc, cat:item.form.cat,
            date:item.form.date, url:imgData.url, thumb:imgData.thumb,
            location:item.form.location, likes:0, seriesId
          }})
        })
        const newPhoto = await metaRes.json()
        if (seriesId && newPhoto?.id) {
          setSeries(prev => prev.map(s => s.id===seriesId
            ? {...s, photoIds:[...(s.photoIds||[]),newPhoto.id], cover:s.cover||imgData.url} : s))
        }
        setBulkFiles(prev => prev.map(x => x.id===item.id ? {...x, status:'done'} : x))
      } catch {
        setBulkFiles(prev => prev.map(x => x.id===item.id ? {...x, status:'error'} : x))
      }
      done++
      setBulkProgress(Math.round(done/pending.length*100))
    }
    // Save series to Redis after all uploads
    if (seriesId) {
      setSeries(prev => { saveSeries(prev); return prev })
    }
    await loadPhotos()
    setBulkUploading(false)
    // Close if all done
    const allDone = bulkFiles.every(x => x.status==='done'||x.status==='error')
    if (allDone) {
      setShowUpload(false)
      setBulkFiles([]); setBulkSeriesId(''); setBulkNewSeriesName(''); setBulkShowNewSeries(false); setBulkProgress(0)
      setUploadMode('single')
    }
  }

  // Colors
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
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const Nav = ({solid}) => (
    <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:200,background:solid?BG:'linear-gradient(to bottom,rgba(10,10,10,0.9),transparent)',borderBottom:solid?'1px solid rgba(232,226,217,0.06)':'none'}}>
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
          <button onClick={()=>setMobileMenu(m=>!m)} style={{background:'none',border:'none',color:TXT,fontSize:'1.5rem',cursor:'pointer',padding:'4px 8px',lineHeight:1}}>
            {mobileMenu?'✕':'☰'}
          </button>
        )}
      </div>
      {isMobile && mobileMenu && (
        <div style={{background:'rgba(10,10,10,0.98)',borderTop:'1px solid rgba(232,226,217,0.08)',padding:'0.5rem 0 1rem'}}>
          {[['home','Главная'],['gallery','Галерея'],['about','Об авторе']].map(([v,l])=>(
            <div key={v} onClick={()=>{setView(v);setMobileMenu(false)}}
              style={{padding:'14px 1.5rem',fontSize:'0.8rem',letterSpacing:'0.18em',textTransform:'uppercase',color:view===v?C:MUT,cursor:'pointer',borderBottom:'1px solid rgba(232,226,217,0.04)'}}>
              {l}
            </div>
          ))}
          <div style={{padding:'14px 1.5rem'}}>
            <button style={{fontSize:'0.8rem',letterSpacing:'0.15em',textTransform:'uppercase',color:BG,background:C,border:'none',padding:'12px 0',borderRadius:2,cursor:'pointer',width:'100%'}}
              onClick={()=>{setMobileMenu(false);requireAdmin('upload',()=>setShowUpload(true))}}>
              + Добавить фото
            </button>
          </div>
        </div>
      )}
    </nav>
  )

  const PhotoCard = ({p, listRef}) => {
    const liked = isLiked(p.id)
    const lc = likes[p.id]||0
    return (
      <div style={{position:'relative',aspectRatio:'3/2',overflow:'hidden',cursor:'zoom-in',background:'#111'}}
        onMouseEnter={e=>{e.currentTarget.querySelector('.ov').style.background='rgba(0,0,0,0.5)';e.currentTarget.querySelectorAll('.rv').forEach(el=>{el.style.opacity='1';el.style.transform='translateY(0)'})}}
        onMouseLeave={e=>{e.currentTarget.querySelector('.ov').style.background='rgba(0,0,0,0)';e.currentTarget.querySelectorAll('.rv').forEach(el=>{el.style.opacity='0';el.style.transform='translateY(8px)'})}}
        onClick={()=>setLightbox(p)}>
        {p.url
          ? <img src={p.url} alt={p.title} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none',userSelect:'none'}} draggable={false}/>
          : <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#1a1a2e,#0f3460)'}}/>}
        {lc>0 && <div style={{position:'absolute',top:8,right:8,background:'rgba(10,10,10,0.75)',backdropFilter:'blur(4px)',border:'1px solid rgba(226,75,74,0.4)',borderRadius:999,padding:'3px 8px',fontSize:'0.65rem',color:'#E24B4A',display:'flex',alignItems:'center',gap:4,zIndex:2}}>♥ {lc}</div>}
        <div className="ov" style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',justifyContent:'flex-end',padding:'1rem',background:'rgba(0,0,0,0)',transition:'background 0.3s',zIndex:1}}>
          <div className="rv" style={{fontSize:'0.6rem',letterSpacing:'0.22em',textTransform:'uppercase',color:C,marginBottom:3,opacity:0,transform:'translateY(8px)',transition:'all 0.3s'}}>{p.cat}</div>
          <div className="rv" style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1rem',fontWeight:300,opacity:0,transform:'translateY(8px)',transition:'all 0.3s 0.04s'}}>{p.title}</div>
          <div className="rv" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:6,opacity:0,transform:'translateY(8px)',transition:'all 0.3s 0.08s'}}>
            <button onClick={e=>{e.stopPropagation();setDlPhoto(p);setShowDlModal(true)}} style={{fontSize:'0.6rem',letterSpacing:'0.15em',textTransform:'uppercase',padding:'5px 12px',borderRadius:2,border:'1px solid rgba(232,226,217,0.3)',background:'rgba(10,10,10,0.6)',color:TXT,cursor:'pointer'}}>✉ Запросить</button>
            <button onClick={e=>toggleLike(p.id,e)} style={{display:'flex',alignItems:'center',gap:5,fontSize:'0.72rem',padding:'5px 10px',borderRadius:2,border:liked?'1px solid rgba(226,75,74,0.5)':'1px solid rgba(232,226,217,0.25)',background:'rgba(10,10,10,0.6)',color:liked?'#E24B4A':MUT,cursor:'pointer'}}>
              {liked?'♥':'♡'} {lc>0&&lc}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const PhotoGrid = ({list}) => (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'2px'}}>
      {list.length===0 && <div style={{color:MUT,padding:'4rem',gridColumn:'1/-1',textAlign:'center'}}>Нет фотографий</div>}
      {list.map(p=><PhotoCard key={p.id} p={p}/>)}
    </div>
  )

  // ═══ LIGHTBOX — настоящий полноэкранный ═══
  const [showSeriesPicker, setShowSeriesPicker] = useState(false)

  async function assignSeriesToPhoto(photoId, seriesId) {
    // Update series in state and save
    setSeries(prev => {
      const updated = prev.map(s => {
        const hasPhoto = (s.photoIds||[]).includes(photoId)
        if (s.id === seriesId) {
          return hasPhoto ? s : {...s, photoIds:[...(s.photoIds||[]),photoId]}
        } else {
          return {...s, photoIds:(s.photoIds||[]).filter(id=>id!==photoId)}
        }
      })
      saveSeries(updated)
      return updated
    })
    // Update photo seriesId in Redis
    try {
      await fetch('/api/photos', {
        method: 'PATCH',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({password:adminPassword, photoId, seriesId})
      })
    } catch {}
    await loadPhotos()
  }

  const Lightbox = () => {
    const arr = getDisplayPhotos()
    const idx = arr.findIndex(p=>p.id===lightbox.id)
    const liked = isLiked(lightbox.id)
    const lc = likes[lightbox.id]||0
    const prev = arr[(idx-1+arr.length)%arr.length]
    const next = arr[(idx+1)%arr.length]
    const currentSeries = series.find(s=>(s.photoIds||[]).includes(lightbox.id))

    return (
      <div style={{
        position:'fixed', inset:0, zIndex:1000,
        background:'rgba(0,0,0,0.97)',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
      }}>
        {/* Top bar */}
        <div style={{position:'absolute',top:0,left:0,right:0,height:60,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 1.5rem',background:'linear-gradient(to bottom,rgba(0,0,0,0.7),transparent)',zIndex:2}}>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <span style={{fontSize:'0.65rem',letterSpacing:'0.2em',textTransform:'uppercase',color:C}}>{lightbox.cat}</span>
            <span style={{fontSize:'0.65rem',color:MUT}}>{fmtDate(lightbox.date)}</span>
            {lightbox.location&&<span style={{fontSize:'0.65rem',color:MUT}}>📍 {lightbox.location}</span>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {arr.length>1&&<span style={{fontSize:'0.65rem',color:MUT}}>{idx+1} / {arr.length}</span>}
            <button onClick={()=>setLightbox(null)} style={{background:'none',border:'none',color:TXT,fontSize:'1.6rem',cursor:'pointer',lineHeight:1,padding:'4px 8px'}}>✕</button>
          </div>
        </div>

        {/* Prev arrow */}
        {arr.length>1&&(
          <button onClick={()=>setLightbox(prev)} style={{position:'absolute',left:16,top:'50%',transform:'translateY(-50%)',width:52,height:52,borderRadius:'50%',border:'1px solid rgba(232,226,217,0.2)',background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',color:TXT,fontSize:'1.3rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}>←</button>
        )}
        {/* Next arrow */}
        {arr.length>1&&(
          <button onClick={()=>setLightbox(next)} style={{position:'absolute',right:16,top:'50%',transform:'translateY(-50%)',width:52,height:52,borderRadius:'50%',border:'1px solid rgba(232,226,217,0.2)',background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',color:TXT,fontSize:'1.3rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}>→</button>
        )}

        {/* FULL SIZE IMAGE */}
        <img
          src={lightbox.url}
          alt={lightbox.title}
          draggable={false}
          style={{
            maxWidth:'calc(100vw - 140px)',
            maxHeight:'calc(100vh - 160px)',
            width:'auto', height:'auto',
            objectFit:'contain',
            pointerEvents:'none', userSelect:'none',
            borderRadius:2,
          }}
        />

        {/* Bottom bar */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'1.5rem 2rem',background:'linear-gradient(to top,rgba(0,0,0,0.85),transparent)',display:'flex',alignItems:'flex-end',justifyContent:'space-between',zIndex:2}}>
          <div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.5rem',fontWeight:300,marginBottom:4}}>{lightbox.title}</div>
            {lightbox.desc&&<div style={{fontSize:'0.8rem',color:MUT,maxWidth:600}}>{lightbox.desc}</div>}
          </div>
          <div style={{display:'flex',gap:10,flexShrink:0,marginLeft:16}}>
            <button onClick={e=>toggleLike(lightbox.id,e)} style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.75rem',padding:'8px 18px',borderRadius:2,border:liked?'1px solid rgba(226,75,74,0.5)':'1px solid rgba(232,226,217,0.2)',background:'rgba(0,0,0,0.5)',color:liked?'#E24B4A':MUT,cursor:'pointer'}}>
              {liked?'♥':'♡'} {lc>0?`(${lc})`:''} Нравится
            </button>
            <button onClick={()=>{setDlPhoto(lightbox);setShowDlModal(true)}} style={{fontSize:'0.75rem',padding:'8px 18px',borderRadius:2,border:`1px solid ${C}`,background:'transparent',color:C,cursor:'pointer'}}>✉ Запросить</button>
            {isAdmin&&(
              <div style={{position:'relative'}}>
                <button onClick={()=>setShowSeriesPicker(p=>!p)} style={{fontSize:'0.75rem',padding:'8px 18px',borderRadius:2,border:'1px solid rgba(232,226,217,0.2)',background:'rgba(0,0,0,0.5)',color:MUT,cursor:'pointer'}}>
                  ✏ {currentSeries?currentSeries.title:'Серия'}
                </button>
                {showSeriesPicker&&(
                  <div style={{position:'absolute',bottom:'110%',right:0,background:'#1a1a1a',border:'1px solid rgba(232,226,217,0.15)',borderRadius:4,minWidth:200,zIndex:10,overflow:'hidden'}}>
                    <div onClick={()=>{assignSeriesToPhoto(lightbox.id,'');setShowSeriesPicker(false)}}
                      style={{padding:'10px 14px',fontSize:'0.78rem',color:MUT,cursor:'pointer',borderBottom:'1px solid rgba(232,226,217,0.06)'}}
                      onMouseEnter={e=>e.target.style.background='rgba(232,226,217,0.06)'}
                      onMouseLeave={e=>e.target.style.background='transparent'}>
                      — Без серии —
                    </div>
                    {series.map(s=>(
                      <div key={s.id} onClick={()=>{assignSeriesToPhoto(lightbox.id,s.id);setShowSeriesPicker(false)}}
                        style={{padding:'10px 14px',fontSize:'0.78rem',color:s.id===currentSeries?.id?C:TXT,cursor:'pointer',background:s.id===currentSeries?.id?'rgba(200,169,110,0.08)':'transparent'}}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(232,226,217,0.06)'}
                        onMouseLeave={e=>e.currentTarget.style.background=s.id===currentSeries?.id?'rgba(200,169,110,0.08)':'transparent'}>
                        {s.id===currentSeries?.id?'✓ ':''}{s.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ═══ HOME ═══
  if (view==='home') {
    const totalLikes = Object.values(likes).reduce((a,b)=>a+b,0)
    return (
      <div style={{minHeight:'100vh',background:BG,color:TXT,fontFamily:"'Jost',sans-serif",fontWeight:300,overflow:'hidden'}}>
        <Nav solid={false}/>
        <div style={{position:'fixed',inset:0,zIndex:0}}>
          {slidePhotos.length===0&&(
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'flex-end'}}>
              <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#1a1a2e,#0f3460)'}}/>
              <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.75) 100%)'}}/>
              <div style={{position:'absolute',bottom:0,left:0,right:0,height:'40%',background:'linear-gradient(to top,rgba(0,0,0,0.8),transparent)'}}/>
              <div style={{position:'relative',zIndex:2,padding:isMobile?'0 1.5rem 7rem':'0 3rem 7rem',width:'100%'}}>
                <div style={{fontSize:'0.65rem',letterSpacing:'0.25em',textTransform:'uppercase',color:C,marginBottom:'0.6rem'}}>Портфолио</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'clamp(2rem,5vw,4rem)',fontWeight:300}}>Bobur Gafurov</div>
              </div>
            </div>
          )}
          {slidePhotos.map((p,i)=>(
            <div key={p.id} style={{position:'absolute',inset:0,opacity:i===slideIdx?1:0,transition:'opacity 1.2s ease',display:'flex',alignItems:'flex-end'}}>
              <div style={{position:'absolute',inset:0,backgroundImage:`url(${p.url})`,backgroundSize:'cover',backgroundPosition:'center'}}/>
              <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.7) 100%)'}}/>
              <div style={{position:'absolute',bottom:0,left:0,right:0,height:'50%',background:'linear-gradient(to top,rgba(0,0,0,0.85),transparent)'}}/>
              <div style={{position:'relative',zIndex:2,padding:'0 3rem 7rem',width:'100%'}}>
                <div style={{fontSize:'0.65rem',letterSpacing:'0.25em',textTransform:'uppercase',color:C,marginBottom:'0.6rem'}}>{p.cat}</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'clamp(2rem,5vw,4rem)',fontWeight:300}}>{p.title}</div>
                <div style={{fontSize:'0.7rem',color:MUT,letterSpacing:'0.15em',marginTop:'0.75rem'}}>{fmtDate(p.date)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats — BOTTOM RIGHT corner */}
        <div style={{position:'fixed',right:'3rem',bottom:'3.5rem',zIndex:100,display:'flex',gap:'2rem',alignItems:'flex-end'}}>
          {[[photos.length,'фото'],[series.length,'серий'],[Object.values(likes).reduce((a,b)=>a+b,0),'лайков']].map(([num,label])=>(
            <div key={label} style={{textAlign:'center'}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.6rem',fontWeight:300,color:TXT,lineHeight:1}}>{num}</div>
              <div style={{fontSize:'0.55rem',letterSpacing:'0.18em',textTransform:'uppercase',color:MUT,marginTop:2}}>{label}</div>
            </div>
          ))}
        </div>

        {/* Dots center */}
        {slidePhotos.length>1&&(
          <div style={{position:'fixed',bottom:'3.5rem',left:'50%',transform:'translateX(-50%)',zIndex:100,display:'flex',gap:8,alignItems:'center'}}>
            {slidePhotos.map((_,i)=><div key={i} onClick={()=>setSlideIdx(i)} style={{width:5,height:5,borderRadius:'50%',background:i===slideIdx?C:MUT,cursor:'pointer',transform:i===slideIdx?'scale(1.4)':'scale(1)',transition:'all 0.3s'}}/>)}
          </div>
        )}

        {/* Counter — left side */}
        {slidePhotos.length>1&&(
          <>
            <div style={{position:'fixed',top:'50%',left:'2.5rem',transform:'translateY(-50%)',zIndex:100,writingMode:'vertical-rl',fontSize:'0.65rem',letterSpacing:'0.2em',color:MUT}}>
              <span style={{color:TXT}}>{String(slideIdx+1).padStart(2,'0')}</span>{' / '}{String(slidePhotos.length).padStart(2,'0')}
            </div>
            <div style={{position:'fixed',bottom:'3.5rem',left:'3rem',zIndex:100,display:'flex',gap:'1rem'}}>
              {['←','→'].map((ar,i)=>(
                <button key={i} onClick={()=>setSlideIdx(idx=>i===0?(idx-1+slidePhotos.length)%slidePhotos.length:(idx+1)%slidePhotos.length)}
                  style={{width:42,height:42,borderRadius:'50%',border:'1px solid rgba(232,226,217,0.2)',background:'rgba(10,10,10,0.4)',backdropFilter:'blur(6px)',color:TXT,cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center'}}>{ar}</button>
              ))}
            </div>
          </>
        )}

        {showPwModal&&<PwModal/>}
        {showUpload&&<UploadModal/>}
      </div>
    )
  }

  // ═══ GALLERY ═══
  if (view==='gallery') {
    const displayPhotos = getDisplayPhotos()
    const byCat = cats.reduce((acc,cat)=>{ acc[cat]=photos.filter(p=>p.cat===cat); return acc },{})
    const seriesData = series.map(ser=>({...ser, photos:photos.filter(p=>(ser.photoIds||[]).includes(p.id))}))

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

          {/* Tabs */}
          <div style={{padding:isMobile?'0.75rem 1rem 0':'1.25rem 3rem 0',display:'flex',gap:0,borderBottom:'1px solid rgba(232,226,217,0.08)'}}>
            {[['all','Все фото'],['cats','Категории'],['series','Серии']].map(([tab,label])=>(
              <button key={tab} onClick={()=>{setGalleryTab(tab);setActiveSeries(null)}}
                style={{padding:'10px 24px',fontSize:'0.72rem',letterSpacing:'0.15em',textTransform:'uppercase',background:'transparent',border:'none',borderBottom:galleryTab===tab?`2px solid ${C}`:'2px solid transparent',color:galleryTab===tab?TXT:MUT,cursor:'pointer',marginBottom:-1}}>
                {label}
              </button>
            ))}
          </div>

          {/* ALL */}
          {galleryTab==='all'&&(
            <div>
              <div style={{padding:'1rem 3rem',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                <div style={{position:'relative'}}>
                  <span style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',opacity:0.4,fontSize:13}}>🔍</span>
                  <input style={{padding:'6px 10px 6px 32px',fontSize:13,border:'0.5px solid rgba(232,226,217,0.2)',borderRadius:6,background:'rgba(255,255,255,0.05)',color:TXT,outline:'none',width:200}} placeholder="Поиск..." value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                {['Все',...cats].map(cat=>(
                  <button key={cat} onClick={()=>setFilterCat(cat)}
                    style={{fontSize:'0.65rem',padding:'5px 13px',borderRadius:999,border:filterCat===cat?'none':'1px solid rgba(232,226,217,0.2)',cursor:'pointer',background:filterCat===cat?C:'transparent',color:filterCat===cat?BG:MUT,letterSpacing:'0.15em',textTransform:'uppercase'}}>{cat}</button>
                ))}
                <div style={{marginLeft:'auto',display:'flex',gap:6}}>
                  {[['new','Новые'],['old','Старые'],['popular','Популярные']].map(([m,l])=>(
                    <button key={m} onClick={()=>setSortMode(m)}
                      style={{fontSize:'0.65rem',padding:'5px 12px',borderRadius:6,border:sortMode===m?`1px solid ${C}`:'1px solid rgba(232,226,217,0.2)',cursor:'pointer',background:'transparent',color:sortMode===m?C:MUT}}>{l}</button>
                  ))}
                </div>
              </div>
              <div style={{fontSize:'0.7rem',color:MUT,padding:isMobile?'0 1rem 0.5rem':'0 3rem 0.5rem'}}>{displayPhotos.length} фото</div>
              <div style={{padding:isMobile?'0 1rem 4rem':'0 3rem 4rem'}}><PhotoGrid list={displayPhotos}/></div>
            </div>
          )}

          {/* CATEGORIES */}
          {galleryTab==='cats'&&(
            <div style={{padding:'2rem 3rem 4rem'}}>
              {cats.map(cat=>{
                const cp=photos.filter(p=>p.cat===cat); if(cp.length===0) return null
                return (
                  <div key={cat} style={{marginBottom:'3rem'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
                      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.6rem',fontWeight:300}}>{cat}</div>
                      <span style={{fontSize:'0.65rem',letterSpacing:'0.18em',textTransform:'uppercase',color:C}}>{cp.length} фото</span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'2px'}}>
                      {cp.slice(0,6).map(p=><PhotoCard key={p.id} p={p}/>)}
                    </div>
                    {cp.length>6&&(
                      <button onClick={()=>{setFilterCat(cat);setGalleryTab('all')}}
                        style={{marginTop:12,fontSize:'0.65rem',letterSpacing:'0.18em',textTransform:'uppercase',background:'transparent',border:`1px solid ${C}`,color:C,padding:'7px 20px',borderRadius:2,cursor:'pointer'}}>
                        Показать все {cp.length} →
                      </button>
                    )}
                  </div>
                )
              })}
              {cats.every(cat=>photos.filter(p=>p.cat===cat).length===0)&&<div style={{color:MUT,padding:'4rem 0',textAlign:'center'}}>Нет фотографий</div>}
            </div>
          )}

          {/* SERIES */}
          {galleryTab==='series'&&(
            <div style={{padding:'2rem 3rem 4rem'}}>
              {activeSeries ? (
                <div>
                  <div style={{marginBottom:'1.5rem'}}>
                    <div style={{fontSize:'0.65rem',letterSpacing:'0.2em',textTransform:'uppercase',color:C,marginBottom:8,cursor:'pointer'}} onClick={()=>setActiveSeries(null)}>← Все серии</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'2rem',fontWeight:300}}>{activeSeries.title}</div>
                    {activeSeries.desc&&<div style={{fontSize:'0.85rem',color:MUT,marginTop:6}}>{activeSeries.desc}</div>}
                  </div>
                  {(activeSeries.photos?.length||0)===0
                    ?<div style={{color:MUT,padding:'2rem 0'}}>В этой серии пока нет фото. При добавлении выбери эту серию.</div>
                    :<PhotoGrid list={activeSeries.photos||[]}/>}
                </div>
              ) : (
                <>
                  {seriesData.length===0&&<div style={{color:MUT,padding:'4rem 0',textAlign:'center'}}>Серий пока нет.{isAdmin?' Нажми "+ Серия" чтобы создать.':''}</div>}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'1.5rem'}}>
                    {seriesData.map(ser=>{
                      const cover=ser.cover||ser.photos?.[0]?.url
                      return (
                        <div key={ser.id} onClick={()=>setActiveSeries(ser)}
                          style={{position:'relative',borderRadius:4,overflow:'hidden',cursor:'pointer',aspectRatio:'4/3',background:'linear-gradient(135deg,#1a1a2e,#0f3460)'}}>
                          {cover&&<img src={cover} alt={ser.title} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none'}} draggable={false}/>}
                          <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 60%)',display:'flex',flexDirection:'column',justifyContent:'flex-end',padding:'1.5rem'}}>
                            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.4rem',fontWeight:300}}>{ser.title}</div>
                            <div style={{fontSize:'0.65rem',letterSpacing:'0.18em',textTransform:'uppercase',color:C,marginTop:4}}>{ser.photos?.length||0} фото</div>
                            {ser.desc&&<div style={{fontSize:'0.75rem',color:'rgba(232,226,217,0.55)',marginTop:4}}>{ser.desc}</div>}
                          </div>
                          {isAdmin&&<button onClick={e=>{e.stopPropagation();setEditingSeries(ser);setShowSeriesEdit(true)}}
                            style={{position:'absolute',top:10,right:10,background:'rgba(10,10,10,0.7)',border:'1px solid rgba(232,226,217,0.2)',color:TXT,borderRadius:2,padding:'4px 10px',fontSize:'0.65rem',cursor:'pointer'}}>✏</button>}
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
        {showPwModal&&<PwModal/>}
        {showUpload&&<UploadModal/>}
        {showDlModal&&dlPhoto&&<DlModal/>}
        {showCatManager&&<CatManagerModal/>}
        {showSeriesEdit&&<SeriesEditModal/>}
      </div>
    )
  }

  // ═══ ABOUT ═══
  if (view==='about') return (
    <div style={{minHeight:'100vh',background:BG,color:TXT,fontFamily:"'Jost',sans-serif",fontWeight:300,overflowY:'auto'}}>
      <Nav solid={true}/>
      <div style={{maxWidth:900,margin:'0 auto',padding:isMobile?'calc(56px + 1.5rem) 1.25rem 3rem':'calc(64px + 3rem) 3rem 5rem',display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:isMobile?'2rem':'5rem',alignItems:'start'}}>
        {/* Avatar */}
        <div style={{aspectRatio:'3/4',position:'relative',overflow:'hidden',background:'linear-gradient(160deg,#1a1a2e,#0f3460 60%,#1c0a00)'}}>
          {avatarUrl && <img src={avatarUrl} alt={about.name} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none'}} draggable={false}/>}
          {isAdmin && (
            <button onClick={()=>setShowAvatarUpload(true)}
              style={{position:'absolute',bottom:16,left:'50%',transform:'translateX(-50%)',padding:'7px 18px',fontSize:'0.65rem',letterSpacing:'0.15em',textTransform:'uppercase',background:'rgba(10,10,10,0.75)',backdropFilter:'blur(4px)',border:`1px solid ${C}`,color:C,cursor:'pointer',borderRadius:2,whiteSpace:'nowrap'}}>
              {avatarUrl ? '✏ Сменить фото' : '+ Фото профиля'}
            </button>
          )}
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
          {[['@',about.email],['ig',about.ig],['✦',about.city]].map(([icon,val])=>(
            <div key={icon} style={{display:'flex',alignItems:'center',gap:'1rem',fontSize:'0.78rem',color:MUT,marginBottom:'0.6rem'}}>
              <span style={{color:C,width:14,fontSize:'0.7rem'}}>{icon}</span><span style={{color:TXT}}>{val}</span>
            </div>
          ))}
          <div style={{display:'flex',gap:'1rem',marginTop:'2rem',flexWrap:'wrap'}}>
            <button onClick={()=>requireAdmin('about',()=>setShowAboutEdit(true))}
              style={{padding:'9px 24px',fontSize:'0.7rem',letterSpacing:'0.18em',textTransform:'uppercase',border:'1px solid rgba(232,226,217,0.2)',background:'transparent',color:MUT,cursor:'pointer',borderRadius:2}}>
              Редактировать
            </button>
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
        <div style={{...MBX, width: uploadMode==='bulk' ? 720 : 460, maxWidth:'96vw', maxHeight:'92vh', overflowY:'auto'}}>
          <button style={closeX} onClick={()=>setShowUpload(false)}>✕</button>

          {/* Mode tabs */}
          <div style={{display:'flex',gap:0,marginBottom:'1.5rem',borderBottom:'1px solid rgba(232,226,217,0.08)'}}>
            {[['single','Одно фото'],['bulk','Несколько фото']].map(([mode,label])=>(
              <button key={mode} onClick={()=>setUploadMode(mode)}
                style={{padding:'8px 20px',fontSize:'0.72rem',letterSpacing:'0.15em',textTransform:'uppercase',background:'transparent',border:'none',borderBottom:uploadMode===mode?`2px solid ${C}`:'2px solid transparent',color:uploadMode===mode?TXT:MUT,cursor:'pointer',marginBottom:-1}}>
                {label}
              </button>
            ))}
          </div>

          {/* SINGLE MODE */}
          {uploadMode==='single'&&(
            <>
              <div style={{marginBottom:'1rem'}}>
                <label style={mLabel}>Фотография</label>
                <div style={{border:uploadFile?`1.5px solid ${C}`:'1.5px dashed rgba(232,226,217,0.2)',borderRadius:2,padding:'1.25rem',textAlign:'center',cursor:'pointer',color:uploadFile?C:MUT,fontSize:13,position:'relative'}} onClick={()=>{if(analyzing)return;const fi=document.getElementById('fi');if(fi){fi.value='';fi.click()}}}>

                  {uploadPreview?<img src={uploadPreview} alt="" style={{maxHeight:100,borderRadius:2,display:'block',margin:'0 auto'}}/>:'Нажмите, чтобы выбрать фото'}
                  <div style={{marginTop:4,fontSize:11}}>{uploadFile?.name||''}</div>
                  {analyzing&&<div style={{position:'absolute',inset:0,background:'rgba(10,10,10,0.8)',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:2,flexDirection:'column',gap:8}}>
                    <div style={{fontSize:'1.2rem'}}>🤖</div>
                    <div style={{fontSize:'0.75rem',color:C,letterSpacing:'0.1em'}}>AI анализирует...</div>
                  </div>}
                </div>
                <input id="fi" type="file" accept="image/*" style={{display:'none'}} onChange={onFileSelect} onClick={e=>{e.target.value=''}}/>
              </div>
              {analyzing&&<div style={{background:'rgba(200,169,110,0.08)',border:'1px solid rgba(200,169,110,0.2)',borderRadius:2,padding:'10px 14px',fontSize:'0.75rem',color:C,marginBottom:'1rem'}}>🤖 AI заполняет поля...</div>}
              {[['title','Название','Напр. Закат в горах'],['desc','Описание','Атмосфера и настроение...'],['location','📍 Место съёмки','Напр. Мальдивы, атолл Раа']].map(([k,l,ph])=>(
                <div key={k} style={{marginBottom:'1rem'}}>
                  <label style={mLabel}>{l}</label>
                  {k==='desc'
                    ?<textarea style={{...mInput,minHeight:56,resize:'vertical'}} value={uploadForm[k]} onChange={e=>setUploadForm(f=>({...f,[k]:e.target.value}))} placeholder={ph}/>
                    :<input style={mInput} value={uploadForm[k]} onChange={e=>setUploadForm(f=>({...f,[k]:e.target.value}))} placeholder={ph}/>}
                </div>
              ))}
              <div style={{marginBottom:'1rem'}}>
                <label style={mLabel}>Тема</label>
                <select style={mInput} value={uploadForm.cat} onChange={e=>setUploadForm(f=>({...f,cat:e.target.value}))}>
                  {cats.map(cat=><option key={cat}>{cat}</option>)}
                </select>
              </div>
              <div style={{marginBottom:'1rem'}}>
                <label style={mLabel}>Серия</label>
                {!showNewSeriesInUpload?(
                  <div style={{display:'flex',gap:8}}>
                    <select style={{...mInput,flex:1}} value={uploadForm.seriesId} onChange={e=>setUploadForm(f=>({...f,seriesId:e.target.value}))}>
                      <option value="">— Без серии —</option>
                      {series.map(ser=><option key={ser.id} value={ser.id}>{ser.title}</option>)}
                    </select>
                    <button type="button" onClick={()=>setShowNewSeriesInUpload(true)} style={{padding:'8px 14px',fontSize:'0.7rem',borderRadius:2,border:`1px solid ${C}`,background:'transparent',color:C,cursor:'pointer',whiteSpace:'nowrap'}}>+ Новая</button>
                  </div>
                ):(
                  <div style={{display:'flex',gap:8}}>
                    <input style={{...mInput,flex:1}} value={newSeriesName} onChange={e=>setNewSeriesName(e.target.value)} placeholder="Название новой серии..." autoFocus/>
                    <button type="button" onClick={()=>{setShowNewSeriesInUpload(false);setNewSeriesName('')}} style={{padding:'8px 10px',fontSize:'0.8rem',borderRadius:2,border:'1px solid rgba(232,226,217,0.2)',background:'transparent',color:MUT,cursor:'pointer'}}>✕</button>
                  </div>
                )}
                {showNewSeriesInUpload&&<div style={{fontSize:'0.65rem',color:C,marginTop:4}}>Серия создастся при сохранении</div>}
              </div>
              <div style={{marginBottom:'1rem'}}>
                <label style={mLabel}>Дата</label>
                <input style={mInput} type="date" value={uploadForm.date} onChange={e=>setUploadForm(f=>({...f,date:e.target.value}))}/>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:'1.25rem'}}>
                <button style={btnCancel} onClick={()=>setShowUpload(false)}>Отмена</button>
                <button style={{...btnSave,opacity:(uploading||analyzing)?0.6:1}} onClick={doUpload} disabled={uploading||analyzing}>
                  {uploading?'Загрузка...':analyzing?'Анализ...':'Сохранить'}
                </button>
              </div>
            </>
          )}

          {/* BULK MODE */}
          {uploadMode==='bulk'&&(
            <>
              {bulkFiles.length===0?(
                <div>
                  <div style={{border:'1.5px dashed rgba(232,226,217,0.2)',borderRadius:2,padding:'2.5rem',textAlign:'center',cursor:'pointer',color:MUT,fontSize:13}} onClick={()=>document.getElementById('bulk-fi').click()}>
                    <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>📁</div>
                    <div style={{fontSize:'0.9rem',marginBottom:4}}>Выберите несколько фотографий</div>
                    <div style={{fontSize:'0.72rem',color:'rgba(232,226,217,0.3)'}}>AI автоматически проанализирует каждую</div>
                  </div>
                  <input id="bulk-fi" type="file" accept="image/*" multiple style={{display:'none'}} onChange={onBulkFilesSelect}/>
                </div>
              ):(
                <div>
                  {/* Bulk series selector */}
                  <div style={{background:'rgba(200,169,110,0.06)',border:'1px solid rgba(200,169,110,0.15)',borderRadius:2,padding:'12px 14px',marginBottom:'1rem'}}>
                    <label style={{...mLabel,marginBottom:8}}>Серия для всех фото (необязательно)</label>
                    {!bulkShowNewSeries?(
                      <div style={{display:'flex',gap:8}}>
                        <select style={{...mInput,flex:1}} value={bulkSeriesId} onChange={e=>setBulkSeriesId(e.target.value)}>
                          <option value="">— Без серии —</option>
                          {series.map(ser=><option key={ser.id} value={ser.id}>{ser.title}</option>)}
                        </select>
                        <button onClick={()=>setBulkShowNewSeries(true)} style={{padding:'8px 14px',fontSize:'0.7rem',borderRadius:2,border:`1px solid ${C}`,background:'transparent',color:C,cursor:'pointer',whiteSpace:'nowrap'}}>+ Новая серия</button>
                      </div>
                    ):(
                      <div style={{display:'flex',gap:8}}>
                        <input style={{...mInput,flex:1}} value={bulkNewSeriesName} onChange={e=>setBulkNewSeriesName(e.target.value)} placeholder="Название серии..."/>
                        <button onClick={()=>{setBulkShowNewSeries(false);setBulkNewSeriesName('')}} style={{padding:'8px 10px',fontSize:'0.8rem',borderRadius:2,border:'1px solid rgba(232,226,217,0.2)',background:'transparent',color:MUT,cursor:'pointer'}}>✕</button>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  {bulkUploading&&(
                    <div style={{marginBottom:'1rem'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.7rem',color:MUT,marginBottom:6}}>
                        <span>Загружаю...</span><span>{bulkProgress}%</span>
                      </div>
                      <div style={{height:3,background:'rgba(232,226,217,0.1)',borderRadius:2}}>
                        <div style={{height:'100%',background:C,borderRadius:2,width:`${bulkProgress}%`,transition:'width 0.3s'}}/>
                      </div>
                    </div>
                  )}

                  {/* Photo list */}
                  <div style={{display:'flex',flexDirection:'column',gap:'1px',maxHeight:'52vh',overflowY:'auto'}}>
                    {bulkFiles.map(item=>(
                      <div key={item.id} style={{display:'grid',gridTemplateColumns:'72px 1fr auto',gap:10,padding:'10px',background:item.status==='done'?'rgba(99,153,34,0.08)':item.status==='error'?'rgba(226,75,74,0.08)':'rgba(255,255,255,0.02)',borderRadius:2,alignItems:'start',position:'relative'}}>
                        {/* Preview */}
                        <div style={{position:'relative',aspectRatio:'1',overflow:'hidden',borderRadius:2,background:'#1a1a1a',flexShrink:0}}>
                          {item.preview&&<img src={item.preview} alt="" style={{width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none'}}/>}
                          {item.analyzing&&<div style={{position:'absolute',inset:0,background:'rgba(10,10,10,0.75)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem'}}>🤖</div>}
                          {item.status==='done'&&<div style={{position:'absolute',inset:0,background:'rgba(99,153,34,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem'}}>✓</div>}
                          {item.status==='uploading'&&<div style={{position:'absolute',inset:0,background:'rgba(200,169,110,0.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',color:BG}}>↑</div>}
                        </div>
                        {/* Fields */}
                        <div style={{display:'flex',flexDirection:'column',gap:5}}>
                          <input style={{...mInput,padding:'5px 8px',fontSize:12}} value={item.form.title} onChange={e=>updateBulkItem(item.id,'title',e.target.value)} placeholder="Название" disabled={item.status==='done'||bulkUploading}/>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                            <select style={{...mInput,padding:'5px 8px',fontSize:12}} value={item.form.cat} onChange={e=>updateBulkItem(item.id,'cat',e.target.value)} disabled={item.status==='done'||bulkUploading}>
                              {cats.map(cat=><option key={cat}>{cat}</option>)}
                            </select>
                            <input style={{...mInput,padding:'5px 8px',fontSize:12}} type="date" value={item.form.date} onChange={e=>updateBulkItem(item.id,'date',e.target.value)} disabled={item.status==='done'||bulkUploading}/>
                          </div>
                          <input style={{...mInput,padding:'5px 8px',fontSize:12}} value={item.form.location} onChange={e=>updateBulkItem(item.id,'location',e.target.value)} placeholder="📍 Место" disabled={item.status==='done'||bulkUploading}/>
                          {item.analyzing&&<div style={{fontSize:'0.65rem',color:C}}>🤖 AI анализирует...</div>}
                          {item.status==='error'&&<div style={{fontSize:'0.65rem',color:'#E24B4A'}}>Ошибка загрузки</div>}
                        </div>
                        {/* Remove */}
                        {!bulkUploading&&item.status!=='done'&&(
                          <button onClick={()=>removeBulkItem(item.id)} style={{background:'none',border:'none',color:MUT,cursor:'pointer',fontSize:'1rem',padding:'2px 4px',flexShrink:0}}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{display:'flex',gap:8,justifyContent:'space-between',alignItems:'center',marginTop:'1rem'}}>
                    <button onClick={()=>document.getElementById('bulk-fi-more').click()} style={{...btnCancel,fontSize:'0.7rem'}}>+ Добавить ещё</button>
                    <input id="bulk-fi-more" type="file" accept="image/*" multiple style={{display:'none'}} onChange={async e=>{
                      const newFiles = Array.from(e.target.files)
                      const newItems = newFiles.map(file=>({id:Math.random().toString(36).slice(2),file,preview:null,form:{title:file.name.replace(/\.[^.]+$/,''),desc:'',cat:'Путешествия',date:new Date().toISOString().split('T')[0],location:''},status:'pending',analyzing:false}))
                      for(const item of newItems){await new Promise(r=>{const rd=new FileReader();rd.onload=ev=>{item.preview=ev.target.result;r()};rd.readAsDataURL(item.file)})}
                      setBulkFiles(prev=>[...prev,...newItems])
                    }}/>
                    <div style={{display:'flex',gap:8}}>
                      <button style={btnCancel} onClick={()=>{setBulkFiles([]);setBulkProgress(0);setBulkUploading(false)}}>Очистить</button>
                      <button style={{...btnSave,opacity:bulkUploading?0.6:1}} onClick={doBulkUpload} disabled={bulkUploading}>
                        {bulkUploading?`Загружаю ${bulkProgress}%`:`Загрузить ${bulkFiles.filter(x=>x.status==='pending').length} фото`}
                      </button>
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
    const subj=encodeURIComponent('Запрос на скачивание: '+dlPhoto.title)
    const body=encodeURIComponent('Здравствуйте!\n\nХочу запросить фото «'+dlPhoto.title+'».\n\nЦель: \n\nС уважением,')
    const tg=about.ig?.startsWith('@')?about.ig.slice(1):about.ig
    return (
      <div style={MB} onClick={e=>e.target===e.currentTarget&&setShowDlModal(false)}>
        <div style={{...MBX,textAlign:'center'}}>
          <button style={closeX} onClick={()=>setShowDlModal(false)}>✕</button>
          <div style={{fontSize:'1.5rem',marginBottom:'1rem',opacity:0.5}}>📷</div>
          <div style={mTitle}>Запросить фото</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.1rem',fontStyle:'italic',color:C,marginBottom:'1.5rem'}}>«{dlPhoto.title}»</div>
          <div style={{fontSize:'0.75rem',color:MUT,marginBottom:'1.5rem'}}>Свяжитесь с автором для получения разрешения</div>
          <div style={{display:'flex',gap:10,marginBottom:10}}>
            <a style={{flex:1,padding:'11px',fontSize:'0.7rem',letterSpacing:'0.15em',textTransform:'uppercase',borderRadius:2,background:C,border:`1px solid ${C}`,color:BG,fontWeight:400,textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:8}} href={`mailto:${about.email}?subject=${subj}&body=${body}`} target="_blank">✉ Email</a>
            <a style={{flex:1,padding:'11px',fontSize:'0.7rem',letterSpacing:'0.15em',textTransform:'uppercase',borderRadius:2,background:'transparent',border:'1px solid rgba(232,226,217,0.2)',color:MUT,textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:8}} href={`https://t.me/${tg}`} target="_blank">→ Telegram</a>
          </div>
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
                {DEFAULT_CATS.includes(cat)
                  ?<span style={{fontSize:11,color:MUT}}>стандартная</span>
                  :<button onClick={()=>setCats(p=>p.filter(x=>x!==cat))} style={{background:'none',border:'none',color:'#E24B4A',cursor:'pointer',fontSize:13}}>✕</button>}
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:8}}>
            <input style={{...mInput,flex:1}} value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Новая тема..." onKeyDown={e=>{if(e.key==='Enter'&&newCat.trim()){setCats(p=>[...p,newCat.trim()]);setNewCat('')}}}/>
            <button style={btnSave} onClick={()=>{if(newCat.trim()){setCats(p=>[...p,newCat.trim()]);setNewCat('')}}}>+ Добавить</button>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',marginTop:'1.5rem'}}>
            <button style={btnSave} onClick={()=>setShowCatManager(false)}>Готово</button>
          </div>
        </div>
      </div>
    )
  }

  function SeriesEditModal() {
    const [form,setForm]=useState(editingSeries?{title:editingSeries.title,desc:editingSeries.desc||''}:{title:'',desc:''})
    const [sel,setSel]=useState(editingSeries?.photoIds||[])
    return (
      <div style={MB} onClick={e=>e.target===e.currentTarget&&setShowSeriesEdit(false)}>
        <div style={{...MBX,width:560,maxWidth:'100%'}}>
          <button style={closeX} onClick={()=>setShowSeriesEdit(false)}>✕</button>
          <div style={mTitle}>{editingSeries?'Редактировать серию':'Новая серия'}</div>
          <div style={{marginBottom:'1rem'}}>
            <label style={mLabel}>Название</label>
            <input style={mInput} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Напр. Мальдивы 2022"/>
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={mLabel}>Описание</label>
            <input style={mInput} value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="Краткое описание..."/>
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={mLabel}>Выбери фотографии ({sel.length} выбрано)</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6,maxHeight:200,overflowY:'auto',padding:'4px 0'}}>
              {photos.map(p=>(
                <div key={p.id} onClick={()=>setSel(prev=>prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev,p.id])}
                  style={{aspectRatio:'1',position:'relative',cursor:'pointer',border:sel.includes(p.id)?`2px solid ${C}`:'2px solid transparent',borderRadius:2,overflow:'hidden',background:'#1a1a1a'}}>
                  {p.url&&<img src={p.thumb||p.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none'}}/>}
                  {sel.includes(p.id)&&<div style={{position:'absolute',top:3,right:3,background:C,borderRadius:'50%',width:14,height:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:BG,fontWeight:'bold'}}>✓</div>}
                </div>
              ))}
              {photos.length===0&&<div style={{gridColumn:'1/-1',color:MUT,fontSize:12,padding:'1rem 0'}}>Сначала добавьте фотографии</div>}
            </div>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:'1.25rem'}}>
            {editingSeries&&<button style={{...btnCancel,color:'#E24B4A',borderColor:'rgba(226,75,74,0.3)'}} onClick={async()=>{const u=series.filter(s=>s.id!==editingSeries.id);setSeries(u);await saveSeries(u);setShowSeriesEdit(false)}}>Удалить</button>}
            <button style={btnCancel} onClick={()=>setShowSeriesEdit(false)}>Отмена</button>
            <button style={btnSave} onClick={()=>{
              if(!form.title.trim()) return
              const cover=photos.find(p=>sel.includes(p.id))?.url||''
              let updatedSeries
              if(editingSeries){updatedSeries=series.map(s=>s.id===editingSeries.id?{...s,...form,photoIds:sel,cover:cover||s.cover}:s)}
              else{updatedSeries=[...series,{id:Date.now().toString(),...form,photoIds:sel,cover}]}
              setSeries(updatedSeries)
              saveSeries(updatedSeries)
              setShowSeriesEdit(false)
            }}>Сохранить</button>
          </div>
        </div>
      </div>
    )
  }

  function AboutEditModal() {
    const [form, setForm] = useState({...about})
    const [saving, setSaving] = useState(false)

    async function saveAbout() {
      setSaving(true)
      try {
        setAbout(form)
        await fetch('/api/about', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: adminPassword, about: { ...form, avatarUrl } })
        })
        setShowAboutEdit(false)
      } catch { setShowAboutEdit(false) }
      setSaving(false)
    }

    return (
      <div style={MB} onClick={e=>e.target===e.currentTarget&&setShowAboutEdit(false)}>
        <div style={MBX}>
          <button style={closeX} onClick={()=>setShowAboutEdit(false)}>✕</button>
          <div style={mTitle}>Редактировать профиль</div>
          {[['name','Имя'],['nameLast','Фамилия'],['role','Подзаголовок'],['email','Email'],['ig','Instagram / Telegram'],['city','Город']].map(([k,l])=>(
            <div key={k} style={{marginBottom:'1rem'}}>
              <label style={mLabel}>{l}</label>
              <input style={mInput} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>
            </div>
          ))}
          <div style={{marginBottom:'1rem'}}>
            <label style={mLabel}>О себе</label>
            <textarea style={{...mInput,minHeight:80,resize:'vertical'}} value={form.bio||''} onChange={e=>setForm(f=>({...f,bio:e.target.value}))}/>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:'1.25rem'}}>
            <button style={btnCancel} onClick={()=>setShowAboutEdit(false)}>Отмена</button>
            <button style={{...btnSave,opacity:saving?0.6:1}} onClick={saveAbout} disabled={saving}>
              {saving?'Сохраняю...':'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ═══ AVATAR UPLOAD MODAL ═══
  function AvatarUploadModal() {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(avatarUrl || null)
    const [saving, setSaving] = useState(false)
    const [pw, setPw] = useState(adminPassword || '')
    const [pwErr, setPwErr] = useState('')
    const [verified, setVerified] = useState(!!adminPassword)

    async function verifyPw() {
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pw })
        })
        if (!res.ok) { setPwErr('Неверный пароль'); return }
        setAdminPassword(pw)
        setVerified(true)
        setPwErr('')
      } catch { setPwErr('Ошибка соединения') }
    }

    function onPick(e) {
      const f = e.target.files[0]; if(!f) return
      setFile(f)
      const reader = new FileReader()
      reader.onload = ev => setPreview(ev.target.result)
      reader.readAsDataURL(f)
    }

    async function save() {
      if (!file) return
      setSaving(true)
      try {
        const compressed = await compressFromDataUrl(preview, 800, 0.85)
        const data = await uploadToImgBB(compressed, 'avatar')
        setAvatarUrl(data.url)
        await fetch('/api/about', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: adminPassword || pw, about: { ...about, avatarUrl: data.url } })
        })
        setShowAvatarUpload(false)
      } catch(err) { alert('Ошибка: ' + err.message) }
      setSaving(false)
    }

    return (
      <div style={MB} onClick={e=>e.target===e.currentTarget&&setShowAvatarUpload(false)}>
        <div style={{...MBX, width:380}}>
          <button style={closeX} onClick={()=>setShowAvatarUpload(false)}>✕</button>
          <div style={mTitle}>Фото профиля</div>

          {!verified ? (
            /* Шаг 1 — пароль */
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'1.8rem',marginBottom:'1rem',opacity:0.5}}>🔒</div>
              <div style={{fontSize:'0.75rem',color:MUT,marginBottom:'1.5rem'}}>Введите пароль администратора</div>
              <input style={{...mInput,textAlign:'center',letterSpacing:'0.3em',marginBottom:'0.5rem'}}
                type="password" placeholder="••••••••" value={pw}
                onChange={e=>setPw(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&verifyPw()} autoFocus/>
              {pwErr && <div style={{color:'#E24B4A',fontSize:'0.72rem',marginBottom:'0.5rem'}}>{pwErr}</div>}
              <button style={{...btnSave,width:'100%',padding:10,marginTop:8}} onClick={verifyPw}>Войти</button>
              <br/><button style={{...btnCancel,border:'none',marginTop:8}} onClick={()=>setShowAvatarUpload(false)}>Отмена</button>
            </div>
          ) : (
            /* Шаг 2 — выбор фото */
            <div>
              <div style={{aspectRatio:'3/4',position:'relative',overflow:'hidden',background:'linear-gradient(160deg,#1a1a2e,#0f3460)',borderRadius:2,marginBottom:'1rem'}}>
                {preview && <img src={preview} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>}
              </div>
              <button onClick={()=>document.getElementById('avatar-fi').click()}
                style={{width:'100%',padding:'10px',fontSize:'0.75rem',letterSpacing:'0.15em',textTransform:'uppercase',border:'1.5px dashed rgba(232,226,217,0.2)',background:'transparent',color:MUT,cursor:'pointer',borderRadius:2,marginBottom:'1.5rem'}}>
                {file ? '✓ ' + file.name : 'Выбрать фото'}
              </button>
              <input id="avatar-fi" type="file" accept="image/*" style={{display:'none'}} onChange={onPick}/>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button style={btnCancel} onClick={()=>setShowAvatarUpload(false)}>Отмена</button>
                <button style={{...btnSave, opacity:(!file||saving)?0.6:1}} onClick={save} disabled={!file||saving}>
                  {saving ? 'Сохраняю...' : 'Сохранить'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
