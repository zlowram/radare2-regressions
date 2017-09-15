#include <math.h>
#include <r_diff.h>
#include "minunit.h"

static struct {
	const ut8 *a;
	const ut8 *b;
	int di_distance;
	int dis_distance;
} tests[] = {
	{"", "zzz", 3, 3},
	{"meow", "", 4, 4},
	{"a", "b", 2, 1},
	{"aaa", "aaa", 0, 0},
	{"aaaaa", "aabaa", 2, 1},
	{"aaaa", "aabaa", 1, 1},
	{"aaba", "babca", 3, 2},
	{"foo", "foobar", 3, 3},
	{"wallaby", "wallet", 5, 3},
	{"identity", "identity", 0},
};

bool test_r_diff_buffers_distance(void) {
	char msg[128];
	RDiff *diff = r_diff_new();
	int i, distance;

	// Levenshtein edit distance (deletion/insertion/substitution)
	diff->type = '\0';
	for (i = 0; i < R_ARRAY_SIZE (tests); i++) {
		size_t la = strlen (tests[i].a), lb = strlen (tests[i].b);
		r_diff_buffers_distance (diff, tests[i].a, la, tests[i].b, lb, &distance, NULL);
		snprintf (msg, sizeof msg, "original %s/%s distance", tests[i].a, tests[i].b);
		mu_assert_eq (distance, tests[i].dis_distance, msg);
	}

	// Broken r_diff_buffers_distance_levenshtein, uncomment and see why it is incorrect
	// diff->type = 'l';
	// for (i = 0; i < R_ARRAY_SIZE (tests); i++) {
	// 	size_t la = strlen (tests[i].a), lb = strlen (tests[i].b);
	// 	r_diff_buffers_distance (diff, tests[i].a, la, tests[i].b, lb, &distance, NULL);
	// 	snprintf (msg, sizeof msg, "levenshtein %s/%s distance", tests[i].a, tests[i].b);
	// 	mu_assert_eq (distance, tests[i].dis_distance, msg);
	// }

	// Eugene W. Myers' O(ND) diff algorithm, deletion/insertion edit distance
	diff->type = 'm';
	for (i = 0; i < R_ARRAY_SIZE (tests); i++) {
		size_t la = strlen (tests[i].a), lb = strlen (tests[i].b);
		r_diff_buffers_distance (diff, tests[i].a, la, tests[i].b, lb, &distance, NULL);
		snprintf (msg, sizeof msg, "myers %s/%s distance", tests[i].a, tests[i].b);
		mu_assert_eq (distance, tests[i].di_distance, msg);
	}

	r_diff_free (diff);
	mu_end;
}

int all_tests() {
	mu_run_test(test_r_diff_buffers_distance);
	return tests_passed != tests_run;
}

int main(int argc, char **argv) {
	return all_tests();
}
