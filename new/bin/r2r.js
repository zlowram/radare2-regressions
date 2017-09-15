#!/usr/bin/env node

const NewRegressions = require('..');

const rc = require('rc');
const minimist = require('minimist');
const walk = require('walk').walk;
const path = require('path');

const flagMap = {
  '-i': '--interactive',
  '-v': '--verbose'
};
const args = process.argv.slice(2).map(_=> {
  return flagMap[_] || _;
});

main(minimist(args, {
  boolean: ['verbose'],
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
console.log("WAT DO")
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
      nr.quit().then(_ => {
        console.log('Done');
        const code = process.env.APPVEYOR? 0: nr.report.failed > 0;
        process.exit(code);
      });
    });

    return 0;
  });
}
