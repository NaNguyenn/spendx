#!/usr/bin/env node

/**
 * expo-env.d.ts supplies the ambient types (CSS modules, etc.) that come from
 * `expo/types`. The Expo CLI writes it itself as a side effect of `expo start`
 * (see @expo/cli's start/server/type-generation/expo-env.js, mirrored here),
 * which is why it's gitignored — but CI runs `tsc` without ever starting the
 * dev server, so nothing would create it there. Run before typecheck to keep
 * the file self-sufficient in a clean checkout.
 */

const fs = require('fs');
const path = require('path');

const template = `/// <reference types="expo/types" />

// NOTE: This file should not be edited and should be in your git ignore`;

// Run as an npm script, so cwd is always the package root.
fs.writeFileSync(path.join(process.cwd(), 'expo-env.d.ts'), template);
