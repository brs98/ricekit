# Production Readiness Checklist

Track items needed before selling MacTheme to customers.

---

## Critical (Blockers for Sale)

- [ ] **Auto-Updates** - Integrate `electron-updater` with release server
- [ ] **Privacy Policy** - Create privacy policy document (required for GDPR compliance)
- [ ] **Terms of Service** - Create terms of service document
- [ ] **App Icons** - Create `build/icon.icns` (macOS) and `build/icon.ico` (Windows)

---

## High Priority

- [ ] **License Consistency** - Update README to reflect MIT license (currently says "[License TBD]")
- [ ] **CI/CD Pipeline** - Set up GitHub Actions for automated builds and releases
- [ ] **Cross-platform Testing** - QA Windows and Linux builds
- [ ] **Changelog** - Create `CHANGELOG.md` and establish versioning process
- [ ] **Update Integrity** - Add cryptographic verification for downloaded themes/updates
- [ ] **Dependency Audit** - Run `npm audit` and fix vulnerabilities

---

## Important for Quality

- [ ] **Accessibility (A11y)** - Add ARIA labels and test keyboard navigation
- [ ] **Internationalization (i18n)** - Add framework for multiple languages
- [ ] **Unit Tests** - Add Jest/Vitest unit tests for utilities and shared code
- [ ] **Theme Validation** - Implement strict JSON schema validation for theme files
- [ ] **Crash Reporting** - Add error collection service (Sentry, etc.)
- [ ] **Performance Monitoring** - Add optional telemetry with user opt-out

---

## Nice to Have

- [ ] **Theme Repository** - Built-in theme discovery/download from community
- [ ] **Cloud Sync** - Sync themes across devices
- [ ] **Team Sharing** - Share theme collections with teams
- [ ] **Contributing Guidelines** - Add `CONTRIBUTING.md`
- [ ] **Issue Templates** - Add GitHub issue/PR templates

---

## Future: Marketplace (Validate Core Product First)

Consider building after core product is validated and generating revenue.

**Phase 1 - Lean Validation:**
- [ ] Enable sharing `.mactheme` files via external channels (GitHub, Discord)
- [ ] Track organic sharing behavior to validate demand

**Phase 2 - Curated Gallery:**
- [ ] Built-in theme gallery with curated community themes (no user uploads)
- [ ] Simple "Install from URL" feature

**Phase 3 - Full Marketplace (if demand proven):**
- [ ] User accounts and authentication
- [ ] Theme/wallpaper upload and hosting
- [ ] Rating and review system
- [ ] Paid themes with revenue share (15-30% cut)
- [ ] Content moderation system
- [ ] DMCA/copyright takedown process
- [ ] Creator profiles and analytics

**Risks to consider:** Moderation burden, infrastructure costs, legal liability, support overhead, critical mass problem.

---

## Notes

- Current version: v0.1.0 (pre-release)
- Distributing unsigned: Users must right-click → Open to bypass Gatekeeper on first launch
