import type { SolutionSet } from "./index";

/**
 * Reference solutions for the easy-b catalogue.
 *
 * Each one is a complete program: read stdin, write stdout, exit. They follow
 * the editorial approach for the problem. Where C has no standard equivalent of
 * a hash container, the C version sorts instead and says so in a comment rather
 * than shipping a hand-rolled hash table the reader has to verify.
 */
export const EASY_B_SOLUTIONS: Record<string, SolutionSet> = {
  "remove-duplicates-sorted": {
    C: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long *a = malloc(sizeof(long long) * (size_t)n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);

    /* The array is sorted, so duplicates are always adjacent. */
    int write = 0;
    for (int read = 0; read < n; read++) {
        if (read == 0 || a[read] != a[write - 1]) a[write++] = a[read];
    }

    for (int i = 0; i < write; i++) printf("%lld%c", a[i], i + 1 == write ? '\\n' : ' ');
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

    vector<long long> out;
    for (int i = 0; i < n; i++) {
        if (i == 0 || a[i] != out.back()) out.push_back(a[i]);
    }

    for (size_t i = 0; i < out.size(); i++) cout << out[i] << (i + 1 == out.size() ? '\\n' : ' ');
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

        StringBuilder out = new StringBuilder();
        long last = 0;
        int kept = 0;
        for (int i = 0; i < n; i++) {
            if (i == 0 || a[i] != last) {
                if (kept > 0) out.append(' ');
                out.append(a[i]);
                last = a[i];
                kept++;
            }
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
    a = list(map(int, data[1:1 + n]))

    out = []
    for value in a:
        if not out or value != out[-1]:
            out.append(value)

    print(" ".join(map(str, out)))

if __name__ == "__main__":
    main()
`,
  },

  "move-zeroes": {
    C: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long *a = malloc(sizeof(long long) * (size_t)n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);

    int write = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] != 0) a[write++] = a[i];
    }
    while (write < n) a[write++] = 0;

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

    int write = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] != 0) a[write++] = a[i];
    }
    while (write < n) a[write++] = 0;

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

        int write = 0;
        for (int i = 0; i < n; i++) {
            if (a[i] != 0) a[write++] = a[i];
        }
        while (write < n) a[write++] = 0;

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
    a = list(map(int, data[1:1 + n]))

    kept = [value for value in a if value != 0]
    kept.extend([0] * (n - len(kept)))

    print(" ".join(map(str, kept)))

if __name__ == "__main__":
    main()
`,
  },

  "missing-number": {
    C: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    long long expected = (long long)n * (n + 1) / 2;
    long long seen = 0;
    for (int i = 0; i < n; i++) {
        long long value;
        if (scanf("%lld", &value) != 1) break;
        seen += value;
    }

    printf("%lld\\n", expected - seen);
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

    long long expected = (long long)n * (n + 1) / 2;
    long long seen = 0;
    for (int i = 0; i < n; i++) {
        long long value;
        cin >> value;
        seen += value;
    }

    cout << expected - seen << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());

        long expected = (long)n * (n + 1) / 2;
        long seen = 0;
        for (int i = 0; i < n; i++) seen += Long.parseLong(st.nextToken());

        System.out.println(expected - seen);
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
    a = list(map(int, data[1:1 + n]))
    print(n * (n + 1) // 2 - sum(a))

if __name__ == "__main__":
    main()
`,
  },

  "single-number-xor": {
    C: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    long long answer = 0;
    for (int i = 0; i < n; i++) {
        long long value;
        if (scanf("%lld", &value) != 1) break;
        answer ^= value;
    }

    printf("%lld\\n", answer);
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

    long long answer = 0;
    for (int i = 0; i < n; i++) {
        long long value;
        cin >> value;
        answer ^= value;
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

        long answer = 0;
        for (int i = 0; i < n; i++) answer ^= Long.parseLong(st.nextToken());

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
    n = int(data[0])

    answer = 0
    for value in map(int, data[1:1 + n]):
        answer ^= value

    print(answer)

if __name__ == "__main__":
    main()
`,
  },

  "max-consecutive-ones": {
    C: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    int run = 0, best = 0;
    for (int i = 0; i < n; i++) {
        int value;
        if (scanf("%d", &value) != 1) break;
        if (value == 1) {
            run++;
            if (run > best) best = run;
        } else {
            run = 0;
        }
    }

    printf("%d\\n", best);
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

    int run = 0, best = 0;
    for (int i = 0; i < n; i++) {
        int value;
        cin >> value;
        if (value == 1) best = max(best, ++run);
        else run = 0;
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

        int run = 0, best = 0;
        for (int i = 0; i < n; i++) {
            int value = Integer.parseInt(st.nextToken());
            if (value == 1) {
                run++;
                best = Math.max(best, run);
            } else {
                run = 0;
            }
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

    run = best = 0
    for value in map(int, data[1:1 + n]):
        if value == 1:
            run += 1
            best = max(best, run)
        else:
            run = 0

    print(best)

if __name__ == "__main__":
    main()
`,
  },

  "merge-sorted-arrays": {
    C: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 0;
    long long *a = malloc(sizeof(long long) * (size_t)n);
    long long *b = malloc(sizeof(long long) * (size_t)m);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    for (int i = 0; i < m; i++) scanf("%lld", &b[i]);

    int i = 0, j = 0, printed = 0;
    while (i < n || j < m) {
        long long value;
        if (j >= m || (i < n && a[i] <= b[j])) value = a[i++];
        else value = b[j++];
        printf("%lld%c", value, ++printed == n + m ? '\\n' : ' ');
    }

    free(a);
    free(b);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    if (!(cin >> n >> m)) return 0;
    vector<long long> a(n), b(m);
    for (auto &value : a) cin >> value;
    for (auto &value : b) cin >> value;

    vector<long long> merged;
    merged.reserve(a.size() + b.size());
    size_t i = 0, j = 0;
    while (i < a.size() || j < b.size()) {
        if (j >= b.size() || (i < a.size() && a[i] <= b[j])) merged.push_back(a[i++]);
        else merged.push_back(b[j++]);
    }

    for (size_t k = 0; k < merged.size(); k++) {
        cout << merged[k] << (k + 1 == merged.size() ? '\\n' : ' ');
    }
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());
        int m = Integer.parseInt(st.nextToken());
        long[] a = new long[n];
        long[] b = new long[m];
        for (int i = 0; i < n; i++) a[i] = Long.parseLong(st.nextToken());
        for (int i = 0; i < m; i++) b[i] = Long.parseLong(st.nextToken());

        StringBuilder out = new StringBuilder();
        int i = 0, j = 0;
        while (i < n || j < m) {
            long value;
            if (j >= m || (i < n && a[i] <= b[j])) value = a[i++];
            else value = b[j++];
            if (out.length() > 0) out.append(' ');
            out.append(value);
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
    n, m = int(data[0]), int(data[1])
    a = list(map(int, data[2:2 + n]))
    b = list(map(int, data[2 + n:2 + n + m]))

    merged = []
    i = j = 0
    while i < n or j < m:
        if j >= m or (i < n and a[i] <= b[j]):
            merged.append(a[i])
            i += 1
        else:
            merged.append(b[j])
            j += 1

    print(" ".join(map(str, merged)))

if __name__ == "__main__":
    main()
`,
  },

  "intersection-two-arrays": {
    C: `#include <stdio.h>
#include <stdlib.h>

static int compare(const void *x, const void *y) {
    long long a = *(const long long *)x;
    long long b = *(const long long *)y;
    return (a > b) - (a < b);
}

int main(void) {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 0;
    long long *a = malloc(sizeof(long long) * (size_t)n);
    long long *b = malloc(sizeof(long long) * (size_t)m);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    for (int i = 0; i < m; i++) scanf("%lld", &b[i]);

    /* C has no standard hash set, so both sides are sorted and walked with two
       pointers — same result, O((n+m) log) instead of O(n+m). */
    qsort(a, (size_t)n, sizeof(long long), compare);
    qsort(b, (size_t)m, sizeof(long long), compare);

    int i = 0, j = 0, printed = 0;
    long long last = 0;
    while (i < n && j < m) {
        if (a[i] < b[j]) i++;
        else if (a[i] > b[j]) j++;
        else {
            if (printed == 0 || a[i] != last) {
                if (printed > 0) printf(" ");
                printf("%lld", a[i]);
                last = a[i];
                printed++;
            }
            i++;
            j++;
        }
    }

    if (printed == 0) printf("NONE");
    printf("\\n");
    free(a);
    free(b);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    if (!(cin >> n >> m)) return 0;
    unordered_set<long long> first;
    for (int i = 0; i < n; i++) {
        long long value;
        cin >> value;
        first.insert(value);
    }

    set<long long> common;
    for (int i = 0; i < m; i++) {
        long long value;
        cin >> value;
        if (first.count(value)) common.insert(value);
    }

    if (common.empty()) {
        cout << "NONE\\n";
        return 0;
    }

    bool first_out = true;
    for (long long value : common) {
        if (!first_out) cout << ' ';
        cout << value;
        first_out = false;
    }
    cout << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());
        int m = Integer.parseInt(st.nextToken());

        Set<Long> first = new HashSet<>();
        for (int i = 0; i < n; i++) first.add(Long.parseLong(st.nextToken()));

        TreeSet<Long> common = new TreeSet<>();
        for (int i = 0; i < m; i++) {
            long value = Long.parseLong(st.nextToken());
            if (first.contains(value)) common.add(value);
        }

        if (common.isEmpty()) {
            System.out.println("NONE");
            return;
        }

        StringBuilder out = new StringBuilder();
        for (long value : common) {
            if (out.length() > 0) out.append(' ');
            out.append(value);
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
    n, m = int(data[0]), int(data[1])
    a = set(map(int, data[2:2 + n]))
    b = set(map(int, data[2 + n:2 + n + m]))

    common = sorted(a & b)
    print(" ".join(map(str, common)) if common else "NONE")

if __name__ == "__main__":
    main()
`,
  },

  "majority-element-boyer": {
    C: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    long long candidate = 0;
    int count = 0;
    for (int i = 0; i < n; i++) {
        long long value;
        if (scanf("%lld", &value) != 1) break;
        if (count == 0) {
            candidate = value;
            count = 1;
        } else if (value == candidate) {
            count++;
        } else {
            count--;
        }
    }

    printf("%lld\\n", candidate);
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

    long long candidate = 0;
    int count = 0;
    for (int i = 0; i < n; i++) {
        long long value;
        cin >> value;
        if (count == 0) {
            candidate = value;
            count = 1;
        } else if (value == candidate) {
            count++;
        } else {
            count--;
        }
    }

    cout << candidate << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());

        long candidate = 0;
        int count = 0;
        for (int i = 0; i < n; i++) {
            long value = Long.parseLong(st.nextToken());
            if (count == 0) {
                candidate = value;
                count = 1;
            } else if (value == candidate) {
                count++;
            } else {
                count--;
            }
        }

        System.out.println(candidate);
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

    candidate = None
    count = 0
    for value in map(int, data[1:1 + n]):
        if count == 0:
            candidate = value
            count = 1
        elif value == candidate:
            count += 1
        else:
            count -= 1

    print(candidate)

if __name__ == "__main__":
    main()
`,
  },

  "kadane-max-subarray": {
    C: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    long long current = 0, best = 0;
    for (int i = 0; i < n; i++) {
        long long value;
        if (scanf("%lld", &value) != 1) break;
        if (i == 0) {
            current = best = value;
        } else {
            current = value > current + value ? value : current + value;
            if (current > best) best = current;
        }
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

    long long current = 0, best = 0;
    for (int i = 0; i < n; i++) {
        long long value;
        cin >> value;
        if (i == 0) current = best = value;
        else {
            current = max(value, current + value);
            best = max(best, current);
        }
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

        long current = 0, best = 0;
        for (int i = 0; i < n; i++) {
            long value = Long.parseLong(st.nextToken());
            if (i == 0) {
                current = best = value;
            } else {
                current = Math.max(value, current + value);
                best = Math.max(best, current);
            }
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
    a = list(map(int, data[1:1 + n]))

    current = best = a[0]
    for value in a[1:]:
        current = max(value, current + value)
        best = max(best, current)

    print(best)

if __name__ == "__main__":
    main()
`,
  },

  "best-time-buy-sell-stock": {
    C: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    long long minPrice = 0, profit = 0;
    for (int i = 0; i < n; i++) {
        long long price;
        if (scanf("%lld", &price) != 1) break;
        if (i == 0) {
            minPrice = price;
        } else {
            if (price - minPrice > profit) profit = price - minPrice;
            if (price < minPrice) minPrice = price;
        }
    }

    printf("%lld\\n", profit);
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

    long long minPrice = 0, profit = 0;
    for (int i = 0; i < n; i++) {
        long long price;
        cin >> price;
        if (i == 0) minPrice = price;
        else {
            profit = max(profit, price - minPrice);
            minPrice = min(minPrice, price);
        }
    }

    cout << profit << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());

        long minPrice = 0, profit = 0;
        for (int i = 0; i < n; i++) {
            long price = Long.parseLong(st.nextToken());
            if (i == 0) {
                minPrice = price;
            } else {
                profit = Math.max(profit, price - minPrice);
                minPrice = Math.min(minPrice, price);
            }
        }

        System.out.println(profit);
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
    prices = list(map(int, data[1:1 + n]))

    min_price = prices[0]
    profit = 0
    for price in prices[1:]:
        profit = max(profit, price - min_price)
        min_price = min(min_price, price)

    print(profit)

if __name__ == "__main__":
    main()
`,
  },

  "contains-duplicate": {
    C: `#include <stdio.h>
#include <stdlib.h>

static int compare(const void *x, const void *y) {
    long long a = *(const long long *)x;
    long long b = *(const long long *)y;
    return (a > b) - (a < b);
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long *a = malloc(sizeof(long long) * (size_t)n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);

    /* Sorting brings equal values next to each other, which stands in for the
       hash set C does not provide. */
    qsort(a, (size_t)n, sizeof(long long), compare);

    for (int i = 1; i < n; i++) {
        if (a[i] == a[i - 1]) {
            printf("YES\\n");
            free(a);
            return 0;
        }
    }

    printf("NO\\n");
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

    unordered_set<long long> seen;
    seen.reserve((size_t)n * 2);
    for (int i = 0; i < n; i++) {
        long long value;
        cin >> value;
        if (!seen.insert(value).second) {
            cout << "YES\\n";
            return 0;
        }
    }

    cout << "NO\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());

        Set<Long> seen = new HashSet<>();
        for (int i = 0; i < n; i++) {
            if (!seen.add(Long.parseLong(st.nextToken()))) {
                System.out.println("YES");
                return;
            }
        }

        System.out.println("NO");
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
    a = list(map(int, data[1:1 + n]))
    print("YES" if len(set(a)) < n else "NO")

if __name__ == "__main__":
    main()
`,
  },

  "first-unique-character": {
    C: `#include <stdio.h>
#include <string.h>

static char s[100005];

int main(void) {
    if (scanf("%100004s", s) != 1) return 0;
    int n = (int)strlen(s);

    int count[26] = {0};
    for (int i = 0; i < n; i++) count[s[i] - 'a']++;

    for (int i = 0; i < n; i++) {
        if (count[s[i] - 'a'] == 1) {
            printf("%d\\n", i);
            return 0;
        }
    }

    printf("-1\\n");
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

    array<int, 26> count{};
    for (char c : s) count[c - 'a']++;

    for (size_t i = 0; i < s.size(); i++) {
        if (count[s[i] - 'a'] == 1) {
            cout << i << "\\n";
            return 0;
        }
    }

    cout << "-1\\n";
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

        int[] count = new int[26];
        for (int i = 0; i < s.length(); i++) count[s.charAt(i) - 'a']++;

        for (int i = 0; i < s.length(); i++) {
            if (count[s.charAt(i) - 'a'] == 1) {
                System.out.println(i);
                return;
            }
        }

        System.out.println(-1);
    }
}
`,
    PYTHON: `import sys
from collections import Counter

def main() -> None:
    s = sys.stdin.read().strip()
    count = Counter(s)

    for i, c in enumerate(s):
        if count[c] == 1:
            print(i)
            return

    print(-1)

if __name__ == "__main__":
    main()
`,
  },

  "valid-parentheses": {
    C: `#include <stdio.h>
#include <string.h>
#include <stdlib.h>

static char s[100005];

int main(void) {
    if (scanf("%100004s", s) != 1) return 0;
    int n = (int)strlen(s);

    char *stack = malloc((size_t)n + 1);
    int top = 0;

    for (int i = 0; i < n; i++) {
        char c = s[i];
        if (c == '(' || c == '[' || c == '{') {
            stack[top++] = c;
        } else {
            char want = c == ')' ? '(' : (c == ']' ? '[' : '{');
            if (top == 0 || stack[top - 1] != want) {
                printf("NO\\n");
                free(stack);
                return 0;
            }
            top--;
        }
    }

    printf("%s\\n", top == 0 ? "YES" : "NO");
    free(stack);
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

    vector<char> stack;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') {
            stack.push_back(c);
        } else {
            char want = c == ')' ? '(' : (c == ']' ? '[' : '{');
            if (stack.empty() || stack.back() != want) {
                cout << "NO\\n";
                return 0;
            }
            stack.pop_back();
        }
    }

    cout << (stack.empty() ? "YES" : "NO") << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String s = br.readLine();
        if (s == null) return;
        s = s.trim();

        Deque<Character> stack = new ArrayDeque<>();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '(' || c == '[' || c == '{') {
                stack.push(c);
            } else {
                char want = c == ')' ? '(' : (c == ']' ? '[' : '{');
                if (stack.isEmpty() || stack.pop() != want) {
                    System.out.println("NO");
                    return;
                }
            }
        }

        System.out.println(stack.isEmpty() ? "YES" : "NO");
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    s = sys.stdin.read().strip()

    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for c in s:
        if c in "([{":
            stack.append(c)
        else:
            if not stack or stack.pop() != pairs.get(c):
                print("NO")
                return

    print("YES" if not stack else "NO")

if __name__ == "__main__":
    main()
`,
  },

  "implement-stack-array": {
    C: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    int q;
    if (scanf("%d", &q) != 1) return 0;

    long long *stack = malloc(sizeof(long long) * (size_t)q);
    int top = 0;
    char op[16];

    for (int i = 0; i < q; i++) {
        if (scanf("%15s", op) != 1) break;
        if (strcmp(op, "PUSH") == 0) {
            long long value;
            scanf("%lld", &value);
            stack[top++] = value;
        } else if (strcmp(op, "POP") == 0) {
            if (top == 0) printf("EMPTY\\n");
            else printf("%lld\\n", stack[--top]);
        } else {
            if (top == 0) printf("EMPTY\\n");
            else printf("%lld\\n", stack[top - 1]);
        }
    }

    free(stack);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int q;
    if (!(cin >> q)) return 0;

    vector<long long> stack;
    string op;

    for (int i = 0; i < q; i++) {
        if (!(cin >> op)) break;
        if (op == "PUSH") {
            long long value;
            cin >> value;
            stack.push_back(value);
        } else if (op == "POP") {
            if (stack.empty()) cout << "EMPTY\\n";
            else {
                cout << stack.back() << "\\n";
                stack.pop_back();
            }
        } else {
            if (stack.empty()) cout << "EMPTY\\n";
            else cout << stack.back() << "\\n";
        }
    }

    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int q = Integer.parseInt(st.nextToken());

        long[] stack = new long[q];
        int top = 0;
        StringBuilder out = new StringBuilder();

        for (int i = 0; i < q && st.hasMoreTokens(); i++) {
            String op = st.nextToken();
            if (op.equals("PUSH")) {
                stack[top++] = Long.parseLong(st.nextToken());
            } else if (op.equals("POP")) {
                out.append(top == 0 ? "EMPTY" : Long.toString(stack[--top])).append('\\n');
            } else {
                out.append(top == 0 ? "EMPTY" : Long.toString(stack[top - 1])).append('\\n');
            }
        }

        System.out.print(out);
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
    q = int(data[0])

    stack = []
    out = []
    i = 1
    for _ in range(q):
        if i >= len(data):
            break
        op = data[i]
        i += 1
        if op == "PUSH":
            stack.append(int(data[i]))
            i += 1
        elif op == "POP":
            out.append(str(stack.pop()) if stack else "EMPTY")
        else:
            out.append(str(stack[-1]) if stack else "EMPTY")

    print("\\n".join(out))

if __name__ == "__main__":
    main()
`,
  },

  "implement-queue": {
    C: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    int q;
    if (scanf("%d", &q) != 1) return 0;

    long long *queue = malloc(sizeof(long long) * (size_t)q);
    int head = 0, tail = 0;
    char op[16];

    for (int i = 0; i < q; i++) {
        if (scanf("%15s", op) != 1) break;
        if (strcmp(op, "ENQUEUE") == 0) {
            long long value;
            scanf("%lld", &value);
            queue[tail++] = value;
        } else if (strcmp(op, "DEQUEUE") == 0) {
            if (head == tail) printf("EMPTY\\n");
            else printf("%lld\\n", queue[head++]);
        } else {
            if (head == tail) printf("EMPTY\\n");
            else printf("%lld\\n", queue[head]);
        }
    }

    free(queue);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int q;
    if (!(cin >> q)) return 0;

    vector<long long> queue;
    size_t head = 0;
    string op;

    for (int i = 0; i < q; i++) {
        if (!(cin >> op)) break;
        if (op == "ENQUEUE") {
            long long value;
            cin >> value;
            queue.push_back(value);
        } else if (op == "DEQUEUE") {
            if (head == queue.size()) cout << "EMPTY\\n";
            else cout << queue[head++] << "\\n";
        } else {
            if (head == queue.size()) cout << "EMPTY\\n";
            else cout << queue[head] << "\\n";
        }
    }

    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int q = Integer.parseInt(st.nextToken());

        long[] queue = new long[q];
        int head = 0, tail = 0;
        StringBuilder out = new StringBuilder();

        for (int i = 0; i < q && st.hasMoreTokens(); i++) {
            String op = st.nextToken();
            if (op.equals("ENQUEUE")) {
                queue[tail++] = Long.parseLong(st.nextToken());
            } else if (op.equals("DEQUEUE")) {
                out.append(head == tail ? "EMPTY" : Long.toString(queue[head++])).append('\\n');
            } else {
                out.append(head == tail ? "EMPTY" : Long.toString(queue[head])).append('\\n');
            }
        }

        System.out.print(out);
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
    q = int(data[0])

    queue = []
    head = 0
    out = []
    i = 1
    for _ in range(q):
        if i >= len(data):
            break
        op = data[i]
        i += 1
        if op == "ENQUEUE":
            queue.append(int(data[i]))
            i += 1
        elif op == "DEQUEUE":
            if head == len(queue):
                out.append("EMPTY")
            else:
                out.append(str(queue[head]))
                head += 1
        else:
            out.append(str(queue[head]) if head < len(queue) else "EMPTY")

    print("\\n".join(out))

if __name__ == "__main__":
    main()
`,
  },

  "bubble-sort-impl": {
    C: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long *a = malloc(sizeof(long long) * (size_t)n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);

    for (int i = 0; i < n - 1; i++) {
        int swapped = 0;
        for (int j = 0; j < n - 1 - i; j++) {
            if (a[j] > a[j + 1]) {
                long long tmp = a[j];
                a[j] = a[j + 1];
                a[j + 1] = tmp;
                swapped = 1;
            }
        }
        if (!swapped) break;
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

    for (int i = 0; i < n - 1; i++) {
        bool swapped = false;
        for (int j = 0; j < n - 1 - i; j++) {
            if (a[j] > a[j + 1]) {
                swap(a[j], a[j + 1]);
                swapped = true;
            }
        }
        if (!swapped) break;
    }

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

        for (int i = 0; i < n - 1; i++) {
            boolean swapped = false;
            for (int j = 0; j < n - 1 - i; j++) {
                if (a[j] > a[j + 1]) {
                    long tmp = a[j];
                    a[j] = a[j + 1];
                    a[j + 1] = tmp;
                    swapped = true;
                }
            }
            if (!swapped) break;
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
    a = list(map(int, data[1:1 + n]))

    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        if not swapped:
            break

    print(" ".join(map(str, a)))

if __name__ == "__main__":
    main()
`,
  },

  "selection-sort-impl": {
    C: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long *a = malloc(sizeof(long long) * (size_t)n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);

    for (int i = 0; i < n - 1; i++) {
        int best = i;
        for (int j = i + 1; j < n; j++) {
            if (a[j] < a[best]) best = j;
        }
        if (best != i) {
            long long tmp = a[i];
            a[i] = a[best];
            a[best] = tmp;
        }
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

    for (int i = 0; i < n - 1; i++) {
        int best = i;
        for (int j = i + 1; j < n; j++) {
            if (a[j] < a[best]) best = j;
        }
        if (best != i) swap(a[i], a[best]);
    }

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

        for (int i = 0; i < n - 1; i++) {
            int best = i;
            for (int j = i + 1; j < n; j++) {
                if (a[j] < a[best]) best = j;
            }
            if (best != i) {
                long tmp = a[i];
                a[i] = a[best];
                a[best] = tmp;
            }
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
    a = list(map(int, data[1:1 + n]))

    for i in range(n - 1):
        best = i
        for j in range(i + 1, n):
            if a[j] < a[best]:
                best = j
        if best != i:
            a[i], a[best] = a[best], a[i]

    print(" ".join(map(str, a)))

if __name__ == "__main__":
    main()
`,
  },

  "insertion-sort-impl": {
    C: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long *a = malloc(sizeof(long long) * (size_t)n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);

    for (int i = 1; i < n; i++) {
        long long key = a[i];
        int j = i - 1;
        while (j >= 0 && a[j] > key) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
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

    for (int i = 1; i < n; i++) {
        long long key = a[i];
        int j = i - 1;
        while (j >= 0 && a[j] > key) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
    }

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

        for (int i = 1; i < n; i++) {
            long key = a[i];
            int j = i - 1;
            while (j >= 0 && a[j] > key) {
                a[j + 1] = a[j];
                j--;
            }
            a[j + 1] = key;
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
    a = list(map(int, data[1:1 + n]))

    for i in range(1, n):
        key = a[i]
        j = i - 1
        while j >= 0 and a[j] > key:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key

    print(" ".join(map(str, a)))

if __name__ == "__main__":
    main()
`,
  },

  "sort-colors-01": {
    C: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int *a = malloc(sizeof(int) * (size_t)n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    /* Dutch national flag: zeroes below low, twos above high. */
    int low = 0, mid = 0, high = n - 1;
    while (mid <= high) {
        if (a[mid] == 0) {
            int tmp = a[low];
            a[low++] = a[mid];
            a[mid++] = tmp;
        } else if (a[mid] == 1) {
            mid++;
        } else {
            int tmp = a[high];
            a[high--] = a[mid];
            a[mid] = tmp;
        }
    }

    for (int i = 0; i < n; i++) printf("%d%c", a[i], i + 1 == n ? '\\n' : ' ');
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
    vector<int> a(n);
    for (auto &value : a) cin >> value;

    int low = 0, mid = 0, high = n - 1;
    while (mid <= high) {
        if (a[mid] == 0) swap(a[low++], a[mid++]);
        else if (a[mid] == 1) mid++;
        else swap(a[mid], a[high--]);
    }

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
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = Integer.parseInt(st.nextToken());

        int low = 0, mid = 0, high = n - 1;
        while (mid <= high) {
            if (a[mid] == 0) {
                int tmp = a[low];
                a[low++] = a[mid];
                a[mid++] = tmp;
            } else if (a[mid] == 1) {
                mid++;
            } else {
                int tmp = a[high];
                a[high--] = a[mid];
                a[mid] = tmp;
            }
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
    a = list(map(int, data[1:1 + n]))

    low, mid, high = 0, 0, n - 1
    while mid <= high:
        if a[mid] == 0:
            a[low], a[mid] = a[mid], a[low]
            low += 1
            mid += 1
        elif a[mid] == 1:
            mid += 1
        else:
            a[mid], a[high] = a[high], a[mid]
            high -= 1

    print(" ".join(map(str, a)))

if __name__ == "__main__":
    main()
`,
  },

  "power-of-two": {
    C: `#include <stdio.h>

int main(void) {
    unsigned long long n;
    if (scanf("%llu", &n) != 1) return 0;

    /* A power of two has a single set bit, so clearing it empties the value. */
    printf("%s\\n", (n > 0 && (n & (n - 1)) == 0) ? "YES" : "NO");
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

    cout << ((n > 0 && (n & (n - 1)) == 0) ? "YES" : "NO") << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        long n = Long.parseLong(br.readLine().trim());

        System.out.println((n > 0 && (n & (n - 1)) == 0) ? "YES" : "NO");
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    n = int(sys.stdin.read().split()[0])
    print("YES" if n > 0 and (n & (n - 1)) == 0 else "NO")

if __name__ == "__main__":
    main()
`,
  },

  "count-set-bits": {
    C: `#include <stdio.h>

int main(void) {
    unsigned long long n;
    if (scanf("%llu", &n) != 1) return 0;

    /* Brian Kernighan: n &= n-1 clears exactly the lowest set bit. */
    int count = 0;
    while (n != 0) {
        n &= n - 1;
        count++;
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

    unsigned long long n;
    if (!(cin >> n)) return 0;

    int count = 0;
    while (n != 0) {
        n &= n - 1;
        count++;
    }

    cout << count << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        long n = Long.parseLong(br.readLine().trim());

        int count = 0;
        while (n != 0) {
            n &= n - 1;
            count++;
        }

        System.out.println(count);
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    n = int(sys.stdin.read().split()[0])

    count = 0
    while n:
        n &= n - 1
        count += 1

    print(count)

if __name__ == "__main__":
    main()
`,
  },

  "reverse-integer-digits": {
    C: `#include <stdio.h>

int main(void) {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;

    int negative = n < 0;
    unsigned long long value = negative ? (unsigned long long)(-(n + 1)) + 1ULL : (unsigned long long)n;

    unsigned long long reversed = 0;
    while (value > 0) {
        reversed = reversed * 10 + value % 10;
        value /= 10;
    }

    if (negative) printf("-%llu\\n", reversed);
    else printf("%llu\\n", reversed);
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

    bool negative = n < 0;
    unsigned long long value = negative ? (unsigned long long)(-(n + 1)) + 1ULL : (unsigned long long)n;

    unsigned long long reversed = 0;
    while (value > 0) {
        reversed = reversed * 10 + value % 10;
        value /= 10;
    }

    if (negative) cout << "-";
    cout << reversed << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.math.BigInteger;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        BigInteger n = new BigInteger(br.readLine().trim());

        boolean negative = n.signum() < 0;
        String digits = n.abs().toString();
        String reversed = new StringBuilder(digits).reverse().toString();
        BigInteger result = new BigInteger(reversed);

        System.out.println(negative ? result.negate() : result);
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    n = int(sys.stdin.read().split()[0])

    negative = n < 0
    value = abs(n)

    reversed_value = 0
    while value > 0:
        reversed_value = reversed_value * 10 + value % 10
        value //= 10

    print(-reversed_value if negative else reversed_value)

if __name__ == "__main__":
    main()
`,
  },

  "armstrong-number": {
    C: `#include <stdio.h>

int main(void) {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;

    int digits = 0;
    for (long long copy = n; copy > 0; copy /= 10) digits++;

    long long total = 0;
    for (long long copy = n; copy > 0; copy /= 10) {
        long long digit = copy % 10, power = 1;
        for (int i = 0; i < digits; i++) power *= digit;
        total += power;
    }

    printf("%s\\n", total == n ? "YES" : "NO");
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

    int digits = 0;
    for (long long copy = n; copy > 0; copy /= 10) digits++;

    long long total = 0;
    for (long long copy = n; copy > 0; copy /= 10) {
        long long digit = copy % 10, power = 1;
        for (int i = 0; i < digits; i++) power *= digit;
        total += power;
    }

    cout << (total == n ? "YES" : "NO") << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        long n = Long.parseLong(br.readLine().trim());

        int digits = 0;
        for (long copy = n; copy > 0; copy /= 10) digits++;

        long total = 0;
        for (long copy = n; copy > 0; copy /= 10) {
            long digit = copy % 10, power = 1;
            for (int i = 0; i < digits; i++) power *= digit;
            total += power;
        }

        System.out.println(total == n ? "YES" : "NO");
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    n = int(sys.stdin.read().split()[0])

    digits = len(str(n))
    total = sum(int(c) ** digits for c in str(n))

    print("YES" if total == n else "NO")

if __name__ == "__main__":
    main()
`,
  },

  "perfect-number": {
    C: `#include <stdio.h>

int main(void) {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;

    if (n < 2) {
        printf("NO\\n");
        return 0;
    }

    long long total = 1;
    for (long long d = 2; d * d <= n; d++) {
        if (n % d == 0) {
            total += d;
            long long pair = n / d;
            if (pair != d) total += pair;
        }
    }

    printf("%s\\n", total == n ? "YES" : "NO");
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

    if (n < 2) {
        cout << "NO\\n";
        return 0;
    }

    long long total = 1;
    for (long long d = 2; d * d <= n; d++) {
        if (n % d == 0) {
            total += d;
            long long pair = n / d;
            if (pair != d) total += pair;
        }
    }

    cout << (total == n ? "YES" : "NO") << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        long n = Long.parseLong(br.readLine().trim());

        if (n < 2) {
            System.out.println("NO");
            return;
        }

        long total = 1;
        for (long d = 2; d * d <= n; d++) {
            if (n % d == 0) {
                total += d;
                long pair = n / d;
                if (pair != d) total += pair;
            }
        }

        System.out.println(total == n ? "YES" : "NO");
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    n = int(sys.stdin.read().split()[0])

    if n < 2:
        print("NO")
        return

    total = 1
    d = 2
    while d * d <= n:
        if n % d == 0:
            total += d
            pair = n // d
            if pair != d:
                total += pair
        d += 1

    print("YES" if total == n else "NO")

if __name__ == "__main__":
    main()
`,
  },

  "sieve-primes": {
    C: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    if (n < 2) {
        printf("NONE\\n");
        return 0;
    }

    char *isPrime = malloc((size_t)n + 1);
    memset(isPrime, 1, (size_t)n + 1);
    isPrime[0] = 0;
    isPrime[1] = 0;

    for (long long p = 2; p * p <= n; p++) {
        if (!isPrime[p]) continue;
        for (long long multiple = p * p; multiple <= n; multiple += p) isPrime[multiple] = 0;
    }

    int printed = 0;
    for (int i = 2; i <= n; i++) {
        if (!isPrime[i]) continue;
        if (printed++) printf(" ");
        printf("%d", i);
    }
    printf("\\n");

    free(isPrime);
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

    if (n < 2) {
        cout << "NONE\\n";
        return 0;
    }

    vector<char> isPrime((size_t)n + 1, 1);
    isPrime[0] = isPrime[1] = 0;
    for (long long p = 2; p * p <= n; p++) {
        if (!isPrime[p]) continue;
        for (long long multiple = p * p; multiple <= n; multiple += p) isPrime[multiple] = 0;
    }

    bool first = true;
    for (int i = 2; i <= n; i++) {
        if (!isPrime[i]) continue;
        if (!first) cout << ' ';
        cout << i;
        first = false;
    }
    cout << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int n = Integer.parseInt(br.readLine().trim());

        if (n < 2) {
            System.out.println("NONE");
            return;
        }

        boolean[] composite = new boolean[n + 1];
        for (long p = 2; p * p <= n; p++) {
            if (composite[(int)p]) continue;
            for (long multiple = p * p; multiple <= n; multiple += p) composite[(int)multiple] = true;
        }

        StringBuilder out = new StringBuilder();
        for (int i = 2; i <= n; i++) {
            if (composite[i]) continue;
            if (out.length() > 0) out.append(' ');
            out.append(i);
        }

        System.out.println(out);
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    n = int(sys.stdin.read().split()[0])

    if n < 2:
        print("NONE")
        return

    sieve = bytearray([1]) * (n + 1)
    sieve[0] = sieve[1] = 0
    p = 2
    while p * p <= n:
        if sieve[p]:
            sieve[p * p::p] = bytearray(len(sieve[p * p::p]))
        p += 1

    print(" ".join(str(i) for i in range(2, n + 1) if sieve[i]))

if __name__ == "__main__":
    main()
`,
  },

  "linked-list-traverse": {
    C: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    long long value;
    struct Node *next;
};

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    struct Node *head = NULL, *tail = NULL;
    for (int i = 0; i < n; i++) {
        struct Node *node = malloc(sizeof(struct Node));
        scanf("%lld", &node->value);
        node->next = NULL;
        if (!head) head = tail = node;
        else { tail->next = node; tail = node; }
    }

    int count = 0;
    for (struct Node *node = head; node; node = node->next) {
        if (count++) printf(" ");
        printf("%lld", node->value);
    }
    if (count == 0) printf("EMPTY");
    printf("\\n%d\\n", count);

    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

struct Node {
    long long value;
    Node *next;
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    if (!(cin >> n)) return 0;

    Node *head = nullptr, *tail = nullptr;
    for (int i = 0; i < n; i++) {
        Node *node = new Node{0, nullptr};
        cin >> node->value;
        if (!head) head = tail = node;
        else { tail->next = node; tail = node; }
    }

    int count = 0;
    for (Node *node = head; node; node = node->next) {
        if (count++) cout << ' ';
        cout << node->value;
    }
    if (count == 0) cout << "EMPTY";
    cout << "\\n" << count << "\\n";

    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    private static class Node {
        long value;
        Node next;
        Node(long value) { this.value = value; }
    }

    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());

        Node head = null, tail = null;
        for (int i = 0; i < n; i++) {
            Node node = new Node(Long.parseLong(st.nextToken()));
            if (head == null) head = tail = node;
            else { tail.next = node; tail = node; }
        }

        StringBuilder out = new StringBuilder();
        int count = 0;
        for (Node node = head; node != null; node = node.next) {
            if (count++ > 0) out.append(' ');
            out.append(node.value);
        }
        if (count == 0) out.append("EMPTY");

        System.out.println(out);
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
    n = int(data[0])
    values = data[1:1 + n]

    print(" ".join(values) if values else "EMPTY")
    print(len(values))

if __name__ == "__main__":
    main()
`,
  },

  "linked-list-reverse": {
    C: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    long long value;
    struct Node *next;
};

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    struct Node *head = NULL, *tail = NULL;
    for (int i = 0; i < n; i++) {
        struct Node *node = malloc(sizeof(struct Node));
        scanf("%lld", &node->value);
        node->next = NULL;
        if (!head) head = tail = node;
        else { tail->next = node; tail = node; }
    }

    /* Walk the list once, flipping each next pointer backwards. */
    struct Node *prev = NULL, *curr = head;
    while (curr) {
        struct Node *next = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next;
    }

    int printed = 0;
    for (struct Node *node = prev; node; node = node->next) {
        if (printed++) printf(" ");
        printf("%lld", node->value);
    }
    if (printed == 0) printf("EMPTY");
    printf("\\n");

    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

struct Node {
    long long value;
    Node *next;
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    if (!(cin >> n)) return 0;

    Node *head = nullptr, *tail = nullptr;
    for (int i = 0; i < n; i++) {
        Node *node = new Node{0, nullptr};
        cin >> node->value;
        if (!head) head = tail = node;
        else { tail->next = node; tail = node; }
    }

    Node *prev = nullptr, *curr = head;
    while (curr) {
        Node *next = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next;
    }

    int printed = 0;
    for (Node *node = prev; node; node = node->next) {
        if (printed++) cout << ' ';
        cout << node->value;
    }
    if (printed == 0) cout << "EMPTY";
    cout << "\\n";

    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    private static class Node {
        long value;
        Node next;
        Node(long value) { this.value = value; }
    }

    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());

        Node head = null, tail = null;
        for (int i = 0; i < n; i++) {
            Node node = new Node(Long.parseLong(st.nextToken()));
            if (head == null) head = tail = node;
            else { tail.next = node; tail = node; }
        }

        Node prev = null, curr = head;
        while (curr != null) {
            Node next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }

        StringBuilder out = new StringBuilder();
        for (Node node = prev; node != null; node = node.next) {
            if (out.length() > 0) out.append(' ');
            out.append(node.value);
        }
        if (out.length() == 0) out.append("EMPTY");

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
    values = data[1:1 + n]

    values.reverse()
    print(" ".join(values) if values else "EMPTY")

if __name__ == "__main__":
    main()
`,
  },

  "linked-list-middle": {
    C: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    long long value;
    struct Node *next;
};

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    struct Node *head = NULL, *tail = NULL;
    for (int i = 0; i < n; i++) {
        struct Node *node = malloc(sizeof(struct Node));
        scanf("%lld", &node->value);
        node->next = NULL;
        if (!head) head = tail = node;
        else { tail->next = node; tail = node; }
    }

    /* Fast moves two steps per one of slow, so slow lands on the middle. */
    struct Node *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }

    if (slow) printf("%lld\\n", slow->value);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

struct Node {
    long long value;
    Node *next;
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    if (!(cin >> n)) return 0;

    Node *head = nullptr, *tail = nullptr;
    for (int i = 0; i < n; i++) {
        Node *node = new Node{0, nullptr};
        cin >> node->value;
        if (!head) head = tail = node;
        else { tail->next = node; tail = node; }
    }

    Node *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }

    if (slow) cout << slow->value << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    private static class Node {
        long value;
        Node next;
        Node(long value) { this.value = value; }
    }

    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());

        Node head = null, tail = null;
        for (int i = 0; i < n; i++) {
            Node node = new Node(Long.parseLong(st.nextToken()));
            if (head == null) head = tail = node;
            else { tail.next = node; tail = node; }
        }

        Node slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }

        if (slow != null) System.out.println(slow.value);
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

    slow = fast = 0
    while fast + 1 < n:
        slow += 1
        fast += 2

    print(values[slow])

if __name__ == "__main__":
    main()
`,
  },

  "linked-list-cycle": {
    C: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    long long value;
    struct Node *next;
};

int main(void) {
    int n, pos;
    if (scanf("%d %d", &n, &pos) != 2) return 0;

    struct Node **nodes = malloc(sizeof(struct Node *) * (size_t)n);
    for (int i = 0; i < n; i++) {
        nodes[i] = malloc(sizeof(struct Node));
        scanf("%lld", &nodes[i]->value);
        nodes[i]->next = NULL;
    }
    for (int i = 0; i + 1 < n; i++) nodes[i]->next = nodes[i + 1];
    if (pos >= 0) nodes[n - 1]->next = nodes[pos];

    /* Floyd: a faster pointer laps a slower one only inside a cycle. */
    struct Node *slow = nodes[0], *fast = nodes[0];
    int cyclic = 0;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) { cyclic = 1; break; }
    }

    printf("%s\\n", cyclic ? "YES" : "NO");
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

struct Node {
    long long value;
    Node *next;
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, pos;
    if (!(cin >> n >> pos)) return 0;

    vector<Node *> nodes(n);
    for (int i = 0; i < n; i++) {
        nodes[i] = new Node{0, nullptr};
        cin >> nodes[i]->value;
    }
    for (int i = 0; i + 1 < n; i++) nodes[i]->next = nodes[i + 1];
    if (pos >= 0) nodes[n - 1]->next = nodes[pos];

    Node *slow = nodes[0], *fast = nodes[0];
    bool cyclic = false;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) { cyclic = true; break; }
    }

    cout << (cyclic ? "YES" : "NO") << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    private static class Node {
        long value;
        Node next;
        Node(long value) { this.value = value; }
    }

    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());
        int pos = Integer.parseInt(st.nextToken());

        Node[] nodes = new Node[n];
        for (int i = 0; i < n; i++) nodes[i] = new Node(Long.parseLong(st.nextToken()));
        for (int i = 0; i + 1 < n; i++) nodes[i].next = nodes[i + 1];
        if (pos >= 0) nodes[n - 1].next = nodes[pos];

        Node slow = nodes[0], fast = nodes[0];
        boolean cyclic = false;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) { cyclic = true; break; }
        }

        System.out.println(cyclic ? "YES" : "NO");
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

class Node:
    __slots__ = ("value", "next")

    def __init__(self, value: int) -> None:
        self.value = value
        self.next = None

def main() -> None:
    data = sys.stdin.read().split()
    n, pos = int(data[0]), int(data[1])

    nodes = [Node(int(v)) for v in data[2:2 + n]]
    for i in range(n - 1):
        nodes[i].next = nodes[i + 1]
    if pos >= 0:
        nodes[n - 1].next = nodes[pos]

    slow = fast = nodes[0]
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            print("YES")
            return

    print("NO")

if __name__ == "__main__":
    main()
`,
  },

  "tree-inorder": {
    C: `#include <stdio.h>
#include <stdlib.h>

static long long *tree;
static int size;
static int printed;

static void inorder(int index) {
    if (index >= size || tree[index] == -1) return;
    inorder(2 * index + 1);
    if (printed++) printf(" ");
    printf("%lld", tree[index]);
    inorder(2 * index + 2);
}

int main(void) {
    if (scanf("%d", &size) != 1) return 0;
    tree = malloc(sizeof(long long) * (size_t)size);
    for (int i = 0; i < size; i++) scanf("%lld", &tree[i]);

    inorder(0);
    if (printed == 0) printf("EMPTY");
    printf("\\n");

    free(tree);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

static vector<long long> tree;
static vector<long long> order;

static void inorder(size_t index) {
    if (index >= tree.size() || tree[index] == -1) return;
    inorder(2 * index + 1);
    order.push_back(tree[index]);
    inorder(2 * index + 2);
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    if (!(cin >> n)) return 0;
    tree.resize(n);
    for (auto &value : tree) cin >> value;

    inorder(0);

    if (order.empty()) {
        cout << "EMPTY\\n";
        return 0;
    }
    for (size_t i = 0; i < order.size(); i++) cout << order[i] << (i + 1 == order.size() ? '\\n' : ' ');
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    private static long[] tree;
    private static StringBuilder out = new StringBuilder();

    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());
        tree = new long[n];
        for (int i = 0; i < n; i++) tree[i] = Long.parseLong(st.nextToken());

        inorder(0);
        if (out.length() == 0) out.append("EMPTY");
        System.out.println(out);
    }

    private static void inorder(int index) {
        if (index >= tree.length || tree[index] == -1) return;
        inorder(2 * index + 1);
        if (out.length() > 0) out.append(' ');
        out.append(tree[index]);
        inorder(2 * index + 2);
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
    sys.setrecursionlimit(300000)
    data = sys.stdin.read().split()
    n = int(data[0])
    tree = list(map(int, data[1:1 + n]))

    order = []

    def inorder(index: int) -> None:
        if index >= n or tree[index] == -1:
            return
        inorder(2 * index + 1)
        order.append(tree[index])
        inorder(2 * index + 2)

    inorder(0)
    print(" ".join(map(str, order)) if order else "EMPTY")

if __name__ == "__main__":
    main()
`,
  },

  "tree-height": {
    C: `#include <stdio.h>
#include <stdlib.h>

static long long *tree;
static int size;

static int height(int index) {
    if (index >= size || tree[index] == -1) return 0;
    int left = height(2 * index + 1);
    int right = height(2 * index + 2);
    return 1 + (left > right ? left : right);
}

int main(void) {
    if (scanf("%d", &size) != 1) return 0;
    tree = malloc(sizeof(long long) * (size_t)size);
    for (int i = 0; i < size; i++) scanf("%lld", &tree[i]);

    printf("%d\\n", height(0));

    free(tree);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

static vector<long long> tree;

static int height(size_t index) {
    if (index >= tree.size() || tree[index] == -1) return 0;
    return 1 + max(height(2 * index + 1), height(2 * index + 2));
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    if (!(cin >> n)) return 0;
    tree.resize(n);
    for (auto &value : tree) cin >> value;

    cout << height(0) << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    private static long[] tree;

    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());
        tree = new long[n];
        for (int i = 0; i < n; i++) tree[i] = Long.parseLong(st.nextToken());

        System.out.println(height(0));
    }

    private static int height(int index) {
        if (index >= tree.length || tree[index] == -1) return 0;
        return 1 + Math.max(height(2 * index + 1), height(2 * index + 2));
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
    sys.setrecursionlimit(300000)
    data = sys.stdin.read().split()
    n = int(data[0])
    tree = list(map(int, data[1:1 + n]))

    def height(index: int) -> int:
        if index >= n or tree[index] == -1:
            return 0
        return 1 + max(height(2 * index + 1), height(2 * index + 2))

    print(height(0))

if __name__ == "__main__":
    main()
`,
  },

  "bst-search": {
    C: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    long long target;
    if (scanf("%d %lld", &n, &target) != 2) return 0;
    long long *tree = malloc(sizeof(long long) * (size_t)n);
    for (int i = 0; i < n; i++) scanf("%lld", &tree[i]);

    int index = 0, found = 0;
    while (index < n && tree[index] != -1) {
        if (tree[index] == target) { found = 1; break; }
        index = target < tree[index] ? 2 * index + 1 : 2 * index + 2;
    }

    printf("%s\\n", found ? "YES" : "NO");
    free(tree);
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
    vector<long long> tree(n);
    for (auto &value : tree) cin >> value;

    size_t index = 0;
    bool found = false;
    while (index < tree.size() && tree[index] != -1) {
        if (tree[index] == target) { found = true; break; }
        index = target < tree[index] ? 2 * index + 1 : 2 * index + 2;
    }

    cout << (found ? "YES" : "NO") << "\\n";
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
        long[] tree = new long[n];
        for (int i = 0; i < n; i++) tree[i] = Long.parseLong(st.nextToken());

        int index = 0;
        boolean found = false;
        while (index < n && tree[index] != -1) {
            if (tree[index] == target) { found = true; break; }
            index = target < tree[index] ? 2 * index + 1 : 2 * index + 2;
        }

        System.out.println(found ? "YES" : "NO");
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
    tree = list(map(int, data[2:2 + n]))

    index = 0
    while index < n and tree[index] != -1:
        if tree[index] == target:
            print("YES")
            return
        index = 2 * index + 1 if target < tree[index] else 2 * index + 2

    print("NO")

if __name__ == "__main__":
    main()
`,
  },

  "min-max-heap-top": {
    C: `#include <stdio.h>
#include <stdlib.h>

static int compare(const void *x, const void *y) {
    long long a = *(const long long *)x;
    long long b = *(const long long *)y;
    return (a > b) - (a < b);
}

int main(void) {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 0;
    long long *a = malloc(sizeof(long long) * (size_t)n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);

    /* Sorting is the straightforward stand-in for a size-k heap in C. */
    qsort(a, (size_t)n, sizeof(long long), compare);

    for (int i = 0; i < k; i++) printf("%lld%c", a[i], i + 1 == k ? '\\n' : ' ');
    free(a);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    if (!(cin >> n >> k)) return 0;

    /* A max-heap capped at k keeps only the k smallest seen so far. */
    priority_queue<long long> heap;
    for (int i = 0; i < n; i++) {
        long long value;
        cin >> value;
        heap.push(value);
        if ((int)heap.size() > k) heap.pop();
    }

    vector<long long> smallest;
    while (!heap.empty()) {
        smallest.push_back(heap.top());
        heap.pop();
    }
    sort(smallest.begin(), smallest.end());

    for (size_t i = 0; i < smallest.size(); i++) {
        cout << smallest[i] << (i + 1 == smallest.size() ? '\\n' : ' ');
    }
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());
        int k = Integer.parseInt(st.nextToken());

        PriorityQueue<Long> heap = new PriorityQueue<>(Collections.reverseOrder());
        for (int i = 0; i < n; i++) {
            heap.add(Long.parseLong(st.nextToken()));
            if (heap.size() > k) heap.poll();
        }

        List<Long> smallest = new ArrayList<>(heap);
        Collections.sort(smallest);

        StringBuilder out = new StringBuilder();
        for (long value : smallest) {
            if (out.length() > 0) out.append(' ');
            out.append(value);
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
import heapq

def main() -> None:
    data = sys.stdin.read().split()
    n, k = int(data[0]), int(data[1])
    a = list(map(int, data[2:2 + n]))

    print(" ".join(map(str, sorted(heapq.nsmallest(k, a)))))

if __name__ == "__main__":
    main()
`,
  },

  "matrix-transpose": {
    C: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 0;
    long long *a = malloc(sizeof(long long) * (size_t)n * (size_t)m);
    for (int i = 0; i < n * m; i++) scanf("%lld", &a[i]);

    for (int j = 0; j < m; j++) {
        for (int i = 0; i < n; i++) printf("%lld%c", a[i * m + j], i + 1 == n ? '\\n' : ' ');
    }

    free(a);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    if (!(cin >> n >> m)) return 0;
    vector<vector<long long>> a(n, vector<long long>(m));
    for (auto &row : a) for (auto &value : row) cin >> value;

    for (int j = 0; j < m; j++) {
        for (int i = 0; i < n; i++) cout << a[i][j] << (i + 1 == n ? '\\n' : ' ');
    }

    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());
        int m = Integer.parseInt(st.nextToken());
        long[][] a = new long[n][m];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) a[i][j] = Long.parseLong(st.nextToken());
        }

        StringBuilder out = new StringBuilder();
        for (int j = 0; j < m; j++) {
            for (int i = 0; i < n; i++) {
                if (i > 0) out.append(' ');
                out.append(a[i][j]);
            }
            out.append('\\n');
        }

        System.out.print(out);
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
    n, m = int(data[0]), int(data[1])
    values = list(map(int, data[2:2 + n * m]))

    rows = [values[i * m:(i + 1) * m] for i in range(n)]
    for column in zip(*rows):
        print(" ".join(map(str, column)))

if __name__ == "__main__":
    main()
`,
  },

  "matrix-row-sums": {
    C: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 0;

    long long *rows = calloc((size_t)n, sizeof(long long));
    long long *cols = calloc((size_t)m, sizeof(long long));

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < m; j++) {
            long long value;
            scanf("%lld", &value);
            rows[i] += value;
            cols[j] += value;
        }
    }

    for (int i = 0; i < n; i++) printf("%lld%c", rows[i], i + 1 == n ? '\\n' : ' ');
    for (int j = 0; j < m; j++) printf("%lld%c", cols[j], j + 1 == m ? '\\n' : ' ');

    free(rows);
    free(cols);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    if (!(cin >> n >> m)) return 0;

    vector<long long> rows(n, 0), cols(m, 0);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < m; j++) {
            long long value;
            cin >> value;
            rows[i] += value;
            cols[j] += value;
        }
    }

    for (int i = 0; i < n; i++) cout << rows[i] << (i + 1 == n ? '\\n' : ' ');
    for (int j = 0; j < m; j++) cout << cols[j] << (j + 1 == m ? '\\n' : ' ');
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());
        int m = Integer.parseInt(st.nextToken());

        long[] rows = new long[n];
        long[] cols = new long[m];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                long value = Long.parseLong(st.nextToken());
                rows[i] += value;
                cols[j] += value;
            }
        }

        StringBuilder out = new StringBuilder();
        for (int i = 0; i < n; i++) {
            if (i > 0) out.append(' ');
            out.append(rows[i]);
        }
        out.append('\\n');
        for (int j = 0; j < m; j++) {
            if (j > 0) out.append(' ');
            out.append(cols[j]);
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
    n, m = int(data[0]), int(data[1])
    values = list(map(int, data[2:2 + n * m]))

    rows = [values[i * m:(i + 1) * m] for i in range(n)]
    print(" ".join(str(sum(row)) for row in rows))
    print(" ".join(str(sum(column)) for column in zip(*rows)))

if __name__ == "__main__":
    main()
`,
  },

  "matrix-diagonal-sum": {
    C: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long *a = malloc(sizeof(long long) * (size_t)n * (size_t)n);
    for (int i = 0; i < n * n; i++) scanf("%lld", &a[i]);

    long long total = 0;
    for (int i = 0; i < n; i++) {
        total += a[i * n + i];
        total += a[i * n + (n - 1 - i)];
    }
    if (n % 2 == 1) total -= a[(n / 2) * n + (n / 2)];

    printf("%lld\\n", total);
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
    vector<vector<long long>> a(n, vector<long long>(n));
    for (auto &row : a) for (auto &value : row) cin >> value;

    long long total = 0;
    for (int i = 0; i < n; i++) {
        total += a[i][i];
        total += a[i][n - 1 - i];
    }
    if (n % 2 == 1) total -= a[n / 2][n / 2];

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
        long[][] a = new long[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) a[i][j] = Long.parseLong(st.nextToken());
        }

        long total = 0;
        for (int i = 0; i < n; i++) {
            total += a[i][i];
            total += a[i][n - 1 - i];
        }
        if (n % 2 == 1) total -= a[n / 2][n / 2];

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
    values = list(map(int, data[1:1 + n * n]))
    rows = [values[i * n:(i + 1) * n] for i in range(n)]

    total = 0
    for i in range(n):
        total += rows[i][i]
        total += rows[i][n - 1 - i]
    if n % 2 == 1:
        total -= rows[n // 2][n // 2]

    print(total)

if __name__ == "__main__":
    main()
`,
  },

  "spiral-matrix-print": {
    C: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 0;
    long long *a = malloc(sizeof(long long) * (size_t)n * (size_t)m);
    for (int i = 0; i < n * m; i++) scanf("%lld", &a[i]);

    int top = 0, bottom = n - 1, left = 0, right = m - 1, printed = 0;
    while (top <= bottom && left <= right) {
        for (int j = left; j <= right; j++) printf("%lld%c", a[top * m + j], ++printed == n * m ? '\\n' : ' ');
        top++;
        for (int i = top; i <= bottom; i++) printf("%lld%c", a[i * m + right], ++printed == n * m ? '\\n' : ' ');
        right--;
        if (top <= bottom) {
            for (int j = right; j >= left; j--) printf("%lld%c", a[bottom * m + j], ++printed == n * m ? '\\n' : ' ');
            bottom--;
        }
        if (left <= right) {
            for (int i = bottom; i >= top; i--) printf("%lld%c", a[i * m + left], ++printed == n * m ? '\\n' : ' ');
            left++;
        }
    }

    free(a);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    if (!(cin >> n >> m)) return 0;
    vector<vector<long long>> a(n, vector<long long>(m));
    for (auto &row : a) for (auto &value : row) cin >> value;

    vector<long long> order;
    int top = 0, bottom = n - 1, left = 0, right = m - 1;
    while (top <= bottom && left <= right) {
        for (int j = left; j <= right; j++) order.push_back(a[top][j]);
        top++;
        for (int i = top; i <= bottom; i++) order.push_back(a[i][right]);
        right--;
        if (top <= bottom) {
            for (int j = right; j >= left; j--) order.push_back(a[bottom][j]);
            bottom--;
        }
        if (left <= right) {
            for (int i = bottom; i >= top; i--) order.push_back(a[i][left]);
            left++;
        }
    }

    for (size_t i = 0; i < order.size(); i++) cout << order[i] << (i + 1 == order.size() ? '\\n' : ' ');
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());
        int m = Integer.parseInt(st.nextToken());
        long[][] a = new long[n][m];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) a[i][j] = Long.parseLong(st.nextToken());
        }

        StringBuilder out = new StringBuilder();
        int top = 0, bottom = n - 1, left = 0, right = m - 1;
        while (top <= bottom && left <= right) {
            for (int j = left; j <= right; j++) append(out, a[top][j]);
            top++;
            for (int i = top; i <= bottom; i++) append(out, a[i][right]);
            right--;
            if (top <= bottom) {
                for (int j = right; j >= left; j--) append(out, a[bottom][j]);
                bottom--;
            }
            if (left <= right) {
                for (int i = bottom; i >= top; i--) append(out, a[i][left]);
                left++;
            }
        }

        System.out.println(out);
    }

    private static void append(StringBuilder out, long value) {
        if (out.length() > 0) out.append(' ');
        out.append(value);
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
    n, m = int(data[0]), int(data[1])
    values = list(map(int, data[2:2 + n * m]))
    a = [values[i * m:(i + 1) * m] for i in range(n)]

    order = []
    top, bottom, left, right = 0, n - 1, 0, m - 1
    while top <= bottom and left <= right:
        for j in range(left, right + 1):
            order.append(a[top][j])
        top += 1
        for i in range(top, bottom + 1):
            order.append(a[i][right])
        right -= 1
        if top <= bottom:
            for j in range(right, left - 1, -1):
                order.append(a[bottom][j])
            bottom -= 1
        if left <= right:
            for i in range(bottom, top - 1, -1):
                order.append(a[i][left])
            left += 1

    print(" ".join(map(str, order)))

if __name__ == "__main__":
    main()
`,
  },

  "string-uppercase-toggle": {
    C: `#include <stdio.h>
#include <ctype.h>

static char s[100005];

int main(void) {
    if (scanf("%100004s", s) != 1) return 0;

    for (int i = 0; s[i] != '\\0'; i++) {
        unsigned char c = (unsigned char)s[i];
        if (isupper(c)) s[i] = (char)tolower(c);
        else if (islower(c)) s[i] = (char)toupper(c);
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

    for (char &c : s) {
        unsigned char u = (unsigned char)c;
        if (isupper(u)) c = (char)tolower(u);
        else if (islower(u)) c = (char)toupper(u);
    }

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

        StringBuilder out = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isUpperCase(c)) out.append(Character.toLowerCase(c));
            else if (Character.isLowerCase(c)) out.append(Character.toUpperCase(c));
            else out.append(c);
        }

        System.out.println(out);
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    s = sys.stdin.read().strip()
    print(s.swapcase())

if __name__ == "__main__":
    main()
`,
  },

  "longest-word": {
    C: `#include <stdio.h>
#include <string.h>

static char word[105];
static char best[105];

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    size_t bestLength = 0;
    for (int i = 0; i < n; i++) {
        if (scanf("%104s", word) != 1) break;
        size_t length = strlen(word);
        if (i == 0 || length > bestLength) {
            strcpy(best, word);
            bestLength = length;
        }
    }

    printf("%s\\n", best);
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

    string best, word;
    for (int i = 0; i < n; i++) {
        cin >> word;
        if (i == 0 || word.size() > best.size()) best = word;
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

        String best = "";
        for (int i = 0; i < n && st.hasMoreTokens(); i++) {
            String word = st.nextToken();
            if (i == 0 || word.length() > best.length()) best = word;
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
    words = data[1:1 + n]

    best = words[0]
    for word in words[1:]:
        if len(word) > len(best):
            best = word

    print(best)

if __name__ == "__main__":
    main()
`,
  },

  "word-frequency": {
    C: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_WORD 32

static int compare(const void *x, const void *y) {
    return strcmp((const char *)x, (const char *)y);
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    char *words = malloc((size_t)n * MAX_WORD);
    for (int i = 0; i < n; i++) scanf("%31s", words + (size_t)i * MAX_WORD);

    /* Sorting groups equal words and puts ties in lexicographic order, so the
       first word to reach the highest count is already the smallest one. */
    qsort(words, (size_t)n, MAX_WORD, compare);

    const char *best = words;
    int bestCount = 0, run = 0;
    for (int i = 0; i < n; i++) {
        const char *current = words + (size_t)i * MAX_WORD;
        if (i > 0 && strcmp(current, words + (size_t)(i - 1) * MAX_WORD) == 0) run++;
        else run = 1;
        if (run > bestCount) {
            bestCount = run;
            best = current;
        }
    }

    printf("%s\\n", best);
    free(words);
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

    unordered_map<string, int> counts;
    string word;
    for (int i = 0; i < n; i++) {
        cin >> word;
        counts[word]++;
    }

    string best;
    int bestCount = 0;
    for (const auto &entry : counts) {
        if (entry.second > bestCount || (entry.second == bestCount && entry.first < best)) {
            best = entry.first;
            bestCount = entry.second;
        }
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

        Map<String, Integer> counts = new HashMap<>();
        for (int i = 0; i < n && st.hasMoreTokens(); i++) {
            String word = st.nextToken();
            counts.merge(word, 1, Integer::sum);
        }

        String best = null;
        int bestCount = 0;
        for (Map.Entry<String, Integer> entry : counts.entrySet()) {
            if (entry.getValue() > bestCount
                    || (entry.getValue() == bestCount && entry.getKey().compareTo(best) < 0)) {
                best = entry.getKey();
                bestCount = entry.getValue();
            }
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
from collections import Counter

def main() -> None:
    data = sys.stdin.read().split()
    n = int(data[0])
    words = data[1:1 + n]

    counts = Counter(words)
    best = min(counts.items(), key=lambda item: (-item[1], item[0]))
    print(best[0])

if __name__ == "__main__":
    main()
`,
  },

  fizzbuzz: {
    C: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    for (int i = 1; i <= n; i++) {
        if (i % 15 == 0) printf("FizzBuzz\\n");
        else if (i % 3 == 0) printf("Fizz\\n");
        else if (i % 5 == 0) printf("Buzz\\n");
        else printf("%d\\n", i);
    }

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

    for (int i = 1; i <= n; i++) {
        if (i % 15 == 0) cout << "FizzBuzz\\n";
        else if (i % 3 == 0) cout << "Fizz\\n";
        else if (i % 5 == 0) cout << "Buzz\\n";
        else cout << i << "\\n";
    }

    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int n = Integer.parseInt(br.readLine().trim());

        StringBuilder out = new StringBuilder();
        for (int i = 1; i <= n; i++) {
            if (i % 15 == 0) out.append("FizzBuzz");
            else if (i % 3 == 0) out.append("Fizz");
            else if (i % 5 == 0) out.append("Buzz");
            else out.append(i);
            out.append('\\n');
        }

        System.out.print(out);
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    n = int(sys.stdin.read().split()[0])

    out = []
    for i in range(1, n + 1):
        if i % 15 == 0:
            out.append("FizzBuzz")
        elif i % 3 == 0:
            out.append("Fizz")
        elif i % 5 == 0:
            out.append("Buzz")
        else:
            out.append(str(i))

    print("\\n".join(out))

if __name__ == "__main__":
    main()
`,
  },

  "leap-year": {
    C: `#include <stdio.h>

int main(void) {
    long long y;
    if (scanf("%lld", &y) != 1) return 0;

    int leap;
    if (y % 400 == 0) leap = 1;
    else if (y % 100 == 0) leap = 0;
    else leap = y % 4 == 0;

    printf("%s\\n", leap ? "YES" : "NO");
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long y;
    if (!(cin >> y)) return 0;

    bool leap;
    if (y % 400 == 0) leap = true;
    else if (y % 100 == 0) leap = false;
    else leap = y % 4 == 0;

    cout << (leap ? "YES" : "NO") << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        long y = Long.parseLong(br.readLine().trim());

        boolean leap;
        if (y % 400 == 0) leap = true;
        else if (y % 100 == 0) leap = false;
        else leap = y % 4 == 0;

        System.out.println(leap ? "YES" : "NO");
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    y = int(sys.stdin.read().split()[0])

    if y % 400 == 0:
        leap = True
    elif y % 100 == 0:
        leap = False
    else:
        leap = y % 4 == 0

    print("YES" if leap else "NO")

if __name__ == "__main__":
    main()
`,
  },

  "min-coins-greedy": {
    C: `#include <stdio.h>

int main(void) {
    long long amount;
    if (scanf("%lld", &amount) != 1) return 0;

    const long long coins[] = {2000, 500, 100, 50, 20, 10, 5, 2, 1};
    long long used = 0;
    for (int i = 0; i < 9; i++) {
        used += amount / coins[i];
        amount %= coins[i];
    }

    printf("%lld\\n", used);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long amount;
    if (!(cin >> amount)) return 0;

    const vector<long long> coins = {2000, 500, 100, 50, 20, 10, 5, 2, 1};
    long long used = 0;
    for (long long coin : coins) {
        used += amount / coin;
        amount %= coin;
    }

    cout << used << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        long amount = Long.parseLong(br.readLine().trim());

        long[] coins = {2000, 500, 100, 50, 20, 10, 5, 2, 1};
        long used = 0;
        for (long coin : coins) {
            used += amount / coin;
            amount %= coin;
        }

        System.out.println(used);
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    amount = int(sys.stdin.read().split()[0])

    used = 0
    for coin in (2000, 500, 100, 50, 20, 10, 5, 2, 1):
        used += amount // coin
        amount %= coin

    print(used)

if __name__ == "__main__":
    main()
`,
  },

  "activity-selection-count": {
    C: `#include <stdio.h>
#include <stdlib.h>

struct Activity {
    long long start;
    long long finish;
};

static int compare(const void *x, const void *y) {
    const struct Activity *a = x;
    const struct Activity *b = y;
    return (a->finish > b->finish) - (a->finish < b->finish);
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    struct Activity *items = malloc(sizeof(struct Activity) * (size_t)n);
    for (int i = 0; i < n; i++) scanf("%lld %lld", &items[i].start, &items[i].finish);

    qsort(items, (size_t)n, sizeof(struct Activity), compare);

    int taken = 0;
    long long lastFinish = 0;
    for (int i = 0; i < n; i++) {
        if (taken == 0 || items[i].start >= lastFinish) {
            taken++;
            lastFinish = items[i].finish;
        }
    }

    printf("%d\\n", taken);
    free(items);
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
    vector<pair<long long, long long>> items(n);
    for (auto &item : items) cin >> item.second >> item.first;

    /* Sorted by finish time, which is stored first in the pair. */
    sort(items.begin(), items.end());

    int taken = 0;
    long long lastFinish = 0;
    for (const auto &item : items) {
        if (taken == 0 || item.second >= lastFinish) {
            taken++;
            lastFinish = item.first;
        }
    }

    cout << taken << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        int n = Integer.parseInt(st.nextToken());

        long[][] items = new long[n][2];
        for (int i = 0; i < n; i++) {
            items[i][0] = Long.parseLong(st.nextToken());
            items[i][1] = Long.parseLong(st.nextToken());
        }

        Arrays.sort(items, Comparator.comparingLong(item -> item[1]));

        int taken = 0;
        long lastFinish = 0;
        for (long[] item : items) {
            if (taken == 0 || item[0] >= lastFinish) {
                taken++;
                lastFinish = item[1];
            }
        }

        System.out.println(taken);
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

    items = []
    for i in range(n):
        start = int(data[1 + 2 * i])
        finish = int(data[2 + 2 * i])
        items.append((finish, start))
    items.sort()

    taken = 0
    last_finish = 0
    for finish, start in items:
        if taken == 0 or start >= last_finish:
            taken += 1
            last_finish = finish

    print(taken)

if __name__ == "__main__":
    main()
`,
  },

  "climbing-stairs": {
    C: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    if (n <= 2) {
        printf("%d\\n", n);
        return 0;
    }

    long long previous = 1, current = 2;
    for (int i = 3; i <= n; i++) {
        long long next = previous + current;
        previous = current;
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

    if (n <= 2) {
        cout << n << "\\n";
        return 0;
    }

    long long previous = 1, current = 2;
    for (int i = 3; i <= n; i++) {
        long long next = previous + current;
        previous = current;
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

        if (n <= 2) {
            System.out.println(n);
            return;
        }

        long previous = 1, current = 2;
        for (int i = 3; i <= n; i++) {
            long next = previous + current;
            previous = current;
            current = next;
        }

        System.out.println(current);
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    n = int(sys.stdin.read().split()[0])

    if n <= 2:
        print(n)
        return

    previous, current = 1, 2
    for _ in range(3, n + 1):
        previous, current = current, previous + current

    print(current)

if __name__ == "__main__":
    main()
`,
  },

  "subsets-count": {
    C: `#include <stdio.h>

static int n;
static long long target;
static long long a[25];
static long long found;

static void explore(int index, long long sum) {
    if (index == n) {
        if (sum == target) found++;
        return;
    }
    explore(index + 1, sum);
    explore(index + 1, sum + a[index]);
}

int main(void) {
    if (scanf("%d %lld", &n, &target) != 2) return 0;
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);

    explore(0, 0);

    printf("%lld\\n", found);
    return 0;
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

static int n;
static long long target;
static vector<long long> a;
static long long found = 0;

static void explore(int index, long long sum) {
    if (index == n) {
        if (sum == target) found++;
        return;
    }
    explore(index + 1, sum);
    explore(index + 1, sum + a[index]);
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    if (!(cin >> n >> target)) return 0;
    a.resize(n);
    for (auto &value : a) cin >> value;

    explore(0, 0);

    cout << found << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;
import java.util.*;

public class Main {
    private static int n;
    private static long target;
    private static long[] a;
    private static long found = 0;

    public static void main(String[] args) throws IOException {
        StringTokenizer st = tokens();
        n = Integer.parseInt(st.nextToken());
        target = Long.parseLong(st.nextToken());
        a = new long[n];
        for (int i = 0; i < n; i++) a[i] = Long.parseLong(st.nextToken());

        explore(0, 0);

        System.out.println(found);
    }

    private static void explore(int index, long sum) {
        if (index == n) {
            if (sum == target) found++;
            return;
        }
        explore(index + 1, sum);
        explore(index + 1, sum + a[index]);
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
    sys.setrecursionlimit(100000)
    data = sys.stdin.read().split()
    n, target = int(data[0]), int(data[1])
    a = list(map(int, data[2:2 + n]))

    found = 0

    def explore(index: int, total: int) -> None:
        nonlocal found
        if index == n:
            if total == target:
                found += 1
            return
        explore(index + 1, total)
        explore(index + 1, total + a[index])

    explore(0, 0)
    print(found)

if __name__ == "__main__":
    main()
`,
  },

  "binary-to-decimal": {
    C: `#include <stdio.h>

static char s[65];

int main(void) {
    if (scanf("%64s", s) != 1) return 0;

    unsigned long long value = 0;
    for (int i = 0; s[i] != '\\0'; i++) value = value * 2 + (unsigned long long)(s[i] - '0');

    printf("%llu\\n", value);
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

    unsigned long long value = 0;
    for (char c : s) value = value * 2 + (unsigned long long)(c - '0');

    cout << value << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String s = br.readLine().trim();

        long value = 0;
        for (int i = 0; i < s.length(); i++) value = value * 2 + (s.charAt(i) - '0');

        System.out.println(value);
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    s = sys.stdin.read().strip()

    value = 0
    for c in s:
        value = value * 2 + (1 if c == "1" else 0)

    print(value)

if __name__ == "__main__":
    main()
`,
  },

  "decimal-to-binary": {
    C: `#include <stdio.h>

int main(void) {
    unsigned long long n;
    if (scanf("%llu", &n) != 1) return 0;

    if (n == 0) {
        printf("0\\n");
        return 0;
    }

    char digits[64];
    int length = 0;
    while (n > 0) {
        digits[length++] = (char)('0' + (n & 1ULL));
        n >>= 1;
    }

    for (int i = length - 1; i >= 0; i--) putchar(digits[i]);
    putchar('\\n');
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

    if (n == 0) {
        cout << "0\\n";
        return 0;
    }

    string bits;
    while (n > 0) {
        bits.push_back((char)('0' + (n & 1ULL)));
        n >>= 1;
    }
    reverse(bits.begin(), bits.end());

    cout << bits << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        long n = Long.parseLong(br.readLine().trim());

        if (n == 0) {
            System.out.println(0);
            return;
        }

        StringBuilder bits = new StringBuilder();
        while (n > 0) {
            bits.append((char)('0' + (n & 1L)));
            n >>= 1;
        }

        System.out.println(bits.reverse());
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    n = int(sys.stdin.read().split()[0])

    if n == 0:
        print(0)
        return

    bits = []
    while n > 0:
        bits.append(str(n & 1))
        n >>= 1

    print("".join(reversed(bits)))

if __name__ == "__main__":
    main()
`,
  },

  "sum-of-natural-numbers": {
    C: `#include <stdio.h>

int main(void) {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;

    printf("%lld\\n", n * (n + 1) / 2);
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

    cout << n * (n + 1) / 2 << "\\n";
    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        long n = Long.parseLong(br.readLine().trim());

        System.out.println(n * (n + 1) / 2);
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    n = int(sys.stdin.read().split()[0])
    print(n * (n + 1) // 2)

if __name__ == "__main__":
    main()
`,
  },

  "pattern-pyramid": {
    C: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    for (int i = 1; i <= n; i++) {
        for (int space = 0; space < n - i; space++) putchar(' ');
        for (int star = 0; star < 2 * i - 1; star++) putchar('*');
        putchar('\\n');
    }

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

    for (int i = 1; i <= n; i++) {
        cout << string((size_t)(n - i), ' ') << string((size_t)(2 * i - 1), '*') << "\\n";
    }

    return 0;
}
`,
    JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int n = Integer.parseInt(br.readLine().trim());

        StringBuilder out = new StringBuilder();
        for (int i = 1; i <= n; i++) {
            for (int space = 0; space < n - i; space++) out.append(' ');
            for (int star = 0; star < 2 * i - 1; star++) out.append('*');
            out.append('\\n');
        }

        System.out.print(out);
    }
}
`,
    PYTHON: `import sys

def main() -> None:
    n = int(sys.stdin.read().split()[0])

    for i in range(1, n + 1):
        print(" " * (n - i) + "*" * (2 * i - 1))

if __name__ == "__main__":
    main()
`,
  },
};
