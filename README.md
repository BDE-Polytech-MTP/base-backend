# Base backend

![build](https://github.com/BDE-Polytech-MTP/base-backend/workflows/build/badge.svg)
[![codecov](https://codecov.io/gh/BDE-Polytech-MTP/base-backend/branch/master/graph/badge.svg)](https://codecov.io/gh/BDE-Polytech-MTP/base-backend)

This repository contains a part of the backend used for the network website. It's platform/framework agnostic and then can be used
to deploy on any PaaS.

## Use

To use this library, just implement services interfaces. Then instanciate controllers providing your implementations in their constructors. Finally,
just relay requests coming from your routes to the controllers.

Currently, there are 4 services to implement :
* `BDEService`
* `UsersService`
* `EventsService`
* `BookingsService`

Their implementation is made as simple as possible as their role is more or less just to make data persist across requests (using a database, for example).

## Test

This project contains test, just run `npm run test` to run them.

## Contribute

To contribute to the project, you can fork it and make PR. If your pull requests are satisfying you'll be able to pretend to become
a direct contributor of the project (be able to push on the repository directly).