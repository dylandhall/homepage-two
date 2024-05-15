# Homepage project (number two)

This is a small project I made so my new tab page is a bit more customised. I have updated my chrome flags (chrome://flags/#custom-ntp) to let me set the new tab page, a tiny webserver running as a windows service to hand it to me, and a bunch of API keys to let it show me issues and PRs from github, some news RSS feeds, the weather and a nice wallpaper.

It's ridiculous but I like it so I'm checking it in so I can set it up again easily elsewhere. If someone else uses any of this, you're welcome.

* Weather is from https://pirate-weather.apiable.io/
* Rss2json is from https://rss2json.com/
* Google API used for the calendar
* Github graphQl via Apollo used for their API
* Bing images downloaded by a script running as a task
* Webserver is a wrapper I wrote running as a service for miniserve, see MiniserveWrapper folder
* CopyFiles.ps1 runs as part of the NPM build to make updating easy, update as you see fit

## Screenshot

![image](https://github.com/dylandhall/homepage-two/assets/13939961/e9e66bf5-bd5d-415b-a2dc-c0c6cc9fbb99)


## HomeTwo

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.2.6.

### Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

### Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

### Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

### Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
