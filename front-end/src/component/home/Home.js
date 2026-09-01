import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../navbar/Header';
import Footer from '../Footer';
import NeoAccordion from '../ui/NeoAccordion';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      <Header />

      {/* HERO SECTION */}
      <section style={{ padding: '40px 0 0 0' }}>
        <div className="container hero-grid">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--green)', padding: '6px 14px', borderRadius: 20, marginBottom: 16, border: '1px solid var(--dark)', fontWeight: 600, fontSize: 13 }}>
              <span>✨</span>
              <span>The Modern Way to Deliver Event Photos</span>
            </div>
            <h1 style={{ fontSize: 56, lineHeight: 1.05, fontWeight: 600, letterSpacing: '-0.02em' }}>
              Find yourself in <span style={{ background: 'var(--green)', padding: '2px 12px', borderRadius: 10 }}>every</span> event photo
            </h1>
            <p style={{ marginTop: 20, color: '#191A23', fontSize: 18, lineHeight: 1.6, maxWidth: 540 }}>
              No more scrolling through 5,000 photos in messy cloud folders. Photographers upload the gallery once — guests scan a QR code, snap a quick selfie, and get every picture they are in within seconds.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
              <button className="neo-btn neo-btn-dark" style={{ padding: '18px 30px' }} onClick={() => navigate('/login')}>
                Create Free Event →
              </button>
              <button className="neo-btn neo-btn-white" style={{ padding: '18px 28px' }} onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                See How It Works
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 28, color: '#676767', fontSize: 14, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>✓ No app download</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>✓ 100% private</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>✓ High-res downloads</span>
            </div>
          </div>

          {/* Interactive Visual Hero Card */}
          <div style={{
            background: '#F3F3F3', border: '1px solid #191A23', borderRadius: 45, padding: 32,
            boxShadow: '0px 5px 0px #191A23', minHeight: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center'
          }}>
            <div style={{ background: 'white', border: '1px solid #191A23', borderRadius: 24, padding: 24, boxShadow: '0px 4px 0px #191A23' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EEEEEE', paddingBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--green)', border: '1px solid #191A23', display: 'grid', placeItems: 'center', fontSize: 20 }}>📸</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Grand Wedding Reception</div>
                    <div style={{ fontSize: 13, color: '#676767' }}>3,420 Photos in Gallery</div>
                  </div>
                </div>
                <span className="neo-badge" style={{ background: 'var(--green)' }}>Live Gallery</span>
              </div>

              <div style={{ margin: '18px 0', background: '#F8F8F8', borderRadius: 16, padding: 16, border: '1px solid #E5E5E5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#191A23', color: 'white', display: 'grid', placeItems: 'center', fontSize: 22 }}>🤳</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>Quick Guest Selfie Taken</div>
                    <div style={{ fontSize: 13, color: '#16A34A', fontWeight: 500 }}>✓ Matched in 1.2 seconds</div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--dark)', color: 'white', borderRadius: 16, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>YOUR PERSONAL COLLECTION</div>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>Found 14 Photos of You</div>
                  </div>
                  <span style={{ background: 'var(--green)', color: 'var(--dark)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700 }}>100% Ready</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} style={{ height: 54, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'grid', placeItems: 'center', fontSize: 18 }}>
                      🖼️
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#676767' }}>
                <span>🔒 Privacy guaranteed • Selfie deleted automatically</span>
                <span style={{ fontWeight: 600, color: 'var(--dark)' }}>Full Quality Original Files</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={{ marginTop: 40, borderTop: '1px solid #DDDDDD', borderBottom: '1px solid #DDDDDD', padding: '22px 0', overflow: 'hidden' }}>
        <div className="container trust-strip-inner" style={{ color: '#676767', fontSize: 14, fontWeight: 500 }}>
          <span style={{ fontWeight: 600, color: 'var(--dark)' }}>Trusted by wedding & event studios:</span>
          <span style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontWeight: 700, color: '#191A23', letterSpacing: '0.04em' }}>
            <span>◆ APEX PHOTO CO.</span>
            <span>● MOMENT FRAME</span>
            <span>⬢ LUMINA WEDDINGS</span>
            <span>⬣ SHUTTER & SOUL</span>
            <span>✦ VELVET LENS</span>
          </span>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '70px 0 30px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 40 }}>
            <h2 style={{ background: 'var(--green)', padding: '6px 14px', borderRadius: 8, fontSize: 38 }}>How It Works</h2>
            <p style={{ maxWidth: 620, color: '#191A23', fontSize: 17, lineHeight: 1.5 }}>
              Effortless setup for photographers, instant magic for guests. Deliver memorable photo experiences in 3 simple steps.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {/* Step 1 */}
            <div className="neo-card" style={{ padding: 36 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--green)', border: '1px solid var(--dark)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 20 }}>1</span>
                <span className="neo-badge" style={{ background: '#F3F3F3' }}>Photographer</span>
              </div>
              <h3 style={{ fontSize: 24, marginBottom: 12 }}>Upload Event Photos</h3>
              <p style={{ color: '#555', fontSize: 16, lineHeight: 1.6 }}>
                Drag and drop your high-resolution event gallery. Upload hundreds or thousands of photos in one go with automatic smart organization.
              </p>
              <div style={{ marginTop: 24, padding: 14, background: '#F9F9F9', borderRadius: 12, border: '1px solid #E5E5E5', fontSize: 13, color: '#676767' }}>
                📁 DSLR, mirrorless, or mobile photos supported
              </div>
            </div>

            {/* Step 2 */}
            <div className="neo-card" style={{ padding: 36, background: 'var(--grey)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: 'white', border: '1px solid var(--dark)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 20 }}>2</span>
                <span className="neo-badge" style={{ background: 'var(--green)' }}>At The Event</span>
              </div>
              <h3 style={{ fontSize: 24, marginBottom: 12 }}>Share QR Code</h3>
              <p style={{ color: '#555', fontSize: 16, lineHeight: 1.6 }}>
                Display your event QR code on table standees, projection screens, or send the direct link. Optional 6-digit PIN keeps the event secure.
              </p>
              <div style={{ marginTop: 24, padding: 14, background: 'white', borderRadius: 12, border: '1px solid #E5E5E5', fontSize: 13, color: '#676767' }}>
                📱 Instant QR download ready for printing
              </div>
            </div>

            {/* Step 3 */}
            <div className="neo-card" style={{ padding: 36, background: 'var(--dark)', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--green)', color: 'var(--dark)', border: '1px solid var(--dark)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 20 }}>3</span>
                <span className="neo-badge" style={{ background: 'white', color: 'var(--dark)' }}>Guest Experience</span>
              </div>
              <h3 style={{ fontSize: 24, marginBottom: 12, color: 'white' }}>Selfie &amp; Instant Match</h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, lineHeight: 1.6 }}>
                Guests scan the QR code with their phone, take a quick selfie in their browser, and immediately see and download all their pictures.
              </p>
              <div style={{ marginTop: 24, padding: 14, background: 'rgba(255,255,255,0.1)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', fontSize: 13, color: 'var(--green)' }}>
                ⚡ No account or mobile app required
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE OLD WAY VS THE FYNDR WAY */}
      <section style={{ padding: '40px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 36 }}>
            <h2 style={{ background: 'var(--green)', padding: '6px 14px', borderRadius: 8, fontSize: 38 }}>Why Switch?</h2>
            <p style={{ maxWidth: 600, color: '#191A23', fontSize: 17, lineHeight: 1.5 }}>
              Stop sending messy folders that overwhelm your clients. Give guests an experience they rave about.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {/* The Old Way */}
            <div style={{ background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 32, padding: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#EF4444', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 700 }}>✕</span>
                <h3 style={{ fontSize: 22, color: '#991B1B', margin: 0 }}>The Traditional Way</h3>
              </div>
              <ul style={{ paddingLeft: 20, color: '#7F1D1D', fontSize: 15, lineHeight: 2, margin: 0 }}>
                <li>Sending massive 5,000-photo Google Drive links</li>
                <li>Guests spend 45+ minutes searching through folders</li>
                <li>Most guests give up and never find their photos</li>
                <li>Constant client messages asking: "Where are my photos?"</li>
                <li>Compressed, low-quality photos shared via chat apps</li>
              </ul>
            </div>

            {/* The Fyndr Way */}
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 32, padding: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#22C55E', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 700 }}>✓</span>
                <h3 style={{ fontSize: 22, color: '#166534', margin: 0 }}>The Fyndr Experience</h3>
              </div>
              <ul style={{ paddingLeft: 20, color: '#14532D', fontSize: 15, lineHeight: 2, margin: 0 }}>
                <li>One simple QR code at the event or sent via link</li>
                <li>Instant facial matching finds their photos in 2 seconds</li>
                <li>100% of guests effortlessly find their candid moments</li>
                <li>Full-resolution original downloads ready for framing &amp; sharing</li>
                <li>Guests love the magic and tag your photography studio</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section style={{ padding: '40px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 36 }}>
            <h2 style={{ background: 'var(--green)', padding: '6px 14px', borderRadius: 8, fontSize: 38 }}>Perfect For Every Event</h2>
            <p style={{ maxWidth: 580, color: '#191A23', fontSize: 17, lineHeight: 1.5 }}>
              From intimate family weddings to 5,000-attendee conferences, Fyndr scales seamlessly.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              {
                icon: '💍',
                title: 'Weddings & Receptions',
                desc: 'Let the bride, groom, family, and hundreds of guests get their personal moments without waiting weeks.',
                tag: 'Most Popular',
              },
              {
                icon: '👔',
                title: 'Corporate Galas & Conferences',
                desc: 'Deliver keynotes, speaker portraits, and attendee networking photos effortlessly.',
                tag: 'High Volume',
              },
              {
                icon: '🎉',
                title: 'Birthdays & Private Parties',
                desc: 'Share candid laughs, cake cutting, and group pictures with friends before the night ends.',
                tag: 'Zero Friction',
              },
              {
                icon: '🎓',
                title: 'Graduations & Sports Meets',
                desc: 'Help graduates and athletes instantly find their stage walks, medal ceremonies, and action shots.',
                tag: 'Instant Access',
              },
            ].map((item, idx) => (
              <div key={idx} className="neo-card" style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 32 }}>{item.icon}</span>
                  <span className="neo-badge" style={{ background: 'var(--green)', fontSize: 11 }}>{item.tag}</span>
                </div>
                <h3 style={{ fontSize: 20, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 15, color: '#676767', lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES — Positivus 2-col cards */}
      <section id="services" style={{ padding: '50px 0 20px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 36 }}>
            <h2 style={{ background: 'var(--green)', padding: '6px 14px', borderRadius: 8, fontSize: 38 }}>Key Features</h2>
            <p style={{ maxWidth: 580, color: '#191A23', fontSize: 17, lineHeight: 1.5 }}>
              Built specifically for modern event photographers who value speed, privacy, and delighting their clients.
            </p>
          </div>

          <div className="service-grid">
            <div className="service-card white">
              <div>
                <h3 style={{ background: 'var(--green)', display: 'inline', padding: '2px 10px', borderRadius: 8, lineHeight: 1.4 }}>Instant Face</h3>
                <h3 style={{ marginTop: 6 }}>Recognition</h3>
                <p style={{ marginTop: 14, color: '#555', fontSize: 15, lineHeight: 1.5 }}>
                  Smart AI identifies guests across wide group shots, side profiles, and candid moments in under two seconds.
                </p>
              </div>
              <div style={{ width: 110, height: 110, borderRadius: 20, background: '#F3F3F3', border: '1px solid #191A23', display: 'grid', placeItems: 'center', fontSize: 38 }}>⚡</div>
            </div>

            <div className="service-card green">
              <div>
                <h3 style={{ background: 'white', display: 'inline', padding: '2px 10px', borderRadius: 8 }}>Zero App</h3>
                <h3 style={{ marginTop: 6 }}>Download</h3>
                <p style={{ marginTop: 14, color: '#191A23', fontSize: 15, lineHeight: 1.5 }}>
                  No app store downloads, logins, or passwords required. Opens smoothly in standard mobile browsers.
                </p>
              </div>
              <div style={{ width: 110, height: 110, borderRadius: 20, background: 'white', border: '1px solid #191A23', display: 'grid', placeItems: 'center', fontSize: 38 }}>📲</div>
            </div>

            <div className="service-card dark">
              <div>
                <h3 style={{ background: 'white', color: '#191A23', display: 'inline', padding: '2px 10px', borderRadius: 8 }}>Original Quality</h3>
                <h3 style={{ marginTop: 6, color: 'white' }}>Downloads</h3>
                <p style={{ marginTop: 14, color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 1.5 }}>
                  Guests receive the crisp, high-resolution original files straight from your DSLR or mirrorless camera.
                </p>
              </div>
              <div style={{ width: 110, height: 110, borderRadius: 20, background: 'white', border: '1px solid #191A23', display: 'grid', placeItems: 'center', fontSize: 38, color: '#191A23' }}>💎</div>
            </div>

            <div className="service-card white">
              <div>
                <h3 style={{ background: 'var(--green)', display: 'inline', padding: '2px 10px', borderRadius: 8 }}>100% Privacy</h3>
                <h3 style={{ marginTop: 6 }}>Guaranteed</h3>
                <p style={{ marginTop: 14, color: '#555', fontSize: 15, lineHeight: 1.5 }}>
                  Guest selfies are used solely for live matching and are never stored or shared with third parties.
                </p>
              </div>
              <div style={{ width: 110, height: 110, borderRadius: 20, background: '#F3F3F3', border: '1px solid #191A23', display: 'grid', placeItems: 'center', fontSize: 38 }}>🛡️</div>
            </div>

            <div className="service-card green">
              <div>
                <h3 style={{ background: 'white', display: 'inline', padding: '2px 10px', borderRadius: 8 }}>PIN Protected</h3>
                <h3 style={{ marginTop: 6 }}>Galleries</h3>
                <p style={{ marginTop: 14, color: '#191A23', fontSize: 15, lineHeight: 1.5 }}>
                  Add a 6-digit access PIN to your events so only invited guests and attendees can view matching photos.
                </p>
              </div>
              <div style={{ width: 110, height: 110, borderRadius: 20, background: 'white', border: '1px solid #191A23', display: 'grid', placeItems: 'center', fontSize: 38 }}>🔐</div>
            </div>

            <div className="service-card dark">
              <div>
                <h3 style={{ background: 'var(--green)', color: '#191A23', display: 'inline', padding: '2px 10px', borderRadius: 8 }}>Studio</h3>
                <h3 style={{ marginTop: 6, color: 'white' }}>Branding</h3>
                <p style={{ marginTop: 14, color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 1.5 }}>
                  Deliver galleries with your studio name and logo, building strong word-of-mouth client referrals.
                </p>
              </div>
              <div style={{ width: 110, height: 110, borderRadius: 20, background: 'white', border: '1px solid #191A23', display: 'grid', placeItems: 'center', fontSize: 38, color: '#191A23' }}>🌟</div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: '40px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 36 }}>
            <h2 style={{ background: 'var(--green)', padding: '6px 14px', borderRadius: 8, fontSize: 38 }}>Photographer Stories</h2>
            <p style={{ maxWidth: 580, color: '#191A23', fontSize: 17, lineHeight: 1.5 }}>
              See how studios and event planners are transforming client satisfaction.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {[
              {
                quote: "At our last 500-guest wedding, over 380 guests downloaded their photos before the reception even ended. The bride was thrilled!",
                author: "Marcus Chen",
                role: "Lead Photographer, Lumina Weddings",
                rating: "★★★★★",
              },
              {
                quote: "No more spending hours answering 'where are my photos?' emails. Clients scan the QR code and find themselves instantly.",
                author: "Priya Patel",
                role: "Founder, Shutter & Soul Studios",
                rating: "★★★★★",
              },
              {
                quote: "Having the QR code on the tables gave our corporate conference a premium, modern feel. The attendee engagement was incredible.",
                author: "David Miller",
                role: "Event Director, Apex Visuals",
                rating: "★★★★★",
              },
            ].map((t, idx) => (
              <div key={idx} className="neo-card" style={{ padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#EAB308', fontSize: 18, marginBottom: 12 }}>{t.rating}</div>
                  <p style={{ fontSize: 16, lineHeight: 1.6, color: '#191A23', fontStyle: 'italic' }}>
                    "{t.quote}"
                  </p>
                </div>
                <div style={{ marginTop: 24, borderTop: '1px solid #EEEEEE', paddingTop: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{t.author}</div>
                  <div style={{ fontSize: 13, color: '#676767', marginTop: 2 }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section style={{ padding: '20px 0 30px 0' }}>
        <div className="container">
          <div className="cta-flex">
            <div style={{ flex: 1, minWidth: 280 }}>
              <h3 style={{ fontSize: 32, lineHeight: 1.2 }}>Deliver an unforgettable photo experience</h3>
              <p style={{ marginTop: 14, color: '#191A23', maxWidth: 540 }}>
                Set up your first event in under 2 minutes. Upload photos, generate your QR code standee, and delight your guests with instant selfie search.
              </p>
              <button className="neo-btn neo-btn-dark" style={{ marginTop: 20 }} onClick={() => navigate('/login')}>
                Get Started Free →
              </button>
            </div>
            <div style={{ width: 220, height: 180, borderRadius: 24, background: 'white', border: '1px solid var(--dark)', display: 'grid', placeItems: 'center', fontSize: 54, boxShadow: '0px 4px 0px var(--dark)' }}>
              🎉
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section style={{ padding: '40px 0' }}>
        <div className="container" style={{ maxWidth: 940 }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 28 }}>
            <h2 style={{ background: 'var(--green)', padding: '6px 14px', borderRadius: 8, fontSize: 38 }}>Frequently Asked Questions</h2>
            <p style={{ maxWidth: 540, fontSize: 16 }}>Everything you need to know about setting up and using Fyndr.</p>
          </div>
          <NeoAccordion
            items={[
              {
                title: 'How do guests find their photos?',
                content: 'Guests simply scan the event QR code using their phone camera, take a 1-second selfie in their mobile browser, and all photos containing their face appear instantly on their screen.',
                accent: 'yellow',
              },
              {
                title: 'Do guests need to install an app or register?',
                content: 'No app download or account creation is required! Fyndr works directly inside mobile Safari, Google Chrome, and all standard web browsers.',
                accent: 'cyan',
              },
              {
                title: 'Are guest selfies kept private and secure?',
                content: 'Yes, 100%. Selfies are processed in real-time solely to match photos and are immediately discarded. We never store, sell, or train on guest face data.',
                accent: 'lime',
              },
              {
                title: 'Can photographers upload high-resolution DSLR photos?',
                content: 'Yes! You can upload full-resolution JPEG, PNG, or WebP images from professional DSLR, mirrorless cameras, or smartphones.',
                accent: 'coral',
              },
              {
                title: 'How many photos can I upload per event?',
                content: 'You can upload thousands of photos per event gallery. Fyndr processes entire galleries smoothly so guests experience instantaneous search.',
                accent: 'yellow',
              },
              {
                title: 'Is Fyndr free to try?',
                content: 'Yes! You can create events for free with full access to QR generation, high-res photo uploads, and guest selfie search.',
                accent: 'lime',
              },
            ]}
          />
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section style={{ padding: '20px 0 60px 0' }}>
        <div className="container">
          <div className="final-cta-grid" style={{ border: '1px solid var(--dark)', background: 'var(--dark)', borderRadius: 45 }}>
            <div>
              <h2 style={{ color: 'white', fontSize: 38 }}>Ready to modernize your photo delivery?</h2>
              <p style={{ color: 'rgba(255,255,255,0.85)', marginTop: 14, maxWidth: 540, fontSize: 17, lineHeight: 1.6 }}>
                Join photographers who deliver memorable guest experiences. Free to get started — no credit card required.
              </p>
              <div style={{ display: 'flex', gap: 14, marginTop: 24, flexWrap: 'wrap' }}>
                <button className="neo-btn" style={{ background: 'var(--green)', color: 'var(--dark)', borderColor: 'var(--dark)' }} onClick={() => navigate('/login')}>
                  Create Photographer Account
                </button>
                <button className="neo-btn neo-btn-white" onClick={() => navigate('/about')}>
                  About Fyndr
                </button>
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: 24, padding: 28, color: 'var(--dark)', border: '1px solid var(--dark)' }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Everything Included:</div>
              <ul style={{ marginTop: 14, paddingLeft: 20, fontSize: 15, lineHeight: 1.8 }}>
                <li>Instant Event QR Codes &amp; PIN</li>
                <li>Fast AI Face Recognition</li>
                <li>Full-Resolution Downloads</li>
                <li>Zero App Download for Guests</li>
                <li>Complete Privacy Guarantee</li>
                <li>Custom Studio Branding</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
