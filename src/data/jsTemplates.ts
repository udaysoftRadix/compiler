import type { Template } from '../types';

export const jsTemplates: Template[] = [
  {
    id: 'hello-world',
    label: 'Hello World',
    files: [
      {
        name: 'solution.js',
        isEntry: true,
        content: `function main() {
  console.log("Hello, World!");
}

main();
`,
      },
    ],
  },
  {
    id: 'reading-input',
    label: 'Reading Input (stdin)',
    files: [
      {
        name: 'solution.js',
        isEntry: true,
        content: `// Type a name into the Input panel below, then press Run (or Ctrl+Enter).
function main() {
  const name = readLine() || "World";
  console.log("Hello, " + name + "!");
}

main();
`,
      },
    ],
  },
  {
    id: 'two-sum',
    label: 'Two Sum',
    files: [
      {
        name: 'solution.js',
        isEntry: true,
        content: `// Input: a comma-separated array on line 1, target on line 2.
// Example input:
// 2,7,11,15
// 9
function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) return [seen.get(complement), i];
    seen.set(nums[i], i);
  }
  return [];
}

function main() {
  const nums = (readLine() || "2,7,11,15").split(",").map(Number);
  const target = Number(readLine() || "9");
  console.log(JSON.stringify(twoSum(nums, target)));
}

main();
`,
      },
    ],
  },
  {
    id: 'bubble-sort',
    label: 'Bubble Sort',
    files: [
      {
        name: 'solution.js',
        isEntry: true,
        content: `import { bubbleSort } from './sort.js';

// Input: a comma-separated array of numbers.
// Example input: 5,3,8,1,2
function main() {
  const nums = (readLine() || "5,3,8,1,2").split(",").map(Number);
  console.log("Before:", nums.join(", "));
  console.log("After: ", bubbleSort(nums).join(", "));
}

main();
`,
      },
      {
        name: 'sort.js',
        content: `export function bubbleSort(arr) {
  const result = [...arr];
  for (let i = 0; i < result.length; i++) {
    for (let j = 0; j < result.length - i - 1; j++) {
      if (result[j] > result[j + 1]) {
        [result[j], result[j + 1]] = [result[j + 1], result[j]];
      }
    }
  }
  return result;
}
`,
      },
    ],
  },
  {
    id: 'fibonacci',
    label: 'Fibonacci Series',
    files: [
      {
        name: 'solution.js',
        isEntry: true,
        content: `// Input: how many Fibonacci numbers to print.
// Example input: 10
function fibonacci(count) {
  const series = [0, 1];
  while (series.length < count) {
    series.push(series[series.length - 1] + series[series.length - 2]);
  }
  return series.slice(0, count);
}

function main() {
  const count = Number(readLine() || "10");
  console.log(fibonacci(count).join(", "));
}

main();
`,
      },
    ],
  },
  {
    id: 'palindrome',
    label: 'Palindrome Check',
    files: [
      {
        name: 'solution.js',
        isEntry: true,
        content: `// Input: a word or phrase to check.
// Example input: racecar
function isPalindrome(str) {
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned === cleaned.split("").reverse().join("");
}

function main() {
  const input = readLine() || "racecar";
  console.log(\`"\${input}" is \${isPalindrome(input) ? "" : "NOT "}a palindrome\`);
}

main();
`,
      },
    ],
  },
];

export const defaultJsTemplate = jsTemplates[0];
