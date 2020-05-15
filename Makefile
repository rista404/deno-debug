all: fmt test

demo:
	DEBUG=* deno run --allow-env ./demo.ts

test:
	DEBUG=* deno test --allow-env

fmt:
	deno fmt