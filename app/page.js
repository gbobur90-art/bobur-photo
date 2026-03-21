'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const DEFAULT_CATS = ['Путешествия', 'Природа', 'Архитектура', 'Улица', 'Портрет']
const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
function fmtDate(d) { if(!d) return ''; const dt=new Date(d); return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}` }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}; return a }

export default function Home() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('home')
  const [galleryTab, setGalleryTab] = useState('all') // all | cats | series
  const [slideOrder, setSlideOrder] = useState([])
  const [slideIdx, setSlideIdx] = useState(0)
  const [filterCat, setFilterCat] = useState('Все')
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState('new') // new | old | popular
  const [favs, setFavs] = useState({})
  const [likes, setLikes] = useState({}) // photoId -> count
  const [cats, setCats] = useState(DEFAULT_CATS)
  const [series, setSeries] = useState([])
  const [activeSeries, setActiveSeries] = useState(null)

  // Lightbox
  const [lightbox, setLightbox] = useState(null) // photo object

  // Modals
  const [showUpload, setShowUpload] = useState(false)
  const [showPwModal, setShowPwModal] = useState(false)
  const [pwPurpose, setPwPurpose] = useState('upload')
  const [showDlModal, setShowDlModal] = useState(false)
  const [dlPhoto, setDlPhoto] = useState(null)
  const [showAboutEdit, setShowAboutEdit] = useState(false)
  const [showCatManager, setShowCatManager] = useState(false)
  const [showSeriesEdit, setShowSeriesEdit] = useState(false)
  const [editingSeries, setEditingSeries] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)

  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadPreview, setUploadPreview] = useState(null)
  const [uploadForm, setUploadForm] = useState({ title:'', desc:'', cat:'Путешествия', date:new Date().toISOString().split('T')[0], seriesId:'' })

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
      // init likes from stored data
      const lk = {}; arr.forEach(p => { lk[p.id] = p.likes||0 }); setLikes(lk)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { loadPhotos() }, [loadPhotos])

  // Randomize slideshow order when photos load
  useEffect(() => {
    if (photos.length === 0) return
    setSlideOrder(shuffle(photos.slice(0, Math.min(photos.length, 8)).map(p => p.id)))
  }, [photos.length])

  // Random slide timer
  useEffect(() => {
    if (view !== 'home' || slideOrder.length === 0) return
    timerRef.current = setInterval(() => setSlideIdx(i => (i+1) % slideOrder.length), 5000)
    return () => clearInterval(timerRef.current)
  }, [view, slideOrder.length])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') {
        if (lightbox) { const arr=getDisplayPhotos(); const i=arr.findIndex(p=>p.id===lightbox.id); setLightbox(arr[(i+1)%arr.length]) }
        else setSlideIdx(i => (i+1) % Math.max(slideOrder.length,1))
      }
      if (e.key === 'ArrowLeft') {
        if (lightbox) { const arr=getDisplayPhotos(); const i=arr.findIndex(p=>p.id===lightbox.id); setLightbox(arr[(i-1+arr.length)%arr.length]) }
        else setSlideIdx(i => (i-1+Math.max(slideOrder.length,1)) % Math.max(slideOrder.length,1))
      }
      if (e.key === 'Escape') {
        if (lightbox) { setLightbox(null); return }
        setShowUpload(false); setShowPwModal(false); setShowDlModal(false)
        setShowAboutEdit(false); setShowCatManager(false); setShowSeriesEdit(false)
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

  const slidePhotos = slideOrder.map(id => photos.find(p => p.id===id)).filter(Boolean)
  const allCats = ['Все', ...cats]

  function getDisplayPhotos() {
    return photos
      .filter(p => filterCat==='Все' || p.cat===filterCat)
      .filter(p => !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.desc?.toLowerCase().includes(search.toLowerCase()))
      .sort((a,b) => {
        if (sortMode==='new') return new Date(b.createdAt)-new Date(a.createdAt)
        if (sortMode==='old') return new Date(a.createdAt)-new Date(b.createdAt)
        if (sortMode==='popular') return (likes[b.id]||0)-(likes[a.id]||0)
        return 0
      })
  }

  function toggleLike(photoId, e) {
    e && e.stopPropagation()
    const key = 'liked_'+photoId
    const alreadyLiked = localStorage.getItem(key)
    if (alreadyLiked) {
      localStorage.removeItem(key)
      setLikes(l => ({...l, [photoId]: Math.max(0,(l[photoId]||1)-1)}))
    } else {
      localStorage.setItem(key, '1')
      setLikes(l => ({...l, [photoId]: (l[photoId]||0)+1}))
    }
  }

  function isLiked(photoId) {
    try { return !!localStorage.getItem('liked_'+photoId) } catch { return false }
  }

  function requireAdmin(purpose, onSuccess) {
    if (isAdmin) { onSuccess(); return }
    setPwPurpose(purpose); setPwInput(''); setPwError('')
    setPendingAction(() => onSuccess); setShowPwModal(true)
  }

  async function checkPassword() {
    try {
      const res = await fetch('/api/photos', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({password:pwInput, photo:{title:'__check__',url:'',cat:'check',date:'2000-01-01'}})
      })
      if (res.status===401) { setPwError('Неверный пароль'); return }
      setIsAdmin(true); setShowPwModal(false); setPwError('')
      if (pendingAction) { pendingAction(); setPendingAction(null) }
      await loadPhotos()
    } catch { setPwError('Ошибка соединения') }
  }

  function onFileSelect(e) {
    const file=e.target.files[0]; if(!file) return
    setUploadFile(file)
    const reader=new FileReader(); reader.onload=ev=>setUploadPreview(ev.target.result); reader.readAsDataURL(file)
  }

  async function doUpload() {
    if (!uploadFile||!uploadForm.title) return
    setUploading(true)
    try {
      const imgForm=new FormData(); imgForm.append('password',pwInput); imgForm.append('image',uploadFile); imgForm.append('title',uploadForm.title)
      const imgRes=await fetch('/api/upload',{method:'POST',body:imgForm}); const imgData=await imgRes.json()
      if (!imgRes.ok) throw new Error(imgData.error)
      const metaRes=await fetch('/api/photos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pwInput,photo:{...uploadForm,url:imgData.url,thumb:imgData.thumb,likes:0}})})
      if (!metaRes.ok) throw new Error('Ошибка сохранения')
      const newPhoto=await metaRes.json()
      if (uploadForm.seriesId&&newPhoto?.id) setSeries(prev=>prev.map(s=>s.id===uploadForm.seriesId?{...s,photoIds:[...(s.photoIds||[]),newPhoto.id],cover:s.cover||imgData.url}:s))
      await loadPhotos(); setShowUpload(false); setUploadFile(null); setUploadPreview(null)
      setUploadForm({title:'',desc:'',cat:cats[0]||'Путешествия',date:new Date().toISOString().split('T')[0],seriesId:''})
    } catch(err) { alert('Ошибка: '+err.message) }
    setUploading(false)
  }

  // Theme
  const C='#c8a96e', MUT='rgba(232,226,217,0.45)', BG='#0a0a0a', TXT='#e8e2d9'
  const mInput={width:'100%',padding:'8px 10px',fontSize:13,background:'#1a1a1a',border:'1px solid rgba(232,226,217,0.12)',borderRadius:2,color:TXT,outline:'none',fontFamily:"'Jost',sans-serif"}
  const mLabel={display:'block',fontSize:'0.65rem',letterSpacing:'0.18em',textTransform:'uppercase',color:MUT,marginBottom:4}
  const btnSave={padding:'7px 20px',fontSize:'0.75rem',letterSpacing:'0.14em',textTransform:'uppercase',background:C,border:'none',color:BG,cursor:'pointer',borderRadius:2,fontWeight:400}
  const btnCancel={padding:'7px 16px',fontSize:'0.75rem',borderRadius:2,border:'1px solid rgba(232,226,217,0.2)',background:'transparent',color:MUT,cursor:'pointer'}
  const MODAL_BG={position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.92)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}
  const MODAL_BOX={background:'#111',border:'1px solid rgba(232,226,217,0.1)',borderRadius:4,padding:'2.5rem',width:440,maxWidth:'100%',position:'relative',maxHeight:'90vh',overflowY:'auto'}
  const mTitle={fontFamily:"'Cormorant Garamond',serif",fontSize:'1.5rem',fontWeight:300,marginBottom:'1.5rem'}
  const closeX={position:'absolute',top:12,right:14,background:'none',border:'none',color:MUT,fontSize:'1.2rem',cursor:'pointer'}
  const accentBtn={fontSize:'0.65rem',padding:'6px 16px',borderRadius:2,border:'none',background:C,color:BG,cursor:'pointer',letterSpacing:'0.12em',textTransform:'uppercase'}

  const Nav = ({solid}) => (
    <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:200,height:64,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 2.5rem',background:solid?BG:'linear-gradient(to bottom,rgba(10,10,10,0.85),transparent)',borderBottom:solid?'1px solid rgba(232,226,217,0.06)':'none'}}>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.4rem',fontWeight:300,letterSpacing:'0.12em',color:TXT,cursor:'pointer'}} onClick={()=>setView('home')}>
        Фото<em style={{color:C,fontStyle:'italic'}}>Дневник</em>
      </div>
      <ul style={{display:'flex',gap:'2rem',listStyle:'none',alignItems:'center'}}>
        {[['home','Главная'],['gallery','Галерея'],['about','Об авторе']].map(([v,label])=>(
          <li key={v}><span style={{fontSize:'0.72rem',letterSpacing:'0.18em',textTransform:'uppercase',color:view===v?TXT:MUT,cursor:'pointer'}} onClick={()=>setView(v)}>{label}</span></li>
        ))}
        <li><button style={{fontSize:'0.72rem',letterSpacing:'0.15em',textTransform:'uppercase',color:BG,background:C,border:'none',padding:'6px 16px',borderRadius:2,cursor:'pointer'}} onClick={()=>requireAdmin('upload',()=>setShowUpload(true))}>+ Добавить</button></li>
      </ul>
    </nav>
  )

  // PHOTO CARD
  const PhotoCard = ({p, onClick}) => {
    const liked = isLiked(p.id)
    const likeCount = likes[p.id]||0
    return (
      <div style={{position:'relative',aspectRatio:'3/2',overflow:'hidden',cursor:'pointer',background:'#111'}}
        onMouseEnter={e=>{e.currentTarget.querySelector('.ov').style.background='rgba(0,0,0,0.5)';e.currentTarget.querySelectorAll('.rv').forEach(el=>{el.style.opacity='1';el.style.transform='translateY(0)'})}}
        onMouseLeave={e=>{e.currentTarget.querySelector('.ov').style.background='rgba(0,0,0,0)';e.currentTarget.querySelectorAll('.rv').forEach(el=>{el.style.opacity='0';el.style.transform='translateY(8px)'})}}
        onClick={()=>onClick(p)}>
        {p.url?<img src={p.url} alt={p.title} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none',userSelect:'none'}} draggable={false}/>
          :<div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#1a1a2e,#0f3460)'}}/>}
        <div className="ov" style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',justifyContent:'flex-end',padding:'1rem',background:'rgba(0,0,0,0)',transition:'background 0.3s'}}>
          <div className="rv" style={{fontSize:'0.6rem',letterSpacing:'0.22em',textTransform:'uppercase',color:C,marginBottom:3,opacity:0,transform:'translateY(8px)',transition:'all 0.3s'}}>{p.cat}</div>
          <div className="rv" style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1rem',fontWeight:300,opacity:0,transform:'translateY(8px)',transition:'all 0.3s 0.04s'}}>{p.title}</div>
          <div className="rv" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:6,opacity:0,transform:'translateY(8px)',transition:'all 0.3s 0.08s'}}>
            <button onClick={e=>{e.stopPropagation();setDlPhoto(p);setShowDlModal(true)}}
              style={{fontSize:'0.6rem',letterSpacing:'0.15em',textTransform:'uppercase',padding:'5px 12px',borderRadius:2,border:'1px solid rgba(232,226,217,0.3)',background:'rgba(10,10,10,0.6)',color:TXT,cursor:'pointer'}}>✉ Запросить</button>
            <button onClick={e=>toggleLike(p.id,e)}
              style={{display:'flex',alignItems:'center',gap:5,fontSize:'0.72rem',padding:'5px 10px',borderRadius:2,border:liked?'1px solid rgba(226,75,74,0.5)':'1px solid rgba(232,226,217,0.25)',background:'rgba(10,10,10,0.6)',color:liked?'#E24B4A':MUT,cursor:'pointer'}}>
              {liked?'♥':'♡'} {likeCount>0&&<span>{likeCount}</span>}
            </button>
          </div>
        </div>
        {/* Like badge always visible */}
        {likeCount>0&&<div style={{position:'absolute',top:8,right:8,background:'rgba(10,10,10,0.7)',backdropFilter:'blur(4px)',border:'1px solid rgba(226,75,74,0.4)',borderRadius:999,padding:'3px 8px',fontSize:'0.65rem',color:'#E24B4A',display:'flex',alignItems:'center',gap:4}}>♥ {likeCount}</div>}
      </div>
    )
  }

  const PhotoGrid = ({list}) => (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'2px'}}>
      {list.length===0&&<div style={{color:MUT,padding:'4rem',gridColumn:'1/-1',textAlign:'center'}}>Нет фотографий</div>}
      {list.map(p=><PhotoCard key={p.id} p={p} onClick={setLightbox}/>)}
    </div>
  )

  // ═══ LIGHTBOX ═══
  const Lightbox = () => {
    const arr = getDisplayPhotos()
    const idx = arr.findIndex(p=>p.id===lightbox.id)
    const liked = isLiked(lightbox.id)
    const likeCount = likes[lightbox.id]||0
    return (
      <div style={{position:'fixed',inset:0,zIndex:700,background:'rgba(0,0,0,0.96)',display:'flex',alignItems:'center',justifyContent:'center'}} onClick={e=>e.target===e.currentTarget&&setLightbox(null)}>
        {/* Close */}
        <button onClick={()=>setLightbox(null)} style={{position:'absolute',top:20,right:24,background:'none',border:'none',color:TXT,fontSize:'1.8rem',cursor:'pointer',zIndex:10}}>✕</button>
        {/* Prev */}
        {arr.length>1&&<button onClick={()=>setLightbox(arr[(idx-1+arr.length)%arr.length])} style={{position:'absolute',left:20,top:'50%',transform:'translateY(-50%)',width:48,height:48,borderRadius:'50%',border:'1px solid rgba(232,226,217,0.2)',background:'rgba(10,10,10,0.6)',color:TXT,fontSize:'1.2rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10}}>←</button>}
        {/* Next */}
        {arr.length>1&&<button onClick={()=>setLightbox(arr[(idx+1)%arr.length])} style={{position:'absolute',right:20,top:'50%',transform:'translateY(-50%)',width:48,height:48,borderRadius:'50%',border:'1px solid rgba(232,226,217,0.2)',background:'rgba(10,10,10,0.6)',color:TXT,fontSize:'1.2rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10}}>→</button>}
        {/* Image */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',maxWidth:'90vw',maxHeight:'90vh'}}>
          <img src={lightbox.url} alt={lightbox.title} style={{maxWidth:'85vw',maxHeight:'75vh',objectFit:'contain',pointerEvents:'none',userSelect:'none',borderRadius:2}} draggable={false}/>
          <div style={{marginTop:'1.25rem',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.4rem',fontWeight:300}}>{lightbox.title}</div>
            <div style={{display:'flex',alignItems:'center',gap:16}}>
              <span style={{fontSize:'0.65rem',letterSpacing:'0.2em',textTransform:'uppercase',color:C}}>{lightbox.cat}</span>
              <span style={{fontSize:'0.65rem',color:MUT}}>{fmtDate(lightbox.date)}</span>
              {lightbox.desc&&<span style={{fontSize:'0.75rem',color:MUT}}>{lightbox.desc}</span>}
            </div>
            <div style={{display:'flex',gap:10,marginTop:4}}>
              <button onClick={e=>toggleLike(lightbox.id,e)}
                style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.75rem',padding:'7px 16px',borderRadius:2,border:liked?'1px solid rgba(226,75,74,0.5)':'1px solid rgba(232,226,217,0.2)',background:'rgba(10,10,10,0.8)',color:liked?'#E24B4A':MUT,cursor:'pointer'}}>
                {liked?'♥':'♡'} Нравится {likeCount>0&&`(${likeCount})`}
              </button>
              <button onClick={()=>{setDlPhoto(lightbox);setShowDlModal(true)}}
                style={{fontSize:'0.75rem',padding:'7px 16px',borderRadius:2,border:`1px solid ${C}`,background:'transparent',color:C,cursor:'pointer'}}>✉ Запросить фото</button>
            </div>
            {arr.length>1&&<div style={{fontSize:'0.65rem',color:MUT,marginTop:4}}>{idx+1} / {arr.length}</div>}
          </div>
        </div>
      </div>
    )
  }

  // ═══ HOME ═══
  if (view==='home') {
    const currentSlide = slidePhotos[slideIdx]
    const totalPhotos = photos.length
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
              <div style={{position:'relative',zIndex:2,padding:'0 3rem 6rem',width:'100%'}}>
                <div style={{fontSize:'0.65rem',letterSpacing:'0.25em',textTransform:'uppercase',color:C,marginBottom:'0.6rem'}}>Портфолио</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'clamp(2rem,5vw,4rem)',fontWeight:300}}>Bobur Gafurov</div>
              </div>
            </div>
          )}
          {slidePhotos.map((p,i)=>(
            <div key={p.id} style={{position:'absolute',inset:0,opacity:i===slideIdx?1:0,transition:'opacity 1.2s ease',display:'flex',alignItems:'flex-end'}}>
              <div style={{position:'absolute',inset:0,backgroundImage:`url(${p.url})`,backgroundSize:'cover',backgroundPosition:'center'}}/>
              <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.7) 100%)'}}/>
              <div style={{position:'absolute',bottom:0,left:0,right:0,height:'45%',background:'linear-gradient(to top,rgba(0,0,0,0.85),transparent)'}}/>
              <div style={{position:'relative',zIndex:2,padding:'0 3rem 5rem',width:'100%'}}>
                <div style={{fontSize:'0.65rem',letterSpacing:'0.25em',textTransform:'uppercase',color:C,marginBottom:'0.6rem'}}>{p.cat}</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'clamp(2rem,5vw,4rem)',fontWeight:300}}>{p.title}</div>
                <div style={{fontSize:'0.7rem',color:MUT,letterSpacing:'0.15em',marginTop:'0.75rem'}}>{fmtDate(p.date)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats bottom left */}
        {totalPhotos>0&&(
          <div style={{position:'fixed',bottom:'3.5rem',left:'3rem',zIndex:100,display:'flex',gap:'2rem'}}>
            {[[totalPhotos,'фото'],[series.length,'серий'],[totalLikes,'лайков']].map(([num,label])=>(
              <div key={label} style={{textAlign:'center'}}>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.6rem',fontWeight:300,color:TXT,lineHeight:1}}>{num}</div>
                <div style={{fontSize:'0.6rem',letterSpacing:'0.18em',textTransform:'uppercase',color:MUT,marginTop:2}}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Dots */}
        {slidePhotos.length>1&&(
          <div style={{position:'fixed',bottom:'3.5rem',left:'50%',transform:'translateX(-50%)',zIndex:100,display:'flex',gap:8}}>
            {slidePhotos.map((_,i)=><div key={i} onClick={()=>setSlideIdx(i)} style={{width:5,height:5,borderRadius:'50%',background:i===slideIdx?C:MUT,cursor:'pointer',transform:i===slideIdx?'scale(1.4)':'scale(1)',transition:'all 0.3s'}}/>)}
          </div>
        )}

        {/* Counter + controls */}
        {slidePhotos.length>1&&(
          <>
            <div style={{position:'fixed',top:'50%',right:'2.5rem',transform:'translateY(-50%)',zIndex:100,writingMode:'vertical-rl',fontSize:'0.65rem',letterSpacing:'0.2em',color:MUT}}>
              <span style={{color:TXT}}>{String(slideIdx+1).padStart(2,'0')}</span>{' / '}{String(slidePhotos.length).padStart(2,'0')}
            </div>
            <div style={{position:'fixed',bottom:'3.5rem',right:'3rem',zIndex:100,display:'flex',gap:'1rem'}}>
              {['←','→'].map((arrow,i)=>(
                <button key={i} onClick={()=>setSlideIdx(idx=>i===0?(idx-1+slidePhotos.length)%slidePhotos.length:(idx+1)%slidePhotos.length)}
                  style={{width:42,height:42,borderRadius:'50%',border:'1px solid rgba(232,226,217,0.2)',background:'rgba(10,10,10,0.4)',backdropFilter:'blur(6px)',color:TXT,cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center'}}>{arrow}</button>
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
    const seriesWithPhotos = series.map(ser=>({...ser, photos:photos.filter(p=>(ser.photoIds||[]).includes(p.id))}))

    return (
      <div style={{minHeight:'100vh',background:BG,color:TXT,fontFamily:"'Jost',sans-serif",fontWeight:300,overflowY:'auto'}}>
        <Nav solid={true}/>
        <div style={{paddingTop:80}}>
          {/* Header */}
          <div style={{padding:'2.5rem 3rem 0',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'2.2rem',fontWeight:300}}>Галерея</div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {isAdmin&&galleryTab==='all'&&<button style={accentBtn} onClick={()=>setShowCatManager(true)}>⚙ Темы</button>}
              {isAdmin&&galleryTab==='series'&&<button style={accentBtn} onClick={()=>{setEditingSeries(null);setShowSeriesEdit(true)}}>+ Серия</button>}
            </div>
          </div>

          {/* Tabs */}
          <div style={{padding:'1.5rem 3rem 0',display:'flex',gap:0,borderBottom:'1px solid rgba(232,226,217,0.08)'}}>
            {[['all','Все фото'],['cats','Категории'],['series','Серии']].map(([tab,label])=>(
              <button key={tab} onClick={()=>setGalleryTab(tab)}
                style={{padding:'10px 24px',fontSize:'0.72rem',letterSpacing:'0.15em',textTransform:'uppercase',background:'transparent',border:'none',borderBottom:galleryTab===tab?`2px solid ${C}`:'2px solid transparent',color:galleryTab===tab?TXT:MUT,cursor:'pointer',marginBottom:-1}}>
                {label}
              </button>
            ))}
          </div>

          {/* ALL PHOTOS TAB */}
          {galleryTab==='all'&&(
            <div>
              {/* Filters */}
              <div style={{padding:'1rem 3rem',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                <div style={{position:'relative'}}>
                  <span style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',opacity:0.4,fontSize:13}}>🔍</span>
                  <input style={{padding:'6px 10px 6px 32px',fontSize:13,border:'0.5px solid rgba(232,226,217,0.2)',borderRadius:6,background:'rgba(255,255,255,0.05)',color:TXT,outline:'none',width:200}} placeholder="Поиск..." value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                {allCats.map(cat=>(
                  <button key={cat} onClick={()=>setFilterCat(cat)}
                    style={{fontSize:'0.65rem',padding:'5px 13px',borderRadius:999,border:filterCat===cat?'none':'1px solid rgba(232,226,217,0.2)',cursor:'pointer',background:filterCat===cat?C:'transparent',color:filterCat===cat?BG:MUT,letterSpacing:'0.15em',textTransform:'uppercase'}}>{cat}</button>
                ))}
                <div style={{marginLeft:'auto',display:'flex',gap:6}}>
                  {[['new','Новые'],['old','Старые'],['popular','Популярные']].map(([mode,label])=>(
                    <button key={mode} onClick={()=>setSortMode(mode)}
                      style={{fontSize:'0.65rem',padding:'5px 12px',borderRadius:6,border:sortMode===mode?`1px solid ${C}`:'1px solid rgba(232,226,217,0.2)',cursor:'pointer',background:'transparent',color:sortMode===mode?C:MUT}}>{label}</button>
                  ))}
                </div>
              </div>
              <div style={{fontSize:'0.7rem',color:MUT,padding:'0 3rem 0.5rem'}}>{displayPhotos.length} фото</div>
              <div style={{padding:'0 3rem 4rem'}}><PhotoGrid list={displayPhotos}/></div>
            </div>
          )}

          {/* CATEGORIES TAB */}
          {galleryTab==='cats'&&(
            <div style={{padding:'2rem 3rem 4rem'}}>
              {cats.map(cat=>{
                const catPhotos=photos.filter(p=>p.cat===cat)
                if (catPhotos.length===0) return null
                return (
                  <div key={cat} style={{marginBottom:'3rem'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
                      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.6rem',fontWeight:300}}>{cat}</div>
                      <span style={{fontSize:'0.65rem',letterSpacing:'0.18em',textTransform:'uppercase',color:C}}>{catPhotos.length} фото</span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'2px'}}>
                      {catPhotos.slice(0,6).map(p=><PhotoCard key={p.id} p={p} onClick={setLightbox}/>)}
                    </div>
                    {catPhotos.length>6&&(
                      <button onClick={()=>{setFilterCat(cat);setGalleryTab('all')}}
                        style={{marginTop:12,fontSize:'0.65rem',letterSpacing:'0.18em',textTransform:'uppercase',background:'transparent',border:`1px solid ${C}`,color:C,padding:'7px 20px',borderRadius:2,cursor:'pointer'}}>
                        Показать все {catPhotos.length} →
                      </button>
                    )}
                  </div>
                )
              })}
              {cats.every(cat=>photos.filter(p=>p.cat===cat).length===0)&&(
                <div style={{color:MUT,padding:'4rem 0',textAlign:'center'}}>Нет фотографий</div>
              )}
            </div>
          )}

          {/* SERIES TAB */}
          {galleryTab==='series'&&(
            <div style={{padding:'2rem 3rem 4rem'}}>
              {seriesWithPhotos.length===0&&(
                <div style={{color:MUT,padding:'4rem 0',textAlign:'center'}}>
                  Серий пока нет.{isAdmin?' Нажми "+ Серия" чтобы создать.':''}
                </div>
              )}
              {activeSeries ? (
                <div>
                  <div style={{marginBottom:'1.5rem'}}>
                    <div style={{fontSize:'0.65rem',letterSpacing:'0.2em',textTransform:'uppercase',color:C,marginBottom:8,cursor:'pointer'}} onClick={()=>setActiveSeries(null)}>← Все серии</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'2rem',fontWeight:300}}>{activeSeries.title}</div>
                    {activeSeries.desc&&<div style={{fontSize:'0.85rem',color:MUT,marginTop:6}}>{activeSeries.desc}</div>}
                  </div>
                  {activeSeries.photos?.length===0
                    ?<div style={{color:MUT,padding:'2rem 0'}}>В этой серии пока нет фото.</div>
                    :<PhotoGrid list={activeSeries.photos||[]}/>}
                </div>
              ) : (
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'1.5rem'}}>
                  {seriesWithPhotos.map(ser=>{
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
      <div style={{maxWidth:900,margin:'0 auto',padding:'calc(64px + 3rem) 3rem 5rem',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'5rem',alignItems:'start'}}>
        <div style={{aspectRatio:'3/4',background:'linear-gradient(160deg,#1a1a2e,#0f3460 60%,#1c0a00)'}}/>
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
          <button onClick={()=>requireAdmin('about',()=>setShowAboutEdit(true))}
            style={{marginTop:'2rem',padding:'9px 24px',fontSize:'0.7rem',letterSpacing:'0.18em',textTransform:'uppercase',border:'1px solid rgba(232,226,217,0.2)',background:'transparent',color:MUT,cursor:'pointer',borderRadius:2}}>
            Редактировать
          </button>
        </div>
      </div>
      {showPwModal&&<PwModal/>}
      {showAboutEdit&&<AboutEditModal/>}
    </div>
  )

  // ══════════════ MODALS ══════════════
  function PwModal() {
    const labels={upload:'Вход для загрузки',about:'Редактирование профиля',series:'Управление сериями',cat:'Управление темами'}
    return (
      <div style={MODAL_BG} onClick={e=>e.target===e.currentTarget&&setShowPwModal(false)}>
        <div style={MODAL_BOX}>
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
      <div style={MODAL_BG} onClick={e=>e.target===e.currentTarget&&setShowUpload(false)}>
        <div style={MODAL_BOX}>
          <button style={closeX} onClick={()=>setShowUpload(false)}>✕</button>
          <div style={mTitle}>Новое фото</div>
          <div style={{marginBottom:'1rem'}}>
            <label style={mLabel}>Фотография</label>
            <div style={{border:uploadFile?`1.5px solid ${C}`:'1.5px dashed rgba(232,226,217,0.2)',borderRadius:2,padding:'1.25rem',textAlign:'center',cursor:'pointer',color:uploadFile?C:MUT,fontSize:13}} onClick={()=>document.getElementById('fi').click()}>
              {uploadPreview?<img src={uploadPreview} alt="" style={{maxHeight:100,borderRadius:2}}/>:'Нажмите, чтобы выбрать'}
              <div style={{marginTop:4,fontSize:11}}>{uploadFile?.name||''}</div>
            </div>
            <input id="fi" type="file" accept="image/*" style={{display:'none'}} onChange={onFileSelect}/>
          </div>
          {[['title','Название','Напр. Закат в горах'],['desc','Описание','Несколько слов...']].map(([k,l,ph])=>(
            <div key={k} style={{marginBottom:'1rem'}}>
              <label style={mLabel}>{l}</label>
              <input style={mInput} value={uploadForm[k]} onChange={e=>setUploadForm(f=>({...f,[k]:e.target.value}))} placeholder={ph}/>
            </div>
          ))}
          <div style={{marginBottom:'1rem'}}>
            <label style={mLabel}>Тема</label>
            <select style={mInput} value={uploadForm.cat} onChange={e=>setUploadForm(f=>({...f,cat:e.target.value}))}>
              {cats.map(cat=><option key={cat}>{cat}</option>)}
            </select>
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={mLabel}>Серия (необязательно)</label>
            <select style={mInput} value={uploadForm.seriesId} onChange={e=>setUploadForm(f=>({...f,seriesId:e.target.value}))}>
              <option value="">— Без серии —</option>
              {series.map(ser=><option key={ser.id} value={ser.id}>{ser.title}</option>)}
            </select>
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={mLabel}>Дата</label>
            <input style={mInput} type="date" value={uploadForm.date} onChange={e=>setUploadForm(f=>({...f,date:e.target.value}))}/>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:'1.25rem'}}>
            <button style={btnCancel} onClick={()=>setShowUpload(false)}>Отмена</button>
            <button style={{...btnSave,opacity:uploading?0.6:1}} onClick={doUpload} disabled={uploading}>{uploading?'Загрузка...':'Сохранить'}</button>
          </div>
        </div>
      </div>
    )
  }

  function DlModal() {
    const subj=encodeURIComponent('Запрос на скачивание: '+dlPhoto.title)
    const body=encodeURIComponent('Здравствуйте!\n\nХочу запросить фото «'+dlPhoto.title+'».\n\nЦель: \n\nС уважением,')
    const tg=about.ig?.startsWith('@')?about.ig.slice(1):about.ig
    return (
      <div style={MODAL_BG} onClick={e=>e.target===e.currentTarget&&setShowDlModal(false)}>
        <div style={{...MODAL_BOX,textAlign:'center'}}>
          <button style={closeX} onClick={()=>setShowDlModal(false)}>✕</button>
          <div style={{fontSize:'1.5rem',marginBottom:'1rem',opacity:0.5}}>📷</div>
          <div style={mTitle}>Запросить фото</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.1rem',fontStyle:'italic',color:C,marginBottom:'1.5rem'}}>«{dlPhoto.title}»</div>
          <div style={{fontSize:'0.75rem',color:MUT,marginBottom:'1.5rem'}}>Свяжитесь с автором для получения разрешения</div>
          <div style={{display:'flex',gap:10,marginBottom:10}}>
            <a style={{flex:1,padding:'11px 10px',fontSize:'0.7rem',letterSpacing:'0.15em',textTransform:'uppercase',borderRadius:2,background:C,border:`1px solid ${C}`,color:BG,fontWeight:400,textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:8}} href={`mailto:${about.email}?subject=${subj}&body=${body}`} target="_blank">✉ Email</a>
            <a style={{flex:1,padding:'11px 10px',fontSize:'0.7rem',letterSpacing:'0.15em',textTransform:'uppercase',borderRadius:2,background:'transparent',border:'1px solid rgba(232,226,217,0.2)',color:MUT,textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:8}} href={`https://t.me/${tg}`} target="_blank">→ Telegram</a>
          </div>
          <div style={{fontSize:'0.68rem',color:MUT,lineHeight:1.7}}>Укажите название и цель использования.</div>
        </div>
      </div>
    )
  }

  function CatManagerModal() {
    const [newCat,setNewCat]=useState('')
    return (
      <div style={MODAL_BG} onClick={e=>e.target===e.currentTarget&&setShowCatManager(false)}>
        <div style={MODAL_BOX}>
          <button style={closeX} onClick={()=>setShowCatManager(false)}>✕</button>
          <div style={mTitle}>Управление темами</div>
          <div style={{marginBottom:'1.5rem'}}>
            {cats.map(cat=>(
              <div key={cat} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(232,226,217,0.06)'}}>
                <span style={{fontSize:14}}>{cat}</span>
                {DEFAULT_CATS.includes(cat)?<span style={{fontSize:11,color:MUT}}>стандартная</span>
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
      <div style={MODAL_BG} onClick={e=>e.target===e.currentTarget&&setShowSeriesEdit(false)}>
        <div style={{...MODAL_BOX,width:560,maxWidth:'100%'}}>
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
            {editingSeries&&<button style={{...btnCancel,color:'#E24B4A',borderColor:'rgba(226,75,74,0.3)'}} onClick={()=>{setSeries(p=>p.filter(s=>s.id!==editingSeries.id));setShowSeriesEdit(false)}}>Удалить</button>}
            <button style={btnCancel} onClick={()=>setShowSeriesEdit(false)}>Отмена</button>
            <button style={btnSave} onClick={()=>{
              if(!form.title.trim()) return
              const cover=photos.find(p=>sel.includes(p.id))?.url||''
              if(editingSeries){setSeries(p=>p.map(s=>s.id===editingSeries.id?{...s,...form,photoIds:sel,cover:cover||s.cover}:s))}
              else{setSeries(p=>[...p,{id:Date.now().toString(),...form,photoIds:sel,cover}])}
              setShowSeriesEdit(false)
            }}>Сохранить</button>
          </div>
        </div>
      </div>
    )
  }

  function AboutEditModal() {
    const [form,setForm]=useState({...about})
    return (
      <div style={MODAL_BG} onClick={e=>e.target===e.currentTarget&&setShowAboutEdit(false)}>
        <div style={MODAL_BOX}>
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
            <button style={btnSave} onClick={()=>{setAbout(form);setShowAboutEdit(false)}}>Сохранить</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
