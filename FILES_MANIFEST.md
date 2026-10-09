# Манифест файлов — Бункер v8

Архив содержит **26 файлов** (включая этот манифест). Ниже перечислены остальные файлы; строка манифеста не хешируется, чтобы избежать рекурсивного SHA-256.

## Проверки текущей сборки

- `node --check app.js` — успешно.
- `node tests/host_tools_regression.cjs` — **41/41 тестов**.
- `python tests/browser_regression.py` — **30/30 тестов** в Chromium/Playwright.
- `node tests/final_outcome_simulation.cjs` — 500 smoke-сценариев: 255 исходов с выживанием и 245 с гибелью; не является полной балансировкой.
- Реальные PeerJS/WebRTC-сессии на нескольких физических устройствах и публичное развёртывание не тестировались.

## Файлы и контрольные суммы SHA-256

| Путь | Размер, байт | SHA-256 |
|---|---:|---|
| `AUDIT_REPORT.md` | 27095 | `816da41f2858d6994e7ccb0d10ec5e5413224361b6ab63a02e45c557ee97470d` |
| `BUNKER_CHANGELOG.md` | 21350 | `a6be4de4beebe761cc33be388598f6d8182ca2b755bad42f22d8ced503f3066f` |
| `PROJECT_STATUS.md` | 28118 | `accf08275126953c7d1272580c12364deacbc1e24190770a78b6acc64a978d1e` |
| `README.md` | 25167 | `78553f32ad0c3595dc21cef8b44ecbd07df5886be75be082913f9e6f4cd59160` |
| `REQUIREMENTS_TRACEABILITY.md` | 46437 | `f8f3402f14f811dcc6909b4c665d8ebcf56f91c26cc029872c1feb7e264e6ba0` |
| `app.js` | 274330 | `ae87776cea25d76d1c11f7edb16f1b9a10b4d4a160f1edda3e986028eb653534` |
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
| `index.html` | 1020 | `8434ddda8f2bde49c79285d940353b111d69d2d61758d3b954862b442b73e938` |
| `styles.css` | 38862 | `b2bff9453d9e1a975685a4d14a01bc708d3c4a329bd4d29b8c1f29c7e520d79f` |
| `tests/FINAL_OUTCOME_SIMULATION.json` | 423 | `51478092d6d9e21d2463182079a43ed1d90af2f1224bd901541916feea445806` |
| `tests/HOST_TOOLS_RESULTS.json` | 5031 | `e209aef46b2aa028f0322ee33fc7e8fa121d1e7e068bfd05d7f8aacc1ff7070b` |
| `tests/TEST_RESULTS.json` | 15545 | `1d1fd8ab39978a7f7e8396b4a282f10ce682a2ff1c3c8bf0312b9a6ec4a47d56` |
| `tests/browser_regression.py` | 32390 | `e8aec027dd736e431e3d59fb2986aa2e8127edbb8089b4ef7b4b639241412e7a` |
| `tests/final_outcome_simulation.cjs` | 3758 | `59cb717aad4342cfb070854d5dff3da059365592e0f9649158f8102dff4971ed` |
| `tests/host_tools_regression.cjs` | 35015 | `f494f779f724e68b6b77d4ddfcc1ea95a36aad4adc44e64bdf5f88031bdf9226` |
