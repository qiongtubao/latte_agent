# latte_agent 项目构建和测试命令
# latte_code_agent 的 mark_feature_passed 工具会自动执行 make build 和 make test

.PHONY: build test lint dev typecheck

build:
	npx vite build

test:
	npx vitest run

lint:
	npx eslint . --ext .vue,.ts,.tsx

dev:
	npx vite

typecheck:
	npx vue-tsc --noEmit
