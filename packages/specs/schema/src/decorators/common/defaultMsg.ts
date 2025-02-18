import {useDecorators} from "@tsed/core";
import {ErrorMsg} from "./errorMsg";

/**
 * Set default error message.
 *
 * ## Example
 *
 * ```typescript
 * @DefaultMessage("foo should be a string")
 * class Model {
 *    property: number;
 * }
 * ```
 *
 * Will produce:
 *
 * ```json
 * {
 *   "type": "object",
 *   "properties": {
 *     "property": "number"
 *   }
 *   "errorMessage": {
 *     "_": "foo should be a string"
 *   }
 * }
 * ```
 *
 * @decorator
 * @validation
 * @swagger
 * @schema
 */
export function DefaultMsg(message: string): ClassDecorator {
  return useDecorators(ErrorMsg({_: message}));
}
