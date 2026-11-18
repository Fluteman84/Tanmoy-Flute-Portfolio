/**
 * Standalone Zero-Dependency WebSocket Sync Relay Server
 * Musician's Sheet — Multi-Instrument Song Viewer & Live Synchronization System
 *
 * Runs locally for rehearsals or live performances across devices on the same Wi-Fi.
 * Implements RFC 6455 WebSocket framing using standard Node.js built-ins.
 *
 * Usage:
 *   node server/sync-server.mjs
 *   or: npm run sync-server
 */

import http from "node:http";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8765;
const DEFAULT_HOST = process.env.HOST || "0.0.0.0";
const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

export function createSyncServer() {
  // Active Sessions: Map<sessionCode, { masterDeviceId, state, clients: Map<deviceId, clientObj> }>
  const sessions = new Map();

  function getOrCreateSession(code) {
    const sessionCode = (code || "REHEARSAL").toUpperCase().trim();
    if (!sessions.has(sessionCode)) {
      sessions.set(sessionCode, {
        sessionCode,
        masterDeviceId: null,
        state: {
          status: "stopped",
          songId: "great-are-you-lord",
          scheduledStartTime: 0,
          pausePositionMs: 0,
          timelineAnchorTime: 0,
          countInBars: 1,
          activeOccurrenceId: "occ-1-prelude",
          bpm: 120,
          timeSignature: { numerator: 4, denominator: 4, pulseUnit: "quarter" },
          lastUpdated: Date.now(),
        },
        clients: new Map(),
      });
    }
    return sessions.get(sessionCode);
  }

  function broadcastRoster(session) {
    const roster = [];
    for (const client of session.clients.values()) {
      roster.push({
        deviceId: client.deviceId,
        name: client.name || "Musician",
        role: client.role,
        musicianFormat: client.musicianFormat,
        status: client.status || "synced",
        joinedAt: client.joinedAt,
      });
    }

    const payload = JSON.stringify({
      type: "roster_update",
      sessionCode: session.sessionCode,
      deviceCount: roster.length,
      masterDeviceId: session.masterDeviceId,
      devices: roster,
    });

    for (const client of session.clients.values()) {
      sendWsMessage(client.socket, payload);
    }
  }

  function sendWsMessage(socket, data) {
    if (!socket || socket.destroyed || !socket.writable) return;
    const payloadBuffer = Buffer.from(data, "utf8");
    const length = payloadBuffer.length;

    let header;
    if (length <= 125) {
      header = Buffer.from([0x81, length]);
    } else if (length <= 65535) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }

    try {
      socket.write(Buffer.concat([header, payloadBuffer]));
    } catch (err) {}
  }

  function parseWsFrames(buffer, onMessage) {
    let offset = 0;
    while (offset < buffer.length) {
      if (buffer.length - offset < 2) break;

      const firstByte = buffer[offset];
      const secondByte = buffer[offset + 1];
      const opcode = firstByte & 0x0f;
      const isMasked = (secondByte & 0x80) !== 0;
      let payloadLength = secondByte & 0x7f;
      let headerLength = 2;

      if (payloadLength === 126) {
        if (buffer.length - offset < 4) break;
        payloadLength = buffer.readUInt16BE(offset + 2);
        headerLength = 4;
      } else if (payloadLength === 127) {
        if (buffer.length - offset < 10) break;
        payloadLength = Number(buffer.readBigUInt64BE(offset + 2));
        headerLength = 10;
      }

      let maskKey = null;
      if (isMasked) {
        if (buffer.length - offset < headerLength + 4) break;
        maskKey = buffer.subarray(offset + headerLength, offset + headerLength + 4);
        headerLength += 4;
      }

      if (buffer.length - offset < headerLength + payloadLength) break;

      const rawPayload = buffer.subarray(offset + headerLength, offset + headerLength + payloadLength);
      const unmasked = Buffer.alloc(payloadLength);

      if (isMasked && maskKey) {
        for (let i = 0; i < payloadLength; i++) {
          unmasked[i] = rawPayload[i] ^ maskKey[i % 4];
        }
      } else {
        rawPayload.copy(unmasked);
      }

      offset += headerLength + payloadLength;

      if (opcode === 0x08) {
        return { handledBytes: offset, isClose: true };
      } else if (opcode === 0x01) {
        onMessage(unmasked.toString("utf8"));
      }
    }

    return { handledBytes: offset, isClose: false };
  }

  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");

    if (req.url === "/health" || req.url === "/") {
      const activeSessionsInfo = [];
      for (const [code, session] of sessions.entries()) {
        activeSessionsInfo.push({
          sessionCode: code,
          clients: session.clients.size,
          master: session.masterDeviceId,
          status: session.state.status,
        });
      }

      res.writeHead(200);
      res.end(
        JSON.stringify({
          status: "ok",
          service: "Musicians-Sheet-Live-Sync-Relay",
          activeSessions: sessions.size,
          sessions: activeSessionsInfo,
          serverTime: Date.now(),
        })
      );
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.on("upgrade", (req, socket, head) => {
    const secKey = req.headers["sec-websocket-key"];
    if (!secKey) {
      socket.destroy();
      return;
    }

    const hash = crypto.createHash("sha1").update(secKey + WS_GUID).digest("base44").replace(/[^a-zA-Z0-9+/=]/g, "") ||
      crypto.createHash("sha1").update(secKey + WS_GUID).digest("base64");
    const correctHash = crypto.createHash("sha1").update(secKey + WS_GUID).digest("base64");

    const headers = [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${correctHash}`,
      "\r\n",
    ];

    socket.write(headers.join("\r\n"));

    let currentClient = null;
    let currentSession = null;
    let buffer = Buffer.alloc(0);

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const { handledBytes, isClose } = parseWsFrames(buffer, (msgText) => {
        try {
          const msg = JSON.parse(msgText);
          handleClientMessage(socket, msg);
        } catch (err) {}
      });

      if (handledBytes > 0) {
        buffer = buffer.subarray(handledBytes);
      }
      if (isClose) {
        socket.end();
      }
    });

    function handleClientMessage(sock, msg) {
      if (!msg || !msg.type) return;

      if (msg.type === "join_session") {
        const { sessionCode, deviceId, role, musicianFormat, name } = msg;
        currentSession = getOrCreateSession(sessionCode);

        if (role === "master" || !currentSession.masterDeviceId) {
          if (role === "master") currentSession.masterDeviceId = deviceId;
        }

        currentClient = {
          deviceId,
          name: name || (role === "master" ? "Master Device" : `${musicianFormat || "Participant"}`),
          role: role === "master" ? "master" : "participant",
          musicianFormat: musicianFormat || "guitar",
          status: "synced",
          joinedAt: Date.now(),
          socket: sock,
        };

        currentSession.clients.set(deviceId, currentClient);

        sendWsMessage(
          sock,
          JSON.stringify({
            type: "session_joined",
            sessionCode: currentSession.sessionCode,
            deviceId,
            role: currentClient.role,
            masterDeviceId: currentSession.masterDeviceId,
            state: currentSession.state,
            serverTime: Date.now(),
          })
        );

        broadcastRoster(currentSession);
        return;
      }

      if (msg.type === "clock_ping") {
        sendWsMessage(
          sock,
          JSON.stringify({
            type: "clock_pong",
            clientSendTime: msg.clientSendTime,
            serverTime: Date.now(),
          })
        );
        return;
      }

      if (!currentSession) return;

      if (msg.type === "playback_state") {
        if (currentClient?.role === "master" || msg.deviceId === currentSession.masterDeviceId) {
          currentSession.state = {
            ...currentSession.state,
            ...msg.state,
            lastUpdated: Date.now(),
          };

          const broadcastMsg = JSON.stringify({
            type: "playback_state_broadcast",
            sessionCode: currentSession.sessionCode,
            masterDeviceId: currentSession.masterDeviceId,
            state: currentSession.state,
            serverTime: Date.now(),
          });

          for (const c of currentSession.clients.values()) {
            if (c.socket !== sock) {
              sendWsMessage(c.socket, broadcastMsg);
            }
          }
        }
        return;
      }

      if (msg.type === "change_format") {
        if (currentClient) {
          currentClient.musicianFormat = msg.musicianFormat;
          broadcastRoster(currentSession);
        }
        return;
      }

      if (msg.type === "leave_session") {
        cleanupClient();
      }
    }

    function cleanupClient() {
      if (currentSession && currentClient) {
        currentSession.clients.delete(currentClient.deviceId);
        if (currentSession.masterDeviceId === currentClient.deviceId) {
          const remaining = Array.from(currentSession.clients.values());
          if (remaining.length > 0) {
            const nextMaster = remaining.find((c) => c.role === "master") || remaining[0];
            currentSession.masterDeviceId = nextMaster.deviceId;
            nextMaster.role = "master";
          } else {
            currentSession.masterDeviceId = null;
          }
        }
        broadcastRoster(currentSession);
        if (currentSession.clients.size === 0) {
          sessions.delete(currentSession.sessionCode);
        }
        currentClient = null;
        currentSession = null;
      }
    }

    socket.on("close", cleanupClient);
    socket.on("error", cleanupClient);
  });

  return server;
}

// Start standalone server when executed directly via node
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const server = createSyncServer();
  server.listen(DEFAULT_PORT, DEFAULT_HOST, () => {
    console.log(`[Musician's Sheet Sync Relay] Listening on ws://${DEFAULT_HOST}:${DEFAULT_PORT}`);
    console.log(`Health endpoint: http://localhost:${DEFAULT_PORT}/health`);
  });
}
