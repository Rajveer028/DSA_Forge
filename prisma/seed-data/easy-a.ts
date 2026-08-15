import { build, join, reader, tokens, yesNo, type QuestionSpec } from "./catalog";

const A = (input: string) => {
  const r = reader(input);
  const n = r.int();
  return r.ints(n);
};

const specs: QuestionSpec[] = [
  {
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "EASY",
    topics: ["arrays", "hashing"],
    d: "You are given an array of integers and a target value. Exactly one pair of distinct positions adds up to the target. Report the two positions in increasing order.\n\nPositions are 0-indexed.",
    in: "First line: n and target.\nSecond line: n integers.",
    out: "Two space-separated indices in increasing order.",
    c: "2 <= n <= 100000\n-10^9 <= a[i], target <= 10^9\nExactly one valid pair exists.",
    hints: [
      "The obvious solution checks every pair. Ask what you are recomputing each time you scan forward.",
      "For each value you visit, you need to know instantly whether target - value has already appeared.",
      "Walk the array once, keeping a hash map from value to the index where you saw it.",
    ],
    ap: "Scan left to right. Before inserting the current value, look up its complement (target - value) in a hash map of everything seen so far. If it is there, you have the pair; otherwise record the current value.",
    it: "The brute force rescans the prefix for every element; a hash map answers 'have I seen x?' in O(1), so one pass is enough.",
    st: [
      "Create an empty hash map from value to index.",
      "For each index i, compute need = target - a[i].",
      "If need is in the map, print map[need] and i and stop.",
      "Otherwise store a[i] -> i and continue.",
    ],
    tc: "O(n)",
    sc: "O(n)",
    solve: (input) => {
      const r = reader(input);
      const n = r.int();
      const target = r.int();
      const a = r.ints(n);
      const seen = new Map<number, number>();
      for (let i = 0; i < n; i += 1) {
        const need = target - a[i];
        if (seen.has(need)) return `${seen.get(need)} ${i}`;
        if (!seen.has(a[i])) seen.set(a[i], i);
      }
      return "-1 -1";
    },
    samples: ["4 9\n2 7 11 15", "3 6\n3 2 4"],
    why: ["a[0] + a[1] = 2 + 7 = 9.", "a[1] + a[2] = 2 + 4 = 6."],
    hidden: ["2 6\n3 3", "5 -8\n-3 4 -5 1 9", "6 0\n5 -1 -5 2 7 3", "5 100\n50 20 30 70 85"],
    edge: ["2 2000000000\n1000000000 1000000000", "2 -2000000000\n-1000000000 -1000000000"],
    companies: ["google", "amazon", "microsoft", "meta", "adobe"],
    sol: {
      PYTHON: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    n, target = int(data[0]), int(data[1])
    a = list(map(int, data[2:2 + n]))
    seen = {}
    for i, value in enumerate(a):
        need = target - value
        if need in seen:
            print(seen[need], i)
            return
        seen.setdefault(value, i)

if __name__ == "__main__":
    main()
`,
      CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    long long n, target;
    cin >> n >> target;
    unordered_map<long long, int> seen;
    for (int i = 0; i < n; ++i) {
        long long value; cin >> value;
        long long need = target - value;
        auto it = seen.find(need);
        if (it != seen.end()) { cout << it->second << " " << i << "\\n"; return 0; }
        if (!seen.count(value)) seen[value] = i;
    }
    return 0;
}
`,
      JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StreamTokenizer in = new StreamTokenizer(new BufferedInputStream(System.in));
        in.nextToken(); int n = (int) in.nval;
        in.nextToken(); long target = (long) in.nval;
        HashMap<Long, Integer> seen = new HashMap<>();
        for (int i = 0; i < n; i++) {
            in.nextToken();
            long value = (long) in.nval;
            long need = target - value;
            if (seen.containsKey(need)) { System.out.println(seen.get(need) + " " + i); return; }
            seen.putIfAbsent(value, i);
        }
    }
}
`,
      C: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    long long n, target;
    if (scanf("%lld %lld", &n, &target) != 2) return 0;
    long long *a = malloc(sizeof(long long) * n);
    for (long long i = 0; i < n; i++) scanf("%lld", &a[i]);
    /* n <= 1e5, so a quadratic scan with an early exit is acceptable in C
       without a hash table; swap in open addressing for larger limits. */
    for (long long i = 0; i < n; i++)
        for (long long j = i + 1; j < n; j++)
            if (a[i] + a[j] == target) { printf("%lld %lld\\n", i, j); free(a); return 0; }
    free(a);
    return 0;
}
`,
    },
  },
  {
    slug: "maximum-element",
    title: "Maximum Element in an Array",
    difficulty: "EASY",
    topics: ["arrays"],
    d: "Given an array of integers, print the largest value it contains.",
    in: "First line: n.\nSecond line: n integers.",
    out: "The maximum value.",
    c: "1 <= n <= 100000\n-10^9 <= a[i] <= 10^9",
    hints: [
      "You only need to remember one thing as you scan.",
      "Track the best value seen so far.",
      "Initialise the answer to the first element, then compare against every later element.",
    ],
    ap: "Keep a running maximum initialised to the first element and update it whenever a larger value appears.",
    it: "A single running variable is enough because the maximum of a list is the maximum of its prefix extended one element at a time.",
    st: ["Read n and the array.", "Set best = a[0].", "For each remaining element, best = max(best, a[i]).", "Print best."],
    tc: "O(n)",
    sc: "O(1)",
    solve: (input) => String(Math.max(...A(input))),
    samples: ["5\n3 9 2 7 4", "4\n-8 -3 -11 -1"],
    why: ["9 is larger than every other element.", "-1 is the largest of the negatives."],
    hidden: ["1\n42", "6\n5 5 5 5 5 5", "7\n1 2 3 4 5 6 7", "7\n7 6 5 4 3 2 1"],
    edge: ["2\n-1000000000 1000000000"],
    sol: {
      PYTHON: `import sys
data = sys.stdin.read().split()
n = int(data[0])
print(max(map(int, data[1:1 + n])))
`,
      CPP: `#include <bits/stdc++.h>
using namespace std;
int main(){int n;cin>>n;long long best,x;cin>>best;for(int i=1;i<n;i++){cin>>x;best=max(best,x);}cout<<best<<"\\n";}
`,
    },
  },
  {
    slug: "array-sum",
    title: "Sum of Array Elements",
    difficulty: "EASY",
    topics: ["arrays"],
    d: "Compute the sum of all elements in an array. The total can exceed the range of a 32-bit integer.",
    in: "First line: n.\nSecond line: n integers.",
    out: "The sum of all elements.",
    c: "1 <= n <= 100000\n-10^9 <= a[i] <= 10^9",
    hints: [
      "One accumulator is all you need.",
      "Think about the largest total 100000 elements of magnitude 10^9 can produce.",
      "Use a 64-bit integer type so the accumulator never overflows.",
    ],
    ap: "Accumulate every element into a 64-bit running total.",
    it: "The only trap is overflow: n times the maximum magnitude exceeds 2^31.",
    st: ["Initialise total = 0 as a 64-bit value.", "Add each element to total.", "Print total."],
    tc: "O(n)",
    sc: "O(1)",
    solve: (input) => String(A(input).reduce((sum, value) => sum + value, 0)),
    samples: ["5\n1 2 3 4 5", "3\n-4 10 -6"],
    why: ["1+2+3+4+5 = 15.", "-4+10-6 = 0."],
    hidden: ["1\n0", "4\n1000000000 1000000000 1000000000 1000000000", "6\n-1 -2 -3 -4 -5 -6", "5\n7 -7 7 -7 7"],
    edge: ["2\n-1000000000 -1000000000"],
    sol: {
      PYTHON: `import sys
data = sys.stdin.read().split()
n = int(data[0])
print(sum(map(int, data[1:1 + n])))
`,
      CPP: `#include <bits/stdc++.h>
using namespace std;
int main(){int n;cin>>n;long long s=0,x;while(n--){cin>>x;s+=x;}cout<<s<<"\\n";}
`,
    },
  },
  {
    slug: "reverse-array",
    title: "Reverse an Array",
    difficulty: "EASY",
    topics: ["arrays"],
    d: "Print the elements of an array in reverse order, using O(1) extra space beyond the input.",
    in: "First line: n.\nSecond line: n integers.",
    out: "The n integers in reverse order, space separated.",
    c: "1 <= n <= 100000\n-10^9 <= a[i] <= 10^9",
    hints: [
      "You do not need a second array.",
      "Pair the first element with the last, the second with the second-last, and so on.",
      "Use two pointers moving towards each other and swap as they go.",
    ],
    ap: "Two pointers, one at each end, swapping and stepping inwards until they meet.",
    it: "Reversal is a set of independent swaps between mirrored positions.",
    st: ["Set i = 0 and j = n-1.", "While i < j, swap a[i] and a[j].", "Increment i, decrement j.", "Print the array."],
    tc: "O(n)",
    sc: "O(1)",
    solve: (input) => join(A(input).reverse()),
    samples: ["5\n1 2 3 4 5", "4\n9 -2 0 7"],
    why: ["The order is flipped end to end.", "Every element moves to its mirrored position."],
    hidden: ["1\n5", "2\n1 2", "6\n1 1 2 2 3 3", "3\n-1 -2 -3"],
    edge: ["2\n1000000000 -1000000000"],
    sol: {
      PYTHON: `import sys
data = sys.stdin.read().split()
n = int(data[0])
print(*reversed(data[1:1 + n]))
`,
      CPP: `#include <bits/stdc++.h>
using namespace std;
int main(){int n;cin>>n;vector<long long>a(n);for(auto&x:a)cin>>x;reverse(a.begin(),a.end());for(int i=0;i<n;i++)cout<<a[i]<<" \\n"[i==n-1];}
`,
    },
  },
  {
    slug: "second-largest",
    title: "Second Largest Element",
    difficulty: "EASY",
    topics: ["arrays"],
    d: "Find the second largest distinct value in an array. If every element is equal, print -1.",
    in: "First line: n.\nSecond line: n integers.",
    out: "The second largest distinct value, or -1.",
    c: "1 <= n <= 100000\n-10^9 <= a[i] <= 10^9",
    hints: [
      "Sorting works but does more than you need.",
      "Track two values as you scan, not one.",
      "Keep `best` and `second`; when a new value beats `best`, the old `best` becomes `second`.",
    ],
    ap: "One pass maintaining the largest and second largest distinct values seen so far.",
    it: "The second largest is the largest of everything that is not the maximum, which you can maintain incrementally.",
    st: [
      "Initialise best and second to negative infinity.",
      "For each value: if it beats best, second = best and best = value.",
      "Else if it is below best but above second, second = value.",
      "Print second, or -1 if it was never set.",
    ],
    tc: "O(n)",
    sc: "O(1)",
    solve: (input) => {
      const a = A(input);
      let best = -Infinity;
      let second = -Infinity;
      for (const value of a) {
        if (value > best) {
          second = best;
          best = value;
        } else if (value < best && value > second) second = value;
      }
      return second === -Infinity ? "-1" : String(second);
    },
    samples: ["5\n3 9 2 9 4", "3\n7 7 7"],
    why: ["9 is the largest; the largest distinct value below it is 4.", "Every element is equal, so there is no second largest."],
    hidden: ["2\n1 2", "6\n-5 -1 -3 -1 -9 -2", "5\n10 9 8 7 6", "4\n1 1 2 2"],
    edge: ["1\n5", "2\n-1000000000 1000000000"],
    sol: {
      PYTHON: `import sys
data = sys.stdin.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
best = second = float("-inf")
for v in a:
    if v > best:
        best, second = v, best
    elif best > v > second:
        second = v
print(-1 if second == float("-inf") else second)
`,
    },
  },
  {
    slug: "linear-search",
    title: "Linear Search",
    difficulty: "EASY",
    topics: ["searching", "arrays"],
    d: "Find the first position at which a target value occurs in an array, or report -1 if it never occurs.",
    in: "First line: n and target.\nSecond line: n integers.",
    out: "The 0-indexed position of the first occurrence, or -1.",
    c: "1 <= n <= 100000\n-10^9 <= a[i], target <= 10^9",
    hints: [
      "The array is not sorted, so you cannot skip elements.",
      "Stop as soon as you find a match.",
      "Scan from left to right and return the first index where a[i] equals the target.",
    ],
    ap: "Scan from the left and return the first matching index.",
    it: "Without ordering, every element could be the answer, so you must be prepared to look at all of them.",
    st: ["Loop i from 0 to n-1.", "If a[i] equals the target, print i and stop.", "If the loop finishes, print -1."],
    tc: "O(n)",
    sc: "O(1)",
    solve: (input) => {
      const r = reader(input);
      const n = r.int();
      const target = r.int();
      const a = r.ints(n);
      return String(a.indexOf(target));
    },
    samples: ["5 7\n1 3 7 9 7", "4 6\n1 2 3 4"],
    why: ["7 first appears at index 2.", "6 never appears."],
    hidden: ["1 5\n5", "6 -3\n1 -3 -3 4 5 6", "5 1\n2 3 4 5 1", "3 0\n0 0 0"],
    edge: ["1 1\n2"],
  },
  {
    slug: "binary-search-sorted",
    title: "Binary Search",
    difficulty: "EASY",
    topics: ["searching"],
    d: "Given a sorted array in non-decreasing order, find any position at which a target occurs, or -1 if it does not occur.",
    in: "First line: n and target.\nSecond line: n sorted integers.",
    out: "A 0-indexed position of the target, or -1.",
    c: "1 <= n <= 200000\n-10^9 <= a[i], target <= 10^9\nThe array is sorted.",
    hints: [
      "Sortedness lets you discard half the search space with one comparison.",
      "Compare against the middle element and decide which half can still contain the target.",
      "Maintain [lo, hi] and shrink it until it is empty or the middle matches.",
    ],
    ap: "Classic binary search over the index range, halving the candidate window each step.",
    it: "Each comparison against the midpoint eliminates half of the remaining candidates, so the search costs log n comparisons.",
    st: [
      "Set lo = 0, hi = n-1.",
      "While lo <= hi, compute mid = lo + (hi-lo)/2.",
      "If a[mid] equals the target, print mid.",
      "If a[mid] < target, lo = mid+1, else hi = mid-1.",
    ],
    tc: "O(log n)",
    sc: "O(1)",
    solve: (input) => {
      const r = reader(input);
      const n = r.int();
      const target = r.int();
      const a = r.ints(n);
      let lo = 0;
      let hi = n - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (a[mid] === target) return String(mid);
        if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
      }
      return "-1";
    },
    samples: ["6 7\n1 3 5 7 9 11", "5 4\n1 2 3 5 6"],
    why: ["7 sits at index 3.", "4 is absent from the array."],
    hidden: ["1 1\n1", "8 11\n1 3 5 7 9 11 13 15", "7 -5\n-9 -7 -5 -3 -1 0 2", "4 100\n1 2 3 4"],
    edge: ["2 1000000000\n-1000000000 1000000000"],
    companies: ["amazon", "microsoft", "google"],
    sol: {
      PYTHON: `import sys
data = sys.stdin.read().split()
n, target = int(data[0]), int(data[1])
a = list(map(int, data[2:2 + n]))
lo, hi = 0, n - 1
while lo <= hi:
    mid = (lo + hi) // 2
    if a[mid] == target:
        print(mid); break
    if a[mid] < target:
        lo = mid + 1
    else:
        hi = mid - 1
else:
    print(-1)
`,
      CPP: `#include <bits/stdc++.h>
using namespace std;
int main(){int n;long long t;cin>>n>>t;vector<long long>a(n);for(auto&x:a)cin>>x;
int lo=0,hi=n-1;while(lo<=hi){int m=lo+(hi-lo)/2;if(a[m]==t){cout<<m<<"\\n";return 0;}if(a[m]<t)lo=m+1;else hi=m-1;}
cout<<-1<<"\\n";}
`,
    },
  },
  {
    slug: "count-occurrences",
    title: "Count Occurrences",
    difficulty: "EASY",
    topics: ["arrays", "hashing"],
    d: "Count how many times a target value occurs in an array.",
    in: "First line: n and target.\nSecond line: n integers.",
    out: "The number of occurrences.",
    c: "1 <= n <= 100000\n-10^9 <= a[i], target <= 10^9",
    hints: [
      "You must inspect every element at least once.",
      "A single counter suffices.",
      "Increment the counter whenever the element equals the target.",
    ],
    ap: "One pass with a counter.",
    it: "Counting is a fold: start at zero and add one for every match.",
    st: ["Set count = 0.", "For each element, if it equals the target increment count.", "Print count."],
    tc: "O(n)",
    sc: "O(1)",
    solve: (input) => {
      const r = reader(input);
      const n = r.int();
      const target = r.int();
      return String(r.ints(n).filter((value) => value === target).length);
    },
    samples: ["6 3\n1 3 3 5 3 7", "4 9\n1 2 3 4"],
    why: ["3 occurs at indices 1, 2 and 4.", "9 never occurs."],
    hidden: ["1 1\n1", "5 0\n0 0 0 0 0", "7 -2\n-2 3 -2 -2 5 -2 1", "3 4\n1 2 3"],
    edge: ["1 1000000000\n1000000000"],
  },
  {
    slug: "reverse-string",
    title: "Reverse a String",
    difficulty: "EASY",
    topics: ["strings"],
    d: "Print a string with its characters in reverse order.",
    in: "A single line containing a string of visible ASCII characters without spaces.",
    out: "The reversed string.",
    c: "1 <= |s| <= 100000",
    hints: [
      "Reversal maps position i to position |s|-1-i.",
      "You can do it in place with two pointers.",
      "Swap the ends and move both pointers inwards.",
    ],
    ap: "Two pointers from both ends, swapping until they cross.",
    it: "Reversal is a permutation made of independent mirrored swaps.",
    st: ["Set i = 0, j = |s|-1.", "While i < j swap s[i] and s[j].", "Advance i, decrement j.", "Print the result."],
    tc: "O(n)",
    sc: "O(1)",
    solve: (input) => input.trim().split("").reverse().join(""),
    samples: ["forge", "abcd"],
    why: ["'forge' read backwards is 'egrof'.", "'abcd' read backwards is 'dcba'."],
    hidden: ["a", "racecar", "DSAForge2026", "!@#$%^"],
    edge: ["ab"],
    sol: {
      PYTHON: `import sys
print(sys.stdin.readline().strip()[::-1])
`,
      CPP: `#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;reverse(s.begin(),s.end());cout<<s<<"\\n";}
`,
    },
  },
  {
    slug: "palindrome-string",
    title: "Check Palindrome",
    difficulty: "EASY",
    topics: ["strings"],
    d: "Decide whether a string reads the same forwards and backwards. Comparison is case sensitive and every character counts.",
    in: "A single line containing a string without spaces.",
    out: "YES if the string is a palindrome, otherwise NO.",
    c: "1 <= |s| <= 100000",
    hints: [
      "You do not need to build the reversed string.",
      "Compare mirrored positions directly.",
      "Two pointers from both ends: if any pair differs, the answer is NO.",
    ],
    ap: "Two pointers meeting in the middle, comparing mirrored characters.",
    it: "A palindrome is exactly a string where every mirrored pair matches, so one disagreement is enough to decide.",
    st: ["Set i = 0, j = |s|-1.", "While i < j, if s[i] != s[j] print NO and stop.", "Otherwise advance both pointers.", "Print YES."],
    tc: "O(n)",
    sc: "O(1)",
    solve: (input) => {
      const s = input.trim();
      return yesNo(s === s.split("").reverse().join(""));
    },
    samples: ["racecar", "forge"],
    why: ["Every mirrored pair matches.", "'f' and 'e' differ."],
    hidden: ["a", "abba", "abcba", "Racecar"],
    edge: ["aa", "ab"],
    companies: ["tcs", "infosys", "wipro"],
    sol: {
      PYTHON: `import sys
s = sys.stdin.readline().strip()
print("YES" if s == s[::-1] else "NO")
`,
    },
  },
  {
    slug: "count-vowels",
    title: "Count Vowels and Consonants",
    difficulty: "EASY",
    topics: ["strings"],
    d: "Given a string of English letters, count how many are vowels (a, e, i, o, u, in either case) and how many are consonants.",
    in: "A single line containing letters only.",
    out: "Two integers: the vowel count and the consonant count.",
    c: "1 <= |s| <= 100000",
    hints: [
      "Classification per character is independent of the rest of the string.",
      "Lowercase each character before testing it.",
      "Keep two counters and increment the appropriate one for each letter.",
    ],
    ap: "Single pass, lowercasing each character and testing membership in the vowel set.",
    it: "Every letter falls into exactly one bucket, so counting is a linear classification.",
    st: ["Set vowels = 0 and consonants = 0.", "For each character, lowercase it.", "If it is one of aeiou increment vowels, else increment consonants.", "Print both counts."],
    tc: "O(n)",
    sc: "O(1)",
    solve: (input) => {
      const s = input.trim().toLowerCase();
      let vowels = 0;
      let consonants = 0;
      for (const ch of s) {
        if ("aeiou".includes(ch)) vowels += 1;
        else consonants += 1;
      }
      return `${vowels} ${consonants}`;
    },
    samples: ["forge", "AEIOU"],
    why: ["'o' and 'e' are vowels; 'f', 'r', 'g' are consonants.", "All five characters are vowels."],
    hidden: ["a", "xyz", "DataStructures", "Programming"],
    edge: ["b"],
  },
  {
    slug: "string-anagram",
    title: "Valid Anagram",
    difficulty: "EASY",
    topics: ["strings", "hashing"],
    d: "Decide whether two strings are anagrams of each other, that is whether one is a rearrangement of the other.",
    in: "Two lines, each containing a lowercase string.",
    out: "YES if the strings are anagrams, otherwise NO.",
    c: "1 <= |s|, |t| <= 100000\nBoth strings contain lowercase English letters only.",
    hints: [
      "Order does not matter, only how many of each letter there are.",
      "Different lengths can never be anagrams.",
      "Count letter frequencies for both strings and compare the two count arrays.",
    ],
    ap: "Build a frequency table of 26 counters for each string and compare them. Sorting both strings also works but costs an extra log factor.",
    it: "An anagram is a multiset equality, and a fixed alphabet makes that multiset a 26-slot array.",
    st: [
      "If the lengths differ print NO.",
      "Count occurrences of each letter in the first string.",
      "Decrement those counts using the second string.",
      "If any count is non-zero print NO, otherwise YES.",
    ],
    tc: "O(n)",
    sc: "O(1)",
    solve: (input) => {
      const [s = "", t = ""] = tokens(input);
      if (s.length !== t.length) return "NO";
      const count = new Map<string, number>();
      for (const ch of s) count.set(ch, (count.get(ch) ?? 0) + 1);
      for (const ch of t) {
        const next = (count.get(ch) ?? 0) - 1;
        if (next < 0) return "NO";
        count.set(ch, next);
      }
      return "YES";
    },
    samples: ["listen\nsilent", "hello\nbello"],
    why: ["Both strings use the same letters.", "'h' appears in one string but not the other."],
    hidden: ["a\na", "ab\nba", "aab\nabb", "forge\nogref"],
    edge: ["a\nab"],
    companies: ["amazon", "adobe", "accenture"],
    sol: {
      PYTHON: `import sys
from collections import Counter
data = sys.stdin.read().split()
print("YES" if Counter(data[0]) == Counter(data[1]) else "NO")
`,
    },
  },
  {
    slug: "factorial-number",
    title: "Factorial",
    difficulty: "EASY",
    topics: ["recursion", "math"],
    d: "Compute n! for a small n. The result fits in a 64-bit signed integer.",
    in: "A single integer n.",
    out: "The value of n!.",
    c: "0 <= n <= 20",
    hints: [
      "0! is defined as 1.",
      "n! = n times (n-1)!.",
      "Either recurse with a base case at 0, or multiply iteratively from 1 to n.",
    ],
    ap: "Multiply 1 through n into a 64-bit accumulator, or express the same product recursively.",
    it: "Factorial is the canonical example of a recurrence with a single base case.",
    st: ["If n is 0 the answer is 1.", "Otherwise multiply the numbers 1..n.", "Print the product."],
    tc: "O(n)",
    sc: "O(1)",
    solve: (input) => {
      const n = Number(input.trim());
      let result = 1n;
      for (let i = 2n; i <= BigInt(n); i += 1n) result *= i;
      return result.toString();
    },
    samples: ["5", "0"],
    why: ["5! = 120.", "0! is 1 by definition."],
    hidden: ["1", "10", "15", "20"],
    edge: ["2"],
    sol: {
      PYTHON: `import math, sys
print(math.factorial(int(sys.stdin.readline())))
`,
      CPP: `#include <bits/stdc++.h>
using namespace std;
int main(){int n;cin>>n;unsigned long long f=1;for(int i=2;i<=n;i++)f*=i;cout<<f<<"\\n";}
`,
    },
  },
  {
    slug: "fibonacci-nth",
    title: "Nth Fibonacci Number",
    difficulty: "EASY",
    topics: ["recursion", "dp"],
    d: "Print the nth Fibonacci number, where F(0) = 0, F(1) = 1 and F(k) = F(k-1) + F(k-2).",
    in: "A single integer n.",
    out: "F(n).",
    c: "0 <= n <= 90",
    hints: [
      "Naive recursion recomputes the same values exponentially often.",
      "You only ever need the previous two values.",
      "Iterate upwards, keeping a rolling pair (prev, current).",
    ],
    ap: "Bottom-up iteration with two rolling variables, which is the space-optimised form of the classic DP.",
    it: "The recurrence has a window of two, so the whole table collapses into two variables.",
    st: ["Handle n = 0 and n = 1 directly.", "Set prev = 0, current = 1.", "Repeat n-1 times: (prev, current) = (current, prev+current).", "Print current."],
    tc: "O(n)",
    sc: "O(1)",
    solve: (input) => {
      const n = Number(input.trim());
      let prev = 0n;
      let current = 1n;
      if (n === 0) return "0";
      for (let i = 2; i <= n; i += 1) {
        const next = prev + current;
        prev = current;
        current = next;
      }
      return current.toString();
    },
    samples: ["7", "0"],
    why: ["The sequence is 0 1 1 2 3 5 8, so F(7) = 13.", "F(0) is 0 by definition."],
    hidden: ["1", "10", "50", "90"],
    edge: ["2"],
    companies: ["tcs", "infosys"],
    sol: {
      PYTHON: `import sys
n = int(sys.stdin.readline())
a, b = 0, 1
for _ in range(n):
    a, b = b, a + b
print(a)
`,
      CPP: `#include <bits/stdc++.h>
using namespace std;
int main(){int n;cin>>n;unsigned long long a=0,b=1;while(n--){unsigned long long c=a+b;a=b;b=c;}cout<<a<<"\\n";}
`,
    },
  },
  {
    slug: "gcd-two-numbers",
    title: "GCD of Two Numbers",
    difficulty: "EASY",
    topics: ["math", "recursion"],
    d: "Compute the greatest common divisor of two non-negative integers.",
    in: "Two integers a and b on one line.",
    out: "gcd(a, b).",
    c: "0 <= a, b <= 10^18\na and b are not both zero.",
    hints: [
      "Trial division up to min(a, b) is far too slow for 10^18.",
      "gcd(a, b) = gcd(b, a mod b).",
      "Apply the Euclidean algorithm until the remainder is zero.",
    ],
    ap: "The Euclidean algorithm: repeatedly replace (a, b) with (b, a mod b) until b is zero.",
    it: "Any common divisor of a and b also divides a mod b, so the pair can shrink quickly without losing the answer.",
    st: ["While b is non-zero, set (a, b) = (b, a mod b).", "Print a."],
    tc: "O(log min(a, b))",
    sc: "O(1)",
    solve: (input) => {
      const [x, y] = tokens(input).map(BigInt);
      let a = x;
      let b = y;
      while (b !== 0n) {
        const t = a % b;
        a = b;
        b = t;
      }
      return a.toString();
    },
    samples: ["12 18", "17 5"],
    why: ["6 divides both 12 and 18 and nothing larger does.", "17 and 5 are coprime."],
    hidden: ["0 7", "100 25", "1000000000000000000 2", "270 192"],
    edge: ["1 1"],
    sol: {
      PYTHON: `import math, sys
a, b = map(int, sys.stdin.readline().split())
print(math.gcd(a, b))
`,
    },
  },
  {
    slug: "prime-check",
    title: "Check if a Number is Prime",
    difficulty: "EASY",
    topics: ["math"],
    d: "Decide whether a positive integer is prime.",
    in: "A single integer n.",
    out: "YES if n is prime, otherwise NO.",
    c: "1 <= n <= 10^12",
    hints: [
      "Checking every divisor up to n is far too slow.",
      "If n = p times q then one of p, q is at most sqrt(n).",
      "Test divisibility only up to the square root of n.",
    ],
    ap: "Trial division up to sqrt(n), skipping even numbers after the check for 2.",
    it: "Divisors come in pairs that straddle sqrt(n), so finding none below the root proves there are none at all.",
    st: ["Numbers below 2 are not prime.", "Handle 2 and 3 directly.", "Reject multiples of 2 and 3.", "Test divisors of the form 6k±1 up to sqrt(n)."],
    tc: "O(sqrt n)",
    sc: "O(1)",
    solve: (input) => {
      const n = Number(input.trim());
      if (n < 2) return "NO";
      if (n < 4) return "YES";
      if (n % 2 === 0 || n % 3 === 0) return "NO";
      for (let i = 5; i * i <= n; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) return "NO";
      }
      return "YES";
    },
    samples: ["29", "1"],
    why: ["29 has no divisor other than 1 and itself.", "1 is not prime by definition."],
    hidden: ["2", "97", "1000003", "999999999989"],
    edge: ["4", "9"],
    sol: {
      PYTHON: `import sys
n = int(sys.stdin.readline())
if n < 2:
    print("NO")
else:
    i, ok = 2, True
    while i * i <= n:
        if n % i == 0:
            ok = False
            break
        i += 1
    print("YES" if ok else "NO")
`,
    },
  },
  {
    slug: "sum-of-digits",
    title: "Sum of Digits",
    difficulty: "EASY",
    topics: ["math"],
    d: "Compute the sum of the decimal digits of a non-negative integer.",
    in: "A single integer n.",
    out: "The sum of its digits.",
    c: "0 <= n <= 10^18",
    hints: [
      "n mod 10 gives you the last digit.",
      "Integer division by 10 removes that digit.",
      "Repeat until the number becomes zero.",
    ],
    ap: "Repeatedly take n mod 10 and divide n by 10 until nothing is left.",
    it: "Decimal digits are exactly the residues you get by peeling off powers of ten.",
    st: ["Set total = 0.", "While n > 0: total += n mod 10, then n /= 10.", "Print total."],
    tc: "O(log n)",
    sc: "O(1)",
    solve: (input) =>
      String(
        input
          .trim()
          .split("")
          .reduce((sum, ch) => sum + Number(ch), 0),
      ),
    samples: ["12345", "0"],
    why: ["1+2+3+4+5 = 15.", "The only digit is 0."],
    hidden: ["9", "1000000", "999999999999999999", "10203040"],
    edge: ["10"],
  },
  {
    slug: "even-odd-count",
    title: "Count Even and Odd",
    difficulty: "EASY",
    topics: ["arrays", "math"],
    d: "Count how many elements of an array are even and how many are odd.",
    in: "First line: n.\nSecond line: n integers.",
    out: "Two integers: the count of even values and the count of odd values.",
    c: "1 <= n <= 100000\n-10^9 <= a[i] <= 10^9",
    hints: [
      "Parity is decided by the last bit.",
      "Careful with negative numbers if your language's modulo can return -1.",
      "Use value % 2 == 0 or a bitwise AND with 1.",
    ],
    ap: "One pass, incrementing one of two counters based on parity.",
    it: "Parity is a local property, so no ordering or extra structure is needed.",
    st: ["Set even = 0, odd = 0.", "For each value, test whether it is divisible by 2.", "Increment the matching counter.", "Print both counts."],
    tc: "O(n)",
    sc: "O(1)",
    solve: (input) => {
      const a = A(input);
      const even = a.filter((value) => value % 2 === 0).length;
      return `${even} ${a.length - even}`;
    },
    samples: ["6\n1 2 3 4 5 6", "3\n-2 -3 -4"],
    why: ["2, 4 and 6 are even; 1, 3 and 5 are odd.", "-2 and -4 are even; -3 is odd."],
    hidden: ["1\n0", "5\n2 4 6 8 10", "5\n1 3 5 7 9", "4\n-1 0 1 2"],
    edge: ["1\n-1000000000"],
  },
  {
    slug: "swap-without-temp",
    title: "Swap Two Numbers",
    difficulty: "EASY",
    topics: ["math"],
    d: "Read two integers and print them in the opposite order. Solve it without using a third variable to hold a value.",
    in: "Two integers a and b.",
    out: "b and a, space separated.",
    c: "-10^9 <= a, b <= 10^9",
    hints: [
      "Arithmetic can encode both values in one variable temporarily.",
      "a = a + b then b = a - b then a = a - b works but can overflow.",
      "XOR swapping avoids overflow entirely: a ^= b; b ^= a; a ^= b.",
    ],
    ap: "Swap in place using XOR, which is overflow-safe, or simply print the values in reverse order.",
    it: "XOR is its own inverse, so applying it three times exchanges the two operands.",
    st: ["Read a and b.", "a ^= b; b ^= a; a ^= b.", "Print a and b."],
    tc: "O(1)",
    sc: "O(1)",
    solve: (input) => {
      const [a, b] = tokens(input);
      return `${b} ${a}`;
    },
    samples: ["3 8", "-4 9"],
    why: ["The values are exchanged.", "Signs are preserved through the swap."],
    hidden: ["0 0", "1 -1", "1000000000 -1000000000", "7 7"],
    edge: ["-1000000000 -1000000000"],
  },
  {
    slug: "array-rotate-left",
    title: "Left Rotate an Array by K",
    difficulty: "EASY",
    topics: ["arrays"],
    d: "Rotate an array to the left by k positions. The element at index i moves to index (i - k + n) mod n.",
    in: "First line: n and k.\nSecond line: n integers.",
    out: "The rotated array, space separated.",
    c: "1 <= n <= 100000\n0 <= k <= 10^9\n-10^9 <= a[i] <= 10^9",
    hints: [
      "Rotating by n leaves the array unchanged, so reduce k first.",
      "Rotating one step at a time costs O(nk), which is too slow.",
      "Reverse the first k elements, reverse the rest, then reverse the whole array.",
    ],
    ap: "Reduce k modulo n, then apply the three-reversal trick for an in-place O(n) rotation.",
    it: "Reversing a prefix and a suffix and then the whole array moves each block into place without extra memory.",
    st: ["Set k = k mod n.", "Reverse a[0..k-1].", "Reverse a[k..n-1].", "Reverse the entire array."],
    tc: "O(n)",
    sc: "O(1)",
    solve: (input) => {
      const r = reader(input);
      const n = r.int();
      const k = r.int() % n;
      const a = r.ints(n);
      return join([...a.slice(k), ...a.slice(0, k)]);
    },
    samples: ["5 2\n1 2 3 4 5", "4 0\n9 8 7 6"],
    why: ["Each element moves two places left, wrapping around.", "A rotation of zero changes nothing."],
    hidden: ["5 5\n1 2 3 4 5", "6 7\n1 2 3 4 5 6", "3 1000000000\n1 2 3", "1 5\n42"],
    edge: ["2 1\n-1000000000 1000000000"],
    companies: ["amazon", "tcs"],
    sol: {
      PYTHON: `import sys
data = sys.stdin.read().split()
n, k = int(data[0]), int(data[1])
a = list(map(int, data[2:2 + n]))
k %= n
print(*(a[k:] + a[:k]))
`,
      CPP: `#include <bits/stdc++.h>
using namespace std;
int main(){long long n,k;cin>>n>>k;vector<long long>a(n);for(auto&x:a)cin>>x;k%=n;
rotate(a.begin(),a.begin()+k,a.end());
for(long long i=0;i<n;i++)cout<<a[i]<<" \\n"[i==n-1];}
`,
    },
  },
];

export const EASY_A = specs.map(build);
