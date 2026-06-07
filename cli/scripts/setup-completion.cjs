#!/usr/bin/env node

try {
  const omelette = require('omelette');
  const completion = omelette('devswitch <action> <profile>');
  console.log('✅ DevSwitch tab completion enabled!');
  console.log('   Run: source ~/.bashrc  (or restart terminal)');
  completion.setupShellInitFile();
} catch (err) {
  // Silent catch so it never fails npm install on Windows or unsupported environments
}
