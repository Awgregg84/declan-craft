# Declan-craft

A block-building game made for Declan. It has two worlds to explore (Sunny Valley and Sky Islands), each with its own Nether, mining, crafting, building, animals and monsters, villages with villagers to trade with, bows and crossbows, six kinds of TNT, levers and dispensers, minecarts and a car, day and night, and survival and creative modes. Two to four players can share a world over the internet. Everything in it, including the worlds, textures, characters and sounds, is generated in code.

**Play:** https://awgregg84.github.io/declan-craft/

## On an iPad or iPhone

1. Open the link above in Safari.
2. Tap **Share**, then **Add to Home Screen**.
3. Open Declan-craft from the new icon once while online. After that it also works without internet (except playing together).

Worlds are saved on the device. Deleting the Home Screen icon deletes its saved worlds.

## Characters

Tap **Playing as ...** on the title screen to pick a look (blonde hair, or brown hair) and type a name. Both stay on that device. The name is shown above your head when you play together.

## Villages and trading

Every new Sunny Valley world starts a short walk from a village with a well, houses, gardens and villagers. Tap a villager to trade. Each job (farmer, butcher, toolsmith, shepherd, mason, cleric) buys easy things for emeralds and sells useful things for emeralds. Emerald ore is also found under mountains. Villagers can't be hurt.

## The Nether

Build a frame of obsidian 4 wide and 5 tall (the corners can be left out) and light the inside with flint and steel (flint from gravel, plus an iron ingot). Stand in the purple portal for a moment to travel; walk back in to come home. Every world has its own Nether with lava seas, glowstone, quartz, soul sand, zombified piglins (peaceful unless you hit one) and magma cubes. One block in the Nether is 8 blocks back home, and portals link up with the nearest portal on the other side, or build a new one there. In survival, clerics trade obsidian for emeralds.

## Bows, TNT, machines and vehicles

- **Bows and crossbows.** A bow is 3 sticks and 3 string (string comes from wool); arrows are flint, a stick and a feather. Hold Place (or the right mouse button) to pull the bow back and let go to shoot; a quick tap is a quick shot. Walk over your arrows to pick them up. A crossbow loads with one tap (it takes a moment) and fires with the next. Toolsmiths sell bows, arrows and crossbows.
- **Ender pearls and fire charges.** Tap to throw a pearl and land where it lands. A fire charge (gunpowder, coal and flint) flies off as a little fireball, or lights a portal frame.
- **TNT.** Mega TNT (4 TNT) makes a much bigger crater. Ice TNT freezes water to ice, lava to obsidian, grass to snow, and creatures for a while, and breaks nothing. Digging TNT bores a 3x3 tunnel 16 blocks long the way you were looking when you placed it, and keeps the ores. Party TNT throws confetti and fireworks and bounces everyone nearby, with no damage (sheep change colour). Cluster TNT throws out six little TNTs.
- **Levers, buttons and dispensers.** A lever or button on the side of a block powers what is next to it and next to that block: TNT lights, doors open and shut, and dispensers fire one thing each time (arrows, fire charges, lit TNT, spawn eggs that hatch, a minecart onto a rail, or any item).
- **Endermen and ghasts.** Endermen walk about at night and leave you alone unless you look one in the eyes or hit it; they teleport, dodge arrows, hate water, carry blocks about and drop ender pearls. Ghasts float in the Nether's big caves and shoot fireballs, which you can hit back.
- **Minecarts and the car.** Rails (6 iron and a stick make 16) join up round corners and up slopes by themselves. Put a minecart (5 iron) on a rail and tap it to ride; push forward to roll. The car (glass, 3 iron, 2 coal) drives with the joystick or W A S D, hops up one-block steps and honks when you tap. Sneak gets you out. Minecarts and cars are saved with the world.

## Playing together

Both devices need the internet.

1. On the host's device: **Play Together**, **Host a Game**, then pick a world. (Or tap **Invite a Player** in the game menu of a world you are already playing.)
2. The game shows a room code, like FROG7. It is also in the game menu.
3. On the other device: **Play Together**, **Join a Game**, type the code, then **Join**. A small typing mistake (WORSE8 for HORSE8) is corrected automatically.
4. The host taps **Let them in**.

The shared world, and everything a guest collects there, is saved on the host's device. A guest who leaves and joins again gets their things back. When one player goes through a Nether portal, everyone travels together. Arrows, TNT, levers, dispensers, minecarts and cars all work for every player; a guest drives a car on their own device and the host follows along. Both devices need this version of the game.

If joining doesn't work, tap **Check Connection** on the Play Together screen on both devices. It tests each matchmaking service and the network, and failed joins show a short code (for example `S0` for no internet, `G1` for a wrong room code, `D1` when the two devices can't reach each other).

How it works: the devices find each other through matchmaking services that only pass along the connection setup: the free PeerJS service (0.peerjs.com) and, because PeerJS is often slow or busy, two public MQTT message services (HiveMQ and EMQX) at the same time. Setup messages sent through the MQTT services are encrypted with a key made from the room code. The devices then talk directly over WebRTC; when a direct connection isn't possible, the traffic goes through the free Open Relay TURN server. The host's device runs the world; guests send their moves and block changes to it. The host has to allow each player. Names and game messages travel only inside the encrypted WebRTC connection, so none of these services can read them.

## Building

Requires Node.js.

- `node build.mjs` writes `dist/site/` (the website, published on the `gh-pages` branch) and `dist/declan-craft.html` (a single file that opens in a desktop browser).
- `node tools/make-assets.mjs` regenerates the icons and link-preview picture in `assets/`. It needs Playwright.
- `test/` holds browser tests that use Playwright with Chromium, for example `node test/site.mjs`. `test/wishlist.mjs` covers the bows, TNT, machines, endermen, ghasts and vehicles. The playing-together tests (`test/mp.mjs`, `test/mp-touch.mjs`, `test/mp-nether.mjs`, `test/mp-backup.mjs`, `test/mp-wishlist.mjs`) run local copies of the PeerJS and MQTT services; install them first with `npm install` in `tools/`.

## Layout

- `src/js/`: game code, joined in file-name order
  - `02-gen.js`: terrain, trees, caves, ores, villages and the Nether
  - `09c-vehicles.js`: rails, minecarts and the car
  - `09e-ender.js`: endermen and ghasts
  - `09k-tnt.js`: the kinds of TNT
  - `09p-projectiles.js`: arrows, fireballs, fire charges and ender pearls
  - `09r-redstone.js`: levers, buttons and dispensers
  - `09v-villagers.js`: trading and how villagers move about
  - `12c-character.js`: character look and name
  - `12n-net.js`: room codes and direct connections
  - `12p-mp.js`: playing together (host and guest)
  - `12q-portal.js`: Nether portals (frames, linking, building the other side)
- `src/style.css`, `src/body.html`: screens and controls
- `src/site/`: offline support (`sw.js`) and the Home Screen app manifest
- `assets/`: icons and link-preview picture
