#!/bin/sh
for a in . .. ../.. ; do [ -e $a/tests.sh ] && . $a/tests.sh ; done

PLUGIN=arm.gnu

NAME="${PLUGIN}: add r2, r2, r1, nop, bx r2, blx r5"
CMDS='
e asm.arch='${PLUGIN}'
e asm.bits=32
wa add r2, r2, r1
s+$l
wa nop
s+$l
wa bx r2
s+$l
wa blx r5
s+$l
?v $$
pi 4 @0
'
EXPECT='0x10
add r2, r2, r1
nop   ; (mov r0, r0)
bx r2
blx r5
'
run_test


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
BROKEN=1
ARGS="-a arm -b 16"
CMDS="pa blx 0xfb000134 @ 0xfb00048a"
EXPECT='fff754ee'
run_test

NAME="${PLUGIN}: arm-thumb-mclass"
BROKEN=1
ARGS="-a arm -b 16"
CMDS="pa blx 0x22211C @ 0x00005CE4"
EXPECT='1cf21aea'
run_test

NAME="${PLUGIN}: arm-thumb-mclass"
BROKEN=1
ARGS="-a arm -b 16"
CMDS="pa bl 0xF4001260 @ 0xF40003B2"
EXPECT='00f055ff'
run_test

NAME="${PLUGIN}: arm-thumb-mclass"
BROKEN=1
ARGS="-a arm -b 16"
CMDS="pa blx 0xF4002A6C @ 0xF40003A0"
EXPECT='02f064eb'
run_test

NAME="${PLUGIN}: arm-thumb-mclass"
BROKEN=1
ARGS="-a arm -b 16"
CMDS="pa bl 0xF4002862 @ 0xF40028F6"
EXPECT='fff7b4ff'
run_test

NAME="${PLUGIN}: arm-thumb-mclass"
BROKEN=1
ARGS="-a arm -b 16"
CMDS="pa blx 0xF4002AF4 @ 0xF40006E4"
EXPECT='02f006ea'
run_test

NAME="${PLUGIN}: arm-thumb-mclass"
BROKEN=
ARGS="-a arm -b 16"
CMDS="pa b lr"
EXPECT=''
EXPECT_ERR='Invalid-instruction'
run_test


