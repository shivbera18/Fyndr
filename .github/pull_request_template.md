# Pull Request

## What & Why

## Checklist

- [ ] If this PR adds user-visible surface, is it gated by a feature flag per `FEATURE_FLAGS_PLAN.md` §5.4? (or N/A with reason)
- [ ] Tests added/updated for both flag OFF and ON where applicable
- [ ] `npm --prefix node-server-1 run build` and `npm --prefix front-end run build` pass (or `tsc --noEmit`)
- [ ] Review loop: `gh pr review` posted and addressed (see `pr-review-guidelines.md`)
