// EXAMPLE FILE — delete me with `npm run reset` when you start your own practice.
// Two Sum (LeetCode #1) — https://leetcode.com/problems/two-sum/
//
// This is here so a fresh clone shows what a solution file looks like and how
// the practice log + spaced-repetition schedule point at real files.

/**
 * Return indices of the two numbers that add up to `target`.
 * One-pass hash map: for each number, check if its complement was already seen.
 * Time O(n), space O(n).
 */
export function twoSum(nums: number[], target: number): [number, number] {
  const seen = new Map<number, number>(); // value -> index
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement)!, i];
    }
    seen.set(nums[i], i);
  }
  throw new Error('no two numbers add up to target');
}

// quick sanity check when run directly: `tsx leetcode/1_two_sum.example.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(twoSum([2, 7, 11, 15], 9)); // [0, 1]
  console.log(twoSum([3, 2, 4], 6)); // [1, 2]
}
