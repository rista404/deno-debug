all: fmt test

demo:
	DEBUG=* deno run -c tsconfig.json --allow-env ./demo.ts

test:
	DEBUG=* deno test --allow-env -c tsconfig.json

fmt:
	deno fmt