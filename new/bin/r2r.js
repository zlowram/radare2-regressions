#!/usr/bin/env node

const NewRegressions = require('..');

const fs = require('fs');
const minimist = require('minimist');
const walk = require('walk').walk;
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
rl.on('line', line => {
          // rl.close();
  if (rl.cb) {
    rl.cb(null, line.trim());
    rl.cb = null;
  }
});
rl.on('error', err => {
  if (rl.cb) {
    rl.cb(err);
    rl.cb = null;
  }
});

const flagMap = {
  '-i': '--interactive',
  '-v': '--verbose'
};
const args = process.argv.slice(2).map(_ => {
  return flagMap[_] || _;
});

main(minimist(args, {
  boolean: ['v', 'verbose', 'i', 'interactive']
}));

function main (argv) {
  if (argv.h) {
    console.log(`
Usage: r2r [options] [file] [name] ([cmds])
 -a    add new test
 -b    mark failing tests as broken
 -c    use -c instead of -i to run r2 (EXPERIMENTAL)
 -d    delete test
 -e    edit test
 -f    fix tests that are not passing
 -i    interactive mode
 -j    output in JSON
 -l    list all tests
 -u    unmark broken in fixed tests
 -v    be verbose (show broken tests and use more newlines)
`);
    return 0;
  }

  const nr = new NewRegressions(argv, function ready (err, res) {
    if (err) {
      return 1;
    }

    if (argv.e) {
      // nr.quit();
     // return 0;
    }
    if (argv.a) {
      console.error('Use: r2r -a instead of r2r.js for now');
/*
      const test = {
        from: argv.a,
        name: argv._[0],
        cmdScript: argv._[1],
        file: argv._[2] || 'malloc://128' // maybe -- ?
      };
      nr.runTest(test, (res) => {
        delete res.spawnArgs;
        // TODO: include this into the given test
        console.log(JSON.stringify(res, null, '  '));
      }).then(res => {
      // console.log('RESULT', res);
      }).catch(err => {
        console.error(err);
      });
*/
      nr.quit();
      return 0;
    }

    // Load tests
    const walker = walk('db', {followLinks: false});
    const filter = argv._[0] || '';
    walker.on('file', (root, stat, next) => {
      const testFile = path.join(root, stat.name);
      if (testFile.indexOf(filter) === -1) {
        return next();
      }
      // console.log('[--]', 'run', testFile);
      if (testFile.indexOf('/.') !== -1) {
        // skip hidden files
        return next();
      }
      nr.load(testFile, (err, data) => {
        if (err) {
          console.error(err.message);
          console.log('WAT DO');
        }
        next();
      });
    });
    walker.on('end', () => {
      if (!filter || filter === 'fuzz') {
        // Load fuzzed binaries
        nr.loadFuzz('../bins/fuzzed', (err, data) => {
          if (err) {
            console.error(err.message);
          }
        });
      }
      function readLine (cb) {
        rl.cb = cb;
        rl.prompt();
      }
      function fin (err) {
        if (err) {
          console.error(err);
        }
        const code = process.env.APPVEYOR ? 0 : nr.report.failed > 0;
        process.exit(code);
      }
      function pullQueue (cb) {
        if (nr.queue.length === 0) {
          return cb();
        }
        const test = nr.queue.pop();
        function next () {
          setTimeout(_ => { pullQueue(cb); }, 0);
        }
        console.log('This test has failed:');
        console.log('Script:', test.from);
        console.log('Name:', test.name);
        console.log('-', test.expect);
        console.log('+', test.stdout);
        console.log('Wat du? (f)ix (i)gnore (b)roken (q)uit');
        readLine((err, line) => {
          if (err) {
            return cb(err);
          }
          switch (line) {
            case 'q':
              console.error('Aborted');
              process.exit(1);
              break;
            case 'i':
              next();
              break;
            case 'b':
              markAsBroken(test, next);
              break;
            case 'f':
              fixTest(test, next);
              break;
          }
        });
      }
      nr.quit().then(_ => {
        console.log('Done');
        if (nr.queue.length > 0 && (argv.interactive || argv.i)) {
          console.error(nr.queue.length, 'failed tests');
          pullQueue(fin);
        } else {
          fin();
        }
      });
    });

    return 0;
  });
}

// TODO: move into a module
function markAsBroken (test, next) {
  const filePath = test.from;
  let output = '';
  // read all lines from filepath and stop when finding the test that matches
  try {
    let lines = fs.readFileSync(filePath).toString().trim().split('\n');
    for (let line of lines) {
      output += line + '\n';
      if (line.startsWith('NAME=')) {
        const name = line.split('=', 2)[1];
        if (name === test.name) {
          console.error("TEST FOUND!!! BINGO :D");
          output += 'BROKEN=1\n';
        }
      }
    }
    fs.writeFileSync(filePath, output);
    next();
  } catch (err) {
    console.error(err);
    next();
  }
}

function fixTest (test, next) {
  console.error();
  console.error('TODO: f');
  console.error();
  next();
}
