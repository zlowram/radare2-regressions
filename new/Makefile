TESTS=t/cmd_pd
#TESTS+=t.formats/dex/radare2installer
TESTS+=t/cmd_ph
TESTS+=t/cmd_disasm
TESTS+=t/cmd_hash
TESTS+=t/cmd_flags
TESTS+=t/cmd_flags_stress
TESTS+=t/cmd_graph
TESTS+=t/cmd_help
TESTS+=t/cmd_i
TESTS+=t/cmd_interpret
TESTS+=t/cmd_json
TESTS+=t/cmd_long_string
TESTS+=t/cmd_macros
TESTS+=t/cmd_meta
TESTS+=t/cmd_open
TESTS+=t/cmd_pB
TESTS+=t/cmd_pa
TESTS+=t/malloc
TESTS+=t/cmd_0
TESTS+=t/cmd_ah
TESTS+=t/cmd_wop
TESTS+=t/cmd_system
TESTS+=t/cmd_pf
TESTS+=t/cmd_pf2
TESTS+=t/cmd_pf_elf
TESTS+=t/cmd_pfd
TESTS+=t/cmd_r
TESTS+=t/cmd_repeats
TESTS+=t/cmd_rop
TESTS+=t/cmd_psj
TESTS+=t/cmd_px
TESTS+=t/cmd_pxd
TESTS+=t/cmd_pxw

all:
	rm -rf db/cmd
	mkdir -p db/cmd
	cd .. ; for a in $(TESTS) ; do \
		d=$$(dirname $$a) ; \
		mkdir -p new/db/cmd/$$d ; \
		DUMP=1 $$a > new/db/cmd/$$a ; \
	done

# DUMP=1 $$a | gzip -9 > new/db/cmd/$$a ; \

run:
	time node bin/r2r.js
