const co = require('co');
const colors = require('colors');
const promisify = require('promisify-node');
const walk = require('walk').walk;
const fs = promisify('fs');
const tmp = require('tmp');
const zlib = require('zlib');
const path = require('path');
const spawn = require('child_process').spawn;
const spawnSync = require('child_process').spawnSync;
const r2promise = require('r2pipe-promise');

// set this to false to avoid creating files
let useScript = true;

/* radare2 binary name */
const r2bin = 'radare2';

class NewRegressions {
  constructor (argv, cb) {
    this.argv = argv;
    this.report = {
      total: 0,
      success: 0,
      failed: 0,
      broken: 0,
      fixed: 0
    };
    useScript = !argv.c;
    this.promises = [];
    // reduce startup times of r2
    process.env.RABIN2_NOPLUGINS = 1;
    process.env.RASM2_NOPLUGINS = 1;
    process.env.R2_NOPLUGINS = 1;
    r2promise.open('-').then(r2 => {
      this.r2 = r2;
      cb(null, r2);
    }).catch(e => {
      cb(e);
    });
  }

  callbackFromPath (from) {
    for (let row of [
      [path.join('db', 'cmd'), this.runTest],
      [path.join('db', 'asm'), this.runTestAsm],
      [path.join('db', 'bin'), this.runTestBin]
    ]) {
      const [txt, cb] = row;
      if (from.indexOf(txt) !== -1) {
        return cb;
      }
    }
    return null;
  }

  quit () {
    const promise = this.r2 !== null
      ? this.r2.quit()
      : new Promise(resolve => resolve());
    this.r2 = null;
    return promise;
  }

  runTestAsm (test, cb) {
    const self = this;
    return new Promise((resolve, reject) => {
      try {
        co(function * () {
          test.stdout = yield self.r2.cmd(test.cmd);
          //yield self.r2.quit();
          return resolve(cb(test));
        });
      } catch (e) {
        console.error(e);
        reject(e);
      }
    });
  }

  runTestBin (test, cb) {
    const testPath = test.path;
    return new Promise((resolve, reject) => {
      const promises = [];
      const walker = walk(test.path, {followLinks: false});
      walker.on('file', (root, stat, next) => {
        const newTest = Object.assign({}, test);
        newTest.path = path.join(testPath, stat.name);
        promises.push(this.runTestBinFile(newTest, cb));
        next();
      });
      walker.on('end', () => {
        Promise.all(promises).then(res => {
          console.log('Bins Done');
          resolve();
        }).catch(reject);
      });
    });
  }

  runTestBinFile (test, cb) {
    return new Promise((resolve, reject) => {
      try {
        co(function * () {
          const args = [
            '-escr.utf8=0',
            '-escr.color=0',
            '-c',
            '?e init',
            '-qcq',
            '-A', // configurable to AAA, or just A somehow
            test.path
          ];
          test.birth = null;
          const child = spawn(r2bin, args);
          child.stdout.on('data', data => {
            // console.log(data.toString());
            if (test.birth === null) {
              test.birth = new Date();
            }
          });
          child.stderr.on('data', data => {
          //  console.error(data.toString());
          });
          child.on('close', data => {
            test.death = new Date();
            test.lifetime = test.death - test.birth;
            return resolve(cb(test));
          });
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  runTestFuzz (test, cb) {
    return new Promise((resolve, reject) => {
      try {
        co(function * () {
          const args = ['-c', '?e init', '-qcq', '-A', test.path];
          test.birth = new Date();
          const child = spawnSync(r2bin, args, {timeout: 20000});
          test.death = new Date();
          test.lifetime = test.death - test.birth;
          if (child.error) {
            test.expectErr = 'N';
            test.stderr = 'X';
            test.spawnArgs = args;
            test.cmdScript = '';
            return reject(cb(test));
          } else {
            return resolve(cb(test));
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  runTest (test, cb) {
    return new Promise((resolve, reject) => {
      if (this.argv.l) {
        console.log(test.from.replace('db/', ''), test.name);
        return resolve();
      }
      co(function * () {
        const args = [
          '-escr.utf8=0',
          '-escr.color=0',
          '-N',
          '-Q'
        ];
        // append custom r2 args
        if (test.args && test.args.length > 0) {
          args.push(...test.args.split(' '));
        }
        try {
          if (useScript) {
            // much slower than just using -c
            test.tmpScript = yield createTemporaryFile();
          // TODO use yield here
            yield fs.writeFile(test.tmpScript, test.cmdScript);
            args.push('-i', test.tmpScript);
          } else {
            if (!test.cmds && test.cmdScript) {
              test.cmds = test.cmdScript.split('\n');
            }
            args.push('-c', test.cmds.join(';'));
          }
        // append testfile
          args.push(binPath(test.file));

          let res = '';
          let ree = '';
          test.spawnArgs = args;
          const child = spawn(r2bin, args);
          child.stdout.on('data', data => {
            res += data.toString();
          });
          child.stderr.on('data', data => {
            ree += data.toString();
          });
          child.on('close', data => {
            try {
              if (test.tmpScript) {
                // TODO use yield
                fs.unlinkSync(test.tmpScript);
                test.tmpScript = null;
              }
            } catch (e) {
              console.error(e);
              // ignore
            }
            test.stdout = res;
            test.stderr = ree;
            resolve(cb(test));
          });
        } catch (e) {
          console.error(e);
          reject(e);
        }
/*
        // using r2pipe, maybe viable for some tests
        let res = '';
        let r2 = null;
        try {
          const testPath = binPath(test.file);
          r2 = yield r2promise.open(testPath);
          for (let cmd in test.cmds) {
            res += yield r2.cmd(cmd);
          }
          if (r2 !== null) {
            yield r2.quit();
          }
          if (res.expect === res) {
            console.log('OK', test.name);
          } else {
            console.log('XX', test.name);
          }
          resolve(res);
        } catch (err) {
          console.error(err);
          process.exit(1);
          if (r2 !== null) {
            yield r2.quit();
          }
          return reject(err);
        }
*/
      });
    });
  }

  runTests (source, lines) {
    let test = {from: source};
    for (let l of lines) {
      const line = l.trim();
      if (line.length === 0 || line[0] === '#') {
        continue;
      }
      // TODO: run specific test type depending on directory db/[asm|cmd|unit]
      if (source.indexOf('asm') !== -1) {
        const testCallback = this.callbackFromPath(test.from);
        if (testCallback !== null) {
          let p = parseTestAsm (source, line);
          for (let t of p) {
            test = t;
            this.promises.push(testCallback.bind(this)(test, this.checkTestResult.bind(this)));
          }
          continue;
        }
      }
      if (line === 'RUN') {
        const testCallback = this.callbackFromPath(test.from);
        if (testCallback !== null) {
          this.promises.push(testCallback.bind(this)(test, this.checkTestResult.bind(this)));
          test = {from: source};
          continue;
        }
      }
      const eq = l.indexOf('=');
      if (eq === -1) {
        throw new Error('Invalid database', l);
      }
      const k = l.substring(0, eq);
      const v = l.substring(eq + 1);
      switch (k) {
        case 'NAME':
          test.name = v;
          break;
        case 'PATH':
          test.path = v;
          break;
        case 'ARGS':
          test.args = v || [];
          break;
        case 'CMDS':
          test.cmdScript = v;
          test.cmds = test.cmdScript ? test.cmdScript.trim().split('\n') : [];
          break;
        case 'CMDS64':
          test.cmdScript = debase64(v);
          test.cmds = test.cmdScript ? test.cmdScript.trim().split('\n') : [];
          break;
        case 'ARCH':
          test.arch = v;
          break;
        case 'BITS':
          test.bits = v;
          break;
        case 'BROKEN':
          test.broken = true;
          break;
        case 'EXPECT':
          test.expect = v;
          break;
        case 'EXPECT64':
          test.expect = debase64(v);
          break;
        case 'EXPECT_ERR':
          test.expect = v;
          break;
        case 'EXPECT_ERR64':
          test.expect = debase64(v);
          break;
        case 'FILE':
          test.file = v;
          break;
        default:
          throw new Error('Invalid database, key =(', k, ')');
      }
    }
    if (Object.keys(test) !== 0) {
      if (test.file && test.cmds) {
        this.promises.push(this.runTest(test));
      }
    }
  }

  runFuzz (dir, files) {
    let test = {};
    for (let f of files) {
      test = {from: dir, name: 'fuzz', path: path.join(dir, f)};
      this.promises.push(this.runTestFuzz.bind(this)(test, this.checkTestResult.bind(this)));
    }
  }


  load (fileName, cb) {
    const blob = fs.readFileSync(path.join(__dirname, fileName));
    zlib.gunzip(blob, (err, data) => {
      if (err) {
        this.runTests(fileName, blob.toString().split('\n'));
      } else {
        this.runTests(fileName, data.toString().split('\n'));
      }
      Promise.all(this.promises).then(res => {
        console.log('[--]', this.report);
        cb(null, res);
      }).catch(err => {
        console.log(err);
        cb(err);
      });
    });
  }

  loadFuzz (dir, cb) {
    console.log('[--]', 'fuzz binaries');
    const fuzzed = fs.readdirSync(dir);
    this.runFuzz(dir, fuzzed);
    Promise.all(this.promises).then(res => {
      console.log('[--]', this.report);
      cb(null, res);
    }).catch(err => {
      console.log(err);
      cb(err);
    });
  }

  checkTest (test) {
    test.passes = test.expectErr ? test.expectErr.trim() === test.stderr.trim() : true;
    if (test.passes && test.stdout && test.expect) {
      test.passes = test.expect.trim() === test.stdout.trim();
    }
    const status = (test.passes)
    ? (test.broken ? colors.yellow('FX') : colors.green('OK'))
    : (test.broken ? colors.blue('BR') : colors.red('XX'));
    this.report.total++;
    if (test.passes) {
      if (test.broken) {
        this.report.fixed++;
      } else {
        this.report.success++;
      }
    } else {
      if (test.broken) {
        this.report.broken++;
      } else {
        this.report.failed++;
      }
    }
    if (process.env.NOOK) {
      if (status !== colors.green('OK')) {
        console.log('[' + status + ']', colors.yellow(test.name), test.path, test.lifetime);
      }
    } else {
      console.log('[' + status + ']', colors.yellow(test.name), test.path, test.lifetime);
    }
    return test.passes;
  }

  checkTestResult (test) {
    if (!this.checkTest(test)) {
      console.log('$ r2', test.spawnArgs ? test.spawnArgs.join(' ') : '');
      console.log(test.cmdScript);
      if (test.expect !== null) {
        console.log('---');
        console.log(colors.red(test.expect.trim().replace(/ /g, '~')));
      }
      if (test.stdout !== null) {
        console.log('+++');
        console.log(colors.green(test.stdout.trim().replace(/ /g, '~')));
      }
      console.log('===');
    }
  }
}

function createTemporaryFile () {
  return new Promise((resolve, reject) => {
    try {
      tmp.file(function (err, filePath, fd, cleanupCallback) {
        if (err) {
          return reject(err);
        }
        resolve(filePath);
      });
    } catch (e) {
      reject(e);
    }
  });
}

function parseTestAsm (source, line) {
  /* Parse first argument */
  let args = line.match(/(".*?"|[^"\s]+)+(?=\s*|\s*$)/g);
  let type = args[0];
  let asm = args[1].split('"').join('');
  let expect = args[2];

  let tmp = source.split(path.sep);
  const arch = tmp[tmp.length -1];
  let cmd = '';
  let name = '';
  let tests = [];
  /* TODO Handle _ in name to set bits ie: x86_64 x86_32 */

  /* Generate tests */
  for (let c of type) {
    switch (c) {
      case 'd':
        cmd = 'pad ' + expect + ' @a:' + arch;
        exp = asm;
        name = arch + ': ' + expect + ' => "' + asm + '"';
        break;
      case 'a':
        cmd = 'pa ' + asm + ' @a:' + arch;
        exp = expect;
        name = arch + ': "' + asm + '" => ' + expect;
        break;
    }
    tests.push({from: source, cmd: cmd, name: name, expect: exp});
  }
  return tests;
}

function debase64 (msg) {
  return new Buffer(msg, 'base64').toString('utf8');
}

function binPath (file) {
  if (file && file[0] === '.') {
    return path.join(__dirname, file);
  }
  return file;
}

module.exports = NewRegressions;
