
//========//
// Canvas //
//========//
const makeCanvas = () => {
	const style = `
		background-color: rgb(47, 51, 61)
	`
	const canvas = HTML `<canvas style="${style}"></canvas>`
	return canvas
}
	
const resizeCanvas = (canvas) => {
	const smallestDimension = Math.min(document.body.clientWidth, document.body.clientHeight)
	canvas.style.width = smallestDimension + "px"
	canvas.style.height = smallestDimension + "px"
	
	canvas.width = canvas.clientWidth
	canvas.height = canvas.clientHeight
}

//=========//
// Context //
//=========//
const makeContext = (canvas) => canvas.getContext("webgl2")
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
const WORLD_WIDTH = 100
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
var fragmentShaderSource = `#version 300 es

	precision highp float;
	
	in vec2 v_TexturePosition;
	in float v_isTarget;
	
	uniform sampler2D u_Texture;
	
	out vec4 colour;
	
	void main() {
		vec2 position = (v_TexturePosition);
		colour = texture(u_Texture, position);
		colour.r = colour.r - 0.01;
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
gl.vertexAttribPointer(texturePositionLocation, 2, gl.FLOAT, true, 0, 0)

const texture1 = gl.createTexture()
gl.bindTexture(gl.TEXTURE_2D, texture1)
const spaces = new Uint8Array(WORLD_WIDTH * WORLD_WIDTH)
for (let i = 0; i < spaces.length; i++) {
	spaces[i] = Math.floor(Math.random() * 2) * 255
}
gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, WORLD_WIDTH, WORLD_WIDTH, 0, gl.RED, gl.UNSIGNED_BYTE, spaces)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

const fb1 = gl.createFramebuffer()
gl.bindFramebuffer(gl.FRAMEBUFFER, fb1)
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture1, 0);

const texture2 = gl.createTexture()
gl.bindTexture(gl.TEXTURE_2D, texture2)
gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, WORLD_WIDTH, WORLD_WIDTH, 0, gl.RED, gl.UNSIGNED_BYTE, null)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

const fb2 = gl.createFramebuffer()
gl.bindFramebuffer(gl.FRAMEBUFFER, fb2)
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture2, 0);

//======//
// Draw //
//======//
let currentTexture = 1
const draw = () => {
	
	let sourceTexture
	let frameBuffer
	let targetTexture
	if (currentTexture === 1) {
		sourceTexture = texture1
		frameBuffer = fb2
		targetTexture = texture2
		currentTexture = 2
	}
	else {
		sourceTexture = texture2
		frameBuffer = fb1
		targetTexture = texture1
		currentTexture = 1
	}
	
	// Target
	gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer)
	gl.bindTexture(gl.TEXTURE_2D, sourceTexture)
	gl.uniform1ui(isTargetLocation, 1)
	
	gl.clearColor(1, 1, 1, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
	gl.viewport(0, 0, WORLD_WIDTH, WORLD_WIDTH)
	gl.drawArrays(gl.TRIANGLES, 0, 6)
	
	// Canvas
	gl.bindFramebuffer(gl.FRAMEBUFFER, null)
	gl.bindTexture(gl.TEXTURE_2D, targetTexture)
	gl.uniform1ui(isTargetLocation, 0)
	
	gl.clearColor(1, 1, 1, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
	gl.viewport(0, 0, canvas.clientWidth, canvas.clientWidth)
	gl.drawArrays(gl.TRIANGLES, 0, 6)
	
	requestAnimationFrame(draw)
}

requestAnimationFrame(draw)




