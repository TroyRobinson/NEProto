import { init } from '@instantdb/react';
import schema from '../instant.schema';

// InstantDB is optional in some deployment environments. If the app id is
// missing we export `null` so callers can gracefully fall back to direct API
// calls without throwing during module import.
const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID;

const db = APP_ID ? init({ appId: APP_ID, schema }) : null;

export default db;