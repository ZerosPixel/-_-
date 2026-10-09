# Манифест файлов — Бункер v11

Архив v11 содержит исходный проект, полное ТЗ, историю изменений и WebSocket backend с восстановлением хост-сессии. Контрольные суммы SHA-256 проверяют целостность поставки. Сам манифест не хешируется, чтобы избежать рекурсии.

## Локальные проверки

- `node --check app.js`, `node --check transport.js`, `node --check server.js` — успешно.
- `node tests/websocket_relay_smoke.cjs` — успешно: регистрация, восстановление той же host-сессии, запрет захвата комнаты другой сессией и очистка старого сокета.
- `node tests/transport_compat_smoke.cjs` — успешно: браузерный транспорт, передача данных в обе стороны и сохранение host-token после переподключения.
- `node tests/host_tools_regression.cjs` — **41/41**.
- `python tests/browser_regression.py` — **30/30**.
- `node tests/final_outcome_simulation.cjs` — **500** сценариев smoke-проверки.
- Публичный Render-деплой и тесты на физических iPhone/Android/ПК ещё не выполнялись.

## Список файлов и SHA-256

| Путь | Байты | SHA-256 |
|---|---:|---|
| `.gitignore` | 29 | `0e16dd934cfcf1fbf7aa6a93de188cac61fec2d75416fbb0b842f3d82bc2cb98` |
| `AUDIT_REPORT.md` | 29963 | `df3990a1fad5ea36063c56153841129f52e2cab260a5bc1c66ad992ca124cd3f` |
| `BUNKER_CHANGELOG.md` | 25412 | `0a4ed05d39ac86b3bbd3a0fd10ea87b65f1bd43059fa441f8e29c5e0a4a00fb5` |
| `PROJECT_STATUS.md` | 31868 | `5e2f1538edc5cd494fc1606879b1e64c24b9a90a5391f8abb09a594d66d92f36` |
| `README.md` | 31397 | `77d4c6c1182fc05a45995d912105752ecdab15e506f5efa42f3d189fc15082a7` |
| `REQUIREMENTS_TRACEABILITY.md` | 48126 | `9b2bd181388890a20f5e16dbf43a7bad18bafc3cf3c28b1c7da4215f18b60e08` |
| `app.js` | 276284 | `11de261e0e43ab1ad71a9dbebbe3e3bfe032b5f58038f412f45d44f4f08452e7` |
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
| `index.html` | 1002 | `d8a23593f84c864632a1bee0b51bcdd722d1a5f5acb5a65f2a5b29b301bb30d3` |
| `package.json` | 416 | `c1d8d4cb14df78bace0bf38e3844120e75006f309fe0758ad688b76137825227` |
| `render.yaml` | 168 | `7148893faff09a0f32d11398741be6558b6059117fa1730c5be453c75a51ab25` |
| `server.js` | 15150 | `4089566bdb96c790d524223da56ca53dc1c436f1666c4a4e9e624b1a23a18622` |
| `styles.css` | 38862 | `b2bff9453d9e1a975685a4d14a01bc708d3c4a329bd4d29b8c1f29c7e520d79f` |
| `tests/FINAL_OUTCOME_SIMULATION.json` | 423 | `51478092d6d9e21d2463182079a43ed1d90af2f1224bd901541916feea445806` |
| `tests/HOST_TOOLS_RESULTS.json` | 5023 | `eb04e1a91478a49c076ab7e7f33b7d512848f0201fac5b7411d575c0c5d6aadb` |
| `tests/NETWORK_SMOKE_RESULTS.json` | 1382 | `745dba1232aa602553ac7125db220131c4221851483d304733eff5aa74f153f0` |
| `tests/TEST_RESULTS.json` | 15442 | `3a81dc2b7f6e7aef73b2c2cd67b9241c617278cbd0fc1a68e51c3b3ce3c78528` |
| `tests/browser_regression.py` | 32390 | `e8aec027dd736e431e3d59fb2986aa2e8127edbb8089b4ef7b4b639241412e7a` |
| `tests/final_outcome_simulation.cjs` | 3758 | `59cb717aad4342cfb070854d5dff3da059365592e0f9649158f8102dff4971ed` |
| `tests/host_tools_regression.cjs` | 35285 | `e0d9bd1d10e710ffd127ccf61b7c5052e403ed8222a353001a9f03ee09aa1efc` |
| `tests/transport_compat_smoke.cjs` | 3275 | `f673f042802324c518bb17175ed07237ee30adfdf2ef8233f46845141188a7f9` |
| `tests/websocket_relay_smoke.cjs` | 6305 | `06b5550bf6a078c864dc140b4c46b8b676b03efdd922930622d76c610c805928` |
| `transport.js` | 9716 | `b1b983ab235cb8114c1f88513776c6c219c8375e232f52fdc1cde2b1052f3272` |
