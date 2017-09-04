const travis = require('./');

function run(p) {
  p.then(process.exit).catch(console.error);
}

if (process.argv.length > 2) {
  const arg = process.argv[2];
  if (arg === '-h') {
    console.log('Usage: logstat [file|+limit]');
  } else {
    if (+arg) {
      run(travis(+arg));
    } else {
      console.log(parseLogs(fs.readFileSync(process.argv[2]).toString()));
    }
  }
} else {
  run(travis(-1));
}
