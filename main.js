
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
const createBuffer = (bindPoint = gl.ARRAY_BUFFER, hint = gl.STATIC_DRAW, data) => {
	const buffer = gl.createBuffer()
	const typedData = new Float32Array(data)
	gl.bindBuffer(bindPoint, buffer)
	gl.bufferData(bindPoint, typedData, hint)
	return buffer
}

//========//
// Attrib //
//========//
const createAttrib = ({
	name,
	size,
	type = gl.FLOAT,
	normalise = false,
	stride = 0,
	offset = 0,
	data,
	bindPoint,
	hint,
}) => {
	const attribLocation = gl.getAttribLocation(program, "a_position")
	const buffer = createBuffer(bindPoint, hint, data)
	const vertexArray = gl.createVertexArray()
	vertexArray.length = data.length
	gl.bindVertexArray(vertexArray)
	gl.enableVertexAttribArray(attribLocation)
	gl.vertexAttribPointer(attribLocation, size, type, normalise, stride, offset)
	return {
		vertexArray,
		count: data.length / size,
	}
}

const drawAttrib = (attrib) => {
	gl.bindVertexArray(attrib.vertexArray)
	gl.drawArrays(gl.TRIANGLES, 0, attrib.count)
}

//===============//
// Vertex Shader //
//===============//
const vertexShaderSource = `#version 300 es

	in vec4 a_position;
	 
	void main() {
		gl_Position = a_position;
	}
`

//=================//
// Fragment Shader //
//=================//
var fragmentShaderSource = `#version 300 es

	precision highp float;
	out vec4 outColor;

	void main() {
		outColor = vec4(1, 0.8, 0.0, 1);
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
const positionAttrib = createAttrib({
	name: "a_position",
	size: 2,
	data: [
		0.0, 0.0,
		0.0, 0.5,
		0.5, 0.5,
		
		0.5, 0.5,
		0.5, 0.0,
		0.0, 0.0,
	],
})

//======//
// Draw //
//======//
drawAttrib(positionAttrib)




