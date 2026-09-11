# Public Swarm feed

The GitHub Pages viewer lives in `/swarm/`. This Worker provides only public reads
and an authenticated ingestion route. It has no access to the local game service
and cannot execute game commands.

Endpoints:

- `GET /health`: service identifier.
- `GET /v1/state?windowSeconds=30`: live players, Swarm positions and recent summaries.
- `GET /v1/history?windowSeconds=43200&offset=0`: paginated encounter history.
- `GET /v1/hotspots?windowSeconds=43200`: unique players and encounter counts by cell.
- `POST /v1/publish`: uploader bearer token required; browser-origin submissions denied.

History expires after 12 hours, enforced on reads, ingestion and a five-minute
scheduled cleanup. The local collector defines encounters with a five-minute
unseen gap. Only first/last time and the latest position are mirrored. An offline
uploader loses live status after ten seconds; clients expire after five seconds
and default external markers after thirty seconds from their last sighting.

Deploy from this directory after installing dependencies and signing into Wrangler:

```text
npm ci
npm test
npx wrangler login
npx wrangler d1 create oskariozan-swarm
```

Set the returned database ID in `wrangler.jsonc`, then:

```text
npx wrangler d1 execute oskariozan-swarm --remote --file schema.sql
npx wrangler secret put UPLOAD_TOKEN
npm run deploy
```

Use a generated random secret, never a game credential. Keep it outside the
repository. Configure the same secret in the local publisher's private config.
Set `swarm/config.js` to the resulting HTTPS Worker origin and publish that file.
No secret belongs in the viewer, GitHub Pages assets or repository history.

Tests use a disposable SQLite database and synthetic names. The production Worker
requires its D1 binding and upload secret; a missing secret disables ingestion.
