import { agent } from "./receptionist.js";

export function createTestReceptionist() {
  return agent({
    id: "sample-business",
    business: {
      name: "Sample Business",
      description: "A local service business.",
      language: "en-US",
      timezone: "America/New_York",
      openingHours: {
        monday: ["08:00-12:00", "13:00-17:00"],
      },
    },
    greeting: "Hello, how may I help you?",
    collect: {
      callerName: {
        label: "Caller name",
        description: "The caller's full name",
        type: "string",
        required: true,
      },
      urgent: {
        label: "Urgent request",
        description: "Whether the request is urgent",
        type: "boolean",
        required: false,
      },
      quantity: {
        label: "Quantity",
        description: "The requested quantity",
        type: "number",
        required: false,
      },
    },
    rules: ["Do not quote a price."],
  });
}
