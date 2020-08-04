
//========//
// Canvas //
//========//
const makeCanvas = () => {
	const style = `
		width: 100%;
		height: 100%;
	`
	return HTML `<canvas style="${style}"></canvas>`
}

//========//
// Shader //
//========//
const makeShader = (gl, type, source) => {

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
		throw new Error(`\n\n[SandPond] Compilation Error: ${typeName}\n\n${log}`)
	}
	
	print(`[SandPond] Compilation Success: ${typeName}`)
	return shader
}

//=========//
// Program //
//=========//
const makeProgram = (gl, vertexShader, fragmentShader) => {
	
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
		outColor = vec4(1, 0, 0.5, 1);
	}
`

//=======//
// Setup //
//=======//
const canvas = makeCanvas()
document.body.appendChild(canvas)
const gl = canvas.getContext("webgl2")

makeShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
makeShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)

