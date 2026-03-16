# Skland Guarded API Learning

Date: 2026-03-15

## What we confirmed

- The Endfield wiki page routes through `https://wiki.skland.com/endfield/catalog?typeMainId=1&typeSubId=5`.
- The shipped frontend bundle confirms these API surfaces:
  - `/web/v1/wiki/item/catalog`
  - `/web/v1/wiki/item/list`
  - `/web/v1/wiki/item/info`
  - `/web/v1/wiki/item/update/info`
- The wiki client is configured against `https://zonai.skland.com` for these requests.

## What failed in this environment

- Direct raw HTTP calls to the confirmed endpoints returned `{"code":10000,"message":"请求异常"}`.
- A Playwright bootstrap plus `context.request` calls still returned the same guarded response.
- A direct in-page `fetch(...)` attempt from the rendered catalog page failed as well.

## Implication for future work

- The crawler should keep strict backoff and stop-on-guarded-error behavior.
- If live crawling must succeed from this environment, the next debugging step is to match the site’s request-signing or other runtime request context more closely, not to increase retry volume.
- The current implementation is safe to run because it refuses to hammer the source when the guarded response appears.
