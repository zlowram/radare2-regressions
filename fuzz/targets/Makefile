SRC=$(wildcard *.cc)
LDFLAGS += -lr_core -lr_bin -lr_anal -lr_asm -lr_bp -lr_config -lr_cons -lr_io -lr_core -lr_crypto -lr_debug -lr_egg -lr_flag -lr_fs -lr_hash -lr_lang -lr_magic -lr_parse -lr_reg -lr_search -lr_socket -lr_syscall -lr_util

all:  check-env build

check-env:
ifndef LIB_FUZZING_ENGINE
	$(error LIB_FUZZING_ENGINE is not set)
endif

ifndef RADARE2_BUILD
	$(error RADARE2_BUILD is not set)
endif

build: $(SRC)
	${CXX} ${CXXFLAGS} $^ -o $(basename $^) ${LDFLAGS} -I ${RADARE2_BUILD}/include/libr -L ${RADARE2_BUILD}/lib ${LIB_FUZZING_ENGINE} ; \

clean: $(SRC)
	rm -f $(basename $^)

