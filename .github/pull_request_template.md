## Member behavior

What changes, and what should a member be able to do?

## Verification

- [ ] `npx tsc --noEmit`
- [ ] `npm test -- --run`
- [ ] `npm run build`
- [ ] `npm run lint` (identify existing failures separately)
- [ ] Independent Caveman/Superagent review of final diff
- [ ] Gemini security/debugging review when an authorized path is available

For UI changes, record evidence or mark pending:

- [ ] Narrow Android and iPhone SE-size preview; larger/notched phone
- [ ] Loading, empty, failure, offline/reconnecting states
- [ ] Keyboard overlap, safe areas, large text, screen-reader labels, 44px touch targets
- [ ] Reduced motion; no invented activity or verification claims

For member-data changes:

- [ ] Allowed and denied actors tested in PostgreSQL (anon, owner, other member, blocked, moderator as applicable)
- [ ] No service-role/model/private keys in browser assets or logs
- [ ] Consent and analytics payloads checked
- [ ] Migration, rollback implications, and live verification recorded separately
- [ ] Two-account core loop on separate devices, including stale plan edit, if affected

## Release limits

Record unverified device/provider checks, required configuration, migration/restart steps, and operator-owned work. A passing local build is not proof of deployment. PR review is not merge permission.
