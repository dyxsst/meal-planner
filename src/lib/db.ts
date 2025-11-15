import { init } from "@instantdb/react";
import { schema } from "./instantdb";

// Initialize Instantdb with the database ID from our resources
const APP_ID = "dbb03166-cb33-411a-abf6-8bb7c591235b";

export const db = init({ appId: APP_ID, schema });

export type { Schema } from "./instantdb";
