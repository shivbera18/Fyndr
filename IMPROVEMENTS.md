# Fyndr — Product Improvements & Competitive Roadmap

> **Purpose:** A vendor-neutral, exhaustive catalog of product features Fyndr should ship to win against the current generation of event-photo platforms (Pixieset, Pic-Time, ShootProof, SmugMug, FotoOwl, KwikPic, LightPic, VaultPic, AccioPix, PicsDrop, Samaro, Memzo, FindMe Photo, Premagic, Wed.ing, Photomall, **Honcho, Kamero (Kam-Sync), FTPix, Pixeva, CloudTether, PicSmart, Pelli** for the live-ingest family).
>
> **Scope:** Only **product** features that customers (photographers + their guests/clients) directly perceive and pay for. AI/ML accuracy knobs, infra cost-tuning, UX polish tokens, refactors, and pure-performance work are explicitly **out of scope** here — those live in `UPGRADE_PLAN.md`, `OPTIMIZATION.md`, `ML_MODEL.md`, `plot.md`, and `IMPROVEMENT_PLAN.md`.
>
> **Method:** Public marketing pages, comparison articles (2026), customer forums, and competitor docs were studied to extract the long-tail of features Fyndr does *not* yet ship. Each item below is labeled with the **competitors that already offer it**, a **why it matters**, and a **P0–P4 priority** for Fyndr given our $0-cost, photographer-first, no-app, QR-selfie positioning.

---

## 1. Why this document exists

Fyndr's wedge is **free, no-app, QR → selfie → instant photo delivery** at near-zero infra cost. That wedge is correct, but competitors are racing to widen their suites into the full "photographer business OS." If Fyndr only does delivery, we become a feature in someone else's bundle (Pixieset already partners with face-search add-ons like FindMe Photo). To stay a destination product, Fyndr needs to ship the features that make a photographer choose us as the **single tool** for an event, not just the delivery step.

The catalog below is grouped by **priority tier** and ranked within each.

---

## 2. Competitor feature matrix (what the market already does)

| Capability | Pixieset | Pic-Time | ShootProof | SmugMug | FotoOwl | KwikPic | LightPic | VaultPic | AccioPix | PicsDrop | Samaro | Memzo | FindMe Photo | Premagic | Wed.ing | Fyndr (today) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AI face search (selfie → my photos) | via add-on | yes | via add-on | no | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| No-app browser flow | yes | yes | yes | yes | yes | app | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| Client selection / favoriting / proofing | yes | yes | yes | yes | yes | yes | partial | partial | no | yes | yes | yes | partial | yes | yes | partial |
| Lightroom export of selections | yes | yes | yes | partial | yes | yes | partial | no | no | yes | yes | yes | no | yes | yes | no |
| Selection lock + submit | yes | yes | yes | partial | yes | yes | partial | no | no | yes | yes | yes | no | yes | yes | partial |
| Print store / lab fulfilment | yes | yes | yes (30+ labs) | yes | yes | yes | partial | partial | no | partial | yes | partial | no | partial | partial | no |
| Contracts + invoicing | add-on | third-party | all plans | no | yes | yes | partial | no | no | yes (GST/PDF) | yes | partial | no | yes | yes | no |
| Booking + questionnaires | add-on | no | yes | no | yes | yes | partial | no | no | yes | yes | partial | no | yes | yes | no |
| Built-in portfolio website | yes | no | no | yes | yes | yes | partial | no | no | yes | yes | partial | no | yes | yes | no |
| Custom domain (CNAME) | yes | yes | yes | yes | yes | no | partial | partial | no | yes | yes | partial | partial | yes | yes | no |
| Studio branding / logo / colors | yes | yes | yes | yes | yes | yes | partial | partial | partial | yes | yes | yes | partial | yes | yes | partial |
| Watermark engine (preview only) | yes | yes | yes | yes | yes | yes | partial | partial | no | yes | yes | partial | no | yes | yes | no |
| Sub-event / multi-day folders | yes | yes | yes | yes | yes | yes | partial | yes | no | yes | yes | partial | no | yes | yes | partial |
| QR code standee generator (printable) | yes | yes | yes | partial | yes | yes | yes | yes | no | yes | yes | yes | yes | yes | yes | partial |
| Guest lead capture (CSV download) | no | partial | no | no | yes | yes | partial | partial | no | yes | yes | yes | no | yes | yes | no |
| Photographer analytics (views/DLs/scans) | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | partial | yes | yes | partial |
| WhatsApp click-to-chat share | partial | partial | partial | partial | yes | partial | yes | yes | yes (native) | yes | partial | partial | partial | yes | yes | no |
| WhatsApp Business API delivery | no | no | no | no | yes (verified) | no | no | no | yes | no | no | no | no | partial | partial | no |
| Paid downloads / e-commerce | yes | yes (auto) | yes | yes | yes (soon) | yes | yes | yes | yes | yes | yes | partial | no | yes | yes | no |
| Multi-event bulk create (CSV) | yes | yes | yes | partial | partial | yes | partial | partial | no | yes | yes | partial | no | yes | yes | no |
| Slideshow / video reel | yes | yes | yes | yes | yes | yes | partial | partial | no | partial | yes (4K) | partial | no | yes | yes | no |
| Team / multi-user roles | yes | yes | yes | yes | yes | yes | partial | partial | partial | yes | yes | partial | no | yes | yes | no |
| Mobile native app | yes | yes | yes | yes | partial | yes | no | yes | no | PWA | yes | yes | no | partial | partial | no |
| Photographer portfolio + public page | yes | no | partial | yes | yes | yes | partial | no | no | yes | yes | partial | no | yes | yes | no |
| Album cover auto-pick / smart curation | yes | yes | yes | partial | yes | yes | partial | partial | partial | yes | yes | partial | no | yes | yes | partial |
| Anniversary / auto re-marketing emails | no | yes | yes | partial | partial | yes | no | no | no | partial | yes | no | no | partial | partial | no |
| Vendor galleries (florist, venue, etc.) | no | yes | no | no | partial | partial | no | no | no | partial | partial | no | no | partial | partial | no |
| Group photo / crowd detection | no | partial | no | no | yes | yes | yes | yes | partial | yes | yes | partial | yes | yes | partial | partial |
| Bulk face tagging (cluster browse) | no | partial | no | no | yes | yes | partial | partial | no | yes | yes | partial | partial | yes | partial | no |
| Tag-people / person labels | partial | yes | partial | no | yes | yes | partial | partial | partial | yes | yes | partial | no | yes | partial | no |
| Album share link (no selfie, browse-only) | yes | yes | yes | yes | yes | yes | yes | yes | partial | yes | yes | yes | partial | yes | yes | partial |
| Time-limited / expiring links | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| Self-destruct originals after N days | partial | partial | partial | no | partial | partial | partial | no | partial | partial | partial | partial | no | no | partial | no |
| **Camera-to-Cloud — direct camera FTP/FTPS/SFTP ingest** | no | yes | no | no | yes (Beam) | no | no | no | no | no | no | no | no | no | no | no |
| **Camera-to-Cloud — mobile tethered companion app (camera → phone → cloud)** | no | partial | no | no | partial | no | no | no | no | no | no | no | yes (Honcho) | no | no | no |
| **Live Slideshow / On-Screen Display (browser, real-time)** | partial | yes | partial | partial | partial | partial | no | no | partial | partial | partial | no | yes | yes | yes | no |
| **Auto-Cull / Burst Dedupe / Live Edit Presets** | no | yes (Smart Albums) | no | no | partial | no | no | no | no | no | no | no | yes | no | no | no |
| **Live / On-Site Print Routing from Cloud Gallery** | no | yes | yes | yes | partial | partial | no | no | partial | partial | partial | no | yes | partial | no | no |
| **Desktop Tether Watcher (Capture One / Lightroom folder → cloud)** | no | yes (All-In-One) | no | no | partial | no | no | no | no | no | no | no | yes (Honcho desktop wishlist) | no | no | no |
| **Photo Selection Number / Bib Recognition (sports)** | no | no | no | no | no | no | no | no | no | no | partial | no | yes | no | no | no |
| **Whistle / Finish-Line Auto-Trigger (sports, race bibs)** | no | no | no | no | no | no | no | no | no | no | partial | no | partial | no | no | no |
| **Cloud-to-cloud sync (Drive/Dropbox/Box)** | no | partial | no | no | yes | no | no | no | no | partial | partial | no | no | no | no | no |
| **Watch-Folder Desktop Agent (auto-upload new files)** | no | yes | no | no | yes (Beam) | no | no | no | no | partial | partial | no | no | no | no | no |
| Lightroom plugin / publish service | yes | yes | yes | yes | partial | yes | no | no | no | partial | yes | partial | no | no | partial | no |
| Slideshow music / video export | yes | yes | yes | yes | partial | yes | partial | partial | no | partial | yes | partial | no | yes | yes | no |
| Photo commenting / annotations | yes | yes | yes | yes | yes | yes | partial | partial | no | yes | yes | partial | no | yes | yes | partial |
| "Book this photographer" inquiry CTA | partial | partial | partial | partial | yes | partial | partial | no | no | yes | partial | partial | no | yes | yes | no |
| Event website templates (RSVP etc.) | no | no | partial | no | partial | partial | no | no | no | yes | partial | no | no | yes | yes | no |
| GST / tax-compliant invoicing | no | no | partial | no | partial | partial | no | no | no | yes | partial | no | no | partial | partial | no |
| Razorpay / Stripe native checkout | partial | yes | yes | partial | yes | yes | partial | yes | yes | yes | yes | partial | no | yes | yes | no |
| Client portal (single login for all jobs) | partial | partial | yes | partial | yes | yes | partial | no | no | yes | yes | partial | no | yes | partial | no |
| Public stats / "used at N weddings" proof | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | partial | yes | yes | no |
| Multi-language guest page | partial | partial | partial | partial | partial | yes | yes | partial | yes | partial | partial | partial | partial | yes | yes | no |
| Guest dark/light theme toggle | partial | partial | no | no | partial | partial | partial | no | partial | partial | partial | no | no | no | no | no |
| Photographer in-app messaging | partial | yes | yes | no | yes | yes | partial | partial | partial | yes | yes | partial | no | yes | partial | no |
| Selfie pre-check (no face / multi-face) | partial | partial | partial | no | partial | partial | yes | yes | partial | yes | yes | yes | yes | partial | yes | partial |
| Re-match with different threshold | partial | partial | partial | no | partial | partial | yes | yes | partial | yes | yes | yes | yes | yes | yes | partial |

Legend: yes = first-class · partial = partial / add-on / paid tier · no = missing

---

## 3. The ranked feature backlog

Priorities combine **(a) competitor saturation**, **(b) revenue impact** for a paying photographer, **(c) implementation cost on Fyndr's existing stack**, and **(d) fit with our $0 / no-app / QR-selfie wedge**. We deliberately skip AI accuracy, infra tuning, and UI polish — those are tracked elsewhere.

### P0 — Ship in the next 2 sprints (table stakes, blocking revenue)

| # | Feature | Competitors already offering | Why it matters now | Fyndr fit |
|---|---|---|---|---|
| **P0-1** | **Client Photo Selection (favoriting + Lightroom export + lock)** | Pixieset, Pic-Time, ShootProof, FotoOwl, KwikPic, PicsDrop, Premagic, Wed.ing, Samaro | Solves the #1 studio pain — chasing couples for 6 months to pick album photos. Lightroom comma-list export is the wedge that beats FotoOwl. Required before any paid plan. | Already partially built (`/p0` proofing API merged). Add: selection-lock, photographer dashboard counter, CSV/JSON export. |
| **P0-2** | **Printable Table Standee Generator (A5/4×6 PDF + PNG)** | Every competitor with an India presence | Photographers print these on-site; without it we lose the "place on table" loop entirely. Pure client-side Canvas + `jsPDF`, zero server cost. | Trivial — QR + PIN + studio logo on a templated card. |
| **P0-3** | **Guest Lead Capture Gate + CSV Export** | FotoOwl, KwikPic, PicsDrop, Premagic, Wed.ing, AccioPix, Samaro | Turns every event into a future-booking funnel for the photographer — the single highest-ROI feature per competitor analysis. Pays for itself on one wedding. | Mongo `Lead {event_id, photographer_id, name, phone, photos_found}`, optional toggle per event, dashboard CSV download. |
| **P0-4** | **Sub-Event / Multi-Day Folders (Mehendi → Wedding → Reception)** | Pixieset, Pic-Time, ShootProof, FotoOwl, KwikPic, VaultPic, Premagic, Wed.ing, PicsDrop, Samaro | Indian weddings are 3-5 day events; without sub-folders, 50k photos become a wall. Tab bar `All / Mehendi / Sangeet / Wedding / Reception`. Cross-folder face search optional v2. | `Event.folders[]`, `Photo.folder_name`, guest UI tabs. |
| **P0-5** | **Studio Watermark Engine (preview only, clean originals)** | Pixieset, Pic-Time, ShootProof, FotoOwl, KwikPic, PicsDrop, Premagic, Wed.ing, Samaro, Memzo | Protects photographer IP on screenshots while clean originals stay for paid download. Competitors all charge for this; we ship free. | SVG overlay on thumbs/preview 2048, configurable text + opacity + angle. |
| **P0-6** | **Match Sensitivity Slider (Strict 0.42 / Balanced 0.34 / Loose 0.28)** | LightPic, VaultPic, PicsDrop, AccioPix, FindMe Photo, Memzo | Solves the "I missed my side-profile candid" complaint. Already on roadmap but not shipped. | 3-state toggle on guest `/e/:token` results screen. |
| **P0-7** | **Photographer Analytics Dashboard (scans, selfies, views, downloads, top photos)** | Every competitor | Without this, photographers cannot prove ROI to their paying clients, and cannot upsell print packages. Required for any ₹499+ plan. | Mongo counters on `Event.metrics{}`, dashboard charts via `recharts`. |
| **P0-8** | **Photo Selection Lock + Submit Confirmation** | Pixieset, Pic-Time, ShootProof, FotoOwl, KwikPic, Premagic, Wed.ing | Without lock, photographer cannot trust the selection for album work. Sets the workflow expectation. | Add `Event.selection.lockedAt`, photographer "Selection received" toast. |

### P1 — Ship in 1-2 months (viral-growth & competitive parity)

| # | Feature | Competitors | Why | Fyndr fit |
|---|---|---|---|---|
| **P1-1** | **Custom Domain (CNAME) + Free SSL** | Pixieset, Pic-Time, ShootProof, SmugMug, FotoOwl, PicsDrop, Samaro, Premagic, Wed.ing | "gallery.yourstudio.com" is the single biggest branding unlock for studios; we lose paid tier conversions without it. | Vercel Domains API or Caddy on-demand TLS on Oracle; per-photographer DNS CNAME. |
| **P1-2** | **Studio Branding Pack (logo, accent color, cover photo, fonts)** | All competitors | Photographers refuse to send a guest link that shows another brand. Trivial CSS vars; huge perceived-value bump. | Per-event theme tokens; guest page re-skin. |
| **P1-3** | **WhatsApp Click-to-Chat Share + Native Web Share API** | FotoOwl, LightPic, VaultPic, AccioPix, PicsDrop, Premagic, Wed.ing | `wa.me/?text=...` is free viral distribution vs Meta API costs. Native `navigator.share()` covers iOS/Android share sheets. | `ShareSheet` component with `wa.me` + `navigator.share`. |
| **P1-4** | **Public Photographer Portfolio Page (free with Fyndr account)** | Pixieset, SmugMug, KwikPic, PicsDrop, Samaro, Premagic, Wed.ing | Top of funnel. Photographers who build a free portfolio on Fyndr become event-booking customers. Replaces need for separate website. | `/p/:handle` route with picked events + bio + contact + "Book me" form. |
| **P1-5** | **Multi-Event Bulk Create via CSV** | Pixieset, Pic-Time, ShootProof, KwikPic, Premagic, Wed.ing | School portraits, sports, corporate = volume events. One CSV upload → 30 events in 30 seconds. | `POST /events/bulk` accept CSV. |
| **P1-6** | **Photo Commenting / Annotations on Selections** | Pixieset, Pic-Time, ShootProof, FotoOwl, KwikPic, Premagic, Wed.ing, Samaro, Memzo | "Remove glare from glasses" turns selection into a retouch brief. Already a photographer expectation. | `Selection.comment[]`, threaded per photo. |
| **P1-7** | **"Book This Photographer" Inquiry CTA on Guest Page** | FotoOwl, PicsDrop, Premagic, Wed.ing | Wedding guests see the work, ask the photographer to shoot theirs. Pure inbound lead gen. | Form → photographer email + WhatsApp. |
| **P1-8** | **Album Cover Auto-Pick (largest-face heuristic + photographer override)** | Pixieset, Pic-Time, ShootProof, FotoOwl, KwikPic, Premagic, Wed.ing, Samaro, Memzo | Dashboard cover is the first thing a returning client clicks; default matters. | Already partial; ship photographer-override. |
| **P1-9** | **Public Stats / Social Proof on Landing ("Used at N weddings, avg 3.2s to find")** | All competitors | Trust signal. We have the data; just surface it. | `/stats` route, animated count-up. |
| **P1-10** | **Multi-Language Guest Page (Hindi + English first)** | KwikPic, LightPic, Premagic, Wed.ing, AccioPix | India has 22 scheduled languages; Hindi alone covers 40%+ of guests. Trivial `i18n` JSON. | `next-intl` or flat JSON. |
| **P1-11** | **Group Photo / Crowd Detection ("you're in this crowd")** | FotoOwl, KwikPic, LightPic, PicsDrop, Samaro, FindMe Photo, Premagic | Solves "I was in the back row" candid misses; major differentiation vs Pixieset's add-on face search. | Server-side cluster density > N faces → tag as group, surface in results. |
| **P1-12** | **Slideshow Generator (auto video reel from event)** | Pixieset, Pic-Time, ShootProof, SmugMug, FotoOwl, KwikPic, PicsDrop, Samaro, Premagic, Wed.ing, Memzo | Replaces "send a 50-photo highlight" with a 30-sec reel. Sharable, embeddable. | `ffmpeg` worker job: pick top-N by face-coverage + sharpness, crossfade to MP4. |
| **P1-13** | **Razorpay Native Checkout (India photographer payouts)** | FotoOwl, KwikPic, VaultPic, AccioPix, PicsDrop, Samaro, Premagic, Wed.ing | Stripe works in India but UPI = 60%+ of payments. Razorpay unlocks UPI, NetBanking, Cards, Wallets for paid downloads. | Razorpay Orders + Webhook; idempotent on `event.payment_id`. |
| **P1-14** | **Photographer Mobile App (PWA install, not native)** | Pixieset, Pic-Time, KwikPic, VaultPic, Samaro, Memzo | "Add to Home Screen" is 90% of native UX at 10% of build cost. Push notifications when guest leads arrive. | Manifest + service worker + Web Push API. |
| **P1-15** | **Lightroom Classic Publish Service Plugin** | Pixieset, Pic-Time, ShootProof, SmugMug, KwikPic, Samaro | Photographers live in Lightroom; one-click "Publish to Fyndr" beats any web upload. | LR Plugin SDK → REST `POST /photos/batch`. |

### P2 — Ship in 2-4 months (business OS expansion)

| # | Feature | Competitors | Why | Fyndr fit |
|---|---|---|---|---|
| **P2-1** | **Contracts + E-Sign Module** | ShootProof, FotoOwl, KwikPic, PicsDrop, Premagic, Wed.ing, Samaro | Photographers need a single tool for shoot contract + delivery; "two subscriptions" loses. | DocuSign-like template editor, photographer signs + client signs. |
| **P2-2** | **Invoicing + GST-compliant PDFs** | PicsDrop, Premagic, Wed.ing, ShootProof, KwikPic, Samaro | Indian tax compliance is non-negotiable for any studio doing >₹20L/yr. | Template engine + GST field + Razorpay "Pay this invoice" link. |
| **P2-3** | **Booking + Questionnaire Forms** | ShootProof, FotoOwl, KwikPic, PicsDrop, Premagic, Wed.ing, Samaro | Closes the loop: inquiry → contract → shoot → delivery, all in Fyndr. | Form builder + deposit tracking + calendar. |
| **P2-4** | **Paid Downloads / E-Commerce (per-photo or album pack)** | Pixieset, Pic-Time, ShootProof, SmugMug, FotoOwl, KwikPic, LightPic, VaultPic, AccioPix, PicsDrop, Samaro | Marathons, school portraits, sports = guests pay per photo. Different pricing model from weddings. | Razorpay paywall gate, photographer sets price per photo/album. |
| **P2-5** | **Print Store + Lab Routing (Bay Photo, WHCC, Miller's, Nations)** | Pixieset, Pic-Time, ShootProof, SmugMug, KwikPic, Samaro, Memzo | Photographer margin on print is 30-70%. Native lab routing is a real revenue line. | Lab API integration (WHCC, Bay Photo), white-label pricing. |
| **P2-6** | **Team / Multi-User Roles (Admin, Photographer, Assistant, Viewer)** | Pixieset, Pic-Time, ShootProof, FotoOwl, KwikPic, PicsDrop, Samaro, Premagic, Wed.ing | Studios >3 people can't share one login. Standard SaaS feature. | `Studio.member[]` with role enum + per-event ACL. |
| **P2-7** | **Vendor Galleries (auto-share florist / venue / planner)** | Pic-Time, FotoOwl | Builds referral pipeline — every vendor sees the photographer's work and sends clients. | Per-vendor scoped links, expires with event. |
| **P2-8** | **Tag-People / Person Labels (cluster → name → re-match)** | Pic-Time, FotoOwl, KwikPic, PicsDrop, Samaro, Memzo, Premagic | Photographer names "Bride, Groom, VIP" once → all guests see those labels. | HDBSCAN offline cluster (already on `Should` roadmap); manual rename UI. |
| **P2-9** | **Bulk Face Tagging / Cluster Browse** | FotoOwl, KwikPic, PicsDrop, Samaro, Premagic | Photographer UI: "show me every photo of the groom" without a selfie. | Cluster view in dashboard. |
| **P2-10** | **Anniversary / Auto Re-Marketing Emails** | Pic-Time, ShootProof, KwikPic, Samaro | "1 year since your wedding — anniversary print sale!" passive revenue. | Cron + SendGrid/Resend templates. |
| **P2-11** | **Camera-to-Cloud — FTPS / SFTP ingest endpoint (per-event credentials)** | FotoOwl (Beam), Pic-Time, Kamero (Kam-Sync), FTPix, Pixeva, PicSmart, Pelli, CloudTether, Honcho | Shoot → cloud without touching a laptop. The headline "live delivery" wedge. Per-event FTP user/pass, PASV mode, encrypted-at-rest. Most-requested feature across every India event-photographer forum in 2026. | Spawn `vsftpd` per event with chrooted `event_id` dir, FTPS explicit TLS, credentials surfaced in dashboard; on `STOR` → `pg-boss` ingest job. Cost: ~50MB RAM per concurrent session; runs on existing Oracle box. |
| **P2-12** | **Cloud-to-Cloud Sync (Drive, Dropbox, OneDrive, Box)** | FotoOwl, Pic-Time | Photographer's archive already lives in Drive; pull, don't re-upload. | OAuth + watch-channel. |
| **P2-13** | **Event Website Templates (Wedding RSVP / Corporate hub)** | PicsDrop, Premagic, Wed.ing | Single product for the whole event lifecycle, not just delivery. | Templated `/e/:slug` site builder. |
| **P2-14** | **Client Portal (one login for all jobs)** | ShootProof, FotoOwl, KwikPic, PicsDrop, Samaro, Premagic, Wed.ing | Returning clients don't re-enter data each wedding. | `Client` model linking events + contracts + invoices. |
| **P2-15** | **Photographer In-App Messaging** | Pic-Time, ShootProof, FotoOwl, KwikPic, PicsDrop, Samaro, Premagic | Threads per event per client; replaces email ping-pong. | WebSocket chat + email fallback. |

### P3 — Ship in 4-6 months (advanced / India-specific)

| # | Feature | Competitors | Why | Fyndr fit |
|---|---|---|---|---|
| **P3-1** | **WhatsApp Business API Native Delivery** | FotoOwl (verified), AccioPix | Highest open-rate channel in India (95%+ vs email 20%). Costs Meta API fees but unlocks automated delivery bot. | Meta BSP partner (Gupshup/Interakt), template approval. |
| **P3-2** | **Self-Destruct Originals After N Days** | Most competitors offer; Fyndr is silent | Photographer "delete after delivery" promise. Saves storage cost; matches privacy expectations. | Cron `event.expiresAt+7d` purge + CDN invalidation. |
| **P3-3** | **Public Proof Bar / Trust Badges (used at Taj / ITC / Marriott)** | All competitors | "Used at Taj Palace Delhi" = trust + SEO. | Photographer self-claims; admin approves. |
| **P3-4** | **Guest Page Dark / Light Theme Toggle** | Few competitors | Personal preference; trivial to ship. | `prefers-color-scheme` + manual override. |
| **P3-5** | **Re-Match with Different Threshold (post-result slider)** | LightPic, VaultPic, PicsDrop, AccioPix, FindMe Photo | "I missed my photo" → bump to Loose → instant re-query. | Already partial; ship post-result re-query. |
| **P3-6** | **Multi-Region Storage (EU bucket for GDPR)** | Pixieset, Pic-Time, ShootProof | Enterprise / corporate EU clients require EU data residency. | OCI Frankfurt + `eu.fyndr.in` subdomain. |
| **P3-7** | **Embeddable Widget (third-party sites)** | AccioPix, Pixieset | "See your photos from our event" embedded on a wedding blog / venue page. | `<iframe>` + scoped JWT. |
| **P3-8** | **Album-Level Download Limit / Watermark Toggle** | Pixieset, Pic-Time, ShootProof, FotoOwl | Some clients want limited downloads (per-photo count cap). | Per-event policy. |
| **P3-9** | **Custom Fonts on Photographer Site** | Pixieset (March 2026 update), most | Brand consistency. | `next/font` per photographer. |
| **P3-10** | **Selfie-Free Browse Mode (token-only gallery)** | All competitors | Some guests just want to scroll the whole event without taking a selfie. | Toggle per event: "Anyone with link can browse." |

### P4 — Ship when we hit scale triggers (long-horizon, do not pre-build)

| # | Feature | Competitors | Why we defer |
|---|---|---|---|
| **P4-1** | **Native iOS + Android Apps** | Pixieset, Pic-Time, ShootProof, KwikPic, VaultPic, Samaro, Memzo | $50k+ to build & maintain; PWA covers 90% of need. Trigger: 5k MAU photographers. |
| **P4-2** | **Video Hosting + 4K Streaming** | Samaro, Pic-Time, Pixieset | 10× storage cost; out of wedge. Trigger: any ₹1L/mo plan sells. |
| **P4-3** | **Photographer Marketplace ("Find a photographer in Mumbai")** | Wed.ing, Premagic | Two-sided product; not our core. Trigger: 1k photographers onboarded. |
| **P4-4** | **AI Culling (auto-pick the best 200 of 5,000)** | Pic-Time (Smart Albums), Aftershoot competitor | Different product. Trigger: explicit demand from 50+ photographers. |
| **P4-5** | **CRM / Lead Scoring** | FotoOwl, ShootProof | Once booking forms ship, build scoring. |
| **P4-6** | **Public API + Webhooks** | Pixieset, ShootProof, PicsDrop | Once studios ask. |
| **P4-7** | **Photo Book Auto-Layout** | Pic-Time, Pixieset, SmugMug | Print-store dependency. Trigger: P2-5 shipped. |
| **P4-8** | **Stock Photo Marketplace** | SmugMug | Off-strategy. |
| **P4-9** | **NFT / Blockchain Photo Authenticity** | A few startups | Gimmick; reject. |
| **P4-10** | **Real-Time Photographer → Guest Live Stream** | None meaningful | Out of wedge. |
| **P4-11** | **Whistle / Finish-Line Auto-Trigger (sports)** | Honcho (early concept), Sportpic | Niche. Trigger: ≥5 paying sports photographers asking for it; can be solved by date+time query first. |

---

## 3.1 Camera-to-Cloud & Live Ingest — the live-delivery feature family

Live ingest is the single biggest competitive lever that **does not** require us to build any AI: it lets the photographer's camera (or its tethered phone) push every shutter press into the Fyndr pipeline without a laptop in the loop. FotoOwl's "Beam", Honcho, Kamero (Kam-Sync), FTPix, Pixeva, CloudTether, PicSmart and Pelli all ship at least one variant. The market treats this as **table stakes for any platform that claims to be live** — if we don't ship it, we get benched.

The family decomposes into **9 distinct product features**. Each is independently shippable and is listed below with the priority it earns in our ranking.

### 3.1.1 FTPS / SFTP ingest endpoint (per-event credentials) — **P2-11**
- **What:** Photographer creates an event → dashboard shows a one-time `host=ftp.fyndr.in user=evt_<id> pass=<random>` triplet. Plug into Canon / Nikon / Sony / Fujifilm built-in FTP transfer. Photos hit the cloud within seconds of capture.
- **Why it matters:** The single highest-leverage "live delivery" feature. Every forum thread in 2026 lists "I want Beam" as the #1 missing feature. No laptop, no SD card swap.
- **Implementation:** `vsftpd` with per-event chrooted dirs, FTPS-explicit TLS (most cameras speak FTPS; SFTP is a stretch goal). On `STOR` complete → emit `pg-boss` `face` job. Credentials auto-expire with the event.
- **Competitors offering it:** FotoOwl Beam, Kamero Kam-Sync, FTPix, Pixeva, PicSmart (FTP Live), Pelli, CloudTether, Couchdrop, Honcho (via phone tether).

### 3.1.2 Mobile tethered companion app (camera → phone → cloud) — **P1-16**
- **What:** A free Android / iOS app the photographer installs on their phone. Tether the camera via USB (or the camera's own Wi-Fi), and the app auto-detects new files, downloads them at full res, and uploads to Fyndr over the phone's data. For cameras without built-in FTP, or for shooters who don't want to fight venue Wi-Fi.
- **Why it matters:** Captures the **entire** photographer market — not just the FTP-capable body owners. Honcho and CloudTether are 100% app-first. India's mid-tier photographers overwhelmingly use entry-level Canon Rebels / Sony a6xxx series without FTP.
- **Implementation:** React Native (or Kotlin + Swift) app using `ptp` / `MTP` / Sony `Remote API` / Canon `CCAPI`. Foreground service to keep tether alive. Photo upload goes through presigned R2 PUT. Camera compatibility matrix: Canon EOS R series, Nikon Z series, Sony Alpha, Fujifilm X/GFX.
- **Competitors offering it:** Honcho, CloudTether, FTPix (Android only), Kamero.

### 3.1.3 Live Slideshow / On-Screen Display (browser, real-time) — **P1-17**
- **What:** A read-only `/e/:token/live` URL the photographer projects on a venue TV or LED wall. New photos land in the gallery in real time, the slideshow auto-advances, and the photographer moderates (hide / feature) from their phone.
- **Why it matters:** On-site "photo wall" loops are now the default at award ceremonies, sports venues, and Indian wedding receptions. The photographer becomes part of the show, not an afterthought. SmugMug, Pic-Time, Honcho and several India tools all ship variants.
- **Implementation:** Server-Sent Events (SSE) or WebSocket to push `photo.created` events to connected viewers. 5–10 sec auto-advance, photographer tap-to-feature queue, brand watermark overlay. Reuses the existing `next/image` R2 loader.
- **Competitors offering it:** Honcho, Pic-Time, Pixieset (via add-on), SmugMug, PicsDrop, Wed.ing.

### 3.1.4 Desktop Tether Watcher (Capture One / Lightroom folder → cloud) — **P3-11**
- **What:** A small Mac/Windows app that watches a local folder. When Capture One, Lightroom, or any tethered workflow writes a new file into that folder, the app auto-uploads to Fyndr. No FTP, no phone, no second device.
- **Why it matters:** Studio / commercial photographers who tether to a MacBook for live client review want zero-friction cloud sync without changing their existing Capture One or Lightroom pipeline. Honcho's #1 most-requested feature on thephoblographer is "build this desktop app."
- **Implementation:** Electron or Tauri shell with `chokidar` (cross-platform file watcher) and our existing presigned PUT flow. Auth via Fyndr photographer account, target event picker in tray menu. ~300 LOC.
- **Competitors offering it:** Honcho (planned), Pic-Time All-In-One (Capture One integration), MASV Bridge (file-transfer only).

### 3.1.5 Auto-Cull / Burst Dedupe / Live Edit Presets — **P3-12**
- **What:** As photos land via FTP/tether, an ML sidecar (separate from our `buffalo_s` face pipeline) scores them on sharpness, blink, and near-duplicate similarity within a burst. Bursts collapse to the sharpest frame. Preset-applied tone-mapped JPEGs are published while RAW originals stay private.
- **Why it matters:** "Live delivery" only feels live if the wall isn't showing 12 frames of the same toast-raising. Honcho, Pixeva, and Aftershoot all sell on this. Sports photographers especially need burst dedupe or the gallery drowns in identical frames.
- **Implementation:** Worker uses the same `onnxruntime` runtime we already ship for face detection. Sharpness via Laplacian variance, dedup via perceptual hash (pHash) on downscaled thumbs. Toggle per-event.
- **Competitors offering it:** Honcho (manual mod + auto-cull playground), Pic-Time (Smart Albums), Pixeva (AWS Bedrock classifier), Aftershoot (separate product).

### 3.1.6 Live / On-Site Print Routing from Cloud Gallery — **P3-13**
- **What:** Photographer or assistant opens a print queue on a phone/laptop at the venue, taps photos, and they send to a Wi-Fi-connected Dye-Sub printer (Canon Selphy, DNP, Mitsubishi CP-D70). Most natural with live ingest: shoot → guest chooses → printed in 8s.
- **Why it matters:** Sports events, school portraits, corporate activations monetize heavily on on-site prints (₹150–₹400 per 4×6). Honcho built a flagship workflow around this. Without live ingest we can't realistically power this.
- **Implementation:** Vendor-neutral IPP-everywhere client; printer discovery via mDNS. Order → `paidDownload` already handles the Razorpay side (P1-13). Trigger: P2-11 (FTP) + P1-17 (slideshow) + P1-13 (Razorpay) all shipped.
- **Competitors offering it:** Honcho, Pic-Time, ShootProof (lab routing), SmugMug (via lab).

### 3.1.7 Bib / Jersey Number Recognition (sports) — **P3-14**
- **What:** A separate ML model (YOLOv8-nano fine-tuned on race bibs and jersey numbers) runs over the live-ingest pipeline. Athletes search "my number" instead of a selfie. Falls back to face search.
- **Why it matters:** Marathons and triathlons are a fast-growing segment in India (Tata Mumbai Marathon, Bengaluru Midnight Marathon). Athletes don't want to take a selfie mid-race. Honcho's #1 sports-photographer request.
- **Implementation:** YOLOv8-n ONNX, ~5MB, runs on same CPU box. Tagged with `kind: bib` and indexed in FAISS alongside faces. New search mode "Find by number" on `/e/:token`.
- **Competitors offering it:** Honcho (planned), Sportpic, SnapFlow, Pic-Time (limited).

### 3.1.8 Watch-Folder Desktop Agent (auto-upload new files) — **P3-15**
- **What:** A lightweight always-on agent (separate from the desktop tether watcher) that monitors a chosen folder on the photographer's machine and auto-uploads new files to a Fyndr event. Differs from 3.1.4 in that it doesn't tie to a tethered workflow — it just watches any folder (e.g., a finished shoot dump).
- **Why it matters:** Replaces the manual "drag-drop into the web uploader" step after the event ends. Closes the loop for photographers who edit in Capture One, dump finals to a folder, and want them live in Fyndr without re-uploading.
- **Implementation:** Same Electron/Tauri shell as 3.1.4 minus the capture-software-specific trigger. Shared ~70% of the codebase with the desktop tether watcher.
- **Competitors offering it:** FotoOwl (Beam for camera), MASV, Dropbox-based competitors (Synology, etc.).

### 3.1.9 Whistle / Finish-Line Auto-Trigger (sports) — **P4-11**
- **What:** A small Bluetooth button (or webhook) the photographer presses at the finish line. Every photo taken in the next 60s is auto-tagged "finish-line batch N" so athletes searching for their finish shot find it instantly. Or: a USB trigger that fires on camera shutter release.
- **Why we defer:** Niche. Trigger: at least 5 paying sports photographers asking for it. Most race-photo workflows can be solved by date+time range query first.
- **Competitors offering it:** Honcho (early concept), Sportpic, a few race-photo specialists.

---

### Live-ingest cost & infrastructure sketch

| Component | Existing? | What we add |
|---|---|---|
| FTP server | no | `vsftpd` per-event chroot, 1 process, ~30MB RAM |
| FTPS certs | no | Let's Encrypt wildcard for `*.ftp.fyndr.in` |
| Mobile app | no | React Native, ~$15k dev + $3k/yr maintenance |
| Desktop agent | no | Tauri, ~$8k dev (shared with capture-software watcher) |
| SSE/WebSocket | no | Reuse existing Node process, ~50 LOC |
| Auto-cull ML | no | `onnxruntime` + pHash, ~10MB RAM/photo at peak |
| Bib number ML | no | YOLOv8-n ONNX, ~5MB |
| Print routing | no | IPP client lib (`ipp` npm), ~$2k dev |

**No new DB, no new queue, no new CDN** — all of it runs on the existing Oracle box + R2. Estimated additional monthly cost: **$0** until >50 paid photographers are active.

### Live-ingest priority summary
- **P1-16** Mobile Tethered Companion App
- **P1-17** Live Slideshow
- **P2-11** FTPS / SFTP Ingest
- **P3-11** Desktop Tether Watcher
- **P3-12** Auto-Cull / Burst Dedupe
- **P3-13** Live Print Routing
- **P3-14** Bib / Jersey Number Recognition
- **P3-15** Watch-Folder Desktop Agent
- **P4-11** Whistle / Finish-Line Trigger

---

## 4. Recommended sequencing (the next 6 months)

```
Sprint 1–2   P0-1 Selection + Lightroom export + Lock       (revenue unlock)
Sprint 2–3   P0-2 Standee Generator                          (free viral loop)
Sprint 3     P0-3 Lead Capture + CSV                         (future-booking funnel)
Sprint 4     P0-4 Sub-Event Folders                          (India-wedding parity)
Sprint 4     P0-5 Watermark Engine                           (IP protection)
Sprint 5     P0-6 Threshold Slider                           (already scoped)
Sprint 5     P0-7 Analytics Dashboard                        (paid-tier gate)
Sprint 6     P1-1 Custom Domain + SSL                        (studio tier unlock)
Sprint 6     P1-2 Studio Branding Pack                       (perception bump)
Sprint 7     P1-3 WhatsApp Click-to-Chat                     (free viral)
Sprint 7     P1-4 Photographer Portfolio Page                (top-of-funnel)
Sprint 7     P1-17 Live Slideshow                            (venue TV / wedding wall)
Sprint 8     P1-5 Bulk CSV Create                            (volume events)
Sprint 8     P1-13 Razorpay Native Checkout                  (India payments)
Sprint 8     P1-16 Mobile Tethered Companion App            (live-delivery wedge, Android-first)
Sprint 9     P2-4 Paid Downloads                             (new revenue line)
Sprint 9     P2-1 + P2-2 Contracts + GST Invoicing           (business OS)
Sprint 9     P2-11 FTPS / SFTP Ingest Endpoint               (pro-body live capture)
Sprint 10    P2-3 Booking + Questionnaires                   (lifecycle complete)
Sprint 10    P1-14 Photographer PWA                          (mobile parity)
Sprint 11    P3-12 Auto-Cull / Burst Dedupe                  (gallery quality)
Sprint 11    P3-11 Desktop Tether Watcher                    (Capture One / LR users)
Sprint 12    P3-13 Live Print Routing                        (on-site revenue)
Sprint 12    P3-14 Bib Number Recognition                    (sports segment)
Sprint 12    P3-15 Watch-Folder Desktop Agent                (post-shoot upload)
```

After Sprint 10: Fyndr is feature-equivalent with KwikPic / PicsDrop on the wedding use case and ahead on cost & no-app delivery. Sprints 11–12 push Fyndr into the **live-ingest** category currently dominated by FotoOwl (Beam), Honcho, and Kamero. The remaining P3 → P4 features are revenue expansion, not table stakes.

---

## 5. What we are explicitly NOT building (and why)

- **Native face-recognition hardware** — server ONNX `buffalo_s` is already correct.
- **A "Pixieset clone" gallery editor with 40 themes** — over-investment; one good theme beats 40 mediocre ones.
- **NFTs, AI culling, stock marketplace, video hosting** — see `UPGRADE_PLAN.md` "Won't (until 100 photographers)."
- **Our own payment processor** — Razorpay/Stripe handle this. We integrate, we don't compete.
- **A photographer CRM from scratch** — wait for explicit demand; not table stakes in India yet.
- **A photo-editing suite** — Aftershoot/Lightroom/Capture One own this; we link out.

---

## 6. Success metrics per tier

- **P0 (table stakes):** time-to-paid-plan conversion ≥8% from free; 60%+ of photographers publish a standee within 24h of upload; ≥30% lead-capture opt-in among Indian photographers.
- **P1 (viral growth):** photographer-invited-guests viral coefficient ≥0.3; share-to-WhatsApp ≥40% of share actions; custom-domain uptake ≥25% of paid photographers; **live-slideshow runs ≥15% of paid events** within 6 months.
- **P1–P2 (live-delivery wedge):** mobile companion app install base ≥40% of paid photographers; FTPS endpoint active for ≥25% of paid events within 12 months; ≥10% of FTP-ingested photos indexed and served within 60s of capture.
- **P2 (business OS):** Razorpay GMV ≥₹10L/mo through paid downloads; ≥20% paid photographers use contracts + invoicing.
- **P3 (advanced):** EU residency for ≥1 enterprise corporate account; WhatsApp-bot delivery drives ≥15% of guest retrievals in opted-in events; auto-cull adopted by ≥30% of paid photographers; bib-number search powers ≥3 marathon customers.
- **P4 (long-horizon):** deferred until scale triggers hit.

---

## 7. How this doc stays honest

- **Quarterly review.** Every quarter we re-pull competitor marketing pages and update the matrix in §2.
- **Customer-driven.** New P0 items must come from at least 3 paying photographers asking for the same feature.
- **No "AI for AI's sake."** Anything tagged "AI" in PR copy must move a metric in §6 or it does not ship.
- **Cost-aware.** Each item carries an infra-cost estimate: features that double our Oracle bill need a paying photographer attached first.

---

*Sources consulted (Aug–Sep 2026): pixieset.com, pic-time.com, shootproof.com, smugmug.com, fotoowl.ai (incl. products/beam), kwikpic.in, lightpic.in, vaultpic.com, acciopix.com, picsdrop.in, samaro.in, memzo.app, findme.photo, premagic.com, wed.ing, 12img.com, lightpic.in 2026 ranking guide, aftershoot pictime-vs-pixieset, findme.photo pixieset-vs-shootproof-vs-pic-time, vaultpic.com India 2026, acciopix.com AI face recognition 2026, fotoowl.ai Kwikpic alternative 2026, picsdrop.in Kwikpic alternative, **fotoowl.ai/products/beam (FTP), thehoncho.app camera-to-cloud & live delivery guides, thehoncho.app live-photoshoot, thehoncho.app real-time-photo-delivery, kamero.ai/kam-sync (FTP live), ftpix.in WiFi transfer guide, pixeva.co camera-to-cloud FTP tethering, picsmart.com/ftp-live, pelli.io direct FTP, cloudtether.app, couchdrop.io SFTP guide, ftpsuite.com sports workflow, thephoblographer.com Honcho review, massive.io camera-to-cloud MASV guide**.*
