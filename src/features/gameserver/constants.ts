import type { GameServerDefinition } from "./types";

export const GAME_SERVERS: GameServerDefinition[] = [
  {
    id: "palworld",
    name: "Palworld",
    description: "Dedicated Palworld server hosted on AWS EC2.",
    route: "/gameserver/palworld",
    provider: "aws-ec2",
    region: "ap-southeast-2",
    ports: [
      { label: "Server", protocol: "UDP", port: 8211 },
      { label: "Query", protocol: "UDP", port: 27015 },
    ],
  },
];

export const PALWORLD_SERVER = GAME_SERVERS[0];
