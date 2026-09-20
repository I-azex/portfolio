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

Сайт статический и лежит в репозитории **https://github.com/I-azex/portfolio**.
Основной адрес: **https://i-azex.github.io/portfolio/**

### GitHub Pages (основной хостинг)

Pages уже включён: **Settings → Pages → Deploy from a branch → `main` / `root`**.
Обновление сайта — обычный `git push` в `main`, GitHub пересоберёт его за минуту.

```powershell
git add -A
git commit -m "что изменилось"
git push
```

Сайт живёт в подпапке `/portfolio/`, и это работает, потому что все пути к ассетам
относительные (`assets/css/...`). Абсолютных путей, кроме мета-тегов, в проекте нет.

### Подключение своего домена

Когда домен куплен, порядок такой:

1. **Создайте в корне репозитория файл `CNAME`** без расширения, с одной строкой —
   вашим доменом:

   ```
   kozhuharev.ru
   ```

   Именно так GitHub понимает, какой домен обслуживать. `www.kozhuharev.ru`
   сюда писать не нужно — редирект с `www` настраивается на шаге 3.

2. **Пропишите DNS у регистратора.** Для домена второго уровня (`kozhuharev.ru`)
   нужны A-записи на все четыре адреса GitHub:

   | Тип | Имя | Значение |
   |---|---|---|
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | CNAME | `www` | `i-azex.github.io.` |

   Для поддомена (`portfolio.kozhuharev.ru`) достаточно одной записи:
   CNAME `portfolio` → `i-azex.github.io.`

3. **Включите HTTPS.** После того как DNS разойдётся (от 10 минут до нескольких
   часов), в **Settings → Pages** появится галочка **Enforce HTTPS** — поставьте её.
   Сертификат GitHub выпустит сам и бесплатно.

4. **Замените адрес в `index.html`** — 5 мест: `canonical`, `og:url`, `og:image`,
   `twitter:image` и `"url"` в JSON-LD. Без этого поисковики и мессенджеры будут
   ходить на старый адрес.

Проверить, что домен подхватился, можно так:

```powershell
gh api repos/I-azex/portfolio/pages --jq '{url: .html_url, cname: .cname, https: .https_enforced, status: .status}'
```

### Cloudflare Pages (зеркало)

Ранее сайт был развёрнут на Cloudflare Pages — `rk-portfolio-gz6.pages.dev`.
Может пригодиться как резервная копия, если один из адресов окажется недоступен.

Одна тонкость: **`.assetsignore` wrangler CLI не учитывает**, поэтому деплоить
нужно из отдельной папки, иначе в публикацию попадут `tools/`, `README.md`
и скриншоты:

```powershell
Remove-Item -Recurse -Force tools\.deploy -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force tools\.deploy\assets | Out-Null
Copy-Item index.html tools\.deploy
Copy-Item -Recurse assets\css tools\.deploy\assets\css
Copy-Item -Recurse assets\js  tools\.deploy\assets\js
npx wrangler pages deploy tools\.deploy --project-name rk-portfolio --commit-dirty=true
```

**Важно про доступ из России.** Домен `pages.dev` у части российских провайдеров
блокируется по SNI: TCP-соединение проходит, а TLS-рукопожатие с этим именем
сбрасывается. Симптом — «не удаётся открыть сайт», хотя деплой успешен. Домены
`github.io`, `workers.dev` и `netlify.app` при этом открываются, а `vercel.com`
нет. Именно поэтому основной хостинг — GitHub Pages.

**Netlify** — `netlify deploy --prod --dir .` либо drag & drop папки `.deploy`
из блока выше.

Вне зависимости от площадки стоит добавить `assets/img/og-preview.png` (1200×630) —
сейчас файла нет, и превью в мессенджерах не подтянется. См. `SETUP.md`.
