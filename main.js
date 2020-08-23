const urlParams = new URLSearchParams(window.location.search)

const WORLD_WIDTH_PARAM = urlParams.get("w")
const WORLD_WIDTH = WORLD_WIDTH_PARAM !== null? WORLD_WIDTH_PARAM.as(Number) : 300
//const WORLD_WIDTH = 16384
const SPACE_COUNT = WORLD_WIDTH * WORLD_WIDTH

const RANDOM_MODE_PARAM = urlParams.get("r")
const RANDOM_MODE = RANDOM_MODE_PARAM !== null? RANDOM_MODE_PARAM.as(Number) : 0

if (RANDOM_MODE === 1) {
	alert(`[SandPond] Sorry, random mode is currently not supported because I'm still working on it (:`)
	throw new Error(`[SandPond] Sorry, random mode is currently not supported because I'm still working on it (:`)
}

const EVENT_WINDOW_PARAM = urlParams.get("e")
const EVENT_WINDOW = EVENT_WINDOW_PARAM !== null? EVENT_WINDOW_PARAM.as(Number) : 0

const RANDOM_SPAWN_PARAM = urlParams.get("s")
const RANDOM_SPAWN = RANDOM_SPAWN_PARAM !== null? RANDOM_SPAWN_PARAM.as(Number) : 0

const EVENTS_NEEDED_FOR_COVERAGE = EVENT_WINDOW == 1? 1 : 9

const EVENTS_PER_FRAME_PARAM = urlParams.get("f")
const EVENTS_PER_FRAME = EVENTS_PER_FRAME_PARAM !== null? EVENTS_PER_FRAME_PARAM.as(Number) : 1
const EVENT_CYCLE_COUNT = Math.round(EVENTS_PER_FRAME * EVENTS_NEEDED_FOR_COVERAGE)

let PAN_POSITION_X = 0
let PAN_POSITION_Y = 0
let ZOOM = 1.0

const BG_COLOUR = new THREE.Color()
BG_COLOUR.setHSL(Math.random(), 1, 0.8)

//========//
// Canvas //
//========//
const CANVAS_MARGIN = 0
const makeCanvas = () => {
	const style = `
		background-color: rgb(47, 51, 61);
		margin: ${CANVAS_MARGIN}px;
		${EVENT_WINDOW? "" : "cursor: normal;"}
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
const fragmentShaderSource = `#version 300 es

	precision highp float;
	
	in vec2 v_TexturePosition;
	
	uniform sampler2D u_Texture;
	uniform bool u_isPost;
	uniform vec2 u_dropperPosition;
	uniform vec2 u_dropperPreviousPosition;
	uniform bool u_dropperDown;
	uniform float u_dropperWidth;
	uniform float u_time;
	uniform float u_eventTime;
	
	uniform vec2 u_panPosition;
	uniform float u_zoom;
	
	out vec4 colour;
	
	float random(vec2 st) {
		return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
	}
	
	vec2 world(float x, float y) {
		float ewX = v_TexturePosition.x + x / ${WORLD_WIDTH}.0;
		float ewY = v_TexturePosition.y + y / ${WORLD_WIDTH}.0;
		
		vec2 xy = vec2(ewX, ewY);
		xy = xy * ${WORLD_WIDTH}.0;
		xy = floor(xy);
		xy = xy + 0.5 / ${WORLD_WIDTH}.0;
		return xy;
	}
	
	vec2 ew(float x, float y) {
		vec2 xy = world(x, y);
		xy = xy / ${WORLD_WIDTH}.0;
		return xy;
	}
	
	bool isPicked(float x, float y) {
		
		vec2 space = ew(x, y);
		
		float xDirection = 1.0;
		if (mod(u_time, 2.0) > 1.0) xDirection = -xDirection;
		
		if (mod((space.x * ${WORLD_WIDTH}.0) + u_time, 3.0) < 1.0) {
			if (mod(((space.y * ${WORLD_WIDTH}.0) - u_time / 3.0), 3.0) < 1.0) {
				return true;
			}
		}
		
		return false;
	}
	
	bool isPickedInWindow(float x, float y) {
		if (isPicked(1.0, 0.0)) return true;
		if (isPicked(1.0, 1.0)) return true;
		if (isPicked(0.0, 1.0)) return true;
		if (isPicked(-1.0, 1.0)) return true;
		if (isPicked(-1.0, 0.0)) return true;
		if (isPicked(-1.0, -1.0)) return true;
		if (isPicked(0.0, -1.0)) return true;
		if (isPicked(1.0, -1.0)) return true;
		return false;
	}
	
	// This is needed for PRNG
	// For a synchronous approach, this is not needed
	bool isInWindow(float x, float y) {
		return isPickedInWindow(x, y);
	}
	
	const vec4 WHITE = vec4(224.0 / 255.0, 224.0 / 255.0, 224.0 / 255.0, 1.0);
	const vec4 BLANK = vec4(0.0, 0.0, 0.0, 0.0);
	const vec4 RED = vec4(1.0, 70.0 / 255.0, 70.0 / 255.0, 1.0);
	const vec4 BLUE = vec4(0.0, 0.5, 1.0, 1.0);
	const vec4 GREEN = vec4(0.0, 1.0, 0.5, 1.0);
	
	const vec4 SAND = vec4(1.0, 204.0 / 255.0, 0.0, 1.0);
	const vec4 EMPTY = vec4(0.0, 0.0, 0.0, 0.0);
	const vec4 VOID = vec4(1.0, 1.0, 1.0, 0.0);
	const vec4 WATER = vec4(0.0, 0.6, 1.0, 1.0);
	const vec4 STATIC = vec4(0.5, 0.5, 0.5, 1.0);
	const vec4 FORKBOMB = RED;
	
	vec4 getColour(float x, float y) {
		
		float ewX = v_TexturePosition.x + x / ${WORLD_WIDTH}.0;
		float ewY = v_TexturePosition.y + y / ${WORLD_WIDTH}.0;
		
		/*ewX = ewX * ${WORLD_WIDTH * WORLD_WIDTH}.0;
		ewX = floor(ewX);
		ewX = ewX / ${WORLD_WIDTH * WORLD_WIDTH}.0;
		ewX = ewX + 0.5 / ${WORLD_WIDTH * WORLD_WIDTH}.0;
		
		ewY = ewY * ${WORLD_WIDTH * WORLD_WIDTH}.0;
		ewY = floor(ewY);
		ewY = ewY / ${WORLD_WIDTH * WORLD_WIDTH}.0;
		ewY = ewY + 0.5 / ${WORLD_WIDTH * WORLD_WIDTH}.0;*/
		
		vec2 xy = vec2(ewX, ewY);
		
		if (xy.y < 0.0) return VOID;
		if (xy.y > 1.0) return VOID;
		if (xy.x < 0.0) return VOID;
		if (xy.x > 1.0) return VOID;
		
		return texture(u_Texture, xy);
	}
	
	uniform bool u_dropperPreviousDown;
	
	bool isInDropper(float offsetX, float offsetY, float offsetZoom) {
	
		if (u_eventTime < ${EVENT_CYCLE_COUNT}.0 - 1.0) return false;
	
		vec2 space = (ew(0.0, 0.0) + vec2(offsetX, offsetY)) / offsetZoom;
		
		vec2 drop = u_dropperPosition;
		vec2 previous = u_dropperPreviousPosition;
		
		float width = u_dropperWidth * u_zoom;
				
		if (u_dropperPreviousDown) {
			vec2 diff = drop - previous;
			vec2 abs = abs(diff);
			
			float largest = max(abs.x, abs.y);
			vec2 ratio = abs / largest;
			vec2 way = sign(diff);
			vec2 inc = way * ratio;
			
			float i = 0.0;
			while (i < 1.0) {
				if (i >= largest) break;
				vec2 new = drop - inc * i;
				vec2 final = new + space.x;
				
				vec2 debug = new;
				if (space.x < debug.x + width) {
					if (space.x > debug.x - width) {
						if (space.y < debug.y + width) {
							if (space.y > debug.y - width) {
								return true;
							}
						}
					}
				}
				i = i + 1.0 / ${WORLD_WIDTH}.0;
			}
			
		
			if (space.x < u_dropperPreviousPosition.x + width) {
				if (space.x > u_dropperPreviousPosition.x - width) {
					if (space.y < u_dropperPreviousPosition.y + width) {
						if (space.y > u_dropperPreviousPosition.y - width) {
							return true;
						}
					}
				}
			}
		}
		
		
		if (space.x < u_dropperPosition.x + width) {
			if (space.x > u_dropperPosition.x - width) {
				if (space.y < u_dropperPosition.y + width) {
					if (space.y > u_dropperPosition.y - width) {
						return true;
					}
				}
			}
		}
		
		return false;
	}
	
	// Site Numbers
	const int ORIGIN = 1;
	const int BELOW = 2;
	const int BELOW_RIGHT = 3;
	const int BELOW_LEFT = 4;
	const int RIGHT = 5;
	const int LEFT = 6;
	const int ABOVE = 7;
	
	uniform vec4 u_dropperElement;
	
	bool isElement(vec4 colour, vec4 element) {
		return floor(colour * 255.0) == floor(element * 255.0);
	}
	
	void process() {
	
		${(() => {
			if (!EVENT_WINDOW) return ""
			return `
				// Am I in someone else's event window??
				if (isInWindow(0.0, 0.0)) {
					colour = BLUE;
					return;
				}
				
				// Am I an origin??
				if (isPicked(0.0, 0.0)) {
					colour = RED;
					return;
				}
				
				colour = BLANK;
				return;
			`
		})()}
	
		vec4 dropperElement = u_dropperElement;
	
		// Am I being dropped to?
		if (u_dropperDown && isInDropper(0.0, 0.0, 1.0)) {
			colour = dropperElement;
			return;
		}
		
		//=================//
		// What site am I? //
		//=================//
		int site;
		
		if (isPicked(0.0, 0.0)) site = ORIGIN;
		else if (isPicked(0.0, 1.0)) site = BELOW;
		else if (isPicked(-1.0, 1.0)) site = BELOW_RIGHT;
		else if (isPicked(1.0, 1.0)) site = BELOW_LEFT;
		else if (isPicked(-1.0, 0.0)) site = RIGHT;
		else if (isPicked(1.0, 0.0)) site = LEFT;
		else if (isPicked(0.0, -1.0)) site = ABOVE;
		else {
			colour = getColour(0.0, 0.0);
			return;
		}
		
		//=========================//
		// What do I want to read? //
		//=========================//
		vec4 elementOrigin;
		vec4 elementBelow;
		vec4 elementLeft;
		vec4 elementRight;
		vec4 elementBelowRight;
		vec4 elementBelowLeft;
		vec4 elementAbove;
		
		if (site == ORIGIN) {
			elementOrigin = getColour(0.0, 0.0);
			elementBelow = getColour(0.0, -1.0);
			elementAbove = getColour(0.0, 1.0);
			elementBelowRight = getColour(1.0, -1.0);
			elementBelowLeft = getColour(-1.0, -1.0);
			
			elementLeft = getColour(-1.0, 0.0);
			elementRight = getColour(1.0, 0.0);
		}
		else if (site == BELOW) {
			elementOrigin = getColour(0.0, 1.0);
			elementBelow = getColour(0.0, 0.0);
			elementAbove = getColour(0.0, 2.0);
			elementBelowRight = getColour(1.0, 0.0);
			elementBelowLeft = getColour(-1.0, 0.0);
			
			elementLeft = getColour(-1.0, 1.0);
			elementRight = getColour(1.0, 1.0);
		}
		else if (site == BELOW_RIGHT) {
			elementOrigin = getColour(-1.0, 1.0);
			elementBelow = getColour(-1.0, 0.0);
			elementAbove = getColour(-1.0, 2.0);
			elementBelowRight = getColour(0.0, 0.0);
			elementBelowLeft = getColour(-2.0, 0.0);
			
			elementLeft = getColour(-2.0, 1.0);
			elementRight = getColour(0.0, 1.0);
		}
		else if (site == BELOW_LEFT) {
			elementOrigin = getColour(1.0, 1.0);
			elementBelow = getColour(1.0, 0.0);
			elementAbove = getColour(1.0, 2.0);
			elementBelowRight = getColour(2.0, 0.0);
			elementBelowLeft = getColour(0.0, 0.0);
			
			elementLeft = getColour(0.0, 1.0);
			elementRight = getColour(2.0, 1.0);
		}
		else if (site == RIGHT) {
			elementOrigin = getColour(-1.0, 0.0);
			elementBelow = getColour(-1.0, -1.0);
			elementAbove = getColour(-1.0, 1.0);
			elementBelowRight = getColour(0.0, -1.0);
			elementBelowLeft = getColour(-2.0, -1.0);
			
			elementLeft = getColour(-2.0, 0.0);
			elementRight = getColour(0.0, 0.0);
		}
		else if (site == LEFT) {
			elementOrigin = getColour(1.0, 0.0);
			elementBelow = getColour(1.0, -1.0);
			elementAbove = getColour(1.0, 1.0);
			elementBelowRight = getColour(2.0, -1.0);
			elementBelowLeft = getColour(0.0, -1.0);
			
			elementLeft = getColour(0.0, 0.0);
			elementRight = getColour(2.0, 0.0);
		}
		else if (site == ABOVE) {
			elementOrigin = getColour(0.0, -1.0);
			elementBelow = getColour(0.0, -2.0);
			elementAbove = getColour(0.0, 0.0);
			elementBelowRight = getColour(1.0, -2.0);
			elementBelowLeft = getColour(-1.0, -2.0);
			
			elementLeft = getColour(-1.0, -1.0);
			elementRight = getColour(1.0, -1.0);
		}
		
		//==========================//
		// How do I behave? - WATER //
		//==========================//
		// Fall
		if (isElement(elementOrigin, WATER) && elementBelow == EMPTY) {
			elementOrigin = EMPTY;
			elementBelow = WATER;
		}
		
		else if (isElement(elementOrigin, WATER) && elementLeft == EMPTY) {
			elementOrigin = EMPTY;
			elementLeft = WATER;
		}
		
		else if (isElement(elementOrigin, WATER) && elementRight == EMPTY) {
			elementOrigin = EMPTY;
			elementRight = WATER;
		}
		
		//=============================//
		// How do I behave? - FORKBOMB //
		//=============================//
		else if (elementOrigin == FORKBOMB) {
			elementBelow = FORKBOMB;
			elementLeft = FORKBOMB;
			elementRight = FORKBOMB;
			elementAbove = FORKBOMB;
		}
		
		//=========================//
		// How do I behave? - SAND //
		//=========================//
		// Fall
		else if (elementOrigin == SAND && elementBelow == EMPTY) {
			elementOrigin = EMPTY;
			elementBelow = SAND;
		}
		
		// Slide Right
		else if (elementOrigin == SAND && elementBelow != EMPTY && elementBelowRight == EMPTY) {
			elementOrigin = EMPTY;
			elementBelowRight = SAND;
		}
		
		// Slide Left
		else if (elementOrigin == SAND && elementBelow != EMPTY && elementBelowRight != EMPTY && elementBelowLeft == EMPTY) {
			elementOrigin = EMPTY;
			elementBelowLeft = SAND;
		}
		
		//================//
		// Apply changes! //
		//================//
		if (site == ORIGIN) {
			colour = elementOrigin;
			return;
		}
		if (site == BELOW) {
			colour = elementBelow;
			return;
		}
		if (site == BELOW_RIGHT) {
			colour = elementBelowRight;
			return;
		}
		if (site == BELOW_LEFT) {
			colour = elementBelowLeft;
			return;
		}
		if (site == RIGHT) {
			colour = elementRight;
			return;
		}
		if (site == LEFT) {
			colour = elementLeft;
			return;
		}
		if (site == ABOVE) {
			colour = elementAbove;
			return;
		}
		
		colour = RED;
		
	}
	
	const vec4 u_bgColor = vec4(${BG_COLOUR.r}, ${BG_COLOUR.g}, ${BG_COLOUR.b}, 1.0);
	
	void postProcess() {
		
		${(() => EVENT_WINDOW !== 1? `
			
			if (isInDropper(u_panPosition.x, u_panPosition.y, u_zoom)) {
				colour = vec4(0.0, 1.0, 0.5, 1.0);
				return;
			}
		
		` : "")()}
		
		vec2 targetPos = (v_TexturePosition + u_panPosition) / u_zoom;
		if (targetPos.x <= 1.0 && targetPos.x >= 0.0 && targetPos.y >= 0.0 && targetPos.y <= 1.0) colour = texture(u_Texture, targetPos);
		else colour = u_bgColor;
	}
	
	void main() {
		if (!u_isPost) {
			process();
		}
		else {
			postProcess();
		}
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

const isPostLocation = gl.getUniformLocation(program, "u_isPost")
gl.uniform1ui(isPostLocation, 1)

const dropperDownLocation = gl.getUniformLocation(program, "u_dropperDown")
gl.uniform1ui(dropperDownLocation, 0)

const previousDownLocation = gl.getUniformLocation(program, "u_dropperPreviousDown")
gl.uniform1ui(previousDownLocation, 0)

const dropperPositionLocation = gl.getUniformLocation(program, "u_dropperPosition")
gl.uniform2f(dropperPositionLocation, 0, 0)

const panPositionLocation = gl.getUniformLocation(program, "u_panPosition")
gl.uniform2f(panPositionLocation, PAN_POSITION_X, PAN_POSITION_Y)

const zoomLocation = gl.getUniformLocation(program, "u_zoom")
gl.uniform1f(zoomLocation, ZOOM)

const dropperPreviousPositionLocation = gl.getUniformLocation(program, "u_dropperPreviousPosition")
gl.uniform2f(dropperPreviousPositionLocation, 0, 0)

const EMPTY = [0, 0, 0, 0]
const SAND = [1.0, 204.0 / 255.0, 0.0, 1.0]
const WATER = [0.0, 0.6, 1.0, 1.0]
const STATIC = [0.5, 0.5, 0.5, 1.0]
const FORKBOMB = [1.0, 70.0 / 255.0, 70.0 / 255.0, 1.0]
let DROPPER_ELEMENT = SAND
const dropperElementLocation = gl.getUniformLocation(program, "u_dropperElement")
gl.uniform4fv(dropperElementLocation, DROPPER_ELEMENT)

const dropperWidthLocation = gl.getUniformLocation(program, "u_dropperWidth")
gl.uniform1f(dropperWidthLocation, 1 / WORLD_WIDTH)

const timeLocation = gl.getUniformLocation(program, "u_time")
gl.uniform1f(timeLocation, 0)

const eventTimeLocation = gl.getUniformLocation(program, "u_eventTime")
gl.uniform1f(eventTimeLocation, 0)

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
	else if (RANDOM_SPAWN == 3) {
		spaces[i] = 255
		spaces[i+1] = 204
		spaces[i+3] = 255
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
let paused = false
on.keydown((e) => {
	if (e.key === " ") paused = !paused
})

let middleDown = false
on.mousedown(e => {
	if (e.button === 1) middleDown = true
})
on.mouseup(e => {
	if (e.button === 1) middleDown = false
})

let time = 0

let previousMouseX = 0
let previousMouseY = 0
const draw = async () => {
	
	previousDown = dropperDown
	dropperDown = Mouse.down || Touches.length > 0
	
	
	const diffX = Mouse.x - previousMouseX
	const diffY = Mouse.y - previousMouseY
	
	previousMouseX = Mouse.x
	previousMouseY = Mouse.y
	
	if (middleDown) {
		PAN_POSITION_X -= (diffX / WORLD_WIDTH)
		PAN_POSITION_Y += (diffY / WORLD_WIDTH)
	}
	
	gl.uniform1f(zoomLocation, ZOOM)
	gl.uniform2f(panPositionLocation, PAN_POSITION_X, PAN_POSITION_Y)
	gl.uniform4fv(dropperElementLocation, DROPPER_ELEMENT)
	
	gl.uniform1ui(dropperDownLocation, dropperDown)
	gl.uniform1ui(previousDownLocation, previousDown)
	
	gl.uniform2f(dropperPositionLocation, dropperX / WORLD_WIDTH, dropperY / WORLD_WIDTH)
	gl.uniform2f(dropperPreviousPositionLocation, previousX / WORLD_WIDTH, previousY / WORLD_WIDTH)
	gl.uniform1f(dropperWidthLocation, DROPPER_SIZE / WORLD_WIDTH)
	
	
	previousX = dropperX
	previousY = dropperY
	
	/*let cont = true
	if (EVENT_WINDOW) {
		if (cummT >= 500) cummT = 0
		else cont = false
	}*/
	
	let sourceTexture
	let frameBuffer
	let targetTexture
	
	for (let i = 0; i < EVENT_CYCLE_COUNT; i++) {
	
		time++
		while (time >= 18) time -= 18
		gl.uniform1f(timeLocation, time)
		gl.uniform1f(eventTimeLocation, i)
	
		if (currentDirection === true && !paused) {
			sourceTexture = texture1
			frameBuffer = fb2
			targetTexture = texture2
			targetFrameBuffer = fb1
			if (!paused) currentDirection = false
		}
		else {
			sourceTexture = texture2
			frameBuffer = fb1
			targetTexture = texture1
			targetFrameBuffer = fb2
			if (!paused) currentDirection = true
		}
		
		if (!paused) {
			// Target
			gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer)
			gl.bindTexture(gl.TEXTURE_2D, sourceTexture)
			gl.uniform1ui(isPostLocation, 0)
			
			gl.viewport(0, 0, WORLD_WIDTH, WORLD_WIDTH)
			gl.drawArrays(gl.TRIANGLES, 0, 6)
		}
	}
	
	// Canvas
	gl.bindFramebuffer(gl.FRAMEBUFFER, null)
	gl.bindTexture(gl.TEXTURE_2D, targetTexture)
	gl.uniform1ui(isPostLocation, 1)
	
	gl.viewport(0, 0, canvas.clientWidth, canvas.clientWidth)
	gl.drawArrays(gl.TRIANGLES, 0, 6)
	
	if (EVENT_WINDOW) await wait(500)
	requestAnimationFrame(draw)
}

requestAnimationFrame(draw)

//=========//
// Dropper //
//=========//
let DROPPER_SIZE = 1

let dropperDown = false
let dropperX = 0
let dropperY = 0

let previousDown = false
let previousX = 0
let previousY = 0

const ZOOM_SPEED = 0.05
on.mousewheel((e) => {
	if (Keyboard.Shift) {
		if (e.deltaY < 0) {
			DROPPER_SIZE++
			//if (DROPPER_SIZE > 15) DROPPER_SIZE = 15
		}
		else if (e.deltaY > 0) {
			DROPPER_SIZE--
			if (DROPPER_SIZE < 1) DROPPER_SIZE = 1
		}
	}
	else {
		if (e.deltaY < 0) {
			ZOOM += ZOOM_SPEED
			PAN_POSITION_X += ZOOM_SPEED * 0.5
			PAN_POSITION_Y += ZOOM_SPEED * 0.5
			updateDropperPos()
		}
		else if (e.deltaY > 0) {
			ZOOM -= ZOOM_SPEED
			const [x, y] = getTheoreticalDropperPos()
			const xRatio = (x / WORLD_WIDTH)
			const yRatio = (y / WORLD_WIDTH)
			PAN_POSITION_X -= ZOOM_SPEED * 0.5
			PAN_POSITION_Y -= ZOOM_SPEED * 0.5
			updateDropperPos()
		}
	}
})


const getTheoreticalDropperPos = () => {
	const x = Math.round((((Mouse.x - canvas.offsetLeft) / canvas.clientWidth) + PAN_POSITION_X) * WORLD_WIDTH / ZOOM)
	const y = WORLD_WIDTH / ZOOM - Math.round((((Mouse.y - CANVAS_MARGIN) / canvas.clientWidth) - PAN_POSITION_Y) * WORLD_WIDTH / ZOOM)
	return [x, y]
}

const updateDropperPos = (reset = false) => {
	[dropperX, dropperY] = getTheoreticalDropperPos()
	return
	;dropperX = Math.round((((Mouse.x - canvas.offsetLeft) / canvas.clientWidth) + PAN_POSITION_X) * WORLD_WIDTH)
	dropperY = WORLD_WIDTH - Math.round((((Mouse.y - CANVAS_MARGIN) / canvas.clientWidth) - PAN_POSITION_Y) * WORLD_WIDTH)
	if (reset) {
		previousX = dropperX
		previousY = dropperY
	}
}

canvas.on.mousemove((e) => {
	return updateDropperPos()
	/*dropperX = Math.round(((e.offsetX / canvas.clientWidth) + PAN_POSITION_X) * WORLD_WIDTH)
	dropperY = WORLD_WIDTH - Math.round(((e.offsetY / canvas.clientHeight) - PAN_POSITION_Y) * WORLD_WIDTH)*/
})

canvas.on.touchstart(e => {
	dropperX = Math.round(((e.changedTouches[0].clientX - canvas.offsetLeft) / canvas.clientWidth) * WORLD_WIDTH)
	dropperY = WORLD_WIDTH - Math.round(((e.changedTouches[0].clientY - CANVAS_MARGIN) / canvas.clientWidth) * WORLD_WIDTH)
	e.preventDefault()
})

canvas.on.touchmove(e => {
	dropperX = Math.round(((e.changedTouches[0].clientX - canvas.offsetLeft) / canvas.clientWidth) * WORLD_WIDTH)
	dropperY = WORLD_WIDTH - Math.round(((e.changedTouches[0].clientY - CANVAS_MARGIN) / canvas.clientWidth) * WORLD_WIDTH)
	e.preventDefault()
})

