import {JsonLazyRef} from "../domain/JsonLazyRef";
import {JsonSchema} from "../domain/JsonSchema";
import {JsonSchemaOptions} from "../interfaces/JsonSchemaOptions";
import {execMapper, registerJsonSchemaMapper} from "../registries/JsonSchemaMapperContainer";
import {mapGenericsOptions} from "../utils/generics";
import {toRef} from "../utils/ref";

export function anyMapper(input: any, options: JsonSchemaOptions = {}): any {
  if (typeof input !== "object" || input === null) {
    return input;
  }

  if (input instanceof JsonLazyRef) {
    return execMapper("lazyRef", input, options);
  }

  if (input instanceof JsonSchema && input.get("enum") instanceof JsonSchema) {
    const enumSchema: JsonSchema = input.get("enum");

    return toRef(enumSchema, enumSchema.toJSON(options), options);
  }

  if ("toJSON" in input) {
    const schema = input.toJSON(mapGenericsOptions(options));

    return input.canRef ? toRef(input, schema, options) : schema;
  }

  return execMapper("object", input, options);
}

registerJsonSchemaMapper("any", anyMapper);
