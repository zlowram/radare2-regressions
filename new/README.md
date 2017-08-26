The NewR2R
==========

Example commands tests in `db/cmd/*`:

	NAME=test_db
	CMDS=pd 4
	EXPECT=<<RUN
            ;-- main:
            ;-- entry0:
            ;-- func.100001174:
            0x100001174      55             Push rbp
            0x100001175      4889e5         Mov  rbp, rsp
            0x100001178      4157           Push r15
	RUN

Example tests for `db/asm/*`:

	General format:
	type "assembly" opcode [offset]

		type:
			* a stands for assemble
			* d stands for disassemble
			* B stands for broken

		offset:
			Some architectures are going to assemble an instruction differently depending
			on the offset it's written to. Optional.

	Examples:
	a "ret" c3
	d "ret" c3
	a "nop" 90 # Assembly is correct
	dB "nopppp" 90 # Disassembly test is broken

	You can merge lines:

	adB "nop" 90

	acts the same as

	aB "nop" 90
	dB "nop" 90

        The filename is very important. It is used to tell radare which architecture to use.

        Format:
        arch[[_cpu]_bits]

	Example:
	x86_32 means -a x86 -b 32
        arm_v7_64 means what it means
