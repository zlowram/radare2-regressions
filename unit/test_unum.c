#include <r_util.h>
#include "minunit.h"

static RNum *num;

bool test_r_num_units() {
	char *buf[32];
	//1200 / 1024 = 1.171875
	mu_assert_streq (r_num_units ((char *)buf, 1024), "1K", "K");
	mu_assert_streq (r_num_units ((char *)buf, 1200), "1.2K", "K");
	mu_assert_streq (r_num_units ((char *)buf, 1024 * 1024), "1M", "M");
	mu_assert_streq (r_num_units ((char *)buf, 1200 * 1024), "1.2M", "M");
	mu_assert_streq (r_num_units ((char *)buf, 1024 * 1024 * 1024), "1G", "G");
	mu_assert_streq (r_num_units ((char *)buf, 1200 * 1024 * 1024), "1.2G", "G");
	mu_end;
}

bool test_r_num_minmax_swap_i() {
	int a = -1, b = 2;
	r_num_minmax_swap_i (&a, &b);
	mu_assert_eq (a == -1 && b == 2, 1, "a < b -> a < b");
	a = 2, b = -1;
	r_num_minmax_swap_i (&a, &b);
	mu_assert_eq (a == -1 && b == 2, 1, "b < a -> a < b");
	mu_end;
}

bool test_r_num_minmax_swap() {
	ut64 a = 1, b = 2;
	r_num_minmax_swap (&a, &b);
	mu_assert_eq (a == 1 && b == 2, 1, "a < b -> a < b");
	a = 2, b = 1;
	r_num_minmax_swap (&a, &b);
	mu_assert_eq (a == 1 && b == 2, 1, "b < a -> a < b");
	mu_end;
}

bool test_r_num_between() {
	mu_assert_eq (r_num_between (num, "1 2 3"), 1, "1 <= 2 <= 3");
	mu_assert_eq (r_num_between (num, "3 2 1"), 0, "3 <= 2 <= 1");
	mu_assert_eq (r_num_between (num, "1 1 1"), 1, "1 <= 1 <= 1");
	mu_assert_eq (r_num_between (num, "2 1 3"), 0, "2 <= 1 <= 3");
	mu_assert_eq (r_num_between (num, "1 2 1+2"), 1, "1 <= 2 <= 1+2");
	mu_assert_eq (r_num_between (num, "2 3 1+2+3"), 1, "2 <= 3 <= 1+2+3");
	mu_assert_eq (r_num_between (num, "1+2 2 1+1"), 0, "1+2 <= 2 <= 1+1");
	mu_assert_eq (r_num_between (num, "1 + 2 2 1 + 1"), 0, "1 + 2 <= 2 <= 1 + 1");
	mu_end;
}

bool test_r_num_str_len() {
	mu_assert_eq (r_num_str_len ("1"), 1, "\"1\"");
	mu_assert_eq (r_num_str_len ("1+1"), 3, "\"1+1\"");
	mu_assert_eq (r_num_str_len ("1 + 1"), 5, "\"1 + 1\"");
	mu_assert_eq (r_num_str_len ("1 + 1 "), 5, "\"1 + 1 \"");
	mu_assert_eq (r_num_str_len ("1 + 1  "), 5, "\"1 + 1  \"");
	mu_assert_eq (r_num_str_len ("1 + 1 1"), 5, "\"1 + 1 1\"");
	mu_assert_eq (r_num_str_len ("1 + 1 1 + 1"), 5, "\"1 + 1 1 + 1\"");
	mu_assert_eq (r_num_str_len ("1 + (1 + 1) 1"), 11, "\"1 + (1 + 1) 1\"");
	mu_assert_eq (r_num_str_len ("1 + (1 + (1 + 1)) 1"), 17, "\"1 + (1 + (1 + 1)) 1\"");
	mu_assert_eq (r_num_str_len ("1+(1+(1+1)) 1"), 11, "\"1+(1+(1+1)) 1\"");
	mu_assert_eq (r_num_str_len ("(1 + 1) + (1 + 1) 1"), 17, "\"(1 + 1) + (1 + 1) 1\"");
	mu_assert_eq (r_num_str_len ("(1+1)+(1+1) 1"), 11, "\"(1+1)+(1+1) 1\"");
    mu_end;
}

bool test_r_num_str_split() {
	char *str = malloc (0x20);
	strcpy (str, "1 1 + 2 1 + (2 + 3) 4 ");
	//expected "1\01 + 2\01 + (2 + 3)\04\0"
	int i, count = r_num_str_split (str);
	mu_assert_eq (count, 4, "r_num_str_split (str) == 4");
	mu_assert_streq (str+0, "1", "1");
	mu_assert_streq (str+2, "1 + 2", "1 + 2");
	mu_assert_streq (str+8, "1 + (2 + 3)", "1 + (2 + 3)");
	mu_assert_streq (str+20, "4", "4");
	free (str);
    mu_end;
}

bool test_r_num_str_split_list() {
	char *s;
	char *str = malloc (0x20);
	strcpy (str, "1 1 + 2 1 + (2 + 3) 4 ");
	//expected {"1", "1 + 2", "1 + (2 + 3)", "4"} as list
	RList *list = r_num_str_split_list (str);
	mu_assert_eq (r_list_length (list), 4, "r_list_length (list) == 4");
	s = (char *)r_list_pop_head (list);
	mu_assert_streq (s, "1", "1");
	s = (char *)r_list_pop_head (list);
	mu_assert_streq (s, "1 + 2", "1 + 2");
	s = (char *)r_list_pop_head (list);
	mu_assert_streq (s, "1 + (2 + 3)", "1 + (2 + 3)");
	s = (char *)r_list_pop_head (list);
	mu_assert_streq (s, "4", "4");
	free (str);
	r_list_free (list);
    mu_end;
}

bool all_tests() {
	mu_run_test (test_r_num_units);
	mu_run_test (test_r_num_minmax_swap_i);
	mu_run_test (test_r_num_minmax_swap);
	mu_run_test (test_r_num_between);
	mu_run_test (test_r_num_str_len);
	mu_run_test (test_r_num_str_split);
	mu_run_test (test_r_num_str_split_list);
	return tests_passed != tests_run;
}

int main(int argc, char **argv) {
	num = r_num_new (NULL, NULL, NULL);
	return all_tests ();
}
