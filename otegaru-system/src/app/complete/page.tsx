import { PrismaClient } from '@prisma/client'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

const prisma = new PrismaClient()

export default async function CompletePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const params = await searchParams
  const reservationId = params.id
  let res = null
  
  if (reservationId) {
    res = await prisma.reservation.findUnique({
      where: { id: reservationId }
    })
  }

  return (
    <>
      <Header />

      <section className="page-section" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
        <div className="container" style={{ maxWidth: '500px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(234, 88, 12, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect x="3" y="8" width="18" height="14" rx="2"></rect><path d="M3 10h18"></path><path d="m9 16 2 2 4-4"></path></svg>
          </div>
          
          <h2 className="page-title" style={{ fontSize: '1.5rem', marginBottom: '12px' }}>ご予約ありがとうございます</h2>
          
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', textAlign: 'left', marginBottom: '24px' }}>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>日付</span>
                <span style={{ fontWeight: 500 }}>{res?.date || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>時間</span>
                <span style={{ fontWeight: 500 }}>{res?.time || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>メニュー</span>
                <span style={{ fontWeight: 500 }}>{res?.menu || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>お名前</span>
                <span style={{ fontWeight: 500 }}>{res?.name ? `${res.name} 様` : '-'}</span>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            当日はお時間に余裕をもってお越しください。
          </p>

          <Link href="https://lin.ee/ddFvc0y" target="_blank" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', backgroundColor: '#06C755', color: 'white', borderRadius: '8px', padding: '12px 16px', fontWeight: 500, textDecoration: 'none', marginBottom: '24px', fontSize: '0.875rem' }}>
            <span style={{ fontWeight: 700 }}>LINE</span>
            <span>公式LINEでご質問・変更のご連絡はこちら</span>
          </Link>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link href="/confirm" className="btn-primary-large" style={{ width: '100%', margin: 0, padding: '12px', fontSize: '0.875rem' }}>予約を確認する</Link>
            <Link href="/" className="btn-ghost" style={{ width: '100%', fontSize: '0.875rem' }}>ホームに戻る</Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
