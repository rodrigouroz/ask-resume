import { z } from "zod";
import { createGroundedModel, type GroundedInferenceStage } from "./groundedModel";
import type { GroundedModel } from "./model";
import { ANSWER_MODEL, VERIFICATION_MODEL } from "./modelConfig";

const MODERATION = {
  model: "omni-moderation-latest",
  policy: { input: { mode: "block" }, output: { mode: "block" } },
} as const;

type ParsedResponse = { output_parsed?: unknown };
export type ResponsesClient = {
  parse(input: Record<string, unknown>): Promise<ParsedResponse>;
};

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const responsePayloadSchema = z.object({
  output_text: z.string().optional(),
  output: z
    .array(
      z.object({
        content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
      }),
    )
    .optional(),
});

function jsonSchemaFormat(schema: z.ZodType, name: string) {
  return {
    type: "json_schema",
    name,
    strict: true,
    schema: z.toJSONSchema(schema),
  } as const;
}

function createOpenAIResponsesClient(apiKey: string, fetcher: Fetcher = fetch): ResponsesClient {
  return {
    async parse(input) {
      const response = await fetcher("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error(`OpenAI Responses API failed with ${response.status}`);
      }

      const payload = responsePayloadSchema.parse(await response.json());
      const outputText =
        payload.output_text ??
        payload.output
          ?.flatMap(({ content = [] }) => content)
          .find(({ type, text }) => type === "output_text" && text)?.text;
      if (!outputText) throw new Error("OpenAI Responses API returned no output text");

      return { output_parsed: JSON.parse(outputText) as unknown };
    },
  };
}

function safetyParameter(safetyIdentifier: string | undefined): Record<string, string> {
  return safetyIdentifier ? { safety_identifier: safetyIdentifier } : {};
}

const stageConfiguration = {
  resolution: {
    model: ANSWER_MODEL,
    maxOutputTokens: 120,
    formatName: "resolved_question",
  },
  draft: {
    model: ANSWER_MODEL,
    maxOutputTokens: 700,
    formatName: "grounded_answer",
  },
  verification: {
    model: VERIFICATION_MODEL,
    maxOutputTokens: 300,
    formatName: "grounding_verification",
  },
} satisfies Record<
  GroundedInferenceStage,
  { model: string; maxOutputTokens: number; formatName: string }
>;

export function createOpenAIModel(
  apiKey: string,
  responses: ResponsesClient = createOpenAIResponsesClient(apiKey),
): GroundedModel {
  return createGroundedModel({
    safetyIdentifierSupport: "provider",
    async run(request) {
      const configuration = stageConfiguration[request.stage];
      const response = await responses.parse({
        model: configuration.model,
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: configuration.maxOutputTokens,
        moderation: MODERATION,
        instructions: request.instructions,
        input: request.context ? `${request.context}\n\n${request.input}` : request.input,
        text: { format: jsonSchemaFormat(request.schema, configuration.formatName) },
        ...safetyParameter(request.safetyIdentifier),
      });

      return { value: request.schema.parse(response.output_parsed) };
    },
  });
}
