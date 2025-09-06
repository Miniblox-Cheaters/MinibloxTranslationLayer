# MinibloxTranslationLayer

A middle man to translate Miniblox packets into Minecraft 1.8.9 packets.

## Use Steps

1. Install the latest NodeJS at (<https://nodejs.org/>)
2. Download & extract the repository to a folder of your choosing
3. Open a terminal inside said folder (on windows you can open the folder in explorer, select the path, and replace it all (<kbd>CTRL</kbd> + <kbd>A</kbd> and <kbd>Backspace</kbd>))
4. Run `npm install` to install the dependencies
5. Run `node .` to run the translation layer
6. Connect to localhost on ANY Minecraft 1.8.9 client.

## Commands

Here below is listed all of the commands from the translation layer.

### /play, /queue, and /q

Syntax: `/q <gamemode>` (`<gamemode>` can be autocompleted using the <kbd>TAB</kbd>)

Joins a server matching the gamemode criteria.

## /login

Syntax: `/login <token>`

Writes `token` to `login.token` so the translation layer can use it once you rejoin.
Rejoin for the changes to take effect.

## /join

Syntax: `/join <server ID or invite code>`

Joins a specific server.
A server ID looks like this: `{server size, e.g. small, large, medium, or planet}-{ID 1}-{ID 2}`.
An invite code looks like this: `https://miniblox.io/?join=INVITECODE` or just `INVITECODE`

## /resync

Syntax: `/resync`

Setbacks you to the last place you were teleported to,
This helps fix view angle de-syncs caused by the "new" anti-cheat.
You can also abuse this to go faster on the new anti-cheat, vector best developer of 2025!?!?!

## /reloadchunks

Syntax: `/reloadchunks`

Reloads... the... chunks. (like <kbd>F3</kbd> + <kbd>A</kbd>)

## /desync

Syntax: `/desync`

Toggles if you are de-synced on the server or not.

This makes the input sequence number not increment
and interpolates your position to limit the speed to 1.98 bps (to not flag).
While you are de-synced, you can do any movement, but you will be limited to effectively 2 BPS.
You can also use this as a NoFall,
simply desync when you are about to fall,
and resync as soon as you hit the ground.

## /planets

Syntax: `/planets`

A minimal UI for viewing planets.
This is limited by the amount of items a chest can hold in Minecraft,
so it's probably better just picking a server from the website
and using the invite code or server ID to join on the translation layer.
