#!/bin/sh
for a in . .. ../.. ; do [ -e $a/tests.sh ] && . $a/tests.sh ; done

PLUGIN=arm.gnu

NAME="${PLUGIN}: arm-endian"
CMDS='
e asm.arch='${PLUGIN}'
e asm.bits=32
e cfg.bigendian=0
pa mov r0, 33
e cfg.bigendian=1
pa mov r0, 33
e cfg.bigendian=0
pad 2100a0e3
e cfg.bigendian=1
pad e3a00021
'
EXPECT='2100a0e3
e3a00021
mov r0, 33
mov r0, 33
'

run_test

NAME="${PLUGIN}: arm-thumb-mclass"
BROKEN=
ARGS="-a arm -b 16"
CMDS="pa b lr"
EXPECT=''
EXPECT_ERR='Invalid-instruction'
run_test
