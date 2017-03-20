// const rc = require('rc');
const co = require('co');
const colors = require('colors');
const promisify = require('promisify-node');
const fs = promisify('fs');
const tmp = require('tmp');
const zlib = require('zlib');
const path = require('path');
const spawn = require('child_process').spawn;
// const r2promise = require('r2pipe-promise');

const useScript = true;

class NewRegressions {
  constructor () {
    this.promises = [];
    process.env.RABIN2_NOPLUGINS = 1;
    process.env.RASM2_NOPLUGINS = 1;
    process.env.R2_NOPLUGINS = 1;
  }

  runTest (test) {
    return new Promise((resolve, reject) => {
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
            args.push('-c', test.cmds.join(';'));
          }
        // append testfile
          args.push(binPath(test.file));

          let res = '';
          let ree = '';
          const child = spawn('r2', args);
          child.stdout.on('data', data => {
            res += data.toString();
          });
          child.stderr.on('data', data => {
            ree += data.toString();
          });
          child.on('close', data => {
            if (!checkTest(test, res, ree)) {
              console.log('$ r2', args.join(' '));
              console.log(test.cmdScript);
              console.log('---');
              console.log(test.expect.trim().replace(/ /g, '~'));
              console.log('+++');
              console.log(res.trim().replace(/ /g, '~'));
              console.log('===');
            }

            if (test.tmpScript) {
            // TODO use yield
              fs.unlinkSync(test.tmpScript);
              test.tmpScript = null;
            }
            resolve(res);
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

  runTests (lines) {
    let test = {};
    for (let l of lines) {
      const line = l.trim();
      if (line.length === 0) {
        break;
      }
      if (line === 'RUN') {
        if (test.file && test.cmds) {
          this.promises.push(this.runTest(test));
        }
        test = {};
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
          test.args = v;
          break;
        case 'CMDS':
          test.cmdScript = debase64(v);
          test.cmds = test.cmdScript.trim().split('\n');
          break;
        case 'EXPECT':
          test.expect = debase64(v);
          break;
        case 'FILE':
          test.file = v;
          break;
        default:
          throw new Error('Invalid database, key =', k);
      }
    }
    if (Object.keys(test) !== 0) {
      if (test.file && test.cmds) {
        this.promises.push(this.runTest(test));
      }
    }
  }

  load (fileName, cb) {
    const blob = fs.readFileSync(path.join(__dirname, 'db', fileName));
    zlib.gunzip(blob, (err, data) => {
      if (err) {
        throw new Error('Cannot gunzip', fileName);
      }
      this.runTests(data.toString().split('\n'));
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

main();

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

function main () {
  const nr = new NewRegressions();
  nr.load('t/cmd_pd', (err, data) => {
    if (err) {
//      console.error(err.message);
      return 1;
    }
    // console.log(data);
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

function checkTest (test, stdout, stderr) {
  test.passes = test.expectErr ? test.expectErr.trim() === stderr.trim() : true;
  if (test.passes) {
    test.passes = test.expect.trim() === stdout.trim();
  }
  const status = (test.passes)
    ? (test.broken ? colors.yellow('FX') : colors.green('OK'))
    : (test.broken ? colors.blue('BR') : colors.red('XX'));
  console.log(status, test.name);
  return test.passes;
}
