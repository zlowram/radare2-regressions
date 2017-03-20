TESTS=t/cmd_pd
#TESTS+=t.formats/dex/radare2installer
TESTS+=t/cmd_ph
TESTS+=t/malloc
TESTS+=t/cmd_0
TESTS+=t/cmd_ah
TESTS+=t/cmd_wop
TESTS+=t/cmd_system

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
