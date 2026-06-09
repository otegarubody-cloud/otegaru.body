import React from 'react'
import Link from 'next/link'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function Footer() {
  const settingsArray = await prisma.siteSetting.findMany()
  const settings: Record<string, string> = {
    business_days: '毎週 火曜日・水曜日',
    business_hours: '10:00 〜 18:00',
    address_text: '仙台市青葉区一番町２丁目２\n－１１ ＴＫビル 6F',
    line_url: 'https://lin.ee/ddFvc0y',
    instagram_id: '@otegaru_body',
    instagram_url: 'https://www.instagram.com/otegaru_body/'
  }
  settingsArray.forEach(s => {
    if (s.key in settings) settings[s.key] = s.value
  })
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-column">
          <div className="footer-title">おてがる整体</div>
          <p>日々の疲れをリセット。</p>
        </div>
        <div className="footer-column">
          <div className="footer-title">営業情報</div>
          <ul>
            <li>{settings.business_days} {settings.business_hours}</li>
            <li style={{ whiteSpace: 'pre-wrap' }}>{settings.address_text}</li>
          </ul>
        </div>
        <div className="footer-column">
          <div className="footer-title">お問い合わせ・SNS</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li>
              <Link href={settings.line_url} target="_blank" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#d1d5db', textDecoration: 'none', fontWeight: 500 }}>
                <div style={{ background: '#06C755', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                </div>
                公式LINE
              </Link>
            </li>
            <li>
              <Link href={settings.instagram_url} target="_blank" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#d1d5db', textDecoration: 'none', fontWeight: 500 }}>
                <div style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </div>
                Instagram ({settings.instagram_id})
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="container">
        <div className="footer-copyright">
          &copy; 2026 おてがる整体. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
