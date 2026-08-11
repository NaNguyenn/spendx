# The API contract is generated, and CI fails when it drifts

`backend/` and `mobile/` are two independent npm projects — no workspace, no root `package.json`, no linked packages. What crosses between them is a generated type contract:

1. `npm run openapi:generate` in `backend/` boots the Nest application, writes `openapi.json` from the `@nestjs/swagger` document, and exits. The file is committed.
2. `npm run api:types` runs `openapi-typescript` over that file into `mobile/src/api/schema.d.ts`, also committed. The generator is a devDependency of `backend/`, not `mobile/`: `openapi-typescript` peers on TypeScript 5 while Expo SDK 57 ships TypeScript 6, and a generator that only reads JSON and writes a `.d.ts` has no business forcing a broken peer resolution on the app. `mobile`'s `api:types` script delegates to the backend one, so either directory is a valid place to run it.
3. A hand-written typed `fetch` wrapper (`mobile/src/api/client.ts`) is the only runtime code — base URL, auth header, error shape. Nothing is generated that executes.

CI regenerates both artifacts and fails if `git diff` is non-empty. A changed endpoint therefore cannot merge without the mobile types moving with it, which is the entire point: the failure mode this replaces is a hand-maintained second copy of the contract diverging silently and surfacing as an undefined on a phone rather than a red build.

Linking the two projects as npm workspaces with a shared package was the alternative. It would share runtime constants as well as types, at the cost of Metro monorepo configuration and hoisted native dependencies — the classic source of "builds on web, breaks on Android." Generating a full client with react-query hooks (orval, hey-api) was rejected as a large generated surface that also decides the mobile caching library as a side effect; that choice stays open.
