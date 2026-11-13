## Pull Request Summary

### Feature / Work Item
- **Owner**: Person A / Person B
- **Milestone**: 
- **Component / Scope**: 

### Description of Changes
- 

### Database Changes
- [ ] Schema DDL modified (`db/schema.sql`)
- [ ] Seed data updated (`db/seed.sql` / `db/demo-data.sql`)
- [ ] MongoDB schema/seed updated (`db/mongo-init.js` / `db/mongo-seed.js`)
- [ ] Functions / Procedures / Triggers / Views tested

### Guardrails Checklist
- [ ] Uses raw parameterized SQL via `pg` (no ORM)
- [ ] Uses official `mongodb` driver (no ODM)
- [ ] Strictly respects `TIMESTAMP WITHOUT TIME ZONE` (`YYYY-MM-DD HH:mm`) without JS Date zone mutation
- [ ] Multi-table mutations wrapped in dedicated-client transaction
- [ ] Role-based access control verified (server-side & database-level)
- [ ] API responses use standardized `{data}` and `{error:{message,code}}` envelopes

### Test Evidence
- [ ] Lint passed (`npm run lint`)
- [ ] Typecheck passed (`npm run typecheck`)
- [ ] Integration tests passed (`npm run test:integration`)
