import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

// The codebase has hundreds of debug logs; keep warn/error but silence
// log/debug/info in production so the console stays clean for users.
if (environment.production) {
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
