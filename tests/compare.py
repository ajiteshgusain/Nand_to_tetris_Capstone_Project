"""compare.py - compare my .hack output with the official assembler's output.
Usage: python compare.py mine.hack official.hack"""
import sys
a = open(sys.argv[1]).read().split()
b = open(sys.argv[2]).read().split()
if a == b:
    print("MATCH: %s == %s (%d instructions)" % (sys.argv[1], sys.argv[2], len(a)))
else:
    print("DIFFERENT")
    for i, (x, y) in enumerate(zip(a, b)):
        if x != y:
            print("  first difference at instruction %d:\n    mine    %s\n    official %s" % (i, x, y)); break
    if len(a) != len(b): print("  lengths differ:", len(a), len(b))
    sys.exit(1)
