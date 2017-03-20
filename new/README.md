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

	NAME=bipush 33
	EXPECT=1021
	RUN

Same goes for `db/dis*`:

	NAME=00
	EXPECT=nop
	RUN
