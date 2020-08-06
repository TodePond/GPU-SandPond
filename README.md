# GPU SandPond
Fast Sand?

I've never written WebGL before but I'm experimenting with simulating an [MFM](https://github.com/DaveAckley/MFM)-style engine with GPU.

## Settings
There are some settings you can access by putting parameters after the URL (eg: [gpu.sandpond.cool?w=1000&r=0](https://gpu.sandpond.cool?w=1000&r=0)).

**Width**<br>
`w` sets the width (and height) of the world (default: 300).

**Spawn**<br>
`s` sets the default contents of the world (default: 0).<br>
0 = empty<br>
1 = sand atoms in random places<br>
2 = one sand atom in the middle

**Randomness**<br>
`r` sets how randomly events should fire (default: 1).<br>
0 = events don't fire randomly<br>
1 = events fire randomly

**Event Windows**<br>
`e` lets you visualise where event windows are taking place (default: 0).<br>
0 = event windows are not visible<br>
1 = event windows are visible (and the engine runs slower so you can see what's going on)
