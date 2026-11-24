"""Tiny Hack CPU simulator used to verify Box.hack without the GUI emulator."""
import sys
def run(hack, steps, ram=None, key_at=None):
    rom = [int(l, 2) for l in open(hack).read().split()]
    R = [0] * 24577
    if ram: R.update({}) if False else [R.__setitem__(k, v) for k, v in ram.items()]
    A = D = pc = 0
    for t in range(steps):
        if key_at: R[24576] = key_at(t)
        if pc >= len(rom): break
        ins = rom[pc]
        if not ins & 0x8000:
            A = ins; pc += 1; continue
        y = R[A & 0x7FFF] if ins & 0x1000 else A
        y = y - 65536 if y & 0x8000 else y
        d = D - 65536 if D & 0x8000 else D
        c = (ins >> 6) & 0x3F
        tbl = {0b101010:0, 0b111111:1, 0b111010:-1, 0b001100:d, 0b110000:y,
               0b001101:~d, 0b110001:~y, 0b001111:-d, 0b110011:-y, 0b011111:d+1,
               0b110111:y+1, 0b001110:d-1, 0b110010:y-1, 0b000010:d+y,
               0b010011:d-y, 0b000111:y-d, 0b000000:d&y, 0b010101:d|y}
        out = tbl[c]; o16 = out & 0xFFFF
        oldA = A
        if ins & 8: R[oldA & 0x7FFF] = o16
        if ins & 16: D = o16
        if ins & 32: A = o16
        s = out - 65536 if o16 & 0x8000 else out
        s = o16 - 65536 if o16 & 0x8000 else o16
        jump = ((ins & 4) and s < 0) or ((ins & 2) and s == 0) or ((ins & 1) and s > 0)
        pc = oldA & 0x7FFF if jump else pc + 1
    return R

def black_words(R):
    return sorted(i - 16384 for i in range(16384, 24576) if R[i] != 0)

if __name__ == "__main__":
    # Box test: keyboard up -> down -> up
    up, down = 0, 75
    for label, key in [("no key held", lambda t: up),
                       ("key held", lambda t: down),
                       ("key pressed then released", lambda t: down if t < 20000 else up)]:
        R = run("Box.hack", 60000, key_at=key)
        words = black_words(R)
        rows = sorted({w // 32 for w in words}); cols = sorted({w % 32 for w in words})
        vals = {R[16384 + w] for w in words}
        print("%-28s black words=%3d  rows=%s..%s  cols=%s  values=%s" % (
            label, len(words), rows[0] if rows else None, rows[-1] if rows else None, cols, vals))
    # Max test
    for a, b in [(3, 7), (9, 2), (5, 5), (-4, 3)]:
        R = run("tests/Max.hack", 200, ram={0: a & 0xFFFF, 1: b & 0xFFFF})
        v = R[2] - 65536 if R[2] & 0x8000 else R[2]
        print("Max(%d,%d) -> R2 = %d" % (a, b, v))
    R = run("tests/Add.hack", 50); print("Add: R0 =", R[0])
    R = run("tests/Rect.hack", 2000, ram={0: 5}); print("Rect R0=5: black rows =", sorted({w//32 for w in black_words(R)}))
