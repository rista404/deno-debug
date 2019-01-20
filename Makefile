all: fmt test

test:
	DEBUG=* deno --allow-env ./test.ts

fmt:
	prettier --no-color --write *.md *.ts *.yml