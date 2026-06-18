#!/bin/bash
export PATH="/Users/ryanrichard/.nvm/versions/node/v24.12.0/bin:$PATH"
cd /Users/ryanrichard/projecont/Rayo/apps/rayo
npx vitest run tests/folha-dealer-engine.test.js tests/folha-dealer-conference-xlsx.test.js tests/folha-dealer-dealer-txt-layout.test.js tests/folha-dealer-dealer-txt-exporter.test.js --reporter=verbose
