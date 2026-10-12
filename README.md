# Homepage project (number two)

This is a small project I made so my new tab page is a bit more customised. It's a Firefox extension that replaces the new tab page, and a bunch of API keys let it show me issues and PRs from github, my calendar, some news RSS feeds, the weather and a nice wallpaper.

It's ridiculous but I like it so I'm checking it in so I can set it up again easily elsewhere. If someone else uses any of this, you're welcome.

* Weather is from https://pirate-weather.apiable.io/
* Rss2json is from https://rss2json.com/
* Google API used for the calendar, logging in through Firefox's identity API
* Github GraphQL API for issues and PRs
* Bookmark cards are the Firefox Bookmarks Toolbar
* Wallpaper is the Bing image of the day, loaded straight from Bing

It was originally a website served locally on Windows (with Windows services for the webserver, bookmark sync and wallpaper download); that version is in the git history before the Angular 22 upgrade.

## Screenshot

![image](https://github.com/dylandhall/homepage-two/assets/13939961/e9e66bf5-bd5d-415b-a2dc-c0c6cc9fbb99)

Note I've since added times in many timezones, not pictured.

## Building

```
npm install
npm run build
```

This builds the Angular app and packages it as `dist/home-two.xpi`. `npm run lint:extension` checks it with Mozilla's linter.

## Installing in Firefox

The extension isn't signed or listed on addons.mozilla.org, so there are two ways to load it.

**To try it out:** open `about:debugging#/runtime/this-firefox`, choose "Load Temporary Add-on…" and pick `dist/home-two/browser/manifest.json`. It stays until Firefox restarts (and its saved settings go with it).

**To keep it:** Arch and CachyOS build Firefox to accept unsigned extensions installed in its application folder, so

```
npm run install-extension
```

copies the xpi to `/usr/lib/firefox/browser/extensions/` (with sudo) and sets `extensions.startupScanScopes` so Firefox picks up installs and updates on restart. After a rebuild, run it again and restart Firefox. To remove it, delete `/usr/lib/firefox/browser/extensions/home-two@dylandhall.github.io.xpi` and `/usr/lib/firefox/browser/defaults/preferences/home-two.js`.

Firefox asks once whether to keep the new tab page the extension sets; keep it.

## Settings

On first run the page opens its settings: paste your config JSON, in the shape of `src/config-example.json`. It's stored in the extension's storage in your Firefox profile, never in the package. The ⚙ button at the end of the bookmarks reopens it.

* `githubQuery.githubToken` needs a token that can read the repo's issues and PRs. The issues and PRs shown are set by the GraphQL query in `src/app/github-constants.ts`.
* For the calendar, add the redirect URI shown on the settings page (`https://<id>.extensions.allizom.org/`, fixed for this extension) as an authorised redirect URI on your Google OAuth client.

## Development

Run `npm start` for a dev server on `http://localhost:4200/`. Outside the extension there's no bookmarks or identity API and Bing's JSON isn't readable, so it uses the example `src/bookmarks.json` and `src/wallpaper.jpg`, loads settings from `src/config.json` (gitignored, copy the example) and Google login is disabled.

`npm run watch` builds the extension unminified into `dist/home-two/browser` on every change, including `src/config.json` so a temporary add-on picks up your settings; use "Reload" in `about:debugging` to load the changes.

Run `npm test` to run the unit tests with [Vitest](https://vitest.dev). The script disables Node's built-in `localStorage` (Node 25+), which otherwise hides jsdom's.

This project uses [Angular](https://angular.dev) 22.
