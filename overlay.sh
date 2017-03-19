#!/bin/sh

# this script creates the radare2/t/overlay directory
# containing all the changes that will be applied into r2r

if [ ! -d ../t ]; then
	echo "Must be run from radare2/radare2-regressions"
	exit 1
fi

O=../t/overlay

create() {
	if [ -d "$O" ]; then
	(
		cd ../t
		git rm -r -f overlay
	)
	fi
	rm -rf $O
	mkdir -p $O
	MF=$(git status -s| grep '^ M' |cut -d ' ' -f 3-)
	NF=$(git status -s| grep '^A ' |cut -d ' ' -f 3-)

	for a in $MF ; do
		d=`dirname $a`
		mkdir -p $O/$d
		git diff $a > $O/$a.patch
	done

	for a in $NF ; do
		d=`dirname $a`
		mkdir -p $O/$d
		cp $a $O/$a
	done
	(
		cd ../t
		git add overlay
	)
	echo "Created ../t/overlay."
}

apply() {
	if [ ! -d "$O" ]; then
		echo "Cannot find $O"
		exit 1
	fi
	(
		F=`cd $O/overlay ; find . -type f`
		for a in $F ; do
			if [ -n "`echo $a | grep .patch`" ]; then
				patch -p1 < $O/overlay/$a
			else
				d=`dirname $a`
				mkdir -p $d
				cp $O/overlay/$a $a
			fi
		done
	)
	echo "Applied radare2/t/overlay into r2r"
}

eval $1


