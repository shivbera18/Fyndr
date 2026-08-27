# Cost Estimation — $0-15/mo free-first

Monthly = fixed + Σ(events × per-event). Originals kept 7d then deleted, thumbs/previews 90d.

| Tier | VM+PG+queue | Store | CDN/BW | Fixed |
|------|-------------|-------|--------|-------|
| Free | Oracle Free 4OCPU/24GB/200GB $0 | R2 10GB free + 10M ops free | Cloudflare free $0 | $1 domain |
| Lean | Hetzner CX22 $6.35 + Box 100GB $4.15 | R2 free | CF free | $11.50 |
| AWS | t3.medium $14 + RDS $13 | R2/B2 | CF free | $28 |

Per-event retained 90d (thumbs 60KB+preview 180KB):
5k `1.2GB $0.02`, 20k `4.8GB $0.07`, 50k `12GB $0.18` + guest BW `~1GB $0` (CF) vs AWS `$0.10-0.52`. Compute CPU `0`, GPU spot `$0.03-0.11`.

| Load | Free | Lean | AWS |
|------|------|------|-----|
| 5×5k (25k) | $1 | $11.90 | $28.65 |
| 10×5k+5×20k (150k) | $1.45 | $12.60 | $31 |
| 20×20k (400k) | $6 | $14.90 | $42 |
| 30×50k (1.5M) | $11 | $38 | $85 |

Keep 90d originals add: 5k +$2.10, 20k +$8.40, 50k +$21 @ B2 $6/TB — don't. Formula: `monthly = 1 + n5k*0.02 + n20k*0.07 + n50k*0.18` (free), `11.5+…` (Hetzner).
