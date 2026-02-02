// services/api/src/temporalClient.ts

import { Connection, Client } from "@temporalio/client";

let client: Client | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (client) return client;

  const connection = await Connection.connect({
    address: "localhost:7233",
  });

  client = new Client({ connection });

  return client;
}
