#!/usr/bin/env node

const NewRegressions = require('..');

const rc = require('rc');
const walk = require('walk').walk;
const path = require('path');

main(rc('r2r'));

function main (argv) {
  if (argv.h) {
    console.log(`
Usage: r2r [options] [file] [name] ([cmds])
 -a    add new test 
 -b    mark failing tests as broken
 -d    delete test 
 -f    fix tests that are not passing
 -c    use -c instead of -i to run r2 (EXPERIMENTAL)
 -j    output in JSON
 -l    list all tests
 -u    unmark broken in fixed tests
`);
    return 0;
  }

  const nr = new NewRegressions(argv, function ready (err, res) {
    if (err) {
      return 1;
    }

    if (argv.a) {
      const test = {
        from: argv.a,
        name: argv._[0],
        cmdScript: argv._[1],
        file: argv._[2] || 'malloc://128'
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
      nr.quit();
      return 0;
    }

    const walker = walk('db', {followLinks: false});
    const filter = argv._[0] || '';
    walker.on('file', (root, stat, next) => {
      const testFile = path.join(root, stat.name);
      if (testFile.indexOf(filter) === -1) {
        return next();
      }
      console.log('[--]', 'run', testFile);
      if (testFile.indexOf('/.') !== -1) {
      // skip hidden files
        return next();
      }
      nr.load(testFile, (err, data) => {
        if (err) {
          console.error(err.message);
        }
        next();
      });
    });
    walker.on('end', () => {
      nr.quit().then(_ => {
        console.log('Done');
      });
    });
  });
}
