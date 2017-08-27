#include <stddef.h>
#include "minunit.h"
#include "r_rbtree.h"

static void random_iota(int *a, int n) {
	a[0] = 0;
	for (int i = 1; i < n; i++) {
		int x = rand () % (i + 1);
		if (i != x) {
			a[i] = a[x];
		}
		a[x] = i;
	}
}

static int cmp_int(void *user, const void *a, const void *b) {
	return (int)(ptrdiff_t)a - (int)(ptrdiff_t)b;
}

bool test_r_rbtree_bound(void) {
	const int key = 0x24;
	RBTreeIter it;
	RBTree *tree = r_rbtree_new(NULL, cmp_int);
	void *data;
	int i;
	for (i = 0; i < 99; i++)
		r_rbtree_insert(tree, (void *)(ptrdiff_t)i, NULL);

	// lower_bound
	it = r_rbtree_lower_bound_forward(tree, (void *)(ptrdiff_t)key, NULL);
	i = key;
	r_rbtree_iter_while(it, data) {
		mu_assert_eq(i, (ptrdiff_t)data, "lower_bound_forward");
		i++;
	}
	it = r_rbtree_lower_bound_backward(tree, (void *)(ptrdiff_t)key, NULL);
	i = key - 1;
	r_rbtree_iter_while_prev(it, data) {
		mu_assert_eq(i, (ptrdiff_t)data, "lower_bound_backward");
		i--;
	}

	// upper_bound
	it = r_rbtree_upper_bound_forward(tree, (void *)(ptrdiff_t)key, NULL);
	i = key + 1;
	r_rbtree_iter_while(it, data) {
		mu_assert_eq(i, (ptrdiff_t)data, "upper_bound_forward");
		i++;
	}
	it = r_rbtree_upper_bound_backward(tree, (void *)(ptrdiff_t)key, NULL);
	i = key;
	r_rbtree_iter_while_prev(it, data) {
		mu_assert_eq(i, (ptrdiff_t)data, "upper_bound_backward");
		i--;
	}

	r_rbtree_free(tree);
	mu_end;
}

static bool insert_delete(int *a, int n) {
	RBTreeIter it;
	RBTree *tree = r_rbtree_new(NULL, cmp_int);
	int i, t;

	for (i = 0; i < n; i++) {
		t = r_rbtree_insert(tree, (void *)(ptrdiff_t)a[i], NULL);
		mu_assert_eq(1, t, "insert");
		t = r_rbtree_insert(tree, (void *)(ptrdiff_t)a[i], NULL);
		mu_assert_eq(0, t, "insert a duplicate");
		mu_assert_eq(i + 1, tree->size, "size");
	}

	random_iota(a, n);
	for (int i = 0; i < n; i++) {
		t = r_rbtree_delete (tree, (void *)(ptrdiff_t)a[i], NULL);
		mu_assert(t, "delete");
		t = r_rbtree_delete (tree, (void *)(ptrdiff_t)a[i], NULL);
		mu_assert(!t, "delete non-existent");
		mu_assert_eq(n - i - 1, tree->size, "size");
	}

	r_rbtree_free(tree);
	return MU_PASSED;
}

bool test_r_rbtree_insert_delete(void) {
#define N 1000
	int a[N], i;

	// Random
	random_iota(a, N);
	insert_delete(a, N);

	// Increasing
	for (i = 0; i < N; i++)
		a[i] = i;
	insert_delete(a, N);

	// Decreasing
	for (i = 0; i < N; i++)
		a[i] = N - 1 - i;
	insert_delete(a, N);

	mu_end;
}

bool test_r_rbtree_traverse(void) {
	RBTreeIter it;
	RBTree *tree = r_rbtree_new(NULL, cmp_int);
	void *data;
	int i;

	for (i = 0; i < 99; i++)
		r_rbtree_insert(tree, (void *)(ptrdiff_t)i, NULL);
	i = 0;
	r_rbtree_foreach (tree, it, data) {
		mu_assert_eq(i, (ptrdiff_t)data, "foreach");
		i++;
	}
	r_rbtree_foreach_prev (tree, it, data) {
		i--;
		mu_assert_eq(i, (ptrdiff_t)data, "foreach_prev");
	}

	r_rbtree_free(tree);
	mu_end;
}

int all_tests() {
	mu_run_test(test_r_rbtree_bound);
	mu_run_test(test_r_rbtree_insert_delete);
	mu_run_test(test_r_rbtree_traverse);
	return tests_passed != tests_run;
}

int main(int argc, char **argv) {
	return all_tests();
}
