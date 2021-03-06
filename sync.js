const fs = require('fs');
const globrex = require('globrex');
const globalyzer = require('globalyzer');
const { join, resolve, relative } = require('path');

const isHidden = /(^|\/)\.[^\/\.]/g;
const giveup = rgx => !rgx || rgx == '/^((?:[^\\/]*(?:\\/|$))*)$/';

let CACHE = {};

function walk(output, prefix, lexer, opts, dirname='', level=0) {
  const rgx = lexer.segments[level];
  const dir = join(opts.cwd, prefix, dirname);
  const files = fs.readdirSync(dir);
  const { dot, filesOnly } = opts;

  let i=0, len=files.length, file;
  let fullpath, relpath, stats, isMatch;

  for (; i < len; i++) {
    fullpath = join(dir, file=files[i]);
    relpath = dirname ? join(dirname, file) : file;
    if (!dot && isHidden.test(relpath)) continue;
    isMatch = lexer.regex.test(relpath);

    if ((stats=CACHE[relpath]) === void 0) {
      CACHE[relpath] = stats = fs.lstatSync(fullpath);
    }

    if (!stats.isDirectory()) {
      isMatch && output.push(relative(opts.cwd, fullpath));
      continue;
    }

    if (rgx && !rgx.test(file)) continue;
    !filesOnly && isMatch && output.push(join(prefix, relpath));

    walk(output, prefix, lexer, opts, relpath, giveup(rgx) ? null : level + 1);
  }
}

/**
 * Find files using bash-like globbing.
 * All paths are normalized compared to node-glob.
 * @param {String} str Glob string
 * @param {String} [options.cwd='.'] Current working directory
 * @param {Boolean} [options.dot=false] Include dotfile matches
 * @param {Boolean} [options.absolute=false] Return absolute paths
 * @param {Boolean} [options.filesOnly=false] Do not include folders if true
 * @param {Boolean} [options.flush=false] Reset cache object
 * @returns {Array} array containing matching files
 */
module.exports = function (str, opts={}) {
  let glob = globalyzer(str);

  if (!glob.isGlob) return fs.existsSync(str) ? [str] : [];
  if (opts.flush) CACHE = {};

  let matches = [];
  opts.cwd = opts.cwd || '.';
  const patterns = globrex(glob.glob, { globstar:true, extended:true });

  walk(matches, glob.base, patterns, opts, '.', 0);

  return opts.absolute ? matches.map(x => resolve(opts.cwd, x)) : matches;
};
