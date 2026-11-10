import React from 'react'
import Link from 'next/link'

const LINE_URL = 'https://lin.ee/ddFvc0y'
const INSTAGRAM_URL = 'https://www.instagram.com/otegaru_body/'
const INSTAGRAM_ID = '@otegaru_body'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-column">
          <div className="footer-title">おてがる整体</div>
          <p className="footer-catch">
            日々の疲れを、<br />
            おてがるリセット。
          </p>
        </div>

        <div className="footer-column">
          <div className="footer-title">営業情報</div>
          <ul className="footer-info-list">
            <li>
              <span className="footer-info-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </span>
              <span>毎週 火曜日・水曜日</span>
            </li>
            <li>
              <span className="footer-info-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </span>
              <span>10:00〜18:00</span>
            </li>
            <li>
              <span className="footer-info-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </span>
              <span>
                〒980-0811<br />
                宮城県仙台市青葉区一番町2丁目2−11<br />
                TKビル 6F
              </span>
            </li>
          </ul>
        </div>

        <div className="footer-column">
          <div className="footer-title">お問い合わせ・SNS</div>
          <ul className="footer-contact-list">
            <li>
              <Link href={LINE_URL} target="_blank" className="footer-social-link">
                <span className="footer-social-icon footer-line-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                </span>
                公式LINE
              </Link>
            </li>
            <li>
              <Link href={INSTAGRAM_URL} target="_blank" className="footer-social-link">
                <span className="footer-social-icon footer-instagram-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </span>
                Instagram ({INSTAGRAM_ID})
              </Link>
            </li>
          </ul>

          <div className="footer-links-title">ページ</div>
          <ul className="footer-page-links">
            <li><Link href="/">ホーム</Link></li>
            <li><Link href="/booking">ご予約</Link></li>
            <li><Link href="/confirm" className="footer-confirm-link">予約の確認・キャンセル</Link></li>
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
