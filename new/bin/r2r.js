#!/usr/bin/env node

const NewRegressions = require('..');

const rc = require('rc');
const walk = require('walk').walk;
const path = require('path');

const argv = rc('r2r');

main(argv);

function main (argv) {
  if (argv.h) {
    console.log(`
Usage: r2r [options] [file] [name] ([cmds])
 -a    add new test 
 -d    delete test 
 -j    output in JSON
 -f    fix tests that are not passing
 -l    list all tests
`);
    return 0;
  }

  const nr = new NewRegressions(argv);

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
    return 0;
  }

  const walker = walk('db', {followLinks: false});
  walker.on('file', (root, stat, next) => {
    const testFile = path.join(root, stat.name);
    console.log('run', testFile);
    nr.load(testFile, (err, data) => {
      if (err) {
//      console.error(err.message);
        return 1;
      }
      next();
    });
  });
  walker.on('end', (root, stat, next) => {
    console.log('Done');
  });
}
