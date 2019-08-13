# google-sheets-calendar-sync

Sync a [Google Sheets](https://www.google.com/sheets/about) spreadsheet with [Google Calendar](https://www.google.com/calendar) using [Google Apps Script](https://developers.google.com/apps-script).

## Getting Started

### Installing dependencies

```shell script
npm install
```

### clasp

This project uses [clasp](https://github.com/google/clasp) to deploy our code as a Google Apps Script project.

#### Setting up clasp

First, login:

```shell script
clasp login
```

Then enable the Google Apps Script API at https://script.google.com/home/usersettings

![Enabling Google Apps Script API](https://user-images.githubusercontent.com/744973/54870967-a9135780-4d6a-11e9-991c-9f57a508bdf0.gif)

#### Linking a Google Apps Script project

To use an existing Apps Script project:

```shell script
clasp clone ${SCRIPT_ID}
```

Or, create a new [container-bound script](https://developers.google.com/apps-script/guides/bound) attached to a Google Sheet which will act as the calendar source, and retrieve the script ID and use the above command.

### Building

```shell script
npm build:dev
```

### Deploying

```shell script
npm run deploy
```

## Technical Overview

### Build and toolchain

[At present](https://developers.google.com/apps-script/guides/services/#basic_javascript_features), Google Apps Script supports [JavaScript 1.6](https://developer.mozilla.org/en-US/docs/Web/JavaScript/New_in_JavaScript/1.6) with a handful of additions from [1.7](https://developer.mozilla.org/en-US/docs/Web/JavaScript/New_in_JavaScript/1.7) and [1.8](https://developer.mozilla.org/en-US/docs/Web/JavaScript/New_in_JavaScript/1.8).

In order to address the developmental shortcomings that arise from this limitation, this project utilizes a custom toolchain so we can develop in normal JavaScript.

#### Webpack

[Webpack](https://webpack.js.org) is used to build and bundle all resources into the [`build/`](build) directory.

The following directories are processed:

- [`src/`](src): Source code to be compiled
    - [`src/index.ts`](src/index.ts) is the entry point, and any symbols exported here are made available in the [global `this` scope](https://webpack.js.org/configuration/output/#outputlibrarytarget) of the resulting compiled JavaScript.
- [`static/`](static): Static resources to be copied as-is to the build directory

#### Babel

[Babel](https://babeljs.io) is used to transpile [TypeScript](https://www.typescriptlang.org) and other modern ES language features to Google Apps Script compatible JavaScript.

#### core-js

[core-js](https://github.com/zloirock/core-js) is [imported](src/index.ts) to polyfill modern ES library code.

#### clasp

[clasp](https://github.com/google/clasp) is configured to deploy the contents of the [build/](build) directory.

### Project layout

[`src/index.ts`](src/index.ts) defines the Google Apps Script [triggers](https://developers.google.com/apps-script/guides/triggers) to be run by exporting global functions with the functionality we want.

However, Webpack does not emit explicit global functions at the top level in the resulting compiled code, so these functions, though callable, are not detected by Google Apps Script, and therefore not installed as triggers.

To solve this, we define a static [`static/_.js`](static/_.js) which defines the triggers we want registered and which delegate to the real, intended functions exported in [`src/index.ts`](src/index.ts).
