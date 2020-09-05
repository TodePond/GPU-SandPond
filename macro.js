
const coordsOrigin = [
	[-1, 1],
	[ 0, 1],
	[ 1, 1],
	
	[-1, 0],
	[ 1, 0],
	
	[-1,-1],
	[ 0,-1],
	[ 1,-1],
	
	[-2, 2],
	[-1, 2],
	[ 0, 2],
	[ 1, 2],
	[ 2, 2],
	
	[-2,-2],
	[-1,-2],
	[ 0,-2],
	[ 1,-2],
	[ 2,-2],
	
	[-2, 1],
	[-2, 0],
	[-2,-1],
	
	[ 2, 1],
	[ 2, 0],
	[ 2,-1],
]

const sitesKey = [
	["ORIGIN", [0, 0]],
	["BELOW", [0, -1]],
	["RIGHT", [1, 0]],
	["LEFT", [-1, 0]],
	//["ABOVE", [0, 1]],
	//["BELOW_RIGHT", [1, -1]],
	//["BELOW_LEFT", [-1, -1]],
]

const getAxisSuffix = (a) => {
	if (a >= 0) return `${a}`
	return `_${a * -1}`
}
const getCoordSuffix = (x, y) => {
	return getAxisSuffix(x) + getAxisSuffix(y)
}

const gen = (coords = coordsOrigin, margin = ``, sites) => {
	const lines = []
	const [siteName, [rx, ry]] = sites[0]
	//console.log(siteName)
	
	const [cx, cy] = coords[0]
	const x = cx + rx
	const y = cy + ry
	
	const coordSuffix = getCoordSuffix(x, y)
	lines.push(`${margin}vec2 space${coordSuffix} = ew(${x}.0, ${y}.0);`)
	lines.push(`${margin}float score${coordSuffix} = getPickedScoreOfSpace(space${coordSuffix});`)
	lines.push(`${margin}if (score00 < score${coordSuffix}) {`)
	
	if (coords.length > 1) {
		lines.push(...gen(coords.slice(1), margin + `	`, sites))
	}
	else {
		lines.push(`${margin}	return ${siteName};`)
	}
	
	lines.push(`${margin}}`)
	
	if (sites.length > 1) {
		//lines.push(...gen(undefined, margin, sites.slice(1)))
	}
	else {
		//console.log("Hioi")
	}
	
	return lines
}

await Deno.writeTextFileSync("macroResult.txt", gen(coordsOrigin, `		`, sitesKey).join("\n"))
