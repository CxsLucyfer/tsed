import {isBoolean, isFunction, isNumber, isStream, isString, Type} from "@tsed/core";
import {Injectable, InjectorService, ProviderScope} from "@tsed/di";
import {ConverterService, EndpointMetadata, HandlerMetadata, HandlerType, IPipe, ParamMetadata, ParamTypes} from "../../mvc";
import {HandlerContext, HandlerContextStatus} from "../domain/HandlerContext";
import {PlatformContext} from "../domain/PlatformContext";
import {ParamValidationError} from "../errors/ParamValidationError";
import {PlatformRouteWithoutHandlers} from "../interfaces/PlatformRouterMethods";
import {createHandlerMetadata} from "../utils/createHandlerMetadata";
import {renderView} from "../utils/renderView";
import {setResponseContentType} from "../utils/setResponseContentType";
import {setResponseHeaders} from "../utils/setResponseHeaders";

export interface OnRequestOptions {
  $ctx: PlatformContext;
  metadata: HandlerMetadata;
  next?: any;
  err?: any;

  [key: string]: any;
}

function shouldBeSerialized(data: any) {
  return !(isStream(data) || shouldBeSent(data) || data === undefined);
}

function shouldBeSent(data: any) {
  return Buffer.isBuffer(data) || isBoolean(data) || isNumber(data) || isString(data) || data === null;
}

/**
 * Platform Handler abstraction layer. Wrap original class method to a pure platform handler (Express, Koa, etc...).
 * @platform
 */
@Injectable({
  scope: ProviderScope.SINGLETON
})
export class PlatformHandler {
  constructor(protected injector: InjectorService) {}

  /**
   * Create a native middleware based on the given metadata and return an instance of HandlerContext
   * @param input
   * @param options
   */
  createHandler(input: EndpointMetadata | HandlerMetadata | any, options: PlatformRouteWithoutHandlers = {}) {
    const metadata: HandlerMetadata = this.createHandlerMetadata(input, options);

    this.sortPipes(metadata);

    return this.createRawHandler(metadata);
  }

  /**
   * Create handler metadata
   * @param obj
   * @param routeOptions
   */
  public createHandlerMetadata(obj: any | EndpointMetadata, routeOptions: PlatformRouteWithoutHandlers = {}): HandlerMetadata {
    return createHandlerMetadata(this.injector, obj, routeOptions);
  }

  /**
   * Get argument from parameter medata or handler context.
   * @param type
   * @param h
   */
  protected getArg(type: ParamTypes | string, h: HandlerContext) {
    const {
      $ctx,
      $ctx: {request, response}
    } = h;

    switch (type) {
      case ParamTypes.FILES:
        return h.getRequest().files;

      case ParamTypes.RESPONSE:
        return h.getResponse();

      case ParamTypes.REQUEST:
        return h.getRequest();

      case ParamTypes.NEXT_FN:
        return h.next;

      case ParamTypes.ERR:
        return h.err;

      case ParamTypes.$CTX: // tsed ctx
        return $ctx;

      case ParamTypes.ENDPOINT_INFO:
        return $ctx.endpoint;

      case ParamTypes.RESPONSE_DATA:
        return $ctx.data;

      case ParamTypes.BODY:
        return request.body;

      case ParamTypes.QUERY:
        return request.query;

      case ParamTypes.PATH:
        return request.params;

      case ParamTypes.HEADER:
        return request.headers;

      case ParamTypes.COOKIES:
        return request.cookies;

      case ParamTypes.SESSION:
        return request.session;

      case ParamTypes.LOCALS:
        return response.locals;

      default:
        return h.request;
    }
  }

  /**
   * Call handler when a request his handle
   * @param requestOptions
   */
  protected async onRequest(requestOptions: OnRequestOptions): Promise<any> {
    const {metadata, $ctx, err} = requestOptions;

    try {
      const h = new HandlerContext({
        $ctx,
        metadata,
        args: [],
        err
      });

      h.args = await this.getArgs(h);

      await h.callHandler();

      if (h.status === HandlerContextStatus.RESOLVED) {
        // Can be canceled by the handler itself
        return await this.onSuccess($ctx.data, requestOptions);
      }
    } catch (er) {
      return this.onError(er, requestOptions);
    }
  }

  protected onError(er: unknown, requestOptions: OnRequestOptions) {
    const {next} = requestOptions;

    if (!next) {
      throw er;
    }

    return next(er);
  }

  /**
   * Manage success scenario
   * @param data
   * @param requestOptions
   * @protected
   */
  protected async onSuccess(data: any, requestOptions: OnRequestOptions) {
    const {metadata, $ctx, next} = requestOptions;

    // set headers each times that an endpoint is called
    if (metadata.type === HandlerType.ENDPOINT) {
      this.setHeaders($ctx);
    }

    // call returned middleware
    if (isFunction(data) && !isStream(data)) {
      return this.callReturnedMiddleware(data, $ctx, next);
    }

    if (metadata.isFinal() && !$ctx.response.isDone()) {
      return this.flush(data, $ctx);
    }

    return !$ctx.response.isDone() && next && next();
  }

  /**
   * Call the returned middleware by the handler.
   * @param middleware
   * @param ctx
   * @param next
   * @protected
   */
  protected callReturnedMiddleware(middleware: any, ctx: PlatformContext, next: any) {
    return middleware(ctx.getRequest(), ctx.getResponse(), next);
  }

  /**
   * Send the response to the consumer.
   * @param data
   * @param ctx
   * @protected
   */
  protected async flush(data: any, ctx: PlatformContext) {
    const {response, endpoint} = ctx;

    if (endpoint.view) {
      data = await this.render(data, ctx);
    } else if (shouldBeSerialized(data)) {
      data = this.injector.get<ConverterService>(ConverterService)!.serialize(data, {type: endpoint.type});
    }

    this.setContentType(data, ctx);

    response.body(data);
  }

  /**
   * Set the right content type from the current endpoint
   * @param data
   * @param ctx
   * @protected
   */
  protected setContentType(data: any, ctx: PlatformContext) {
    return setResponseContentType(data, ctx);
  }

  /**
   * Render the view if the endpoint has a configured view.
   * @param data
   * @param ctx
   * @protected
   */
  protected async render(data: any, ctx: PlatformContext) {
    return renderView(data, ctx);
  }

  /**
   * create Raw handler
   * @param metadata
   */
  protected createRawHandler(metadata: HandlerMetadata): Function {
    switch (metadata.type) {
      case HandlerType.CUSTOM:
        return (ctx: PlatformContext) => this.onRequest({metadata, $ctx: ctx});
      case HandlerType.RAW_ERR_FN:
      case HandlerType.RAW_FN:
        return metadata.handler;

      default:
      case HandlerType.ENDPOINT:
      case HandlerType.MIDDLEWARE:
        return (request: any, response: any, next: any) => this.onRequest({$ctx: request.$ctx, next, metadata});
    }
  }

  /**
   * Set response headers
   * @param ctx
   * @protected
   */
  protected setHeaders(ctx: PlatformContext) {
    return setResponseHeaders(ctx);
  }

  /**
   * Return arguments to call handler
   * @param h
   */
  private async getArgs(h: HandlerContext) {
    const {
      metadata: {parameters}
    } = h;

    return Promise.all(parameters.map((param) => this.mapArg(param, h)));
  }

  /**
   * Sort pipes before calling it
   * @param metadata
   */
  private sortPipes(metadata: HandlerMetadata) {
    if (!metadata.injectable) {
      return;
    }

    const get = (pipe: Type<any>) => {
      return this.injector.getProvider(pipe)!.priority || 0;
    };

    metadata.parameters.forEach((param: ParamMetadata) => {
      return (param.pipes = param.pipes.sort((p1: Type<any>, p2: Type<any>) => {
        return get(p1) < get(p2) ? -1 : get(p1) > get(p2) ? 1 : 0;
      }));
    });
  }

  /**
   * Map argument by calling pipe.
   * @param metadata
   * @param h
   */
  private async mapArg(metadata: ParamMetadata, h: HandlerContext) {
    const {injector} = h;
    const value = this.getArg(metadata.paramType, h);

    // istanbul ignore next
    const handleError = async (cb: Function) => {
      try {
        return await cb();
      } catch (er) {
        throw ParamValidationError.from(metadata, er);
      }
    };

    return metadata.pipes.reduce(async (value, pipe) => {
      value = await value;

      return handleError(() => injector.get<IPipe>(pipe)!.transform(value, metadata));
    }, value);
  }
}
