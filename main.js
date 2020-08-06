const urlParams = new URLSearchParams(window.location.search)


const WORLD_WIDTH_PARAM = urlParams.get("w")
const WORLD_WIDTH = WORLD_WIDTH_PARAM !== null? WORLD_WIDTH_PARAM.as(Number) : 300
//const WORLD_WIDTH = 16384
const SPACE_COUNT = WORLD_WIDTH * WORLD_WIDTH

const RANDOM_MODE_PARAM = urlParams.get("r")
const RANDOM_MODE = RANDOM_MODE_PARAM !== null? RANDOM_MODE_PARAM.as(Number) : 1

const EVENT_WINDOW_PARAM = urlParams.get("e")
const EVENT_WINDOW = EVENT_WINDOW_PARAM !== null? EVENT_WINDOW_PARAM.as(Number) : 0

const RANDOM_SPAWN_PARAM = urlParams.get("s")
const RANDOM_SPAWN = RANDOM_SPAWN_PARAM !== null? RANDOM_SPAWN_PARAM.as(Number) : 0

//========//
// Canvas //
//========//
const CANVAS_MARGIN = 10
const makeCanvas = () => {
	const style = `
		background-color: rgb(47, 51, 61);
		margin: ${CANVAS_MARGIN}px;
	`
	const canvas = HTML `<canvas style="${style}"></canvas>`
	return canvas
}
	
const resizeCanvas = (canvas) => {
	const smallestDimension = Math.min(document.body.clientWidth - CANVAS_MARGIN * 2, document.body.clientHeight - CANVAS_MARGIN * 2)
	canvas.style.width = smallestDimension + "px"
	canvas.style.height = smallestDimension + "px"
	
	canvas.width = canvas.clientWidth
	canvas.height = canvas.clientHeight
}

//=========//
// Context //
//=========//
const makeContext = (canvas) => canvas.getContext("webgl2", {preserveDrawingBuffer: true})
const resizeContext = (gl, canvas) => {
	const smallestDimension = Math.min(document.body.clientWidth, document.body.clientHeight)
	gl.viewport(0, 0, canvas.clientWidth, canvas.clientWidth)
}

//========//
// Shader //
//========//
const createShader = (gl, type, source) => {

	// Check type
	let typeName
	if (type === gl.VERTEX_SHADER) typeName = "Vertex Shader"
	else if (type === gl.FRAGMENT_SHADER) typeName = "Fragment Shader"
	if (typeName === undefined) throw new Error(`[SandPond] Cannot compile unknown shader type: '${type}'`)
	
	const shader = gl.createShader(type)
	gl.shaderSource(shader, source)
	gl.compileShader(shader)
	const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
	if (!success) {
		const log = gl.getShaderInfoLog(shader)
		gl.deleteShader(shader)
		throw new Error(`\n\n[SandPond] WebGL Compilation Error: ${typeName}\n\n${log}`)
	}
	
	print(`[SandPond] WebGL Compilation Success: ${typeName}`)
	return shader
}

//=========//
// Program //
//=========//
const createProgram = (gl, vertexShaderSource, fragmentShaderSource) => {
	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
	const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
	const program = gl.createProgram()
	gl.attachShader(program, vertexShader)
	gl.attachShader(program, fragmentShader)
	gl.linkProgram(program)
	const success = gl.getProgramParameter(program, gl.LINK_STATUS)
	if (!success) {
		const log = gl.getProgramInfoLog(program)
		gl.deleteProgram(program)
		throw new Error(`\n\n[SandPond] WebGL Link Error\n\n${log}`)
	}
	
	print(`[SandPond] WebGL Link Success`)
	gl.useProgram(program)
	return program	
}

//========//
// Buffer //
//========//
const createBuffer = (bindPoint, hint, data) => {
	const buffer = gl.createBuffer()
	const typedData = new Float32Array(data)
	gl.bindBuffer(bindPoint, buffer)
	gl.bufferData(bindPoint, typedData, hint)
	return buffer
}

//========//
// Attrib //
//========//


//===============//
// Vertex Shader //
//===============//
const vertexShaderSource = `#version 300 es

	in vec2 a_TexturePosition;
	out vec2 v_TexturePosition;
	
	void main() {
		vec2 position = (a_TexturePosition - 0.5) * 2.0;
		gl_Position = vec4(position, 0, 1);
		v_TexturePosition = a_TexturePosition;
	}
`

//=================//
// Fragment Shader //
//=================//
// Event Window (origin r)
//========================
//  r
// gba
const fragmentShaderSource = `#version 300 es

	precision highp float;
	
	in vec2 v_TexturePosition;
	
	uniform sampler2D u_Texture;
	uniform bool u_isTarget;
	uniform float u_time;
	
	out vec4 colour;
	
	float random(vec2 st) {
		return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
	}
	
	vec2 siteOrigin(vec2 position) {
		return position;
	}
	
	vec2 world(float x, float y) {
		float ewX = v_TexturePosition.x + x / ${WORLD_WIDTH}.0;
		float ewY = v_TexturePosition.y + y / ${WORLD_WIDTH}.0;
		
		vec2 xy = vec2(ewX, ewY);
		xy = xy * ${WORLD_WIDTH}.0;
		xy = floor(xy);
		return xy;
	}
	
	vec2 ew(float x, float y) {
		vec2 xy = world(x, y);
		xy = xy / ${WORLD_WIDTH}.0;
		return xy;
	}
	
	bool isPicked(float x, float y) {
		vec2 space = ew(x, y);
		if (space.y > 1.0) return false;
		
		${(() => {
			if (RANDOM_MODE === 1) return "return random(space / (u_time)) < 0.9;"
			if (RANDOM_MODE === 0) return `
				float tick = round(u_time * 255.0);
				float offset = 0.0;
				if (mod(tick, 2.0) < 1.0) offset = 1.0;
				return mod(space.y * ${WORLD_WIDTH}.0 + offset, 2.0) < 1.0;
			`
		})()}
	}
	
	bool isPickedInWindow(float x, float y) {
		if (!isPicked(x, y + 1.0)) return false;
		return true;
	}
	
	bool isInWindow(float x, float y) {
	
		float yAbove = 1.0;
		while (yAbove < ${WORLD_WIDTH}.0) {
			
			vec2 space = ew(0.0, yAbove);
			if (space.y > 1.0) return false;
			
			if (isPicked(0.0, yAbove)) {
				if (!isPickedInWindow(0.0, yAbove)) {
					return true;
				}
			}
			else return false;
			yAbove = yAbove + 2.0;
		}
		
		return false;
	}
	
	const vec4 WHITE = vec4(224.0 / 255.0, 224.0 / 255.0, 224.0 / 255.0, 1.0);
	const vec4 BLANK = vec4(0.0, 0.0, 0.0, 0.0);
	const vec4 RED = vec4(1.0, 70.0 / 255.0, 70.0 / 255.0, 1.0);
	const vec4 BLUE = vec4(0.0, 0.5, 1.0, 1.0);
	const vec4 GREEN = vec4(0.0, 1.0, 0.5, 1.0);
	
	const vec4 SAND = vec4(1.0, 204.0 / 255.0, 0.0, 1.0);
	const vec4 EMPTY = vec4(0.0, 0.0, 0.0, 0.0);
	
	vec4 getColour(float x, float y) {
		
		float ewX = v_TexturePosition.x + x / ${WORLD_WIDTH}.0;
		float ewY = v_TexturePosition.y + y / ${WORLD_WIDTH}.0;
		
		/*ewX = ewX * ${WORLD_WIDTH * WORLD_WIDTH}.0;
		ewX = round(ewX);
		ewX = ewX / ${WORLD_WIDTH * WORLD_WIDTH}.0;
		
		ewY = ewY * ${WORLD_WIDTH * WORLD_WIDTH}.0;
		ewY = round(ewY);
		ewY = ewY / ${WORLD_WIDTH * WORLD_WIDTH}.0;*/
		
		vec2 xy = vec2(ewX, ewY);
		
		return texture(u_Texture, xy);
	}
	
	void main() {
		
		// Am I in someone else's event window??
		if (isInWindow(0.0, 0.0)) {
			
			vec4 element = getColour(0.0, 0.0);
			vec4 elementAbove = getColour(0.0, 1.0);
			if (element == EMPTY && elementAbove == SAND) {
				colour = SAND;
				return;
			}
			colour = getColour(0.0, 0.0);
			
			${EVENT_WINDOW == 1? "colour = RED;" : ""}
			return;
		}
		
		// Am I an origin??
		if (isPicked(0.0, 0.0)) {
			vec4 element = getColour(0.0, 0.0);
			vec4 elementBelow = getColour(0.0, -1.0);
			if (element == SAND && elementBelow == EMPTY) {
				colour = EMPTY;
				//colour = getColour(0.0, 0.0);
				return;
			}
			colour = getColour(0.0, 0.0);
			
			${EVENT_WINDOW == 1? "colour = BLUE;" : ""}
			return;
		}
		
		// Then I'm not involved in any events :(
		colour = getColour(0.0, 0.0);
		${EVENT_WINDOW == 1? "colour = BLANK;" : ""}
		
	}
`

//=======//
// Setup //
//=======//
const canvas = makeCanvas()
document.body.appendChild(canvas)
const gl = makeContext(canvas)
resizeCanvas(canvas)
resizeContext(gl, canvas)
on.resize(() => {
	resizeCanvas(canvas)
	resizeContext(gl, canvas)
})

const program = createProgram(gl, vertexShaderSource, fragmentShaderSource)
gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)

const isTargetLocation = gl.getUniformLocation(program, "u_isTarget")
gl.uniform1ui(isTargetLocation, 1)

const timeTurnLocation = gl.getUniformLocation(program, "u_timeTurn")
gl.uniform1ui(timeTurnLocation, 0)

const timeLocation = gl.getUniformLocation(program, "u_time")
gl.uniform1f(timeLocation, 0)

// Texture Position Attribute
const texturePositionLocation = gl.getAttribLocation(program, "a_TexturePosition")
const texturePositionBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, texturePositionBuffer)
const texturePositionData = new Float32Array([
	-1.0, -1.0,
	-1.0, 1.0,
	1.0, 1.0,
	
	1.0, 1.0,
	1.0, -1.0,
	-1.0, -1.0,
])
gl.bufferData(gl.ARRAY_BUFFER, texturePositionData, gl.STATIC_DRAW)
gl.enableVertexAttribArray(texturePositionLocation)
gl.vertexAttribPointer(texturePositionLocation, 2, gl.FLOAT, false, 0, 0)

let texture1 = gl.createTexture()
gl.bindTexture(gl.TEXTURE_2D, texture1)
const spaces = new Uint8Array(WORLD_WIDTH * WORLD_WIDTH * 4)
if (RANDOM_SPAWN !== 0) for (let i = 0; i < spaces.length; i += 4) {
	if (RANDOM_SPAWN == 1) {
		if (Math.random() < 0.05) {
			spaces[i] = 255
			spaces[i+1] = 204
			spaces[i+3] = 255
		}
	}
	else if (RANDOM_SPAWN == 2) {
		if (i === Math.floor(WORLD_WIDTH * WORLD_WIDTH * 4 / 2) + WORLD_WIDTH * 4/2) {
			spaces[i] = 255
			spaces[i+1] = 204
			spaces[i+3] = 255
		}
	}
}
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, WORLD_WIDTH, WORLD_WIDTH, 0, gl.RGBA, gl.UNSIGNED_BYTE, spaces)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST )
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

const fb1 = gl.createFramebuffer()
gl.bindFramebuffer(gl.FRAMEBUFFER, fb1)
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture1, 0)

const texture2 = gl.createTexture()
gl.bindTexture(gl.TEXTURE_2D, texture2)
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, WORLD_WIDTH, WORLD_WIDTH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST )
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

const fb2 = gl.createFramebuffer()
gl.bindFramebuffer(gl.FRAMEBUFFER, fb2)
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture2, 0)

//======//
// Draw //
//======//
let currentDirection = true
let time = 0
let paused = false
on.keydown((e) => {
	if (e.key === " ") paused = !paused
})

const draw = async () => {

	if (paused) return requestAnimationFrame(draw)
	
	let sourceTexture
	let frameBuffer
	let targetTexture
	if (currentDirection === true) {
		sourceTexture = texture1
		frameBuffer = fb2
		targetTexture = texture2
		currentDirection = false
	}
	else {
		sourceTexture = texture2
		frameBuffer = fb1
		targetTexture = texture1
		currentDirection = true
	}
	
	gl.uniform1f(timeLocation, time)
	gl.uniform1f(timeLocation, time)
	
	// Target
	gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer)
	gl.bindTexture(gl.TEXTURE_2D, sourceTexture)
	gl.uniform1ui(isTargetLocation, 1)
	
	gl.viewport(0, 0, WORLD_WIDTH, WORLD_WIDTH)
	gl.drawArrays(gl.TRIANGLES, 0, 6)
	
	// Canvas
	gl.bindFramebuffer(gl.FRAMEBUFFER, null)
	gl.bindTexture(gl.TEXTURE_2D, targetTexture)
	gl.uniform1ui(isTargetLocation, 0)
	
	gl.viewport(0, 0, canvas.clientWidth, canvas.clientWidth)
	gl.drawArrays(gl.TRIANGLES, 0, 6)
	
	time++
	if (time > 255) time = 0
	if (EVENT_WINDOW) await wait(500)
	
	if (dropIfPossible !== undefined) dropIfPossible()
	requestAnimationFrame(draw)
}

requestAnimationFrame(draw)

//=========//
// Dropper //
//=========//
let dropperX
let dropperY
let DROPPER_SIZE = 2

let previousDown = false
let previousX = undefined
let previousY = undefined

const dropIfPossible = () => {
	if (!Mouse.down && Touches.length <= 0) {
		previousDown = false
		return
	}
	
	if (dropperX === undefined) return
	
	drop(dropperX, dropperY)
	
	previousDown = true
	previousX = dropperX
	previousY = dropperY
}

const drop = (dropX, dropY) => {

	const coords = []
	
	// Trail
	if (previousDown) {
		const xDiff = dropX - previousX
		const yDiff = dropY - previousY
		
		const xAbs = Math.abs(xDiff)
		const yAbs = Math.abs(yDiff)
		
		let largest = Math.max(xAbs, yAbs)
		if (largest == 0) largest = 0.00001
		
		const xRatio = (xAbs / largest)
		const yRatio = yAbs / largest
		
		const xWay = Math.sign(xDiff)
		const yWay = Math.sign(yDiff)
		
		const xInc = xWay * xRatio
		const yInc = yWay * yRatio
		
		for (let i = 0; i < largest; i++) {
			const xNew = Math.round(dropX - xInc * i)
			const yNew = Math.round(dropY - yInc * i)
			for (let x = -DROPPER_SIZE; x <= DROPPER_SIZE; x++) {
				for (let y = -DROPPER_SIZE; y <= DROPPER_SIZE; y++) {
					const finalX = xNew+x
					const finalY = yNew+y
					if (finalX >= WORLD_WIDTH) continue
					if (finalY >= WORLD_WIDTH) continue
					if (finalX < 0) continue
					if (finalY < 0) continue
					coords.push([finalX, finalY])
				}
			}
		}
	}
	
	dropAtom(coords)
	
}

const dropAtom = (coords) => {
	const pixels = new Uint8Array(WORLD_WIDTH * WORLD_WIDTH * 4)
	gl.bindFramebuffer(gl.FRAMEBUFFER, fb2)
	gl.readPixels(0, 0, WORLD_WIDTH, WORLD_WIDTH, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
	
	for (const [x, y] of coords) {
		const id = (y * WORLD_WIDTH * 4) + x * 4
		pixels[id] = 255
		pixels[id+1] = 204
		pixels[id+2] = 0
		pixels[id+3] = 255
	}
	
	currentDirection = true
	gl.bindTexture(gl.TEXTURE_2D, texture1)
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, WORLD_WIDTH, WORLD_WIDTH, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
	
	gl.bindTexture(gl.TEXTURE_2D, texture2)
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, WORLD_WIDTH, WORLD_WIDTH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
}

on.mousewheel((e) => {
	if (Keyboard.Shift) {
		if (e.deltaY < 0) {
			DROPPER_SIZE++
			if (DROPPER_SIZE > 10) DROPPER_SIZE = 10
		}
		else if (e.deltaY > 0) {
			DROPPER_SIZE--
			if (DROPPER_SIZE < 0) DROPPER_SIZE = 0
		}
	}
})

canvas.on.mousemove((e) => {
	dropperX = Math.round((e.offsetX / canvas.clientWidth) * WORLD_WIDTH)
	dropperY = WORLD_WIDTH - Math.round((e.offsetY / canvas.clientHeight) * WORLD_WIDTH)
})

canvas.onPassive.touchstart(e => {
	dropperX = Math.round(((e.changedTouches[0].clientX - CANVAS_MARGIN) / canvas.clientWidth) * WORLD_WIDTH)
	dropperY = WORLD_WIDTH - Math.round(((e.changedTouches[0].clientY - CANVAS_MARGIN) / canvas.clientWidth) * WORLD_WIDTH)
})

canvas.onPassive.touchmove(e => {
	dropperX = Math.round(((e.changedTouches[0].clientX - CANVAS_MARGIN) / canvas.clientWidth) * WORLD_WIDTH)
	dropperY = WORLD_WIDTH - Math.round(((e.changedTouches[0].clientY - CANVAS_MARGIN) / canvas.clientWidth) * WORLD_WIDTH)
})

