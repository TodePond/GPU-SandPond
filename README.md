# GPU SandPond
Fast Sand?

I've never written WebGL before but I'm experimenting with simulating an [MFM](https://github.com/DaveAckley/MFM)-style engine with GPU.<br>
It uses WebGL2 so if you use Safari, you'll need to enable `WebGL 2.0` in the `Experimental Features` menu.<br>
It's currently very intensive on the GPU so probably won't work on mobile devices.

## Settings
There are some settings you can access by putting parameters after the URL (eg: `?w=1000&f=2`).

**Width**<br>
`w` sets the width (and height) of the world (default: 300).

**Firing Cycles**<br>
`f` lets you choose how many event cycles get done per frame (default: 12).<br>

**Event Windows**<br>
`e` lets you visualise where event windows are taking place (default: 0).<br>
0 = event windows are not visible<br>
1 = event windows are visible (and the engine runs slower so you can see what's going on)

**Spawn**<br>
`s` sets the default contents of the world (default: 0).<br>
0 = empty<br>
1 = sand atoms in random places<br>
2 = one sand atom in the middle<br>
3 = fill the world up with sand
