# Сайт-портфолио — Кожухарёв Роман

Одностраничный сайт-портфолио разработчика игр. Чистый HTML5 + CSS3 + Vanilla JS (ES2019),
без сборки, без фреймворков и без npm-зависимостей. Единственная внешняя загрузка —
шрифты Google Fonts.

```
index.html                  разметка, SEO-мета, SVG-библиотека логотипа
assets/css/01-tokens.css    дизайн-токены: цвет, типографика, ритм, кривые анимаций
assets/css/02-base.css      сброс, типографические примитивы, фоновые слои
assets/css/03-logo.css      монограмма RK и её 5 состояний
assets/css/04-components.css шапка, hero, панели, карточки, состав команды, контакты
assets/css/05-effects.css   canvas-слои, tilt, ripple, reduced-motion, печать
assets/css/06-responsive.css адаптив: 1200 / 1024 / 768 / 480
assets/js/app.js            всё поведение сайта
tools/                      только для разработки, на прод не влияет
```

## Локальный запуск

Достаточно открыть `index.html` — сайт работает и по `file://` (скрипт подключён
без `type="module"` именно для этого). Если нужен http-сервер:

```powershell
python -m http.server 8080     # затем http://localhost:8080
```

## Что реализовано

**Логотип.** Монограмма «RK» собрана из четырёх смысловых слоёв: буква-стержень R,
буква K, угловые скобки кода `< >` и пиксельная сетка с элементами геймпада
(регистровое ядро + четыре кнопки по углам). Пять состояний переключаются атрибутом
`data-logo-state`: `assembly`, `idle`, `hover`, `loading`, `success`.

```js
// переключить состояние из консоли браузера или из своего кода
window.dispatchEvent(new CustomEvent('rk:logo', { detail: 'success' }));
```

В hero-секции есть пульт «rk.monogram.state» — он переключает состояния вживую,
чтобы анимацию было видно без перезагрузки.

**Остальное по чек-листу:** прелоадер с прогрессом и журналом загрузки; частицы,
звёзды, spotlight и сетка на фоне; кастомный курсор (точка + запаздывающее кольцо);
3D-наклон карточек; прогресс-бары навыков и счётчики по Intersection Observer;
кнопка «наверх» с процентом прокрутки; копирование контактов по клику; мобильное меню.

## Производительность и доступность

- Частицы и звёзды рисуются на `<canvas>`; на тач-устройствах частота ограничена
  30 к/с, при скрытой вкладке цикл останавливается, DPR ограничен 2.
- `prefers-reduced-motion: reduce` полностью отключает анимации: контент показывается
  сразу, прогресс-бары заполнены, canvas-слои и курсор убраны.
- Есть `:focus-visible`, skip-link, `aria-*` у меню и переключателей, `aria-live`
  для подсказок. При отключённом JS `<noscript>`-стили снимают блокировку и
  показывают весь контент.
- Печать (`Ctrl+P`) оформлена отдельными правилами — портфолио можно сохранить в PDF.

## Деплой

Сайт статический, пути относительные, поэтому подходит любой из вариантов.
Сейчас он уже развёрнут на Cloudflare Pages: **https://rk-portfolio-gz6.pages.dev/**

### Cloudflare Pages (текущий хостинг)

Деплоить нужно из отдельной папки, иначе в публикацию попадут `tools/`, `README.md`
и скриншоты — `.assetsignore` wrangler CLI не учитывает. Собирается это так:

```powershell
# 1. собрать чистую папку только с публичными файлами
Remove-Item -Recurse -Force tools\.deploy -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force tools\.deploy\assets | Out-Null
Copy-Item index.html tools\.deploy
Copy-Item -Recurse assets\css tools\.deploy\assets\css
Copy-Item -Recurse assets\js  tools\.deploy\assets\js

# 2. залить
npx wrangler pages deploy tools\.deploy --project-name rk-portfolio --commit-dirty=true
```

Адрес проекта — `rk-portfolio-gz6.pages.dev`: Cloudflare добавил к имени проекта
случайный суффикс `-gz6`, потому что короткое имя `rk-portfolio` уже занято
другим пользователем. Это нормально и не мешает работе.

**Важно про доступ из России.** Домен `pages.dev` у части российских провайдеров
блокируется по SNI: TCP-соединение проходит, а TLS-рукопожатие с этим именем
сбрасывается. Симптом — «не удаётся открыть сайт», хотя деплой успешен.
Домен `workers.dev`, `github.io` и `netlify.app` при этом открываются.
Поэтому для показа работ из РФ нужен либо VPN, либо свой домен, либо GitHub Pages.

### GitHub Pages (рекомендуется как основной для РФ)

```powershell
git init
git add .
git commit -m "Портфолио: первая версия"
git branch -M main
git remote add origin https://github.com/I-azex/<репозиторий>.git
git push -u origin main
```

Затем в репозитории: **Settings → Pages → Source: Deploy from a branch →
Branch: `main` / `root`**. Сайт откроется на `https://i-azex.github.io/<репозиторий>/`.
Если репозиторий назвать `I-azex.github.io`, адрес будет без подпапки.

После смены адреса не забудьте заменить `rk-portfolio-gz6.pages.dev` в `index.html`
(5 мест: `canonical`, `og:url`, `og:image`, `twitter:image`, JSON-LD).

**Netlify** — `netlify deploy --prod --dir .` либо drag & drop папки `.deploy`
из шага 1 выше.

Вне зависимости от площадки стоит добавить `assets/img/og-preview.png` (1200×630) —
сейчас файла нет, и превью в мессенджерах не подтянется. См. `SETUP.md`.
