import { serve } from "https://deno.land/std@0.63.0/http/server.ts"
import { serveFile } from "https://deno.land/std@0.63.0/http/file_server.ts"
const s = serve({port: 8000 })
console.log("Server Running")
for await (const req of s) {
	console.log(req.url)
	const url = req.url.split("?")[0]
	try {
		const content = await serveFile(req, `${Deno.cwd()}${url}`)
		req.respond(content)
	} catch {
		req.respond({status: 404})
	}
}