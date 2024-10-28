import Vapi from "@vapi-ai/web";
import { envConfig } from "../../config/env.config";
console.log("config", envConfig.vapi.token);

export const vapi = new Vapi(envConfig.vapi.token);
