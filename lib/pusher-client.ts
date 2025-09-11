import Pusher from "pusher-js";

let _client: Pusher | null = null;

export function getPusherClient() {
  if (_client) return _client;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) {
    throw new Error("Missing Pusher NEXT_PUBLIC_ env variables");
  }
  _client = new Pusher(key, {
    cluster,
    channelAuthorization: {
      endpoint: "/api/pusher/auth",
      transport: "ajax",
    },
  });
  return _client;
}

