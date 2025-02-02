# E2E testing

As of today, only IOS is supported via Detox.

## IOS

### Requirements

* [Wix AppleSimulatorUtils](https://github.com/wix/AppleSimulatorUtils)
* [ios-sim](https://www.npmjs.com/package/ios-sim)
* a running instance of [io-dev-api-server
](https://github.com/pagopa/io-dev-api-server) at `http://127.0.0.1:3000` (default config)

### Running

Please note that as of now only the `ios.sim.release` configuration is setup and available
 because is the one we run on the CI.

Since Detox is installed as an NPM package, you can run every command using `yarn detox _args_`.

Preparing a build to test:

```
yarn detox build --configuration ios.sim.release
```

Launching the test suite:

```
yarn detox test --configuration ios.sim.release
```

Please look at [CircleCI config](./circleci/config.yml) for more options and to see how the
 different parts interact.

## Android

This part is still missing, contributions are welcome!
