# money-pane

Solid-compatible personal finance insight applet for solid-panes framework

You can build with `npm install && npm run build && cd dist && npx serve`.
You can debug with VSCode + Chrome (see `.vscode/launch.json`).

## Import transaction statements from your bank

Currently supported csv-file formats:
* [ASN Bank, The Netherlands](https://webcache.googleusercontent.com/search?q=cache:x3PuJKDKj2cJ:https://www.asnbank.nl/web/file%3Fuuid%3Dfc28db9c-d91e-4a2c-bd3a-30cffb057e8b%26owner%3D6916ad14-918d-4ea8-80ac-f71f0ff1928e%26contentid%3D852+&cd=1&hl=en&ct=clnk&gl=nl)
* Please add yours!

## Deploy stand-alone

You can deploy this code as a stand-alone Solid app.
The way to do that depends on your html-app hosting provider.
For instance, to deploy to https://solid-money.5apps.com/ you would:

```sh
git checkout deploy # this branch has dist/ commented out in .gitignore
git merge master
npm ci
npm run build
git add dist/
git commit --no-verify -am"build"
git remote add 5apps git@5apps.com:michiel_solid-money.git
git push 5apps deploy:master
```