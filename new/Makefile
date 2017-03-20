TESTS=t/cmd_pd
#TESTS+=t.formats/dex/radare2installer
TESTS+=t/cmd_ph
TESTS+=t/malloc

all:
	rm -rf db
	mkdir -p db
	cd .. ; for a in $(TESTS) ; do \
		d=$$(dirname $$a) ; \
		mkdir -p new/db/cmd/$$d ; \
		DUMP=1 $$a | gzip -9 > new/db/cmd/$$a ; \
	done

run:
	time node bin/r2r.js
