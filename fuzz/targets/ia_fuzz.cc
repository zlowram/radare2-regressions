#include <stdio.h>
#include <r_core.h>

extern "C" int LLVMFuzzerTestOneInput(const uint8_t *Data, size_t Size) {
	RCore *r;
	char path[128];

	r = r_core_new();
	r_config_set(r->config, "scr.interactive", "false");
	r_config_set(r->config, "scr.prompt", "false");
	r_config_set(r->config, "scr.color", "false");

	snprintf(path, sizeof(path)-1, "malloc://%d", (int)Size);
	RCoreFile *fh = r_core_file_open (r, path, R_IO_WRITE | R_IO_READ, 0LL);
	r_core_bin_load(r, NULL, UT64_MAX);
	r_io_write_at(r->io, 0, Data, Size);

	r_core_cmd0(r, "oba");
	r_core_cmd0(r, "ia");

	r_core_file_free (fh);
	r_core_free(r);
	return 0;
}
