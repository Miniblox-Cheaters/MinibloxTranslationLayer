# MinibloxTranslationLayer

A middle man to translate Miniblox packets into Minecraft 1.8.9 packets.

## Progress

### Improvements from the original

- `/planets` selection gui
   (it's not really good since there's no filtering and paging, but better than nothing)
- `/join` accepts miniblox invite codes along with server IDs
- more commands: `/serverinfo`, `/serverid` / `/id` / `/invite`, and `/next`
- migrated to ESM (better code)
- more items are mapped
- handles more packets
  (disconnect packet, queue next packet, and the creative mode set slot packet)

### Handled S2C Packets

- [x] CPacketAnimation
- [x] CPacketBlockAction
- [x] CPacketBlockUpdate
- [ ] CPacketChangeServers (idk what this does, just logs the url field to the console)
- [x] CPacketChunkData
- [x] CPacketCloseWindow
- [x] CPacketConfirmTransaction
- [x] CPacketDestroyEntities
- [x] CPacketDisconnect
      (waits for the connection to actually be closed)
- [x] CPacketEntityAction
- [x] CPacketEntityEquipment
- [x] CPacketEntityMetadata
- [x] CPacketEntityPositionAndRotation
- [x] CPacketEntityRelativePositionAndRotation
- [x] CPacketEntityStatus
- [x] CPacketEntityVelocity
- [ ] CPacketExplosion (working on it)
- [x] CPacketJoinGame
- [ ] CPacketLeaderboard
- [ ] CPacketLocalStorage
- [x] CPacketMessage
- [x] CPacketOpenWindow
- [x] CPacketParticles
- [x] CPacketPlayerList
- [x] CPacketPlayerPosition
- [x] CPacketPlayerPosLook
- [x] CPacketPlayerReconciliation
- [x] CPacketPong
- [x] CPacketRespawn
- [x] CPacketScoreboard
- [x] CPacketServerInfo
- [x] CPacketSetSlot
- [x] CPacketSignEditorOpen
- [x] CPacketSoundEffect
- [x] CPacketSpawnEntity
- [x] CPacketSpawnPlayer
- [x] CPacketTabComplete
- [x] CPacketTitle
- [ ] CPacketUpdate
- [x] CPacketUpdateHealth
- [ ] CPacketUpdateLeaderboard
- [x] CPacketUpdateScoreboard
- [x] CPacketUpdateSign
- [x] CPacketUpdateStatus
- [x] CPacketWindowItems
- [x] CPacketWindowProperty
- [x] CPacketUseBed
- [x] CPacketQueueNext
- [x] CPacketSpawnExperienceOrb
- [x] CPacketSetExperience
- [x] CPacketOpenShop
- [ ] CPacketShopProperties
- [ ] CPacketEntityProperties
- [x] CPacketEntityEffect
- [x] CPacketRemoveEntityEffect
- [ ] CPacketUpdateCommandBlock
- [x] CPacketEntityAttach
- [ ] CPacketServerMetadata
- [x] CPacketTimeUpdate

### Handled C2S Packets

- [ ] SPacketAdminAction
- [x] SPacketAnalytics (sends fake data)
- [x] SPacketClickWindow
- [x] SPacketCloseWindow
- [x] SPacketConfirmTransaction
- [ ] SPacketEnchantItem
- [x] SPacketEntityAction
- [x] SPacketHeldItemChange
- [x] SPacketLoginStart
- [x] SPacketMessage
- [ ] SPacketOpenShop
- [x] SPacketPing
- [x] SPacketPlayerAbilities
- [x] SPacketPlayerAction
- [x] SPacketPlayerPosLook
- [x] SPacketRespawn
- [x] SPacketTabComplete
- [x] SPacketUpdateSign
- [x] SPacketUseEntity
- [ ] SPacketUpdateCommandBlock
- [x] SPacketQueueNext
- [x] SPacketPlayerInput
- [x] SPacketBreakBlock
- [x] SPacketClick
- [ ] SPacketCraftItem
- [x] SPacketPlaceBlock
- [x] SPacketRequestChunk
- [x] SPacketUpdateInventory (creative mode)
- [x] SPacketUseItem

## Use Steps

1. Install the latest NodeJS at (<https://nodejs.org/>)
2. Download & extract the repository to a folder of your choosing
3. Open a terminal inside said folder
   (on windows you can open the folder in explorer, select the path,
   and replace it all (<kbd>CTRL</kbd> + <kbd>A</kbd> and <kbd>Backspace</kbd>))
4. Run `npm install` to install the dependencies
5. Run `node .` to run the translation layer
6. Connect to localhost on ANY(*) Minecraft 1.8.9 client.

*: servers which use the new anti-cheat
   (SkyWars, EggWars, the bridge, Classic PvP, and KitPvP)
   need custom code to send the C0CInput packet.
   (sadly 1.21.2+ clients send input packets
   that get discarded by ViaVersion if you're not in a boat)

## Commands

Here below is listed all of the commands from the translation layer.

### /play, /queue, and /q

Syntax: `/q [gamemode]` (`[gamemode]` can be autocompleted using the <kbd>TAB</kbd>)

Joins a server matching the gamemode criteria.
`skywars` is the default gamemode

## /login

Syntax: `/login <token>`

Writes `token` to `login.token` so the translation layer can use it once you rejoin.
Rejoin for the changes to take effect.

## /join

Syntax: `/join <server ID or invite code>`

Joins a specific server.
A server ID looks like this:
`{server size, e.g. small, large, medium, or planet}-{ID 1}-{ID 2}`.
An invite code looks like this: `https://miniblox.io/?join=INVITECODE` or just `INVITECODE`

## /resync

Syntax: `/resync`

Setbacks you to the last place you were teleported to,
This helps fix view angle de-syncs caused by the "new" anti-cheat.
You can also abuse this to go faster on the new anti-cheat,
vector best developer of 2025!?!?!

## /reloadchunks

Syntax: `/reloadchunks`

Reloads... the... chunks. (like <kbd>F3</kbd> + <kbd>A</kbd>)

## /desync

Syntax: `/desync`

Toggles if you are de-synced on the server or not.

This makes the input sequence number not increment
and interpolates your position to limit the speed to 1.98 bps (to not flag).
While you are de-synced,
you can do any movement,
but you will be limited to effectively 2 BPS (and your rotations won't sync).
You can also use this as a NoFall,
simply desync when you are about to fall,
and resync as soon as you hit the ground.

## /serverid, /id, and /invite

Syntax: `/id`

Condensed version of /serverinfo that
only shows the invite code and server ID, both can be used with `/join`.

## /serverinfo

Shows all the information about this server gathered.
We get all the information from the CPacketServerInfo packet
(which is sent as a packet when the server info changes,
and included in the CPacketJoinGame packet)

## /planets

Syntax: `/planets`

A minimal UI for viewing planets.
This is limited by the amount of items a chest can hold in Minecraft,
so it's probably better just picking a server from the website
and using the invite code or server ID to join on the translation layer.
