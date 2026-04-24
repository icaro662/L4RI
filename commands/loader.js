import { definition as ytDef, execute as ytExecute } from './youtube.js';
import { definition as freeDef, execute as freeExecute } from './freeGames.js';
import { definition as pastaDef, execute as pastaExecute } from './pasta.js';
import { definition as grokDef, execute as grokExecute } from './grok.js';
import { definition as analyzeDef, execute as analyzeExecute } from './analyze.js';
import { definition as searchDef, execute as searchExecute } from './search.js';
import { definition as imgDef, execute as imgExecute } from './imgSearch.js';

export const commands = new Map([
  ['yt',   { definition: ytDef,   execute: ytExecute }],
  ['free', { definition: freeDef, execute: freeExecute }],
  ['pasta', { definition: pastaDef, execute: pastaExecute}],
  ['grok', { definition: grokDef, execute: grokExecute}],
  ['analyze', {definition: analyzeDef, execute: analyzeExecute}],
  ['search', { definition: searchDef, execute: searchDef}],
  ['img', { definition: imgDef, execute: imgDef}],
]);