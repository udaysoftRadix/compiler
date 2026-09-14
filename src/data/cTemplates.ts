import type { Template } from '../types';

export const cTemplates: Template[] = [
  {
    id: 'hello-world',
    label: 'Hello World',
    files: [
      {
        name: 'main.c',
        isEntry: true,
        content: `#include <stdio.h>

int main(void) {
    printf("Hello, World!\\n");
    return 0;
}
`,
      },
    ],
  },
  {
    id: 'reading-input',
    label: 'Reading Input (stdin)',
    files: [
      {
        name: 'main.c',
        isEntry: true,
        content: `#include <stdio.h>

// Type a name into the Input panel below, then press Run.
int main(void) {
    char name[100];
    if (scanf("%99s", name) != 1) {
        return 1;
    }
    printf("Hello, %s!\\n", name);
    return 0;
}
`,
      },
    ],
  },
  {
    id: 'sum-two-numbers',
    label: 'Sum of Two Numbers',
    files: [
      {
        name: 'main.c',
        isEntry: true,
        content: `#include <stdio.h>

// Input: two integers separated by a space.
// Example input: 3 5
int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("Sum = %d\\n", a + b);
    return 0;
}
`,
      },
    ],
  },
  {
    id: 'factorial',
    label: 'Factorial (Recursion)',
    files: [
      {
        name: 'main.c',
        isEntry: true,
        content: `#include <stdio.h>

long long factorial(int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}

// Input: a single non-negative integer.
// Example input: 6
int main(void) {
    int n;
    scanf("%d", &n);
    printf("%d! = %lld\\n", n, factorial(n));
    return 0;
}
`,
      },
    ],
  },
  {
    id: 'bubble-sort',
    label: 'Bubble Sort',
    files: [
      {
        name: 'main.c',
        isEntry: true,
        content: `#include <stdio.h>

void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int tmp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = tmp;
            }
        }
    }
}

int main(void) {
    int arr[] = {5, 3, 8, 1, 2};
    int n = sizeof(arr) / sizeof(arr[0]);

    bubbleSort(arr, n);

    for (int i = 0; i < n; i++) {
        printf("%d ", arr[i]);
    }
    printf("\\n");
    return 0;
}
`,
      },
    ],
  },
];

export const defaultCTemplate = cTemplates[0];
