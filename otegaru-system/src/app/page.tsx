import { PrismaClient } from '@prisma/client'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

export default async function Home() {
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

  const businessDaysDisplay = settings.business_days.replace(/・/g, '・\u200B')

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
            <p className="hero-subtitle">人気の60分は ¥3,500。首・肩から足先まで、まんべんなくほぐして整えます。</p>
            <div className="hero-buttons">
              <Link href="/booking" className="btn-primary-large" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                予約する
              </Link>
              <Link href="/menu" className="btn-ghost-hero">メニューを見る</Link>
            </div>
            <Link href="/confirm" className="hero-confirm-link">ご予約の確認・変更・キャンセルはこちら →</Link>
          </div>
        </div>
      </section>

      <section className="line-banner">
        <div className="container">
          <Link href={settings.line_url} target="_blank" className="btn-line" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            <strong>LINE</strong> <span className="line-text">お問い合わせ<br />ご相談はこちら</span>
          </Link>
        </div>
      </section>

      <section className="info-section">
        <div className="container">
          <div className="text-center section-heading">
            <h2 className="section-title">サロン情報</h2>
          </div>
          
          <div className="cards-grid">
            <div className="info-card">
              <div className="icon-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </div>
              <h3>営業日</h3>
              <p>{businessDaysDisplay}</p>
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
          <p style={{ textAlign: 'center', color: 'var(--warm-muted)', fontSize: '0.9rem', marginTop: '20px' }}>お支払いは現金のみです</p>
        </div>
      </section>

      </div>

      <Footer />
    </>
  )
}
