import type {
  CDATANode,
  CommentNode,
  DoctypeNode,
  DocumentNode,
  ElementNode,
  SerializedNode,
  TextNode,
} from "../types/dom.js";
import { SERIALIZED_NODE_TYPES } from "../types/dom.js";
import type { EventType } from "../types/event.js";
import { EVENT_TYPES } from "../types/event.js";
import type {
  ConsoleEventData,
  CustomEventData,
  ErrorEventData,
  FullSnapshotEventData,
  InputEventData,
  JsonValue,
  MetaEventData,
  MouseInteractionEventData,
  MouseMoveEventData,
  MutationEventData,
  NetworkEventData,
  RewindEvent,
  ScrollEventData,
  ViewportSize,
} from "../types/events.js";
import {
  CONSOLE_LEVELS,
  ERROR_KINDS,
  MOUSE_INTERACTIONS,
} from "../types/events.js";

/**
 * One problem found while reading an untrusted value as an event.
 * `path` is empty when the value itself is the problem.
 */
export interface ParseIssue {
  /** Dotted path, with `[index]` for arrays. Example: `data.adds[0].id`. */
  path: string;
  /** What is wrong at {@link path}. */
  message: string;
}

/**
 * A successful parse or the first failure.
 * `parseEvent` returns this instead of throwing.
 */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: ParseIssue };

/**
 * How deep a DOM or JSON tree may go before it is rejected.
 * Deep enough for a real page, shallow enough that a hostile payload
 * cannot overflow the stack.
 */
const MAX_DEPTH = 256;

const ENVELOPE_KEYS = ["type", "seq", "timestamp", "data"] as const;

interface Context {
  stack: WeakSet<object>;
}

/**
 * Parses an unknown value as a session event.
 * Returns the first problem as a path and a message instead of throwing.
 */
export function parseEvent(input: unknown): Result<RewindEvent> {
  try {
    return parseEventValue(input);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "validation failed";
    return failure("", message);
  }
}

function parseEventValue(input: unknown): Result<RewindEvent> {
  const ctx: Context = { stack: new WeakSet() };
  return withRecord(ctx, input, "", (record) => {
    const type = oneOf(record.type, EVENT_TYPES, "type");
    if (!type.ok) {
      return type;
    }
    const seq = parseFiniteNumber(record.seq, "seq");
    if (!seq.ok) {
      return seq;
    }
    const timestamp = parseFiniteNumber(record.timestamp, "timestamp");
    if (!timestamp.ok) {
      return timestamp;
    }
    const event = parseTyped(
      ctx,
      type.value,
      seq.value,
      timestamp.value,
      record.data,
    );
    if (!event.ok) {
      return event;
    }
    const extra = unknownFields(record, ENVELOPE_KEYS, "");
    if (!extra.ok) {
      return extra;
    }
    return event;
  });
}

function parseTyped(
  ctx: Context,
  type: EventType,
  seq: number,
  timestamp: number,
  data: unknown,
): Result<RewindEvent> {
  switch (type) {
    case "meta": {
      const parsed = parseMeta(ctx, data, "data");
      if (!parsed.ok) {
        return parsed;
      }
      return success({ type, seq, timestamp, data: parsed.value });
    }
    case "full_snapshot": {
      const parsed = parseFullSnapshot(ctx, data, "data");
      if (!parsed.ok) {
        return parsed;
      }
      return success({ type, seq, timestamp, data: parsed.value });
    }
    case "mutation": {
      const parsed = parseMutation(ctx, data, "data");
      if (!parsed.ok) {
        return parsed;
      }
      return success({ type, seq, timestamp, data: parsed.value });
    }
    case "mouse_move": {
      const parsed = parseMouseMove(ctx, data, "data");
      if (!parsed.ok) {
        return parsed;
      }
      return success({ type, seq, timestamp, data: parsed.value });
    }
    case "mouse_interaction": {
      const parsed = parseMouseInteraction(ctx, data, "data");
      if (!parsed.ok) {
        return parsed;
      }
      return success({ type, seq, timestamp, data: parsed.value });
    }
    case "scroll": {
      const parsed = parseScroll(ctx, data, "data");
      if (!parsed.ok) {
        return parsed;
      }
      return success({ type, seq, timestamp, data: parsed.value });
    }
    case "input": {
      const parsed = parseInput(ctx, data, "data");
      if (!parsed.ok) {
        return parsed;
      }
      return success({ type, seq, timestamp, data: parsed.value });
    }
    case "viewport_resize": {
      const parsed = parseViewport(ctx, data, "data");
      if (!parsed.ok) {
        return parsed;
      }
      return success({ type, seq, timestamp, data: parsed.value });
    }
    case "network": {
      const parsed = parseNetwork(ctx, data, "data");
      if (!parsed.ok) {
        return parsed;
      }
      return success({ type, seq, timestamp, data: parsed.value });
    }
    case "console": {
      const parsed = parseConsole(ctx, data, "data");
      if (!parsed.ok) {
        return parsed;
      }
      return success({ type, seq, timestamp, data: parsed.value });
    }
    case "error": {
      const parsed = parseErrorEvent(ctx, data, "data");
      if (!parsed.ok) {
        return parsed;
      }
      return success({ type, seq, timestamp, data: parsed.value });
    }
    case "custom": {
      const parsed = parseCustom(ctx, data, "data");
      if (!parsed.ok) {
        return parsed;
      }
      return success({ type, seq, timestamp, data: parsed.value });
    }
  }
}

function parseMeta(
  ctx: Context,
  value: unknown,
  path: string,
): Result<MetaEventData> {
  return withRecord(ctx, value, path, (record) => {
    const version = parseFiniteNumber(record.version, field(path, "version"));
    if (!version.ok) {
      return version;
    }
    const sessionId = parseString(record.sessionId, field(path, "sessionId"));
    if (!sessionId.ok) {
      return sessionId;
    }
    const startTime = parseFiniteNumber(
      record.startTime,
      field(path, "startTime"),
    );
    if (!startTime.ok) {
      return startTime;
    }
    const url = parseString(record.url, field(path, "url"));
    if (!url.ok) {
      return url;
    }
    const userAgent = parseString(record.userAgent, field(path, "userAgent"));
    if (!userAgent.ok) {
      return userAgent;
    }
    const viewport = parseViewport(
      ctx,
      record.viewport,
      field(path, "viewport"),
    );
    if (!viewport.ok) {
      return viewport;
    }
    const extra = unknownFields(
      record,
      ["version", "sessionId", "startTime", "url", "userAgent", "viewport"],
      path,
    );
    if (!extra.ok) {
      return extra;
    }
    return success({
      version: version.value,
      sessionId: sessionId.value,
      startTime: startTime.value,
      url: url.value,
      userAgent: userAgent.value,
      viewport: viewport.value,
    });
  });
}

function parseFullSnapshot(
  ctx: Context,
  value: unknown,
  path: string,
): Result<FullSnapshotEventData> {
  return withRecord(ctx, value, path, (record) => {
    const nodePath = field(path, "node");
    const node = parseNode(ctx, record.node, nodePath, 1);
    if (!node.ok) {
      return node;
    }
    if (node.value.type !== "Document") {
      return failure(field(nodePath, "type"), "expected Document");
    }
    const extra = unknownFields(record, ["node"], path);
    if (!extra.ok) {
      return extra;
    }
    return success({ node: node.value });
  });
}

function parseMutation(
  ctx: Context,
  value: unknown,
  path: string,
): Result<MutationEventData> {
  return withRecord(ctx, value, path, (record) => {
    const adds = parseList(record.adds, field(path, "adds"), (item, itemPath) =>
      parseMutationAdd(ctx, item, itemPath),
    );
    if (!adds.ok) {
      return adds;
    }
    const removes = parseList(
      record.removes,
      field(path, "removes"),
      (item, itemPath) => parseMutationRemove(ctx, item, itemPath),
    );
    if (!removes.ok) {
      return removes;
    }
    const attributes = parseList(
      record.attributes,
      field(path, "attributes"),
      (item, itemPath) => parseMutationAttribute(ctx, item, itemPath),
    );
    if (!attributes.ok) {
      return attributes;
    }
    const texts = parseList(
      record.texts,
      field(path, "texts"),
      (item, itemPath) => parseMutationText(ctx, item, itemPath),
    );
    if (!texts.ok) {
      return texts;
    }
    const extra = unknownFields(
      record,
      ["adds", "removes", "attributes", "texts"],
      path,
    );
    if (!extra.ok) {
      return extra;
    }
    return success({
      adds: adds.value,
      removes: removes.value,
      attributes: attributes.value,
      texts: texts.value,
    });
  });
}

function parseMutationAdd(
  ctx: Context,
  value: unknown,
  path: string,
): Result<MutationEventData["adds"][number]> {
  return withRecord(ctx, value, path, (record) => {
    const parentId = parseFiniteNumber(
      record.parentId,
      field(path, "parentId"),
    );
    if (!parentId.ok) {
      return parentId;
    }
    const nextId = parseNumberOrNull(record.nextId, field(path, "nextId"));
    if (!nextId.ok) {
      return nextId;
    }
    const node = parseNode(ctx, record.node, field(path, "node"), 1);
    if (!node.ok) {
      return node;
    }
    const extra = unknownFields(record, ["parentId", "nextId", "node"], path);
    if (!extra.ok) {
      return extra;
    }
    return success({
      parentId: parentId.value,
      nextId: nextId.value,
      node: node.value,
    });
  });
}

function parseMutationRemove(
  ctx: Context,
  value: unknown,
  path: string,
): Result<MutationEventData["removes"][number]> {
  return withRecord(ctx, value, path, (record) => {
    const parentId = parseFiniteNumber(
      record.parentId,
      field(path, "parentId"),
    );
    if (!parentId.ok) {
      return parentId;
    }
    const id = parseFiniteNumber(record.id, field(path, "id"));
    if (!id.ok) {
      return id;
    }
    const extra = unknownFields(record, ["parentId", "id"], path);
    if (!extra.ok) {
      return extra;
    }
    return success({ parentId: parentId.value, id: id.value });
  });
}

function parseMutationAttribute(
  ctx: Context,
  value: unknown,
  path: string,
): Result<MutationEventData["attributes"][number]> {
  return withRecord(ctx, value, path, (record) => {
    const id = parseFiniteNumber(record.id, field(path, "id"));
    if (!id.ok) {
      return id;
    }
    const name = parseString(record.name, field(path, "name"));
    if (!name.ok) {
      return name;
    }
    const attributeValue = parseMutationAttributeValue(
      record.value,
      field(path, "value"),
    );
    if (!attributeValue.ok) {
      return attributeValue;
    }
    const extra = unknownFields(record, ["id", "name", "value"], path);
    if (!extra.ok) {
      return extra;
    }
    return success({
      id: id.value,
      name: name.value,
      value: attributeValue.value,
    });
  });
}

function parseMutationText(
  ctx: Context,
  value: unknown,
  path: string,
): Result<MutationEventData["texts"][number]> {
  return withRecord(ctx, value, path, (record) => {
    const id = parseFiniteNumber(record.id, field(path, "id"));
    if (!id.ok) {
      return id;
    }
    const text = parseString(record.value, field(path, "value"));
    if (!text.ok) {
      return text;
    }
    const extra = unknownFields(record, ["id", "value"], path);
    if (!extra.ok) {
      return extra;
    }
    return success({ id: id.value, value: text.value });
  });
}

function parseMouseMove(
  ctx: Context,
  value: unknown,
  path: string,
): Result<MouseMoveEventData> {
  return withRecord(ctx, value, path, (record) => {
    const positions = parseList(
      record.positions,
      field(path, "positions"),
      (item, itemPath) => parseMousePosition(ctx, item, itemPath),
    );
    if (!positions.ok) {
      return positions;
    }
    const extra = unknownFields(record, ["positions"], path);
    if (!extra.ok) {
      return extra;
    }
    return success({ positions: positions.value });
  });
}

function parseMousePosition(
  ctx: Context,
  value: unknown,
  path: string,
): Result<MouseMoveEventData["positions"][number]> {
  return withRecord(ctx, value, path, (record) => {
    const x = parseFiniteNumber(record.x, field(path, "x"));
    if (!x.ok) {
      return x;
    }
    const y = parseFiniteNumber(record.y, field(path, "y"));
    if (!y.ok) {
      return y;
    }
    const timeOffset = parseFiniteNumber(
      record.timeOffset,
      field(path, "timeOffset"),
    );
    if (!timeOffset.ok) {
      return timeOffset;
    }
    const extra = unknownFields(record, ["x", "y", "timeOffset"], path);
    if (!extra.ok) {
      return extra;
    }
    return success({
      x: x.value,
      y: y.value,
      timeOffset: timeOffset.value,
    });
  });
}

function parseMouseInteraction(
  ctx: Context,
  value: unknown,
  path: string,
): Result<MouseInteractionEventData> {
  return withRecord(ctx, value, path, (record) => {
    const interaction = oneOf(
      record.interaction,
      MOUSE_INTERACTIONS,
      field(path, "interaction"),
    );
    if (!interaction.ok) {
      return interaction;
    }
    const id = parseFiniteNumber(record.id, field(path, "id"));
    if (!id.ok) {
      return id;
    }
    const x = parseFiniteNumber(record.x, field(path, "x"));
    if (!x.ok) {
      return x;
    }
    const y = parseFiniteNumber(record.y, field(path, "y"));
    if (!y.ok) {
      return y;
    }
    const extra = unknownFields(record, ["interaction", "id", "x", "y"], path);
    if (!extra.ok) {
      return extra;
    }
    return success({
      interaction: interaction.value,
      id: id.value,
      x: x.value,
      y: y.value,
    });
  });
}

function parseScroll(
  ctx: Context,
  value: unknown,
  path: string,
): Result<ScrollEventData> {
  return withRecord(ctx, value, path, (record) => {
    const id = parseFiniteNumber(record.id, field(path, "id"));
    if (!id.ok) {
      return id;
    }
    const x = parseFiniteNumber(record.x, field(path, "x"));
    if (!x.ok) {
      return x;
    }
    const y = parseFiniteNumber(record.y, field(path, "y"));
    if (!y.ok) {
      return y;
    }
    const extra = unknownFields(record, ["id", "x", "y"], path);
    if (!extra.ok) {
      return extra;
    }
    return success({ id: id.value, x: x.value, y: y.value });
  });
}

function parseInput(
  ctx: Context,
  value: unknown,
  path: string,
): Result<InputEventData> {
  return withRecord(ctx, value, path, (record): Result<InputEventData> => {
    const id = parseFiniteNumber(record.id, field(path, "id"));
    if (!id.ok) {
      return id;
    }
    const kind = oneOf(
      record.kind,
      ["value", "checked"] as const,
      field(path, "kind"),
    );
    if (!kind.ok) {
      return kind;
    }
    const masked = parseBoolean(record.masked, field(path, "masked"));
    if (!masked.ok) {
      return masked;
    }
    if (kind.value === "value") {
      const text = parseString(record.value, field(path, "value"));
      if (!text.ok) {
        return text;
      }
      const extra = unknownFields(
        record,
        ["id", "kind", "value", "masked"],
        path,
      );
      if (!extra.ok) {
        return extra;
      }
      return success({
        id: id.value,
        kind: "value",
        value: text.value,
        masked: masked.value,
      });
    }
    const checked = parseBoolean(record.checked, field(path, "checked"));
    if (!checked.ok) {
      return checked;
    }
    const extra = unknownFields(
      record,
      ["id", "kind", "checked", "masked"],
      path,
    );
    if (!extra.ok) {
      return extra;
    }
    return success({
      id: id.value,
      kind: "checked",
      checked: checked.value,
      masked: masked.value,
    });
  });
}

function parseNetwork(
  ctx: Context,
  value: unknown,
  path: string,
): Result<NetworkEventData> {
  return withRecord(ctx, value, path, (record) => {
    const requestId = parseString(record.requestId, field(path, "requestId"));
    if (!requestId.ok) {
      return requestId;
    }
    const method = parseString(record.method, field(path, "method"));
    if (!method.ok) {
      return method;
    }
    const url = parseString(record.url, field(path, "url"));
    if (!url.ok) {
      return url;
    }
    const status = parseNumberOrNull(record.status, field(path, "status"));
    if (!status.ok) {
      return status;
    }
    const start = parseFiniteNumber(record.start, field(path, "start"));
    if (!start.ok) {
      return start;
    }
    const end = parseNumberOrNull(record.end, field(path, "end"));
    if (!end.ok) {
      return end;
    }
    const requestSize = parseNumberOrNull(
      record.requestSize,
      field(path, "requestSize"),
    );
    if (!requestSize.ok) {
      return requestSize;
    }
    const responseSize = parseNumberOrNull(
      record.responseSize,
      field(path, "responseSize"),
    );
    if (!responseSize.ok) {
      return responseSize;
    }
    const error = parseStringOrNull(record.error, field(path, "error"));
    if (!error.ok) {
      return error;
    }
    const extra = unknownFields(
      record,
      [
        "requestId",
        "method",
        "url",
        "status",
        "start",
        "end",
        "requestSize",
        "responseSize",
        "error",
      ],
      path,
    );
    if (!extra.ok) {
      return extra;
    }
    return success({
      requestId: requestId.value,
      method: method.value,
      url: url.value,
      status: status.value,
      start: start.value,
      end: end.value,
      requestSize: requestSize.value,
      responseSize: responseSize.value,
      error: error.value,
    });
  });
}

function parseConsole(
  ctx: Context,
  value: unknown,
  path: string,
): Result<ConsoleEventData> {
  return withRecord(ctx, value, path, (record) => {
    const level = oneOf(record.level, CONSOLE_LEVELS, field(path, "level"));
    if (!level.ok) {
      return level;
    }
    const args = parseJsonArray(ctx, record.args, field(path, "args"), 1);
    if (!args.ok) {
      return args;
    }
    const stack = parseStringOrNull(record.stack, field(path, "stack"));
    if (!stack.ok) {
      return stack;
    }
    const extra = unknownFields(record, ["level", "args", "stack"], path);
    if (!extra.ok) {
      return extra;
    }
    return success({
      level: level.value,
      args: args.value,
      stack: stack.value,
    });
  });
}

function parseErrorEvent(
  ctx: Context,
  value: unknown,
  path: string,
): Result<ErrorEventData> {
  return withRecord(ctx, value, path, (record) => {
    const message = parseString(record.message, field(path, "message"));
    if (!message.ok) {
      return message;
    }
    const stack = parseStringOrNull(record.stack, field(path, "stack"));
    if (!stack.ok) {
      return stack;
    }
    const source = parseStringOrNull(record.source, field(path, "source"));
    if (!source.ok) {
      return source;
    }
    const line = parseNumberOrNull(record.line, field(path, "line"));
    if (!line.ok) {
      return line;
    }
    const column = parseNumberOrNull(record.column, field(path, "column"));
    if (!column.ok) {
      return column;
    }
    const kind = oneOf(record.kind, ERROR_KINDS, field(path, "kind"));
    if (!kind.ok) {
      return kind;
    }
    const extra = unknownFields(
      record,
      ["message", "stack", "source", "line", "column", "kind"],
      path,
    );
    if (!extra.ok) {
      return extra;
    }
    return success({
      message: message.value,
      stack: stack.value,
      source: source.value,
      line: line.value,
      column: column.value,
      kind: kind.value,
    });
  });
}

function parseCustom(
  ctx: Context,
  value: unknown,
  path: string,
): Result<CustomEventData> {
  return withRecord(ctx, value, path, (record) => {
    const tag = parseString(record.tag, field(path, "tag"));
    if (!tag.ok) {
      return tag;
    }
    const payload = parseJson(ctx, record.payload, field(path, "payload"), 1);
    if (!payload.ok) {
      return payload;
    }
    const extra = unknownFields(record, ["tag", "payload"], path);
    if (!extra.ok) {
      return extra;
    }
    return success({ tag: tag.value, payload: payload.value });
  });
}

function parseViewport(
  ctx: Context,
  value: unknown,
  path: string,
): Result<ViewportSize> {
  return withRecord(ctx, value, path, (record) => {
    const width = parseFiniteNumber(record.width, field(path, "width"));
    if (!width.ok) {
      return width;
    }
    const height = parseFiniteNumber(record.height, field(path, "height"));
    if (!height.ok) {
      return height;
    }
    const extra = unknownFields(record, ["width", "height"], path);
    if (!extra.ok) {
      return extra;
    }
    return success({ width: width.value, height: height.value });
  });
}

function parseNode(
  ctx: Context,
  value: unknown,
  path: string,
  depth: number,
): Result<SerializedNode> {
  if (depth > MAX_DEPTH) {
    return failure(path, "exceeded maximum nesting depth");
  }
  return withRecord(ctx, value, path, (record): Result<SerializedNode> => {
    const type = oneOf(record.type, SERIALIZED_NODE_TYPES, field(path, "type"));
    if (!type.ok) {
      return type;
    }
    const id = parseFiniteNumber(record.id, field(path, "id"));
    if (!id.ok) {
      return id;
    }
    switch (type.value) {
      case "Document":
        return parseDocument(ctx, record, path, depth, id.value);
      case "Doctype":
        return parseDoctype(record, path, id.value);
      case "Element":
        return parseElement(ctx, record, path, depth, id.value);
      case "Text":
        return parseTextLike(record, path, id.value, "Text");
      case "Comment":
        return parseTextLike(record, path, id.value, "Comment");
      case "CDATA":
        return parseTextLike(record, path, id.value, "CDATA");
    }
  });
}

function parseDocument(
  ctx: Context,
  record: Record<string, unknown>,
  path: string,
  depth: number,
  id: number,
): Result<DocumentNode> {
  const childNodes = parseChildNodes(
    ctx,
    record.childNodes,
    field(path, "childNodes"),
    depth,
  );
  if (!childNodes.ok) {
    return childNodes;
  }
  const extra = unknownFields(record, ["id", "type", "childNodes"], path);
  if (!extra.ok) {
    return extra;
  }
  return success({ id, type: "Document", childNodes: childNodes.value });
}

function parseDoctype(
  record: Record<string, unknown>,
  path: string,
  id: number,
): Result<DoctypeNode> {
  const name = parseString(record.name, field(path, "name"));
  if (!name.ok) {
    return name;
  }
  const publicId = parseString(record.publicId, field(path, "publicId"));
  if (!publicId.ok) {
    return publicId;
  }
  const systemId = parseString(record.systemId, field(path, "systemId"));
  if (!systemId.ok) {
    return systemId;
  }
  const extra = unknownFields(
    record,
    ["id", "type", "name", "publicId", "systemId"],
    path,
  );
  if (!extra.ok) {
    return extra;
  }
  return success({
    id,
    type: "Doctype",
    name: name.value,
    publicId: publicId.value,
    systemId: systemId.value,
  });
}

function parseElement(
  ctx: Context,
  record: Record<string, unknown>,
  path: string,
  depth: number,
  id: number,
): Result<ElementNode> {
  const tagName = parseString(record.tagName, field(path, "tagName"));
  if (!tagName.ok) {
    return tagName;
  }
  const attributes = parseAttributes(
    ctx,
    record.attributes,
    field(path, "attributes"),
  );
  if (!attributes.ok) {
    return attributes;
  }
  const childNodes = parseChildNodes(
    ctx,
    record.childNodes,
    field(path, "childNodes"),
    depth,
  );
  if (!childNodes.ok) {
    return childNodes;
  }
  let isSVG: boolean | undefined;
  if ("isSVG" in record) {
    const parsed = parseBoolean(record.isSVG, field(path, "isSVG"));
    if (!parsed.ok) {
      return parsed;
    }
    isSVG = parsed.value;
  }
  let isShadowRoot: boolean | undefined;
  if ("isShadowRoot" in record) {
    const parsed = parseBoolean(
      record.isShadowRoot,
      field(path, "isShadowRoot"),
    );
    if (!parsed.ok) {
      return parsed;
    }
    isShadowRoot = parsed.value;
  }
  const extra = unknownFields(
    record,
    [
      "id",
      "type",
      "tagName",
      "attributes",
      "childNodes",
      "isSVG",
      "isShadowRoot",
    ],
    path,
  );
  if (!extra.ok) {
    return extra;
  }
  const element: ElementNode = {
    id,
    type: "Element",
    tagName: tagName.value,
    attributes: attributes.value,
    childNodes: childNodes.value,
  };
  if (isSVG !== undefined) {
    element.isSVG = isSVG;
  }
  if (isShadowRoot !== undefined) {
    element.isShadowRoot = isShadowRoot;
  }
  return success(element);
}

function parseTextLike(
  record: Record<string, unknown>,
  path: string,
  id: number,
  type: "Text" | "Comment" | "CDATA",
): Result<TextNode | CommentNode | CDATANode> {
  const textContent = parseString(
    record.textContent,
    field(path, "textContent"),
  );
  if (!textContent.ok) {
    return textContent;
  }
  const extra = unknownFields(record, ["id", "type", "textContent"], path);
  if (!extra.ok) {
    return extra;
  }
  if (type === "Text") {
    return success({ id, type, textContent: textContent.value });
  }
  if (type === "Comment") {
    return success({ id, type, textContent: textContent.value });
  }
  return success({ id, type, textContent: textContent.value });
}

function parseChildNodes(
  ctx: Context,
  value: unknown,
  path: string,
  depth: number,
): Result<SerializedNode[]> {
  if (!Array.isArray(value)) {
    return failure(path, "expected an array");
  }
  return withTracked(ctx, value, path, () => {
    const nodes: SerializedNode[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const node = parseNode(ctx, value[index], at(path, index), depth + 1);
      if (!node.ok) {
        return node;
      }
      nodes.push(node.value);
    }
    return success(nodes);
  });
}

function parseAttributes(
  ctx: Context,
  value: unknown,
  path: string,
): Result<Record<string, string | true>> {
  return withRecord(ctx, value, path, (record) => {
    const attributes: Record<string, string | true> = {};
    for (const key of Object.keys(record)) {
      const item = record[key];
      const itemPath = field(path, key);
      if (item === true || typeof item === "string") {
        attributes[key] = item;
        continue;
      }
      return failure(itemPath, "expected a string or true");
    }
    return success(attributes);
  });
}

function parseJson(
  ctx: Context,
  value: unknown,
  path: string,
  depth: number,
): Result<JsonValue> {
  if (depth > MAX_DEPTH) {
    return failure(path, "exceeded maximum nesting depth");
  }
  if (value === null) {
    return success(null);
  }
  if (typeof value === "string") {
    return success(value);
  }
  if (typeof value === "boolean") {
    return success(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return failure(path, "expected a finite number");
    }
    return success(value);
  }
  if (Array.isArray(value)) {
    return parseJsonArray(ctx, value, path, depth);
  }
  if (!isPlainObject(value)) {
    return failure(path, "expected a JSON value");
  }
  return withTracked(ctx, value, path, () => {
    const output: { [key: string]: JsonValue } = {};
    for (const key of Object.keys(value)) {
      const item = parseJson(ctx, value[key], field(path, key), depth + 1);
      if (!item.ok) {
        return item;
      }
      output[key] = item.value;
    }
    return success(output);
  });
}

function parseJsonArray(
  ctx: Context,
  value: unknown,
  path: string,
  depth: number,
): Result<JsonValue[]> {
  if (!Array.isArray(value)) {
    return failure(path, "expected an array");
  }
  return withTracked(ctx, value, path, () => {
    const items: JsonValue[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const item = parseJson(ctx, value[index], at(path, index), depth + 1);
      if (!item.ok) {
        return item;
      }
      items.push(item.value);
    }
    return success(items);
  });
}

function parseList<T>(
  value: unknown,
  path: string,
  parseItem: (item: unknown, itemPath: string) => Result<T>,
): Result<T[]> {
  if (!Array.isArray(value)) {
    return failure(path, "expected an array");
  }
  const items: T[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = parseItem(value[index], at(path, index));
    if (!item.ok) {
      return item;
    }
    items.push(item.value);
  }
  return success(items);
}

function parseMutationAttributeValue(
  value: unknown,
  path: string,
): Result<string | true | null> {
  if (value === null || value === true || typeof value === "string") {
    return success(value);
  }
  return failure(path, "expected a string, true, or null");
}

function parseFiniteNumber(value: unknown, path: string): Result<number> {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return failure(path, "expected a finite number");
  }
  return success(value);
}

function parseNumberOrNull(
  value: unknown,
  path: string,
): Result<number | null> {
  if (value === null) {
    return success(null);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return failure(path, "expected a finite number or null");
  }
  return success(value);
}

function parseString(value: unknown, path: string): Result<string> {
  if (typeof value !== "string") {
    return failure(path, "expected a string");
  }
  return success(value);
}

function parseStringOrNull(
  value: unknown,
  path: string,
): Result<string | null> {
  if (value === null) {
    return success(null);
  }
  if (typeof value !== "string") {
    return failure(path, "expected a string or null");
  }
  return success(value);
}

function parseBoolean(value: unknown, path: string): Result<boolean> {
  if (typeof value !== "boolean") {
    return failure(path, "expected a boolean");
  }
  return success(value);
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
): Result<T> {
  if (typeof value === "string") {
    for (const item of allowed) {
      if (item === value) {
        return success(item);
      }
    }
  }
  return failure(path, `expected one of ${allowed.join(", ")}`);
}

function unknownFields(
  record: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
): Result<true> {
  const allow = new Set<string>(allowed);
  for (const key of Object.keys(record)) {
    if (!allow.has(key)) {
      return failure(field(path, key), `unknown field ${key}`);
    }
  }
  return success(true);
}

function withRecord<T>(
  ctx: Context,
  value: unknown,
  path: string,
  parse: (record: Record<string, unknown>) => Result<T>,
): Result<T> {
  if (!isPlainObject(value)) {
    return failure(path, "expected an object");
  }
  return withTracked(ctx, value, path, () => parse(value));
}

function withTracked<T>(
  ctx: Context,
  value: object,
  path: string,
  parse: () => Result<T>,
): Result<T> {
  if (ctx.stack.has(value)) {
    return failure(path, "circular value");
  }
  ctx.stack.add(value);
  const result = parse();
  ctx.stack.delete(value);
  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function field(path: string, key: string): string {
  return path.length === 0 ? key : `${path}.${key}`;
}

function at(path: string, index: number): string {
  return `${path}[${index}]`;
}

function success<T>(value: T): Result<T> {
  return { ok: true, value };
}

function failure(path: string, message: string): Result<never> {
  return { ok: false, error: { path, message } };
}
