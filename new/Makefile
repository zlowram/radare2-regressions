TESTS=t/cmd_pd
#TESTS+=t.formats/dex/radare2installer
TESTS+=t/cmd_ph

all:
	rm -rf db
	mkdir -p db
	cd .. ; for a in $(TESTS) ; do \
		d=$$(dirname $$a) ; \
		mkdir -p new/db/$$d ; \
		DUMP=1 $$a | gzip -9 > new/db/$$a ; \
	done

run:
	time node index.js
