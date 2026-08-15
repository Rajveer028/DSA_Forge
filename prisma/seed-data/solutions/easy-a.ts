import type { SolutionSet } from "./index";

/**
 * Reference solutions for the easy-a catalogue.
 *
 * Each one is a complete program: read stdin, write stdout, exit. They follow
 * the editorial approach for the problem rather than the shortest trick, so a
 * reader can map the code back onto the written steps line by line.
 */
export const EASY_A_SOLUTIONS: Record<string, SolutionSet> = {
  "maximum-element": {
    C: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long best = 0, value;
    for (int i = 0; i < n; i++) {
        if (scanf("%lld", &value) != 1) break;
        if (i == 0 || value > best) best = value;
    }
    printf("%lld\\n", best);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    if (!(cin >> n)) return 0;
    long long best = 0, value;
    for (int i = 0; i < n; i++) {
        cin >> value;
        if (i == 0 || value > best) best = value;
    }
    cout << best << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());
        long best = 0;
        for (int i = 0; i < n; i++) {
            long value = Long.parseLong(st.nextToken());
            if (i == 0 || value > best) best = value;
        }
        System.out.println(best);
    }

    private static StringTokenizer tokens() throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder all = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) all.append(line).append(' ');
        return new StringTokenizer(all.toString());
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    n = int(data[0])
    values = list(map(int, data[1:1 + n]))
    print(max(values))

if __name__ == "__main__":
    main()
`,
  },

  "array-sum": {
    C: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long total = 0, value;
    for (int i = 0; i < n; i++) {
        if (scanf("%lld", &value) != 1) break;
        total += value;
    }
    printf("%lld\\n", total);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    if (!(cin >> n)) return 0;
    long long total = 0, value;
    for (int i = 0; i < n; i++) {
        cin >> value;
        total += value;
    }
    cout << total << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());
        long total = 0;
        for (int i = 0; i < n; i++) total += Long.parseLong(st.nextToken());
        System.out.println(total);
    }

    private static StringTokenizer tokens() throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder all = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) all.append(line).append(' ');
        return new StringTokenizer(all.toString());
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    n = int(data[0])
    print(sum(map(int, data[1:1 + n])))

if __name__ == "__main__":
    main()
`,
  },

  "reverse-array": {
    C: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long *a = malloc(sizeof(long long) * (size_t)n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);

    /* Two pointers walking inwards, swapping as they go. */
    for (int i = 0, j = n - 1; i < j; i++, j--) {
        long long tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }

    for (int i = 0; i < n; i++) printf("%lld%c", a[i], i + 1 == n ? '\\n' : ' ');
    free(a);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    if (!(cin >> n)) return 0;
    vector<long long> a(n);
    for (auto &value : a) cin >> value;

    for (int i = 0, j = n - 1; i < j; i++, j--) swap(a[i], a[j]);

    for (int i = 0; i < n; i++) cout << a[i] << (i + 1 == n ? '\\n' : ' ');
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());
        long[] a = new long[n];
        for (int i = 0; i < n; i++) a[i] = Long.parseLong(st.nextToken());

        for (int i = 0, j = n - 1; i < j; i++, j--) {
            long tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
        }

        StringBuilder out = new StringBuilder();
        for (int i = 0; i < n; i++) {
            if (i > 0) out.append(' ');
            out.append(a[i]);
        }
        System.out.println(out);
    }

    private static StringTokenizer tokens() throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder all = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) all.append(line).append(' ');
        return new StringTokenizer(all.toString());
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    n = int(data[0])
    a = data[1:1 + n]
    a.reverse()
    print(" ".join(a))

if __name__ == "__main__":
    main()
`,
  },

  "second-largest": {
    C: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    long long best = 0, second = 0;
    int haveBest = 0, haveSecond = 0;
    for (int i = 0; i < n; i++) {
        long long value;
        if (scanf("%lld", &value) != 1) break;
        if (!haveBest || value > best) {
            if (haveBest) {
                second = best;
                haveSecond = 1;
            }
            best = value;
            haveBest = 1;
        } else if (value != best && (!haveSecond || value > second)) {
            second = value;
            haveSecond = 1;
        }
    }

    if (haveSecond) printf("%lld\\n", second);
    else printf("-1\\n");
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    if (!(cin >> n)) return 0;

    long long best = 0, second = 0;
    bool haveBest = false, haveSecond = false;
    for (int i = 0; i < n; i++) {
        long long value;
        cin >> value;
        if (!haveBest || value > best) {
            if (haveBest) {
                second = best;
                haveSecond = true;
            }
            best = value;
            haveBest = true;
        } else if (value != best && (!haveSecond || value > second)) {
            second = value;
            haveSecond = true;
        }
    }

    if (haveSecond) cout << second << "\\n";
    else cout << -1 << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());

        long best = 0, second = 0;
        boolean haveBest = false, haveSecond = false;
        for (int i = 0; i < n; i++) {
            long value = Long.parseLong(st.nextToken());
            if (!haveBest || value > best) {
                if (haveBest) {
                    second = best;
                    haveSecond = true;
                }
                best = value;
                haveBest = true;
            } else if (value != best && (!haveSecond || value > second)) {
                second = value;
                haveSecond = true;
            }
        }

        System.out.println(haveSecond ? second : -1);
    }

    private static StringTokenizer tokens() throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder all = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) all.append(line).append(' ');
        return new StringTokenizer(all.toString());
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    n = int(data[0])
    values = list(map(int, data[1:1 + n]))

    best = second = None
    for value in values:
        if best is None or value > best:
            if best is not None:
                second = best
            best = value
        elif value != best and (second is None or value > second):
            second = value

    print(second if second is not None else -1)

if __name__ == "__main__":
    main()
`,
  },

  "linear-search": {
    C: `#include <stdio.h>

int main(void) {
    int n;
    long long target;
    if (scanf("%d %lld", &n, &target) != 2) return 0;

    int found = -1;
    for (int i = 0; i < n; i++) {
        long long value;
        if (scanf("%lld", &value) != 1) break;
        if (found == -1 && value == target) found = i;
    }

    printf("%d\\n", found);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long target;
    if (!(cin >> n >> target)) return 0;

    int found = -1;
    for (int i = 0; i < n; i++) {
        long long value;
        cin >> value;
        if (found == -1 && value == target) found = i;
    }

    cout << found << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());
        long target = Long.parseLong(st.nextToken());

        int found = -1;
        for (int i = 0; i < n; i++) {
            long value = Long.parseLong(st.nextToken());
            if (found == -1 && value == target) found = i;
        }

        System.out.println(found);
    }

    private static StringTokenizer tokens() throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder all = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) all.append(line).append(' ');
        return new StringTokenizer(all.toString());
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    n, target = int(data[0]), int(data[1])
    values = list(map(int, data[2:2 + n]))

    for i, value in enumerate(values):
        if value == target:
            print(i)
            return
    print(-1)

if __name__ == "__main__":
    main()
`,
  },

  "binary-search-sorted": {
    C: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    long long target;
    if (scanf("%d %lld", &n, &target) != 2) return 0;
    long long *a = malloc(sizeof(long long) * (size_t)n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);

    int lo = 0, hi = n - 1, answer = -1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) { answer = mid; break; }
        if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }

    printf("%d\\n", answer);
    free(a);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long target;
    if (!(cin >> n >> target)) return 0;
    vector<long long> a(n);
    for (auto &value : a) cin >> value;

    int lo = 0, hi = n - 1, answer = -1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) { answer = mid; break; }
        if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }

    cout << answer << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());
        long target = Long.parseLong(st.nextToken());
        long[] a = new long[n];
        for (int i = 0; i < n; i++) a[i] = Long.parseLong(st.nextToken());

        int lo = 0, hi = n - 1, answer = -1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (a[mid] == target) { answer = mid; break; }
            if (a[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }

        System.out.println(answer);
    }

    private static StringTokenizer tokens() throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder all = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) all.append(line).append(' ');
        return new StringTokenizer(all.toString());
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    n, target = int(data[0]), int(data[1])
    a = list(map(int, data[2:2 + n]))

    lo, hi = 0, n - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if a[mid] == target:
            print(mid)
            return
        if a[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    print(-1)

if __name__ == "__main__":
    main()
`,
  },

  "count-occurrences": {
    C: `#include <stdio.h>

int main(void) {
    int n;
    long long target;
    if (scanf("%d %lld", &n, &target) != 2) return 0;

    int count = 0;
    for (int i = 0; i < n; i++) {
        long long value;
        if (scanf("%lld", &value) != 1) break;
        if (value == target) count++;
    }

    printf("%d\\n", count);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long target;
    if (!(cin >> n >> target)) return 0;

    int count = 0;
    for (int i = 0; i < n; i++) {
        long long value;
        cin >> value;
        if (value == target) count++;
    }

    cout << count << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());
        long target = Long.parseLong(st.nextToken());

        int count = 0;
        for (int i = 0; i < n; i++) {
            if (Long.parseLong(st.nextToken()) == target) count++;
        }

        System.out.println(count);
    }

    private static StringTokenizer tokens() throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder all = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) all.append(line).append(' ');
        return new StringTokenizer(all.toString());
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    n, target = int(data[0]), int(data[1])
    values = list(map(int, data[2:2 + n]))
    print(values.count(target))

if __name__ == "__main__":
    main()
`,
  },

  "reverse-string": {
    C: `#include <stdio.h>
#include <string.h>

static char s[100005];

int main(void) {
    if (scanf("%100004s", s) != 1) return 0;
    int n = (int)strlen(s);

    for (int i = 0, j = n - 1; i < j; i++, j--) {
        char tmp = s[i];
        s[i] = s[j];
        s[j] = tmp;
    }

    printf("%s\\n", s);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    if (!(cin >> s)) return 0;

    for (int i = 0, j = (int)s.size() - 1; i < j; i++, j--) swap(s[i], s[j]);

    cout << s << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String s = br.readLine();
        if (s == null) return;
        s = s.trim();

        char[] c = s.toCharArray();
        for (int i = 0, j = c.length - 1; i < j; i++, j--) {
            char tmp = c[i];
            c[i] = c[j];
            c[j] = tmp;
        }

        System.out.println(new String(c));
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    s = sys.stdin.read().strip()
    print(s[::-1])

if __name__ == "__main__":
    main()
`,
  },

  "palindrome-string": {
    C: `#include <stdio.h>
#include <string.h>

static char s[100005];

int main(void) {
    if (scanf("%100004s", s) != 1) return 0;
    int n = (int)strlen(s);

    for (int i = 0, j = n - 1; i < j; i++, j--) {
        if (s[i] != s[j]) {
            printf("NO\\n");
            return 0;
        }
    }

    printf("YES\\n");
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    if (!(cin >> s)) return 0;

    for (int i = 0, j = (int)s.size() - 1; i < j; i++, j--) {
        if (s[i] != s[j]) {
            cout << "NO\\n";
            return 0;
        }
    }

    cout << "YES\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String s = br.readLine();
        if (s == null) return;
        s = s.trim();

        for (int i = 0, j = s.length() - 1; i < j; i++, j--) {
            if (s.charAt(i) != s.charAt(j)) {
                System.out.println("NO");
                return;
            }
        }

        System.out.println("YES");
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    s = sys.stdin.read().strip()
    print("YES" if s == s[::-1] else "NO")

if __name__ == "__main__":
    main()
`,
  },

  "count-vowels": {
    C: `#include <stdio.h>
#include <ctype.h>
#include <string.h>

static char s[100005];

static int isVowel(char c) {
    c = (char)tolower((unsigned char)c);
    return c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u';
}

int main(void) {
    if (scanf("%100004s", s) != 1) return 0;

    int vowels = 0, consonants = 0;
    for (int i = 0; s[i] != '\\0'; i++) {
        if (isVowel(s[i])) vowels++;
        else consonants++;
    }

    printf("%d %d\\n", vowels, consonants);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    if (!(cin >> s)) return 0;

    int vowels = 0, consonants = 0;
    for (char c : s) {
        char lower = (char)tolower((unsigned char)c);
        if (lower == 'a' || lower == 'e' || lower == 'i' || lower == 'o' || lower == 'u') vowels++;
        else consonants++;
    }

    cout << vowels << " " << consonants << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String s = br.readLine();
        if (s == null) return;
        s = s.trim();

        int vowels = 0, consonants = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = Character.toLowerCase(s.charAt(i));
            if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u') vowels++;
            else consonants++;
        }

        System.out.println(vowels + " " + consonants);
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    s = sys.stdin.read().strip()
    vowels = sum(1 for c in s if c.lower() in "aeiou")
    print(vowels, len(s) - vowels)

if __name__ == "__main__":
    main()
`,
  },

  "string-anagram": {
    C: `#include <stdio.h>
#include <string.h>

static char s[100005];
static char t[100005];

int main(void) {
    if (scanf("%100004s", s) != 1) return 0;
    if (scanf("%100004s", t) != 1) return 0;

    if (strlen(s) != strlen(t)) {
        printf("NO\\n");
        return 0;
    }

    int count[26] = {0};
    for (int i = 0; s[i] != '\\0'; i++) count[s[i] - 'a']++;
    for (int i = 0; t[i] != '\\0'; i++) count[t[i] - 'a']--;

    for (int i = 0; i < 26; i++) {
        if (count[i] != 0) {
            printf("NO\\n");
            return 0;
        }
    }

    printf("YES\\n");
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s, t;
    if (!(cin >> s >> t)) return 0;

    if (s.size() != t.size()) {
        cout << "NO\\n";
        return 0;
    }

    array<int, 26> count{};
    for (char c : s) count[c - 'a']++;
    for (char c : t) count[c - 'a']--;

    for (int value : count) {
        if (value != 0) {
            cout << "NO\\n";
            return 0;
        }
    }

    cout << "YES\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        String s = st.nextToken();
        String t = st.hasMoreTokens() ? st.nextToken() : "";

        if (s.length() != t.length()) {
            System.out.println("NO");
            return;
        }

        int[] count = new int[26];
        for (int i = 0; i < s.length(); i++) count[s.charAt(i) - 'a']++;
        for (int i = 0; i < t.length(); i++) count[t.charAt(i) - 'a']--;

        for (int value : count) {
            if (value != 0) {
                System.out.println("NO");
                return;
            }
        }

        System.out.println("YES");
    }

    private static StringTokenizer tokens() throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder all = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) all.append(line).append(' ');
        return new StringTokenizer(all.toString());
    }
}
`,
    PYTHON: `import sys
from collections import Counter

def main() -> None:
    data = sys.stdin.read().split()
    s = data[0]
    t = data[1] if len(data) > 1 else ""
    print("YES" if len(s) == len(t) and Counter(s) == Counter(t) else "NO")

if __name__ == "__main__":
    main()
`,
  },

  "factorial-number": {
    C: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    long long result = 1;
    for (int i = 2; i <= n; i++) result *= i;

    printf("%lld\\n", result);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    if (!(cin >> n)) return 0;

    long long result = 1;
    for (int i = 2; i <= n; i++) result *= i;

    cout << result << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int n = Integer.parseInt(br.readLine().trim());

        long result = 1;
        for (int i = 2; i <= n; i++) result *= i;

        System.out.println(result);
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    n = int(sys.stdin.read().split()[0])

    result = 1
    for i in range(2, n + 1):
        result *= i

    print(result)

if __name__ == "__main__":
    main()
`,
  },

  "fibonacci-nth": {
    C: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    if (n == 0) { printf("0\\n"); return 0; }

    long long prev = 0, current = 1;
    for (int i = 2; i <= n; i++) {
        long long next = prev + current;
        prev = current;
        current = next;
    }

    printf("%lld\\n", current);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    if (!(cin >> n)) return 0;

    if (n == 0) { cout << "0\\n"; return 0; }

    long long prev = 0, current = 1;
    for (int i = 2; i <= n; i++) {
        long long next = prev + current;
        prev = current;
        current = next;
    }

    cout << current << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int n = Integer.parseInt(br.readLine().trim());

        if (n == 0) {
            System.out.println(0);
            return;
        }

        long prev = 0, current = 1;
        for (int i = 2; i <= n; i++) {
            long next = prev + current;
            prev = current;
            current = next;
        }

        System.out.println(current);
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    n = int(sys.stdin.read().split()[0])

    if n == 0:
        print(0)
        return

    prev, current = 0, 1
    for _ in range(2, n + 1):
        prev, current = current, prev + current

    print(current)

if __name__ == "__main__":
    main()
`,
  },

  "gcd-two-numbers": {
    C: `#include <stdio.h>

int main(void) {
    unsigned long long a, b;
    if (scanf("%llu %llu", &a, &b) != 2) return 0;

    while (b != 0) {
        unsigned long long tmp = a % b;
        a = b;
        b = tmp;
    }

    printf("%llu\\n", a);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    unsigned long long a, b;
    if (!(cin >> a >> b)) return 0;

    while (b != 0) {
        unsigned long long tmp = a % b;
        a = b;
        b = tmp;
    }

    cout << a << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        long a = Long.parseLong(st.nextToken());
        long b = Long.parseLong(st.nextToken());

        while (b != 0) {
            long tmp = a % b;
            a = b;
            b = tmp;
        }

        System.out.println(a);
    }

    private static StringTokenizer tokens() throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder all = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) all.append(line).append(' ');
        return new StringTokenizer(all.toString());
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    a, b = int(data[0]), int(data[1])

    while b:
        a, b = b, a % b

    print(a)

if __name__ == "__main__":
    main()
`,
  },

  "prime-check": {
    C: `#include <stdio.h>

int main(void) {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;

    if (n < 2) { printf("NO\\n"); return 0; }
    if (n < 4) { printf("YES\\n"); return 0; }
    if (n % 2 == 0 || n % 3 == 0) { printf("NO\\n"); return 0; }

    /* Every prime above 3 has the form 6k±1, so only those need testing. */
    for (long long i = 5; i * i <= n; i += 6) {
        if (n % i == 0 || n % (i + 2) == 0) {
            printf("NO\\n");
            return 0;
        }
    }

    printf("YES\\n");
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    if (!(cin >> n)) return 0;

    if (n < 2) { cout << "NO\\n"; return 0; }
    if (n < 4) { cout << "YES\\n"; return 0; }
    if (n % 2 == 0 || n % 3 == 0) { cout << "NO\\n"; return 0; }

    for (long long i = 5; i * i <= n; i += 6) {
        if (n % i == 0 || n % (i + 2) == 0) {
            cout << "NO\\n";
            return 0;
        }
    }

    cout << "YES\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        long n = Long.parseLong(br.readLine().trim());

        System.out.println(isPrime(n) ? "YES" : "NO");
    }

    private static boolean isPrime(long n) {
        if (n < 2) return false;
        if (n < 4) return true;
        if (n % 2 == 0 || n % 3 == 0) return false;
        for (long i = 5; i * i <= n; i += 6) {
            if (n % i == 0 || n % (i + 2) == 0) return false;
        }
        return true;
    }
}
`,
    PYTHON: `import sys

def is_prime(n: int) -> bool:
    if n < 2:
        return False
    if n < 4:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True

def main() -> None:
    n = int(sys.stdin.read().split()[0])
    print("YES" if is_prime(n) else "NO")

if __name__ == "__main__":
    main()
`,
  },

  "sum-of-digits": {
    C: `#include <stdio.h>

int main(void) {
    unsigned long long n;
    if (scanf("%llu", &n) != 1) return 0;

    int total = 0;
    if (n == 0) total = 0;
    while (n > 0) {
        total += (int)(n % 10);
        n /= 10;
    }

    printf("%d\\n", total);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    unsigned long long n;
    if (!(cin >> n)) return 0;

    int total = 0;
    while (n > 0) {
        total += (int)(n % 10);
        n /= 10;
    }

    cout << total << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        long n = Long.parseLong(br.readLine().trim());

        int total = 0;
        while (n > 0) {
            total += (int)(n % 10);
            n /= 10;
        }

        System.out.println(total);
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    n = int(sys.stdin.read().split()[0])

    total = 0
    while n > 0:
        total += n % 10
        n //= 10

    print(total)

if __name__ == "__main__":
    main()
`,
  },

  "even-odd-count": {
    C: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    int even = 0, odd = 0;
    for (int i = 0; i < n; i++) {
        long long value;
        if (scanf("%lld", &value) != 1) break;
        if (value % 2 == 0) even++;
        else odd++;
    }

    printf("%d %d\\n", even, odd);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    if (!(cin >> n)) return 0;

    int even = 0, odd = 0;
    for (int i = 0; i < n; i++) {
        long long value;
        cin >> value;
        if (value % 2 == 0) even++;
        else odd++;
    }

    cout << even << " " << odd << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());

        int even = 0, odd = 0;
        for (int i = 0; i < n; i++) {
            long value = Long.parseLong(st.nextToken());
            if (value % 2 == 0) even++;
            else odd++;
        }

        System.out.println(even + " " + odd);
    }

    private static StringTokenizer tokens() throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder all = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) all.append(line).append(' ');
        return new StringTokenizer(all.toString());
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    n = int(data[0])
    values = list(map(int, data[1:1 + n]))

    even = sum(1 for value in values if value % 2 == 0)
    print(even, len(values) - even)

if __name__ == "__main__":
    main()
`,
  },

  "swap-without-temp": {
    C: `#include <stdio.h>

int main(void) {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) != 2) return 0;

    /* XOR swap: no third variable, and no risk of overflow. */
    a ^= b;
    b ^= a;
    a ^= b;

    printf("%lld %lld\\n", a, b);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long a, b;
    if (!(cin >> a >> b)) return 0;

    a ^= b;
    b ^= a;
    a ^= b;

    cout << a << " " << b << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        long a = Long.parseLong(st.nextToken());
        long b = Long.parseLong(st.nextToken());

        a ^= b;
        b ^= a;
        a ^= b;

        System.out.println(a + " " + b);
    }

    private static StringTokenizer tokens() throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder all = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) all.append(line).append(' ');
        return new StringTokenizer(all.toString());
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    a, b = int(data[0]), int(data[1])

    a, b = b, a

    print(a, b)

if __name__ == "__main__":
    main()
`,
  },

  "array-rotate-left": {
    C: `#include <stdio.h>
#include <stdlib.h>

static void reverseRange(long long *a, int i, int j) {
    while (i < j) {
        long long tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
        i++;
        j--;
    }
}

int main(void) {
    int n;
    long long k;
    if (scanf("%d %lld", &n, &k) != 2) return 0;
    long long *a = malloc(sizeof(long long) * (size_t)n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);

    int shift = (int)(k % n);

    /* Three reversals rotate in place: [0,k), [k,n), then the whole array. */
    reverseRange(a, 0, shift - 1);
    reverseRange(a, shift, n - 1);
    reverseRange(a, 0, n - 1);

    for (int i = 0; i < n; i++) printf("%lld%c", a[i], i + 1 == n ? '\\n' : ' ');
    free(a);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long k;
    if (!(cin >> n >> k)) return 0;
    vector<long long> a(n);
    for (auto &value : a) cin >> value;

    int shift = (int)(k % n);
    rotate(a.begin(), a.begin() + shift, a.end());

    for (int i = 0; i < n; i++) cout << a[i] << (i + 1 == n ? '\\n' : ' ');
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());
        long k = Long.parseLong(st.nextToken());
        long[] a = new long[n];
        for (int i = 0; i < n; i++) a[i] = Long.parseLong(st.nextToken());

        int shift = (int)(k % n);
        reverse(a, 0, shift - 1);
        reverse(a, shift, n - 1);
        reverse(a, 0, n - 1);

        StringBuilder out = new StringBuilder();
        for (int i = 0; i < n; i++) {
            if (i > 0) out.append(' ');
            out.append(a[i]);
        }
        System.out.println(out);
    }

    private static void reverse(long[] a, int i, int j) {
        while (i < j) {
            long tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
            i++;
            j--;
        }
    }

    private static StringTokenizer tokens() throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder all = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) all.append(line).append(' ');
        return new StringTokenizer(all.toString());
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    n, k = int(data[0]), int(data[1])
    a = list(map(int, data[2:2 + n]))

    shift = k % n
    a = a[shift:] + a[:shift]

    print(" ".join(map(str, a)))

if __name__ == "__main__":
    main()
`,
  },
};
