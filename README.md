# GPU SandPond
Fast Sand?

I've never written WebGL before but I'm experimenting with simulating an [MFM](https://github.com/DaveAckley/MFM)-style engine with GPU.<br>
It uses WebGL2 so if you use Safari, you'll need to enable `WebGL 2.0` in the `Experimental Features` menu.

## Elements
I haven't added a menu to pick elements from yet.<br>
If you want to pick different elements, you can set the `DROPPER_ELEMENT` variable in the console to one of the following elements:<br>
* `EMPTY`
* `SAND`
* `WATER`
* `STATIC`
* `FORKBOMB`

## Settings
There are some settings you can access by putting parameters after the URL (eg: [gpu.sandpond.cool?w=1000&r=0&f=0.5](https://gpu.sandpond.cool?w=1000&r=0&f=0.5)).

**Width**<br>
`w` sets the width (and height) of the world (default: 300).

**Spawn**<br>
`s` sets the default contents of the world (default: 0).<br>
0 = empty<br>
1 = sand atoms in random places<br>
2 = one sand atom in the middle<br>
3 = fill the world up with sand

**Event Windows**<br>
`e` lets you visualise where event windows are taking place (default: 0).<br>
0 = event windows are not visible<br>
1 = event windows are visible (and the engine runs slower so you can see what's going on)

**Events Per Frame**<br>
`f` lets you choose how many events each space gets per frame (on average) (default: 1). The original SandPond engine only ever does 1<br>
