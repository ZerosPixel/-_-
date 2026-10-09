# Манифест файлов — Бункер v10

Архив v10 содержит исходный проект, полное ТЗ, историю изменений и новый WebSocket backend. Контрольные суммы SHA-256 проверяют целостность поставки. Сам манифест не хешируется, чтобы избежать рекурсии.

## Локальные проверки

- `node --check app.js`, `node --check transport.js`, `node --check server.js` — успешно.
- `node tests/host_tools_regression.cjs` — **41/41**.
- `python tests/browser_regression.py` — **30/30**.
- `node tests/final_outcome_simulation.cjs` — **500** сценариев smoke-проверки.
- `node tests/websocket_relay_smoke.cjs` — успешно: регистрация хоста/клиента, вход, доставка в обе стороны, heartbeat и закрытие.
- `node tests/transport_compat_smoke.cjs` — успешно: адаптер транспорта работает поверх локального WebSocket-сервера.
- Публичный Render-деплой и тесты на физических телефонах/ПК ещё не выполнялись.

## Список файлов и SHA-256

| Путь | Байты | SHA-256 |
|---|---:|---|
| `.gitignore` | 29 | `0e16dd934cfcf1fbf7aa6a93de188cac61fec2d75416fbb0b842f3d82bc2cb98` |
| `AUDIT_REPORT.md` | 28871 | `5bd1187667b76fa49d65e7bcf2a06c64bff9f6876dd60ea921c12e5003726ed2` |
| `BUNKER_CHANGELOG.md` | 24210 | `18b2005d828f195d19912ce400dc3a53109853f16934d3e19e1ec7826b4c05ed` |
| `PROJECT_STATUS.md` | 31033 | `17cf0bee2b5adbbdc473ff7e8820e555e5fc857caba1c65cf29a9179589f4131` |
| `README.md` | 30039 | `3f41fab70aba215e1fda1427307c1836b23ce40dd4dee88e1746fa27a763a336` |
| `REQUIREMENTS_TRACEABILITY.md` | 48126 | `9b2bd181388890a20f5e16dbf43a7bad18bafc3cf3c28b1c7da4215f18b60e08` |
| `app.js` | 276275 | `53da1a184018c9f812ca0e0cf9c1a913d4eff0ce02336dd9bb50395b07188e99` |
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
| `index.html` | 1002 | `98eeea8ae66d4aae15e135b60d4126ef29e8e2c86a9f3b6926c43a67d1f5c7f6` |
| `package.json` | 416 | `084a8a47b3cf4b4d47c04364ca5aefe072bf3200a03cc05a89df8bbcc5e9ea7a` |
| `render.yaml` | 168 | `7148893faff09a0f32d11398741be6558b6059117fa1730c5be453c75a51ab25` |
| `server.js` | 12952 | `8655f4c69d84dfdda0eedbf06d544848a9dd81260a79816ef6e1e9875d4223aa` |
| `styles.css` | 38862 | `b2bff9453d9e1a975685a4d14a01bc708d3c4a329bd4d29b8c1f29c7e520d79f` |
| `tests/FINAL_OUTCOME_SIMULATION.json` | 423 | `51478092d6d9e21d2463182079a43ed1d90af2f1224bd901541916feea445806` |
| `tests/HOST_TOOLS_RESULTS.json` | 5023 | `eb04e1a91478a49c076ab7e7f33b7d512848f0201fac5b7411d575c0c5d6aadb` |
| `tests/NETWORK_SMOKE_RESULTS.json` | 931 | `7aa1e5590c884de0991a105b552ad3cfc859049e357ed4b6cf53061d9ae46029` |
| `tests/TEST_RESULTS.json` | 15670 | `489b6a92cbbefec202f10a8ef6ef10324a289f86015ef6ee380aa6e206358f22` |
| `tests/browser_regression.py` | 32390 | `e8aec027dd736e431e3d59fb2986aa2e8127edbb8089b4ef7b4b639241412e7a` |
| `tests/final_outcome_simulation.cjs` | 3758 | `59cb717aad4342cfb070854d5dff3da059365592e0f9649158f8102dff4971ed` |
| `tests/host_tools_regression.cjs` | 35285 | `500173b98cdbf8385674cab032206506d319b57bd4c2f7060cb21059e1855baa` |
| `tests/transport_compat_smoke.cjs` | 2828 | `3a3cab31d037e11c24667ed038d5784f5a4f073a3ca1e3414e77eaaf5bf35623` |
| `tests/websocket_relay_smoke.cjs` | 4058 | `1f67a80c7f0070c09180a45f962741aee2860fc70dc70a713cd7b70d187716d8` |
| `transport.js` | 8711 | `b0bfc28243b5f5321e9e9fc05bc20595d2be376de76496a20f432fecff6f2946` |
