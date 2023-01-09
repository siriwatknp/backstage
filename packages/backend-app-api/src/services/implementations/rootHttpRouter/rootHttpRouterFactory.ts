/*
 * Copyright 2022 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  ConfigService,
  coreServices,
  createServiceFactory,
  LifecycleService,
  LoggerService,
} from '@backstage/backend-plugin-api';
import express, { RequestHandler, Express } from 'express';
import { MiddlewareFactory, startHttpServer } from '../../../http';
import { RestrictedIndexedRouter } from './RestrictedIndexedRouter';

/**
 * @public
 */
export interface RootHttpRouterConfigureOptions {
  app: Express;
  middleware: MiddlewareFactory;
  routes: RequestHandler;
  config: ConfigService;
  logger: LoggerService;
  lifecycle: LifecycleService;
}

/**
 * @public
 */
export type RootHttpRouterFactoryOptions = {
  /**
   * The path to forward all unmatched requests to. Defaults to '/api/app'
   */
  indexPath?: string | false;

  configure?(options: RootHttpRouterConfigureOptions): void;
};

function defaultConfigure({
  app,
  routes,
  middleware,
}: RootHttpRouterConfigureOptions) {
  app.use(middleware.helmet());
  app.use(middleware.cors());
  app.use(middleware.compression());
  app.use(middleware.logging());
  app.use(routes);
  app.use(middleware.notFound());
  app.use(middleware.error());
}

/** @public */
export const rootHttpRouterFactory = createServiceFactory({
  service: coreServices.rootHttpRouter,
  deps: {
    config: coreServices.config,
    logger: coreServices.rootLogger,
    lifecycle: coreServices.rootLifecycle,
  },
  async factory(
    { config, logger, lifecycle },
    {
      indexPath,
      configure = defaultConfigure,
    }: RootHttpRouterFactoryOptions = {},
  ) {
    const router = new RestrictedIndexedRouter(indexPath ?? '/api/app');

    const app = express();

    const middleware = MiddlewareFactory.create({ config, logger });

    configure({
      app,
      routes: router.handler(),
      middleware,
      config,
      logger,
      lifecycle,
    });

    await startHttpServer(app, { config, logger, lifecycle });

    return router;
  },
});
