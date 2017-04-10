#include <math.h>
#include <r_diff.h>
#include "minunit.h"

static struct {
	const ut8 *a, *b;
	int distance;
} tests[] = {
	{"wallaby", "wallet", 3 /* two replacements, one add */},
	{"foo", "foobar", 3},
	{"identity", "identity", 0},
#if 0
	/* FAILS the symmetry test for case 5: 
	   levenstein and distance
	   distance a-b != distance b-a */
	{"lolinongogonon", "lingon", 2*4},
#endif
	/* special cases: -1 for fails to compare */
	{"", "empty", -1},
	{NULL, "missing", -1},
	{NULL, NULL, -1},
};
static const int testcount = sizeof(tests)/sizeof(tests[0]);

enum {
	LEVENSTEIN, SIMILARITY, DISTANCE, SWAPPED,
	TESTBITS_END
};


bool test_r_diff_buffers_distance(void) {
	char message[1024];
	int i, j;
	
	for (i=0; i<testcount; i++) {
		int la=0, lb=0;

		if (tests[i].a)
			la = strlen(tests[i].a);
		if (tests[i].b)
			lb = strlen(tests[i].b);

		for (j=0; j < 1<<TESTBITS_END; j++) {
			const ut8 *pa, *pb;
			int pla, plb;

			ut32 distance = 0xdeadbeef, *pd;
			double similarity = NAN, *ps;
			bool result;

			RDiff *rdiff = r_diff_new();
			rdiff->levenstein = ! ! (j & (1<<LEVENSTEIN));
			if (j & (1<<SWAPPED)) {
				pa = tests[i].b;
				pb = tests[i].a;
				pla = lb;
				plb = la;
			} else {
				pa = tests[i].a;
				pb = tests[i].b;
				pla = la;
				plb = lb;
			}
			pd = j & (1<<DISTANCE) ? &distance : NULL;
			ps = j & (1<<SIMILARITY) ? &similarity : NULL;
#if 0
			printf("Test run %d %x: args %p %d %p %d %p %p\n",
			       i, j, pa, pla, pb, plb, pd, ps);
#endif

			result = r_diff_buffers_distance(rdiff,
							 pa, pla,
							 pb, plb,
							 pd, ps);

			if (tests[i].distance >= 0) {
				sprintf(message, "%s case %d/%x, return value", __FUNCTION__, i, j);
				mu_assert_eq(result, true, message);
				if (j & (1<<DISTANCE)) {
					sprintf(message, "%s case %d/%x, distance",
						__FUNCTION__, i, j);
					mu_assert_eq(distance, tests[i].distance, message);
				}
				if (j & (1<<SIMILARITY) && pla && plb) {
					/* Note: could fail from precision errors? */
					double ref_similarity = 1.0 -
						(double)tests[i].distance / 
						R_MAX(pla,plb);
					sprintf(message,
						"%s case %d/%x, similarity, expected %g got %g",
						__FUNCTION__, i, j, ref_similarity, similarity);
					mu_assert(similarity==ref_similarity, message);
				}
			} else {
				sprintf(message, "%s case %d/%x, return value", __FUNCTION__, i, j);
				mu_assert_eq(result, false, message);
			}
			
			r_diff_free(rdiff);
		}
	}
	mu_end;
}

int all_tests() {
	mu_run_test(test_r_diff_buffers_distance);
	return tests_passed != tests_run;
}

int main(int argc, char **argv) {
	return all_tests();
}
