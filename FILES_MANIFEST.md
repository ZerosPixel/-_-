# Манифест файлов — Бункер v12

Архив v12 содержит игровой клиент, WebSocket-сервер, полное ТЗ, документацию и результаты тестов. Контрольные суммы SHA-256 рассчитаны для всех файлов, кроме самого манифеста.

## Локальные проверки

- `node --check app.js`, `node --check transport.js`, `node --check server.js` — успешно.
- `node tests/host_tools_regression.cjs` — **42/42**.
- `python tests/browser_regression.py` — **31/31**, включая восстановление в фоне без переключения экрана и продолжение попыток после 24 сбоев.
- `node tests/final_outcome_simulation.cjs` — **500** smoke-сценариев.
- `node tests/transport_compat_smoke.cjs` — успешно.
- `node tests/websocket_relay_smoke.cjs` — успешно.
- Публичный Render-деплой и тесты на физических устройствах не выполнялись.

## Список файлов и SHA-256

| Путь | Байты | SHA-256 |
|---|---:|---|
| `.gitignore` | 29 | `0e16dd934cfcf1fbf7aa6a93de188cac61fec2d75416fbb0b842f3d82bc2cb98` |
| `AUDIT_REPORT.md` | 31556 | `2181bd973783d9ca34a78c5bae20049f8f5703d5a3c518ed5e656707e7227ab1` |
| `BUNKER_CHANGELOG.md` | 26954 | `de26da468e0eba765fac7e7cee27f9df4583b85c3b3c0aa3a50cf6a50d6fb4a1` |
| `PROJECT_STATUS.md` | 32999 | `3dd4765cfe4ad1295734bc9f63b803c9e699bf83a409c7436f719e2fe4a37ffa` |
| `README.md` | 32456 | `d8afe167980e8e17e7827c27b7d40d955251b614208c4ea2ee0171d484c06287` |
| `REQUIREMENTS_TRACEABILITY.md` | 48126 | `9b2bd181388890a20f5e16dbf43a7bad18bafc3cf3c28b1c7da4215f18b60e08` |
| `app.js` | 278256 | `9e3d2e37a7ddcb038addf1e980e111963427195fba483f4e718bf5c28043875f` |
| `assets/catastrophe-01-nuclear-winter.jpg` | 56714 | `88b9165140bae9c53c0d350802721e5a6bc7d358616ce8167caf5148f7118d71` |
| `assets/catastrophe-02-flood.jpg` | 49229 | `2a4a6b8ae911ab6c2267d163d38f039e3e5521f9c83fb233f7c592548626a852` |
| `assets/catastrophe-03-drought.jpg` | 52742 | `8593a7ab6952022179a93443723c6c0c298a9365b110b13a29a76df76070d4be` |
| `assets/catastrophe-04-tech-collapse.jpg` | 38092 | `5ebc652f2f694ea5346649d4e8cb22d1617ffdb05d6fd81c54992720d178e7c5` |
| `assets/catastrophe-05-epidemic.jpg` | 35406 | `7991b3bd921ddd442ef32194a9707b7f18e8678590a367b0dc01b661ad382859` |
| `assets/catastrophe-06-asteroid.jpg` | 40938 | `e98754098a15da2011b9a5a6beb866bc3c3f39f896a1d87b8655d057629298b5` |
| `assets/catastrophe-07-climate-shift.jpg` | 55917 | `f31ee92586aa11684a15a243029f744f048abc3178d6a8da2d9393165ae542dc` |
| `assets/catastrophe-08-dust-storm.jpg` | 32892 | `41103e7b8715a62b6a6cc4eaa2ddfe91bd7d1c9ad124b57561952b0b59743354` |
| `docs/specification/СТАРТ_нового_диалога_ChatGPT_Бункер.txt` | 2747 | `4f767997ab877868e6c26ce2e17f9702cc690664cd616cd2257cf813990b8fc6` |
| `docs/specification/ТЗ_Бункер_ChatGPT_полное_обновлённое_v2.md` | 220685 | `6455855fb7934a8c084a917e0e8ad8aa779ee6fb6dba6b5bba3b827c8f592430` |
| `docs/specification/ТЗ_Бункер_ChatGPT_полное_обновлённое_v2.txt` | 220685 | `6455855fb7934a8c084a917e0e8ad8aa779ee6fb6dba6b5bba3b827c8f592430` |
| `index.html` | 1002 | `1e033a796f8e0644331d64fd0c86e498aaa1d2034b269b1b0db3983296baed0a` |
| `package.json` | 416 | `afe31374316503394dcf3ccedd1cb2fef64b314c3181c79ac79a86640298e67f` |
| `render.yaml` | 168 | `7148893faff09a0f32d11398741be6558b6059117fa1730c5be453c75a51ab25` |
| `server.js` | 15150 | `4089566bdb96c790d524223da56ca53dc1c436f1666c4a4e9e624b1a23a18622` |
| `styles.css` | 38862 | `b2bff9453d9e1a975685a4d14a01bc708d3c4a329bd4d29b8c1f29c7e520d79f` |
| `tests/FINAL_OUTCOME_SIMULATION.json` | 423 | `51478092d6d9e21d2463182079a43ed1d90af2f1224bd901541916feea445806` |
| `tests/HOST_TOOLS_RESULTS.json` | 5158 | `e3d5433fd2d1d4918c16077e608c7da9f0abc2afe8e8c1b355e89c5c4100d75c` |
| `tests/NETWORK_SMOKE_RESULTS.json` | 1689 | `11c55d7cd823852f54c2b0b74c4890a82ebf490f215ead98318af1a5c99507e0` |
| `tests/TEST_RESULTS.json` | 15902 | `05bd742429bbe163ee84ed4a3b266d0ff046bfc65f085725bae4ad80e7ef8c5d` |
| `tests/browser_regression.py` | 34698 | `c46912a7e7fb0975a3f8cffac5bc79af23737374ce0258983eed0b6260d8a95e` |
| `tests/final_outcome_simulation.cjs` | 3758 | `59cb717aad4342cfb070854d5dff3da059365592e0f9649158f8102dff4971ed` |
| `tests/host_tools_regression.cjs` | 36038 | `9ccda1ce777a2490aa03fda7347aad9111304349d6f6364b02a057b77c68fa12` |
| `tests/transport_compat_smoke.cjs` | 3275 | `f673f042802324c518bb17175ed07237ee30adfdf2ef8233f46845141188a7f9` |
| `tests/websocket_relay_smoke.cjs` | 6305 | `06b5550bf6a078c864dc140b4c46b8b676b03efdd922930622d76c610c805928` |
| `transport.js` | 9716 | `b1b983ab235cb8114c1f88513776c6c219c8375e232f52fdc1cde2b1052f3272` |
