import test from "node:test";
import assert from "node:assert/strict";
import aiRecognitionPkg from "../extension/src/ai-recognition.js";

const {
  AI_OVERRIDE_CONFIDENCE,
  AI_SUPPLEMENT_CONFIDENCE,
  CONFIG_STORAGE_KEY,
  FIELD_MAPPING_STORAGE_KEY,
  buildChatCompletionsRequest,
  classifyFormFields,
  getPublicConfig,
  normalizeAiRecognitionConfig,
  parseChatCompletionsResponse
} = aiRecognitionPkg;

test("ai recognition config only accepts https base urls and hides api keys for display", () => {
  assert.equal(CONFIG_STORAGE_KEY, "ctdp.aiRecognitionConfig.v1");
  assert.equal(FIELD_MAPPING_STORAGE_KEY, "ctdp.aiFieldMappings.v1");
  assert.equal(AI_OVERRIDE_CONFIDENCE, 0.82);
  assert.equal(AI_SUPPLEMENT_CONFIDENCE, 0.65);

  assert.throws(() => normalizeAiRecognitionConfig({ baseUrl: "http://example.com/v1" }), /HTTPS/);

  const config = normalizeAiRecognitionConfig({
    enabled: true,
    baseUrl: " https://api.example.com/v1/ ",
    apiKey: "sk-secret",
    model: " compatible-model ",
    permissionGranted: true
  });

  assert.deepEqual(config, {
    enabled: true,
    baseUrl: "https://api.example.com/v1",
    apiKey: "sk-secret",
    model: "compatible-model",
    origin: "https://api.example.com",
    permissionGranted: true
  });
  assert.deepEqual(getPublicConfig(config), {
    enabled: true,
    baseUrl: "https://api.example.com/v1",
    hasApiKey: true,
    model: "compatible-model",
    origin: "https://api.example.com",
    permissionGranted: true
  });
});

test("chat completions request targets the compatible endpoint and asks for json output", () => {
  const request = buildChatCompletionsRequest(
    normalizeAiRecognitionConfig({
      enabled: true,
      baseUrl: "https://api.example.com/v1",
      apiKey: "sk-secret",
      model: "compatible-model"
    }),
    {
      fields: [
        {
          fingerprint: "field-1",
          tag: "input",
          type: "text",
          placeholder: "联系电话",
          localFieldKey: "mobile"
        }
      ],
      allowedFieldKeys: ["mobile", "email"]
    },
    { includeResponseFormat: true }
  );

  assert.equal(request.url, "https://api.example.com/v1/chat/completions");
  assert.equal(request.headers.Authorization, "Bearer sk-secret");
  assert.equal(request.body.model, "compatible-model");
  assert.equal(request.body.temperature, 0);
  assert.deepEqual(request.body.response_format, { type: "json_object" });
  assert.match(request.body.messages[0].content, /字段分类器/);
  assert.match(request.body.messages[1].content, /field-1/);
});

test("chat completions response parser accepts only supported fields with numeric confidence", () => {
  const parsed = parseChatCompletionsResponse(
    {
      choices: [
        {
          message: {
            content: JSON.stringify({
              fields: [
                { fingerprint: "a", fieldKey: "mobile", confidence: 0.91 },
                { fingerprint: "b", fieldKey: "unsupported", confidence: 1 },
                { fingerprint: "c", fieldKey: "email", confidence: "0.7" }
              ]
            })
          }
        }
      ]
    },
    ["mobile", "email"]
  );

  assert.deepEqual(parsed, [
    { fingerprint: "a", fieldKey: "mobile", confidence: 0.91 },
    { fingerprint: "c", fieldKey: "email", confidence: 0.7 }
  ]);
});

test("classification retries without response_format when a compatible service rejects json mode", async () => {
  const requests = [];
  const result = await classifyFormFields({
    config: normalizeAiRecognitionConfig({
      enabled: true,
      baseUrl: "https://api.example.com/v1",
      apiKey: "sk-secret",
      model: "compatible-model",
      permissionGranted: true
    }),
    fetchFn(url, options) {
      requests.push({ url, body: JSON.parse(options.body) });
      if (requests.length === 1) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json() {
            return Promise.resolve({ error: "response_format unsupported" });
          }
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json() {
          return Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    fields: [{ fingerprint: "field-1", fieldKey: "mobile", confidence: 0.93 }]
                  })
                }
              }
            ]
          });
        }
      });
    },
    snapshot: {
      fields: [{ fingerprint: "field-1", placeholder: "联系电话" }],
      allowedFieldKeys: ["mobile"]
    },
    supportedFieldKeys: ["mobile"]
  });

  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].body.response_format, { type: "json_object" });
  assert.equal(Object.prototype.hasOwnProperty.call(requests[1].body, "response_format"), false);
  assert.deepEqual(result.fields, [{ fingerprint: "field-1", fieldKey: "mobile", confidence: 0.93 }]);
});
