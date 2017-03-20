const co = require('co');
const colors = require('colors');
const promisify = require('promisify-node');
const fs = promisify('fs');
const tmp = require('tmp');
const zlib = require('zlib');
const path = require('path');
const spawn = require('child_process').spawn;
const r2promise = require('r2pipe-promise');

// set this to false to avoid creating files
let useScript = true;

class NewRegressions {
  constructor (argv, cb) {
    this.argv = argv;
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
      // return resolve(cb(test));
      try {
        co(function * () {
          const arch = path.basename(test.from);
        // a playground session.. we may probably want to bump some more
          const cmd = 'pa ' + test.name + ' @a:' + arch;
          test.stdout = yield self.r2.cmd(cmd);
          yield self.r2.quit();
          return resolve(cb(test));
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  runTestDis (test, cb) {
    const self = this;
    return new Promise((resolve, reject) => {
      co(function * () {
        const arch = path.basename(test.from);
        // a playground session.. we may probably want to bump some more
        const cmd = 'pad ' + test.name + ' @a:' + arch;
        test.stdout = yield self.r2.cmd(cmd);
        return resolve(cb(test));
      });
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
          const child = spawn('r2', args);
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
      if (line === 'RUN_ASM') {
        this.promises.push(this.runTestAsm(test, checkTestResult));
        test = {from: source};
        continue;
      } else if (line === 'RUN_DIS') {
        this.promises.push(this.runTestDis(test, checkTestResult));
        test = {from: source};
        continue;
      } else if (line === 'RUN') {
        if (test.file && test.cmds) {
          this.promises.push(this.runTest(test, checkTestResult));
        }
        test = {from: source};
        continue;
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
        case 'ARGS':
          test.args = v || [];
          break;
        case 'CMDS':
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
        case 'FILE':
          test.file = v;
          break;
        default:
          throw new Error('Invalid database, key =(', l, ')');
      }
    }
    if (Object.keys(test) !== 0) {
      if (test.file && test.cmds) {
        this.promises.push(this.runTest(test));
      }
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
 //       console.log(res);
        cb(null, res);
      }).catch(err => {
  //      console.log(err);
        cb(err);
      });
    });
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

function debase64 (msg) {
  return new Buffer(msg, 'base64').toString('utf8');
}

function binPath (file) {
  if (file && file[0] === '.') {
    return path.join(__dirname, file);
  }
  return file;
}

function checkTest (test) {
  test.passes = test.expectErr ? test.expectErr.trim() === test.stderr.trim() : true;
  if (test.passes && test.stdout && test.expect) {
    test.passes = test.expect.trim() === test.stdout.trim();
  }
  const status = (test.passes)
    ? (test.broken ? colors.yellow('FX') : colors.green('OK'))
    : (test.broken ? colors.blue('BR') : colors.red('XX'));
  console.log(status, test.name);
  return test.passes;
}

module.exports = NewRegressions;

function checkTestResult (test) {
  if (!checkTest(test)) {
    console.log('$ r2', test.spawnArgs ? test.spawnArgs.join(' ') : '');
    console.log(test.cmdScript);
    if (test.expect !== null) {
      console.log('---');
      console.log(test.expect.trim().replace(/ /g, '~'));
    }
    if (test.stdout !== null) {
      console.log('+++');
      console.log(test.stdout.trim().replace(/ /g, '~'));
    }
    console.log('===');
  }
}
