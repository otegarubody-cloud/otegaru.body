import { PrismaClient } from '@prisma/client'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

export default async function Home() {
  const menus = await prisma.menu.findMany()
  const settingsArray = await prisma.siteSetting.findMany()
  
  const settings: Record<string, string> = {
    catchphrase: '日々の疲れを、\nおてがるリセット。',
    business_days: '毎週 火曜日・水曜日',
    business_hours: '10:00 〜 18:00',
    address_text: '仙台市青葉区一番町２丁目２\n－１１ ＴＫビル 6F',
    address_url: 'https://maps.app.goo.gl/UTiRWfJG4Ce7Xu7F8',
    line_url: 'https://lin.ee/ddFvc0y',
    instagram_id: '@otegaru_body',
    instagram_url: 'https://www.instagram.com/otegaru_body/',
    hero_image_url: '/hero.webp',
  }
  settingsArray.forEach(s => {
    if (s.key in settings) settings[s.key] = s.value
  })

  const mobileHero = settings.hero_image_url.endsWith('/hero.webp') ? '/hero-mobile.webp' : settings.hero_image_url

  return (
    <>
      <Header />

      <div className="home">
      <section className="hero" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#2A2622' }}>
          <picture>
            <source media="(max-width: 640px)" srcSet={mobileHero} />
            <img src={settings.hero_image_url} alt="Hero" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </picture>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(42,32,24,0.84), rgba(42,32,24,0.58), rgba(42,32,24,0.26))' }}></div>
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <div className="hero-content">
            <div className="hero-badge">{settings.business_days} 営業</div>
            <h1 className="hero-title" dangerouslySetInnerHTML={{ __html: settings.catchphrase.replace(/\n/g, '<br>') }}></h1>
            <p className="hero-hook">全身もみほぐし ¥3,000〜</p>
            <p className="hero-subtitle">人気の60分でも ¥3,500。首・肩から足先まで、まんべんなくほぐして整えます。</p>
            <div className="hero-buttons">
              <Link href="/booking" className="btn-primary-large" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                予約する
              </Link>
              <Link href="#services" className="btn-ghost-hero">メニューを見る</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="menu-section" id="services">
        <div className="container">
          <div className="text-center section-heading">
            <h2 className="section-title">施術メニュー</h2>
            <p className="subtitle">お悩みに合わせてお選びいただけます</p>
          </div>
          <div className="menu-grid">
            {menus.map((m, idx) => {
              let svgPath = ""
              if (idx === 0) svgPath = '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>'
              else if (idx === 1) svgPath = '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>'
              else if (idx === 2) svgPath = '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-2 7-2s5 1 7 2a1 1 0 0 1 1 1z"></path>'
              else svgPath = '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path>'

              return (
                <div className="menu-card" key={m.id}>
                  <div className="menu-icon-wrapper">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: svgPath }}></svg>
                  </div>
                  <h3>{m.name}</h3>
                  <p className="menu-meta">{m.duration} <span aria-hidden="true">•</span> ¥{parseInt(m.price).toLocaleString()}</p>
                  <p className="menu-description">{m.description}</p>
                  <Link href={`/booking?autoMenu=${encodeURIComponent(m.name)}`} className="menu-book-link">予約する &rarr;</Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="info-section">
        <div className="container">
          <div className="text-center section-heading">
            <h2 className="section-title">サロン情報</h2>
            <p className="subtitle">お気軽にお越しください</p>
          </div>
          
          <Link href={settings.line_url} target="_blank" className="btn-line" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            <strong>LINE</strong> 公式LINEでお問い合わせ・ご相談はこちら
          </Link>

          <div className="cards-grid">
            <div className="info-card">
              <div className="icon-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </div>
              <h3>営業日</h3>
              <p>{settings.business_days}</p>
            </div>
            <div className="info-card">
              <div className="icon-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <h3>営業時間</h3>
              <p>{settings.business_hours}</p>
            </div>
            <a href={settings.address_url} target="_blank" className="info-card clickable-card">
              <div className="icon-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </div>
              <h3>住所</h3>
              <p dangerouslySetInnerHTML={{ __html: settings.address_text.replace(/\n/g, '<br>') }}></p>
            </a>
            <a href={settings.instagram_url} target="_blank" className="info-card clickable-card">
              <div className="icon-circle" style={{ borderColor: '#E1306C' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E1306C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </div>
              <h3>Instagram</h3>
              <p>{settings.instagram_id}</p>
            </a>
          </div>
        </div>
      </section>

      </div>

      <Footer />
    </>
  )
}
