#include <r_io.h>
#include "minunit.h"

bool test_r_io_mapsplit (void) {
	RIO *io = r_io_new ();
	io->va = true;
	r_io_open_at (io, "null://2", R_IO_READ, 0LL, UT64_MAX);
	mu_assert ("Found no map at UT64", r_io_map_get (io, UT64_MAX));
	mu_assert ("Found no map at 0x0", r_io_map_get (io, 0x0));
	r_io_free (io);
	mu_end;
}

bool test_r_io_mapsplit2 (void) {
	RIO *io = r_io_new ();
	io->va = true;
	r_io_open_at (io, "null://2", R_IO_READ, 0LL, 0LL);
	r_io_map_remap (io, r_io_map_get (io, 0LL)->id, UT64_MAX);
	mu_assert ("Found no map at UT64", r_io_map_get (io, UT64_MAX));
	mu_assert ("Found no map at 0x0", r_io_map_get (io, 0x0));
	r_io_free (io);
	mu_end;
}

bool test_r_io_pcache (void) {
	RIO *io = r_io_new ();
	ut8 buf[8];
	int fd = r_io_fd_open (io, "malloc://3", R_IO_RW, 0);
	r_io_map_add (io, fd, R_IO_RW, 0LL, 0LL, 1, false);
	r_io_map_add (io, fd, R_IO_RW, 1, 1, 1, false);
	r_io_map_add (io, fd, R_IO_RW, 1, 2, 1, false);
	r_io_map_add (io, fd, R_IO_RW, 1, 3, 1, false);
	r_io_map_add (io, fd, R_IO_RW, 1, 4, 1, false);
	r_io_map_add (io, fd, R_IO_RW, 1, 5, 1, false);
	r_io_map_add (io, fd, R_IO_RW, 2, 6, 1, false);
	io->p_cache = 2;
	io->va = true;
	r_io_fd_write_at (io, fd, 0, "8=D", 3);
	r_io_read_at (io, 0x0, buf, 8);
	mu_assert_streq (buf, "", "pcache read happened, but it shouldn't");
	io->p_cache = 1;
	r_io_read_at (io, 0x0, buf, 8);
	mu_assert_streq (buf, "8======D", "expected an ascii-pn from pcache");
	r_io_fd_write_at (io, fd, 0, "XXX", 3);
	r_io_read_at (io, 0x0, buf, 8);
	mu_assert_streq (buf, "8======D", "expected an ascii-pn from pcache");
	io->p_cache = 0;
	r_io_read_at (io, 0x0, buf, 8);
	mu_assert_streq (buf, "XXXXXXXX", "expected censorship of the ascii-pn");
	r_io_free (io);
	mu_end;
}

bool test_r_io_desc_exchange (void) {
	RIO *io = r_io_new ();
	int fd = r_io_fd_open (io, "malloc://3", R_IO_READ, 0),
	    fdx = r_io_fd_open (io, "malloc://6", R_IO_READ, 0);
	r_io_desc_exchange (io, fd, fdx);
	mu_assert ("Desc-exchange is broken", (r_io_fd_size (io, fd) == 6));
	r_io_free (io);
	mu_end;
}

int all_tests() {
	mu_run_test(test_r_io_mapsplit);
	mu_run_test(test_r_io_mapsplit2);
	mu_run_test(test_r_io_pcache);
	mu_run_test(test_r_io_desc_exchange);
	return tests_passed != tests_run;
}

int main(int argc, char **argv) {
	return all_tests();
}
